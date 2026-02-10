import { NextResponse } from "next/server";
import { HubSpotClient } from "@/lib/hubspot/client";
import { createClient } from "@supabase/supabase-js";

const accessToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!accessToken) throw new Error("Missing HUBSPOT_PRIVATE_APP_TOKEN");
if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

type HubSpotListResponse<T> = {
  results: T[];
  paging?: { next?: { after?: string } };
};

type ServiceRecord = {
  id: string;
  properties?: Record<string, any>;
  associations?: { companies?: { results?: Array<{ id: string }> } };
};

type ProjectStatus = "Open" | "Closed" | null;

function mapHubSpotStatusToProjectStatus(status: unknown): ProjectStatus {
  if (typeof status !== "string") return null;

  // Treat completed/succeeded as Closed
  if (status === "succeeded_completed") return "Closed";

  // Everything else is considered Open
  return "Open";
}


function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchServiceRecordsPaged(opts: {
  hubspot: HubSpotClient;
  limit: number;
  pages: number;
}): Promise<ServiceRecord[]> {
  const { hubspot, limit, pages } = opts;

  const all: ServiceRecord[] = [];
  let after: string | undefined = undefined;

  for (let page = 0; page < pages; page++) {
    const res = await hubspot.getServiceRecords({
      limit,
      after,
      associations: ["companies"],
      properties: [
        "hs_object_id",
        "hs_name",
        "hs_status",
        "hs_start_date",
        "hs_target_end_date",
        "hubspot_owner_id",
      ],
    });

    if (res.status === "error") throw new Error(res.reason);

    const data = res.data as HubSpotListResponse<ServiceRecord>;
    all.push(...(data.results ?? []));

    after = data.paging?.next?.after;
    if (!after) break;
  }

  return all;
}

export async function GET(req: Request) {
  const startedAt = Date.now();

  try {
    const url = new URL(req.url);

    const limit = parsePositiveInt(url.searchParams.get("limit"), 25, 100);
    const pages = parsePositiveInt(url.searchParams.get("pages"), 1, 5);
    const concurrency = parsePositiveInt(url.searchParams.get("concurrency"), 5, 15);

    const hubspot = new HubSpotClient(accessToken);

    const ownerCache = new Map<string, any>();
    const companyCache = new Map<string, any>();

    async function getOwner(ownerId?: string | null) {
      if (!ownerId) return null;
      if (ownerCache.has(ownerId)) return ownerCache.get(ownerId);

      const res = await hubspot.getOwnerById(ownerId);
      if (res.status === "error") throw new Error(res.reason);

      ownerCache.set(ownerId, res.data);
      return res.data;
    }

    async function getCompany(companyId: string) {
      if (companyCache.has(companyId)) return companyCache.get(companyId);

      const res = await hubspot.getCompanyById(companyId);
      if (res.status === "error") throw new Error(res.reason);

      companyCache.set(companyId, res.data);
      return res.data;
    }

    const services = await fetchServiceRecordsPaged({ hubspot, limit, pages });

    const invalidServices: Array<{ id: string; companyCount: number }> = [];

    const enriched = await mapLimit(services, concurrency, async (service) => {
      const companies = service.associations?.companies?.results ?? [];
      if (companies.length !== 1) {
        invalidServices.push({ id: service.id, companyCount: companies.length });
        return null;
      }

      const companyId = companies[0].id;
      const ownerId = service.properties?.hubspot_owner_id ?? null;

      const [owner, company] = await Promise.all([
        getOwner(ownerId),
        getCompany(companyId),
      ]);

      return {
        id: service.id,
        name: service.properties?.hs_name ?? null,
        status: service.properties?.hs_status ?? null,
        start_date: service.properties?.hs_start_date ?? null,
        target_end_date: service.properties?.hs_target_end_date ?? null,
        hubspot_owner_id: ownerId,
        owner_first_name: owner?.firstName ?? null,
        owner_last_name: owner?.lastName ?? null,
        owner_email: owner?.email ?? null,
        hubspot_company_id: companyId,
        company_name: company?.properties?.name ?? null,
        company_domain: company?.properties?.domain ?? null,
      };
    });

    const validServices = enriched.filter(
      (x): x is NonNullable<typeof x> => x !== null
    );

    async function getOrCreateClientId(opts: {
      hubspotCompanyId: string;
      companyName?: string | null;
      domain?: string | null;
    }) {
      const { hubspotCompanyId, companyName, domain } = opts;

      const { data: existing, error: findErr } = await supabase
        .from("clients")
        .select("id")
        .eq("hubspot_company_id", hubspotCompanyId)
        .maybeSingle();

      if (findErr) throw new Error(`Failed to lookup client: ${findErr.message}`);
      if (existing?.id) return existing.id;

      const { data: created, error: insertErr } = await supabase
        .from("clients")
        .insert({
          hubspot_company_id: hubspotCompanyId,
          name: companyName ?? null,
          domain: domain ?? null,
        })
        .select("id")
        .single();

      if (insertErr) throw new Error(`Failed to create client: ${insertErr.message}`);
      return created.id;
    }

    const projectErrors: Array<{ serviceId: string; error: string }> = [];

    await mapLimit(validServices, Math.min(concurrency, 5), async (service) => {
      try {
        const clientId = await getOrCreateClientId({
          hubspotCompanyId: service.hubspot_company_id,
          companyName: service.company_name,
          domain: service.company_domain,
        });

        const mappedStatus = mapHubSpotStatusToProjectStatus(service.status);

        const { error: upsertErr } = await supabase
          .from("projects")
          .upsert(
            {
              hubspot_service_id: service.id,
              name: service.name,
              status: mappedStatus, // ✅ ENUM SAFE
              start_date: service.start_date,
              target_end_date: service.target_end_date,
              hubspot_owner_id: service.hubspot_owner_id,
              owner_first_name: service.owner_first_name,
              owner_last_name: service.owner_last_name,
              owner_email: service.owner_email,
              client_id: clientId,
            },
            { onConflict: "hubspot_service_id" }
          );

        if (upsertErr)
          projectErrors.push({ serviceId: service.id, error: upsertErr.message });
      } catch (e: any) {
        projectErrors.push({ serviceId: service.id, error: e?.message ?? String(e) });
      }
    });

    const ms = Date.now() - startedAt;

    return NextResponse.json({
      success: projectErrors.length === 0,
      meta: {
        fetched: services.length,
        valid: validServices.length,
        invalid: invalidServices.length,
        limit,
        pages,
        concurrency,
        duration_ms: ms,
      },
      results: validServices,
      warnings: invalidServices.length ? invalidServices : undefined,
      projectErrors: projectErrors.length ? projectErrors : undefined,
    });
  } catch (err: any) {
    console.error("SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
