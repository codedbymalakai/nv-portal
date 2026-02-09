import { NextResponse } from 'next/server';
import { HubSpotClient } from '@/lib/hubspot/client';
import { createClient } from '@supabase/supabase-js';

const accessToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type HubSpotListResponse<T> = { results: T[] };

async function fetchServiceRecords(): Promise<HubSpotListResponse<any>> {
  const hubspot = new HubSpotClient(accessToken);
  const res = await hubspot.getServiceRecords();
  if (res.status === 'error') throw new Error(res.reason);
  return res.data as HubSpotListResponse<any>;
}

async function fetchCompanyRecordById(id: string): Promise<any> {
  const hubspot = new HubSpotClient(accessToken);
  const res = await hubspot.getCompanyById(id);
  if (res.status === 'error') throw new Error(res.reason);
  return res.data;
}

async function fetchOwnerById(id: string): Promise<any> {
  if (!id) return null;
  const hubspot = new HubSpotClient(accessToken);
  const response = await hubspot.getOwnerById(id);
  if (response.status === 'error') throw new Error(response.reason);
  return response.data;
}

async function getOrCreateClientId(opts: {
  hubspotCompanyId: string;
  companyName?: string | null;
  domain?: string | null;
}) {
  const { hubspotCompanyId, companyName, domain } = opts;

  // 1) Try find
  const { data: existing, error: findErr } = await supabase
    .from('clients')
    .select('id')
    .eq('hubspot_company_id', hubspotCompanyId)
    .maybeSingle();

  if (findErr) {
    // maybeSingle() should not throw on 0 rows, so anything here is usually real
    throw new Error(`Failed to lookup client: ${findErr.message}`);
  }

  if (existing?.id) return existing.id;

  // 2) Create if missing
  const { data: created, error: insertErr } = await supabase
    .from('clients')
    .insert({
      hubspot_company_id: hubspotCompanyId,
      name: companyName ?? null,
      domain: domain ?? null,
    })
    .select('id')
    .single();

  if (insertErr) throw new Error(`Failed to create client: ${insertErr.message}`);

  return created.id;
}

export async function GET() {
  try {
    const services = await fetchServiceRecords();

    const validServices: any[] = [];
    const invalidServices: any[] = [];

    for (const service of services.results) {
      const companies = service.associations?.companies?.results ?? [];

      const ownerId = service.properties?.hubspot_owner_id;
      const owner = await fetchOwnerById(ownerId);

      if (companies.length === 1) {
        const companyId = companies[0].id;
        const company = await fetchCompanyRecordById(companyId);

        validServices.push({
          id: service.id,
          name: service.properties?.hs_name,
          status: service.properties?.hs_status,
          start_date: service.properties?.hs_start_date,
          target_end_date: service.properties?.hs_target_end_date,

          owner: ownerId,
          owner_first_name: owner?.firstName ?? null,
          owner_last_name: owner?.lastName ?? null,
          owner_email: owner?.email ?? null,

          hubspot_company_id: companyId,
          company_name: company?.properties?.name ?? null,
          company_domain: company?.properties?.domain ?? null, // optional, if available
        });
      } else {
        invalidServices.push({
          id: service.id,
          companyCount: companies.length,
        });
      }
    }

    // Sync each service -> ensure client exists -> upsert project linked to client
    const projectErrors: Array<{ serviceId: string; error: string }> = [];

    for (const service of validServices) {
      try {
        const clientId = await getOrCreateClientId({
          hubspotCompanyId: service.hubspot_company_id,
          companyName: service.company_name,
          domain: service.company_domain,
        });

        const { error: upsertErr } = await supabase
          .from('projects')
          .upsert(
            {
              hubspot_service_id: service.id,
              name: service.name,
              status: service.status,
              start_date: service.start_date,
              target_end_date: service.target_end_date,
              hubspot_owner_id: service.owner,
              owner_first_name: service.owner_first_name,
              owner_last_name: service.owner_last_name,
              owner_email: service.owner_email,
              client_id: clientId,
            },
            {
              // make sure hubspot_service_id is unique in DB or set your conflict target here
              onConflict: 'hubspot_service_id',
            }
          );

        if (upsertErr) {
          projectErrors.push({ serviceId: service.id, error: upsertErr.message });
        }
      } catch (e: any) {
        projectErrors.push({ serviceId: service.id, error: e?.message ?? String(e) });
      }
    }

    return NextResponse.json({
      success: projectErrors.length === 0,
      count: validServices.length,
      results: validServices,
      warnings: invalidServices.length > 0 ? invalidServices : undefined,
      projectErrors: projectErrors.length > 0 ? projectErrors : undefined,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
