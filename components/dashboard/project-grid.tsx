// components/dashboard/project-grid.tsx
import Link from 'next/link';
import { ProjectCard } from './project-card';
import { Button } from '@/components/ui/button';
import { FolderOpenIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Project = {
  id: string;
  name: string | null;
  status: string | null;
};

type ProjectGridProps = {
  projects: Project[];
  loading?: boolean;
};

function ProjectSkeleton() {
  return (
    <div
      className={cn('h-[110px] rounded-lg border bg-background/60 backdrop-blur', 'animate-pulse')}
    >
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function ProjectGrid({ projects, loading }: ProjectGridProps) {
  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading projects…</p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Empty state ---------- */
  if (projects.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center',
          'rounded-lg border border-dashed',
          'p-12 text-center',
        )}
      >
        <FolderOpenIcon className="mb-4 h-8 w-8 text-muted-foreground" />

        <div className="max-w-md space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">No projects found</h3>

          <p className="text-sm text-muted-foreground leading-relaxed">
            There are currently no active projects associated with your account. Projects are added
            by your Novocy delivery team. If you believe this is incorrect, please get in touch and
            we’ll be happy to help.
          </p>

          <div className="pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="mailto:samuel@novocy.com">Contact us</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Populated state ---------- */
  return (
    <div className="space-y-4">
      {/* Summary row */}
      <p className="text-sm text-muted-foreground">
        {projects.length} Project{projects.length !== 1 ? 's' : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} id={p.id} name={p.name} status={p.status} />
        ))}
      </div>
    </div>
  );
}
