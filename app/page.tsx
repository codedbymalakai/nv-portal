import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Page() {
  return (
    <main className='min-h-screen flex items-center justify-center gap-3'>
      {/* Link is Next's client-side navigation */}
      <Link href='/login'>
        <Button className=''>Login</Button>
      </Link>

      <Link href='/dashboard'>
        <Button variant='outline'>Dashboard</Button>
      </Link>
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
    </main>
  );
}
