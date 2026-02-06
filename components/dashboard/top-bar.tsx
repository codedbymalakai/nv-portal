// components/dashboard/top-bar.tsx
'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

type TopBarProps = {
  email: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  onLogout: () => void;
};

function getInitials(value: string) {
  return value
    .split('@')[0]
    .split(/[.\-_ ]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function getDisplayName(email: string, fullName?: string | null) {
  if (fullName && fullName.trim().length > 0) return fullName;

  const local = email.split('@')[0];
  return local.replace(/[.\-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function TopBar({ email, avatarUrl, fullName, onLogout }: TopBarProps) {
  const name = getDisplayName(email, fullName);
  const initials = getInitials(email);

  return (
    <div className="flex items-center justify-between border-b pb-6">
      {/* Identity */}
      <div className="group relative flex items-center gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'relative h-9 w-9 shrink-0 overflow-hidden rounded-full',
            'bg-muted text-xs font-semibold text-foreground',
            'flex items-center justify-center select-none',
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>

        {/* Name + hover email */}
        <div className="relative">
          <p className="text-sm font-semibold leading-tight tracking-tight">{name}</p>

          {/* Hover / focus email */}
          <div
            className={cn(
              'pointer-events-none absolute left-0 top-full mt-1',
              'rounded-md border bg-background px-2 py-1 shadow-sm',
              'text-xs text-muted-foreground whitespace-nowrap',
              'opacity-0 translate-y-1 transition-all duration-200',
              'group-hover:opacity-100 group-hover:translate-y-0',
              'group-focus-within:opacity-100 group-focus-within:translate-y-0',
            )}
          >
            {email}
          </div>
        </div>
      </div>

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className={cn(
          'gap-2 text-muted-foreground',
          'hover:text-foreground hover:bg-muted/60',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </Button>
    </div>
  );
}
