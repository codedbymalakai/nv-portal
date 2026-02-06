// components/dashboard/dashboard-shell.tsx
'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <ThemeToggle
        className="
          fixed bottom-4 right-4 z-50
          rounded-full shadow-sm backdrop-blur
          bg-background/80 border
        "
      />

      <div className={cn('mx-auto max-w-6xl px-6 py-10', 'space-y-10')}>{children}</div>
    </main>
  );
}
