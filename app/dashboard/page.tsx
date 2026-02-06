// app/dashboard/page.tsx
'use client';

import { supabase } from '@/lib/supabase/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
type Project = {
  id: string;
  created_at: string;
  client_id: string; // NOT NULL (matches DB)
  name: string | null;
  status: string | null;
  hubspot_service_id: string; // NOT NULL (matches DB)
};

export default function DashboardPage() {
  const [user, setUser] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.push('/login');
        return;
      }

      setUser(data.session.user.email ?? null);
      setLoading(true);

      const projectsRes = await supabase
        .from('projects')
        .select('id, created_at, client_id, name, status, hubspot_service_id')
        .order('created_at', { ascending: false });

      if (projectsRes.error) console.log(projectsRes.error.message);

      setProjects((projectsRes.data ?? []) as Project[]);
      setLoading(false);
    };

    run();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user) {
    return (
      <main className='min-h-screen flex items-center justify-center p-6'>
        <p className='text-sm opacity-70'>Checking session...</p>
      </main>
    );
  }

  return (
    <main className='min-h-screen flex items-center justify-center p-6'>
      <ThemeToggle
        className='
          fixed
          bottom-4
          right-4
          z-50
          rounded-full
          shadow-sm
          backdrop-blur
          bg-background/80
          dark:border-white/5
          border-black/5
        '
      />
      <Card className='w-full max-w-3xl'>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>

        <CardContent className='space-y-4'>
          <p className='text-sm'>Signed in as: {user}</p>

          {loading && <p className='text-sm opacity-70'>Loading...</p>}

          {!loading && projects.length === 0 && (
            <p className='text-sm opacity-70'>No projects yet.</p>
          )}

          {!loading && projects.length > 0 && (
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Projects</div>

              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className='block border rounded p-3 hover:bg-white/5 transition'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-medium'>
                        {p.name ?? 'Untitled project'}
                      </div>
                      <div className='text-xs opacity-70'>
                        Status: {p.status ?? 'unknown'}
                      </div>
                    </div>

                    <span className='text-xs underline opacity-80'>View</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Button onClick={logout} variant='outline' className='w-full'>
            Log out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
