// components/dashboard/project-grid.tsx
import Link from 'next/link';
import { ProjectCard } from './project-card';
import { Button } from '@/components/ui/button';
import { FolderOpenIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

type ProjectGridProps = {
  projects: Project[];
  loading?: boolean;
};

/* ---------------- Skeleton ---------------- */

function ProjectSkeleton() {
  return (
    <div className="h-[110px] rounded-lg border bg-background/60 backdrop-blur animate-pulse">
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function normaliseStatus(status: string | null) {
  if (!status) return 'Other';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Explicit ordering improves scanability and future UX
 */
const STATUS_ORDER = ['Open', 'Closed', 'Other'];

/* ---------------- Component ---------------- */

export function ProjectGrid({ projects, loading }: ProjectGridProps) {
  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ProjectSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Empty ---------- */
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <FolderOpenIcon className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />

        <div className="mx-auto max-w-md space-y-4">
          <h3 className="text-sm font-semibold tracking-tight">No projects found</h3>

          <p className="text-sm text-muted-foreground leading-relaxed">
            There are currently no active projects associated with your account. Projects are added
            by your Novocy delivery team. If you believe this is incorrect, please get in touch and
            we’ll be happy to help.
          </p>

          <Button asChild variant="outline" size="sm">
            <Link href="mailto:samuel@novocy.com">Contact us</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Grouping ---------- */
  const grouped = projects.reduce<Record<string, Project[]>>((acc, project) => {
    const key = normaliseStatus(project.status);
    acc[key] = acc[key] ? [...acc[key], project] : [project];
    return acc;
  }, {});

  const orderedStatuses = STATUS_ORDER.filter((s) => grouped[s]?.length);

  /* ---------- Render ---------- */
  return (
    <div className="space-y-10">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {orderedStatuses.map((status) => (
        <section key={status} className="space-y-4">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">{status}</h3>
            <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
          </div>

          {/* Card grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[status].map((p) => (
              <ProjectCard key={p.id} id={p.id} name={p.name} status={p.status} stage={p.stage} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
