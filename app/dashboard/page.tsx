"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.push("/login");
        return;
      }

      setUser(data.session.user.email ?? null);

      setLoadingProjects(true);
      setLoadingUpdates(true);

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

      setUpdates(updatesRes.data ?? []);
      setProjects(projectsRes.data ?? []);

      setLoadingUpdates(false);
      setLoadingProjects(false);
    };

    checkSession();
  }, [router]);

  // Map project_id -> updates[]
  const updatesByProject = useMemo(() => {
    const map = new Map<string, ServiceUpdate[]>();
    updates.forEach((u) => {
      const list = map.get(u.project_id) ?? [];
      list.push(u);
      map.set(u.project_id, list);
    });
    return map;
  }, [updates]);

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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm">Signed in as: {user}</p>

          <section className="space-y-3">
            <div className="text-sm font-medium">Projects</div>

            {loadingProjects && (
              <p className="text-sm opacity-70">Loading projects...</p>
            )}

            {!loadingProjects && projects.length === 0 && (
              <p className="text-sm opacity-70">No projects yet.</p>
            )}

            {!loadingProjects &&
              projects.map((project) => {
                const projectUpdates = updatesByProject.get(project.id) ?? [];

                return (
                  <div key={project.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          {project.name ?? "Untitled project"}
                        </div>
                        <div className="text-xs opacity-70">
                          Status: {project.status ?? "unknown"}
                        </div>
                      </div>
                      <div className="text-xs opacity-70">
                        {projectUpdates.length} update
                        {projectUpdates.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    {loadingUpdates && (
                      <p className="text-sm opacity-70">Loading updates...</p>
                    )}

                    {!loadingUpdates && projectUpdates.length === 0 && (
                      <p className="text-sm opacity-70">
                        No updates for this project.
                      </p>
                    )}

                    {!loadingUpdates &&
                      projectUpdates.map((u) => (
                        <div key={u.id} className="border-t pt-2">
                          <div className="text-sm font-medium">
                            {u.title ?? "Untitled"}
                          </div>
                          <div className="text-sm opacity-80">
                            {u.body ?? ""}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </section>

          <Button onClick={logout} variant="outline" className="w-full">
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
