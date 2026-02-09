import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_TYPES = ["update", "action", "milestone", "message"];

export async function POST(request: Request) {
  try {
    const secret = request?.headers?.get("x-portal-secret");
    if (secret !== process.env.HUBSPOT_PORTAL_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse JSON
    const { title, body, projectId, occurred_at, type } = await request.json()

    // Basic Validation
    if (!title || !body || !projectId || !occurred_at || !type) {
        return NextResponse.json({ error: "Missing required field" }, { status: 400});
    }
    if (title.length > 128) {
        return NextResponse.json({ error: "Title is too long (max 128)" }, { status: 422 });
    }
     if (body.length > 512) {
        return NextResponse.json({ error: "body is too long (max 512)" }, { status: 422 });
    }
    if (!ALLOWED_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid type. Must be one of: update, action, milestone, message." }, { status: 422 });
    }

    // Fetch Projects table from Supabase
    const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("hubspot_service_id", projectId)
    .single(),

    if (!project || projectError) {
        return NextResponse.json({ error: "Could not find project"  }, { status: 404 })
    }

    const {error: serviceError} = await supabase
    .from("service_updates")
    .insert({
        project_id: projectId,
        title,
        body,
        occurred_at,
        type
    })

    if (serviceError) {
        NextResponse.json({error: serviceError.message}, { status:500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }







// HubSpot must send:
//{
//  title: string (<=128),
//  body: string (<=512),
//  projectId: string (HubSpot service ID),
//  occurred_at: ISO string,
//  type: 'update' | 'action' | 'milestone' | 'message'
//}
