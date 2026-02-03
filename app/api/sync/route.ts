import { NextResponse } from 'next/server'
import { HubSpotClient } from '@/lib/hubspot/client'

const accessToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL

type HubSpotListResponse<T> = {
  results: T[];
};


async function fetchServiceRecords(): Promise<HubSpotListResponse<any>> {
  const hubspot = new HubSpotClient(accessToken)
  const res = await hubspot.getServiceRecords()

  if (res.status === "error") throw new Error(res.reason)

    return res.data as HubSpotListResponse<any>
}





export async function GET() {
  try {
    const services = await fetchServiceRecords()
    return NextResponse.json({ 
      success: true, 
      count: services.results.length,
     })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    )
  }
  
}
