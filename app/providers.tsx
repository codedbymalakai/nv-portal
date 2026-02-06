'use client';

import { useEffect } from 'react';
import { initAuthAnalyticsListener } from '@/lib/supabase/auth-listener';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAuthAnalyticsListener();
  }, []);

  return <>{children}</>;
}
