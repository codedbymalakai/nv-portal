'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/supabaseClient';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProjectHeader } from '@/components/projects/project-header';
import { ServiceUpdatesTimeline } from '@/components/projects/service-updates-timeline';
import { TrustFooter } from '@/components/projects/trust-footer';
import { TopBar } from '@/components/dashboard/top-bar';

export type Project = {
  id: string;
  name: string | null;
  status: 'Open' | 'Closed' | null;
  stage: string;
  created_at: string;
  target_end_date?: string | null;
  owner_first_name?: string | null;
  owner_last_name?: string | null;
  owner_email?: string | null;
};

type ServiceUpdate = {
  id: string;
  title: string | null;
  body: string | null;
  occurred_at: string;
  type: 'update' | 'message' | 'action' | 'milestone';
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id: projectId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<ServiceUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    async function run() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      const session = data.session;

      if (sessionError || !session) {
        router.push('/login');
        return;
      }

      const user = session.user;

      setEmail(user.email ?? null);
      setAvatarUrl(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null);
      setFullName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? null);

      setLoading(true);
      setError(null);

      const [projectRes, updatesRes] = await Promise.all([
        supabase
          .from('projects')
          .select(
            'id, name, status, stage, created_at, owner_first_name, owner_last_name, owner_email, target_end_date',
          )
          .eq('id', projectId)
          .single(),

        supabase
          .from('service_updates')
          .select('id, title, body, occurred_at, type')
          .eq('project_id', projectId)
          .order('occurred_at', { ascending: false }),
      ]);

      if (projectRes.error) {
        setError(projectRes.error.message);
        setProject(null);
      } else {
        setProject(projectRes.data as Project);
      }

      setUpdates((updatesRes.data ?? []) as ServiceUpdate[]);
      setLoading(false);
    }

    run();
  }, [projectId, router]);

  /* ---------- Guard ---------- */
  if (!email) {
    return (
      <DashboardShell>
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      {/* Top chrome */}
      <TopBar
        email={email}
        avatarUrl={avatarUrl}
        fullName={fullName}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      {/* Page content */}
      <div className="mx-auto w-full max-w-5xl space-y-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/dashboard" className="hover:text-foreground underline underline-offset-4">
            Dashboard
          </Link>

          <span aria-hidden className="opacity-60">
            /
          </span>

          <span className="truncate max-w-[40ch] text-foreground">
            {project?.name ?? 'Project'}
          </span>
        </nav>

        {/* Loading */}
        {loading && (
          <div
            className="
              rounded-lg border
              border-border/60 dark:border-white/10
              bg-background/70 dark:bg-background/40
              backdrop-blur
              p-6
            "
          >
            <p className="text-sm text-muted-foreground">Loading project…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="
              rounded-lg border
              border-border/60 dark:border-white/10
              bg-background/70 dark:bg-background/40
              backdrop-blur
              p-6
            "
          >
            <p className="text-sm font-medium">Couldn’t load project</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && project && (
          <div className="space-y-14">
            <ProjectHeader project={project} />

            <div
              className="
                rounded-xl
                bg-background/70 dark:bg-background/40
                backdrop-blur
                border-border/60 dark:border-white/10
              "
            >
              <ServiceUpdatesTimeline updates={updates} />
            </div>

            <TrustFooter stage={project.stage} status={project.status} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
