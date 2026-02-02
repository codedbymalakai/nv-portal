// app/projects/[id]/page.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ServiceUpdate = {
  id: string;
  client_id: string | null;
  project_id: string;
  created_at: string;
  title: string | null;
  body: string | null;
};

type Project = {
  id: string;
  created_at: string;
  client_id: string | null;
  name: string | null;
  status: string | null;
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [user, setUser] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<ServiceUpdate[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!projectId) return;

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push("/login");
        return;
      }

      setUser(sessionData.session.user.email ?? null);

      setLoading(true);
      setErrorMsg(null);

      const [projectRes, updatesRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase
          .from("service_updates")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ]);

      if (projectRes.error) {
        setErrorMsg(projectRes.error.message);
        setProject(null);
      } else {
        setProject(projectRes.data as Project);
      }

      if (updatesRes.error) {
        setErrorMsg((prev) => prev ?? updatesRes.error?.message ?? "Error");
        setUpdates([]);
      } else {
        setUpdates((updatesRes.data ?? []) as ServiceUpdate[]);
      }

      setLoading(false);
    };

    run();
  }, [projectId, router]);

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm opacity-70">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Project</CardTitle>
            <Link href="/dashboard" className="text-sm underline opacity-80">
              Back
            </Link>
          </div>
          <p className="text-xs opacity-70">Signed in as: {user}</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && <p className="text-sm opacity-70">Loading...</p>}

          {!loading && errorMsg && (
            <div className="text-sm border rounded p-3">
              <div className="font-medium">Couldn’t load project</div>
              <div className="opacity-80">{errorMsg}</div>
            </div>
          )}

          {!loading && !errorMsg && project && (
            <>
              <div className="border rounded p-3 space-y-1">
                <div className="text-sm font-medium">
                  {project.name ?? "Untitled project"}
                </div>
                <div className="text-xs opacity-70">
                  Status: {project.status ?? "unknown"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Service updates</div>

                {updates.length === 0 && (
                  <p className="text-sm opacity-70">No updates yet.</p>
                )}

                {updates.map((u) => (
                  <div key={u.id} className="text-sm border-b pb-2">
                    <div className="font-medium">{u.title ?? "Untitled"}</div>
                    <div className="opacity-80">{u.body ?? ""}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="w-full"
          >
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
