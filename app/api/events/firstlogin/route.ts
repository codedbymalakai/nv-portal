import { NextResponse } from 'next/server';
import { HubSpotEventsClient } from '@/lib/hubspot/events';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, loginTimestamp } = body ?? {};

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const hubspot = new HubSpotEventsClient();

    // Fire-and-forget semantics, but still awaited for delivery
    await hubspot.sendFirstLoginEvent({
      email,
      loginTimestamp,
    });

    // Analytics must never block auth
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Intentionally swallow errors
    console.error('HubSpot login event failed:', err);

    // Always return success so auth flows are unaffected
    return NextResponse.json({ ok: true });
  }
}
