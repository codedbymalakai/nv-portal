// components/dashboard/project-card.tsx
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

type ProjectCardProps = {
  id: string;
  name: string | null;
  status: string | null;
};

function normalizeStatus(status: string | null) {
  if (!status) return 'Unknown';

  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ProjectCard({ id, name, status }: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          'relative h-full overflow-hidden',
          'bg-background/80 backdrop-blur',
          'border transition-all duration-300 ease-out',
          'hover:-translate-y-[2px] hover:shadow-xl',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0 py-0',
        )}
      >
        <CardContent className="flex h-full flex-col justify-between p-5">
          {/* Top */}
          <div className="space-y-2">
            <h3 className={cn('text-sm font-semibold leading-snug tracking-tight', 'line-clamp-2')}>
              {name ?? 'Untitled project'}
            </h3>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5',
                  'text-[11px] font-medium',
                  'text-muted-foreground',
                )}
              >
                {normalizeStatus(status)}
              </span>
            </div>
          </div>

          {/* Bottom */}
          <div
            className={cn(
              'mt-6 flex items-center justify-between',
              'text-xs font-medium text-muted-foreground',
            )}
          >
            <span>Open project</span>

            <ArrowRight
              className={cn(
                'h-3.5 w-3.5',
                'opacity-0 translate-x-[-4px]',
                'transition-all duration-300',
                'group-hover:opacity-100 group-hover:translate-x-0',
                'motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-x-0',
              )}
            />
          </div>

          {/* Hover accent */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 h-px',
              'bg-gradient-to-r from-transparent via-foreground/20 to-transparent',
              'opacity-0 transition-opacity duration-300',
              'group-hover:opacity-100',
            )}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
