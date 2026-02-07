import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail } from 'lucide-react';
import { StageTimeline } from './stages';

type ProjectHeaderProps = {
  project: {
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
};

function MetadataItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[140px]">
      {/* Label */}
      <p className="mb-1 h-4 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>

      {/* Value */}
      <div className="flex min-h-[32px] items-center text-sm font-medium leading-tight">
        {children}
      </div>
    </div>
  );
}

const STAGE_HELP: Record<string, string> = {
  Design: 'We are defining requirements, scope, and approach.',
  Build: 'Development work is actively in progress.',
  UAT: 'User acceptance testing is underway.',
  Training: 'Training and documentation are being prepared.',
  Warranty: 'Post-delivery support period.',
  Closed: 'This project has been completed.',
};

function stageBadgeClass(stage: string) {
  switch (stage) {
    case 'Design':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300';
    case 'Build':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'UAT':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    case 'Training':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
    case 'Warranty':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatDate(date?: string | null) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const stage = project.stage ?? 'Unknown';
  const stageKeyMap: Record<string, StageKey> = {
    Design: 'design',
    Build: 'build',
    UAT: 'uat',
    Training: 'training',
    Warranty: 'warranty',
    Completed: 'completed',
    Closed: 'completed',
  };

  const ownerName =
    project.owner_first_name || project.owner_last_name
      ? `${project.owner_first_name ?? ''} ${project.owner_last_name ?? ''}`.trim()
      : 'Unassigned';

  const ownerInitial = project.owner_first_name?.[0] ?? project.owner_last_name?.[0] ?? '?';

  return (
    <section className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* Left: title + stage */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            {project.name ?? 'Untitled project'}
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    'cursor-help px-2.5 py-0.5 text-[11px] font-medium',
                    stageBadgeClass(stage),
                  )}
                >
                  {stage}
                </Badge>
              </TooltipTrigger>

              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                {STAGE_HELP[stage] ?? 'Project stage'}
              </TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground">
              Status: {project.status ?? 'Unknown'}
            </span>
          </div>
        </div>

        {/* Right: timeline */}
        <div className="pt-1">
          <StageTimeline activeStage={stageKeyMap[stage] ?? 'design'} />
        </div>
      </div>

      {/* Metadata bar */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-10 gap-y-6',
          'rounded-lg border',
          'border-border/60 dark:border-white/10',
          'bg-background/70 dark:bg-background/40',
          'backdrop-blur px-5 py-4',
        )}
      >
        {/* Left group */}
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          {/* Target end date */}
          <MetadataItem label="Target end date">{formatDate(project.target_end_date)}</MetadataItem>

          {/* Lead consultant */}
          <MetadataItem label="Lead consultant">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'group inline-flex items-center gap-2 rounded-md',
                      'px-1.5 py-1',
                      'hover:bg-muted/60 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <Avatar className="h-6 w-6 text-[10px]">
                      <AvatarFallback>{ownerInitial}</AvatarFallback>
                    </Avatar>

                    <span className="text-sm font-medium leading-none">{ownerName}</span>
                  </button>
                </PopoverTrigger>

                <PopoverContent align="start" className="w-64 p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium leading-none">{ownerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Lead consultant</p>
                    </div>

                    {/* Inline email action */}
                    {project.owner_email && (
                      <a
                        href={`mailto:${project.owner_email}`}
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          'rounded-md px-2 py-1',
                          'text-xs font-medium',
                          'text-muted-foreground',
                          'hover:text-foreground hover:bg-muted/60',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'transition-colors',
                        )}
                        aria-label={`Email ${ownerName}`}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Email</span>
                      </a>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </MetadataItem>

          {/* Created date */}
          <MetadataItem label="Created">{formatDate(project.created_at)}</MetadataItem>
        </div>
      </div>
    </section>
  );
}
