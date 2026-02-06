// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/supabaseClient';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { TopBar } from '@/components/dashboard/top-bar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProjectGrid } from '@/components/dashboard/project-grid';

type Project = {
  id: string;
  name: string | null;
  status: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function run() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      setEmail(user.email ?? null);
      setAvatarUrl(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null);
      setFullName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? null);

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('created_at', { ascending: false });

      setProjects(projects ?? []);
      setLoading(false);
    }

    run();
  }, [router]);

  if (loading) {
    return null; // or skeleton later
  }

  return (
    <DashboardShell>
      <TopBar
        email={email!}
        avatarUrl={avatarUrl}
        fullName={fullName}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      <DashboardHeader />

      <ProjectGrid projects={projects} loading={loading} />
    </DashboardShell>
  );
}
