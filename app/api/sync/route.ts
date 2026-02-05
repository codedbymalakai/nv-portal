import { NextResponse } from "next/server";
import { HubSpotClient } from "@/lib/hubspot/client";

const accessToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

type HubSpotListResponse<T> = { results: T[] };

async function fetchServiceRecords(): Promise<HubSpotListResponse<any>> {
  const hubspot = new HubSpotClient(accessToken);
  const res = await hubspot.getServiceRecords();

  if (res.status === "error") throw new Error(res.reason);

  return res.data as HubSpotListResponse<any>;
}

async function fetchCompanyRecordById(id: string): Promise<any> {
  const hubspot = new HubSpotClient(accessToken);
  const res = await hubspot.getCompanyById(id);

  if (res.status === "error") throw new Error(res.reason);

  return res.data;
}

async function fetchOwnerById(id: string): Promise<any> {
  const hubspot = new HubSpotClient(accessToken);
  const response = await hubspot.getOwnerById(id);

  if (response.status === "error") throw new Error(response.reason)

    return response.data;
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
          owner_first_name: owner.firstName,
          owner_last_name: owner.lastName,
          owner_email: owner.email,
          client_id: companyId,
          company_name: company?.properties?.name, 
        });
      } else {
        invalidServices.push({
          id: service.id,
          companyCount: companies.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: validServices.length,
      results: validServices,
      warnings: invalidServices.length > 0 ? invalidServices : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
