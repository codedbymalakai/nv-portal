// app/dashboard/page.tsx
"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ServiceUpdate = {
  id: string;
  client_id: string | null;
  project_id: string; // NOT NULL
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

export default function DashboardPage() {
  const [user, setUser] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [updates, setUpdates] = useState<ServiceUpdate[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.push("/login");
        return;
      }

      setUser(data.session.user.email ?? null);
      setLoading(true);

      const [updatesRes, projectsRes] = await Promise.all([
        supabase
          .from("service_updates")
          .select("id, client_id, project_id, created_at, title, body")
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, client_id, created_at, name, status")
          .order("created_at", { ascending: false }),
      ]);

      if (updatesRes.error) console.log(updatesRes.error.message);
      if (projectsRes.error) console.log(projectsRes.error.message);

      const fetchedUpdates = (updatesRes.data ?? []) as ServiceUpdate[];
      const fetchedProjects = (projectsRes.data ?? []) as Project[];

      setUpdates(fetchedUpdates);
      setProjects(fetchedProjects);

      // default selection: first project
      setSelectedProjectId((prev) => prev ?? fetchedProjects[0]?.id ?? null);

      setLoading(false);
    };

    run();
  }, [router]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const selectedProjectUpdates = useMemo(() => {
    if (!selectedProjectId) return [];
    return updates.filter((u) => u.project_id === selectedProjectId);
  }, [updates, selectedProjectId]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm">Signed in as: {user}</p>

          {loading && <p className="text-sm opacity-70">Loading...</p>}

          {!loading && projects.length === 0 && (
            <p className="text-sm opacity-70">No projects yet.</p>
          )}

          {!loading && projects.length > 0 && (
            <>
              {/* Project selector */}
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    type="button"
                    className={`text-xs px-3 py-1 rounded border transition ${
                      selectedProjectId === p.id
                        ? "bg-white/10"
                        : "bg-transparent opacity-80"
                    }`}
                  >
                    {p.name ?? "Untitled"}
                  </button>
                ))}
              </div>

              {/* Selected project header */}
              {selectedProject && (
                <div className="border rounded p-3 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {selectedProject.name ?? "Untitled project"}
                      </div>
                      <div className="text-xs opacity-70">
                        Status: {selectedProject.status ?? "unknown"}
                      </div>
                    </div>

                    <Link
                      href={`/projects/${selectedProject.id}`}
                      className="text-xs underline opacity-80"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              )}

              {/* Filtered updates */}
              {selectedProjectId && selectedProjectUpdates.length === 0 && (
                <p className="text-sm opacity-70">No updates for this project.</p>
              )}

              {selectedProjectUpdates.map((u) => (
                <div key={u.id} className="text-sm border-b pb-2">
                  <div className="font-medium">{u.title ?? "Untitled"}</div>
                  <div className="opacity-80">{u.body ?? ""}</div>
                </div>
              ))}
            </>
          )}

          <Button onClick={logout} variant="outline" className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
