'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';
import { signInWithEmailPassword, signInWithGoogle } from '@/lib/auth/login';
import { cn } from '@/lib/utils';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function isValidEmail(value: string) {
  // pragmatic email validation: good UX without being overly strict
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthFooterLegal() {
  return (
    <div className='mt-4 md:mt-8 space-y-3 text-center'>
      <p className='mx-auto max-w-sm px-10 text-xs leading-relaxed text-muted-foreground'>
        By clicking{' '}
        <span className='font-medium text-foreground'>Continue</span>, you agree
        to our{' '}
        <Link
          href='/legal/terms'
          className='font-medium underline underline-offset-4 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href='/legal/privacy'
          className='font-medium underline underline-offset-4 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        >
          Privacy Policy
        </Link>
        .
      </p>

      <div
        className='flex flex-wrap items-center justify-center gap-2'
        aria-label='Security assurances'
      >
        <Badge variant='outline' className='text-[11px] font-normal'>
          No passwords stored
        </Badge>
        <Badge variant='outline' className='text-[11px] font-normal'>
          Scoped access only
        </Badge>
      </div>
    </div>
  );
}

function normalizeAuthError(err: unknown) {
  const message =
    (typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as any).message === 'string' &&
      (err as any).message) ||
    'Unable to sign in. Please try again.';

  const lower = message.toLowerCase();

  // common auth cases (Supabase / OAuth / generic)
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid') ||
    lower.includes('credentials') ||
    lower.includes('password') ||
    lower.includes('email')
  ) {
    return { kind: 'auth' as const, message: 'Invalid email or password.' };
  }

  if (
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('failed to fetch') ||
    lower.includes('fetch')
  ) {
    return {
      kind: 'network' as const,
      message: 'Network error. Check your connection and try again.',
    };
  }

  return { kind: 'system' as const, message };
}

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const [submitted, setSubmitted] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const emailTrimmed = email.trim();
  const emailOk = emailTrimmed.length > 0 && isValidEmail(emailTrimmed);
  const passwordOk = password.length > 0;

  const emailInvalid = (submitted || emailTrimmed.length > 0) && !emailOk;
  const passwordInvalid = submitted && !passwordOk;

  const canSubmit = emailOk && passwordOk && !loading && !googleLoading;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading || googleLoading) return;

    setSubmitted(true);
    setFormError(null);

    if (!emailOk || !passwordOk) return;

    try {
      setLoading(true);
      await signInWithEmailPassword(emailTrimmed, password);
      router.push('/dashboard');
    } catch (err) {
      const norm = normalizeAuthError(err);
      setFormError(norm.message);

      // inline for auth errors; toast for system/network
      if (norm.kind === 'auth') return;
      toast.error(norm.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (loading || googleLoading) return;

    setFormError(null);

    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      // Redirect will typically be handled by OAuth provider/callback.
    } catch (err) {
      const norm = normalizeAuthError(err);
      toast.error(norm.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className='min-h-screen grid grid-cols-1 lg:grid-cols-3'>
      {/* Brand / Marketing panel */}
      <section className='hidden lg:flex flex-col justify-between px-16 py-14 bg-gradient-to-br from-[#998061] via-[#c7b89a] to-[#ded4bd] text-white'>
        {/* Top */}
        <div className='space-y-14'>
          {/* Brand */}
          <div className='space-y-3'>
            <span className='text-xs font-medium uppercase tracking-wide text-white/60'>
              Novocy · Client Portal
            </span>

            <h1 className='text-4xl font-semibold tracking-tight leading-tight'>
              Your HubSpot projects,
              <br />
              clearly delivered.
            </h1>

            <p className='max-w-md text-sm leading-relaxed text-white/70'>
              Track progress, stages, and important updates across your HubSpot
              CRM Projects, without chasing emails or status calls.
            </p>
          </div>

          {/* Subtle value statements */}
          <div className='space-y-6 max-w-md'>
            <div>
              <p className='text-sm font-medium text-white/85'>
                Delivery transparency
              </p>
              <p className='mt-1 text-sm text-white/70 leading-relaxed'>
                See exactly what stage each project is at, what’s been
                completed, and what’s coming next.
              </p>
            </div>

            <div>
              <p className='text-sm font-medium text-white/85'>Clear actions</p>
              <p className='mt-1 text-sm text-white/70 leading-relaxed'>
                Important decisions and updates are surfaced clearly, so nothing
                gets lost.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='text-xs text-white/55'>
          © {new Date().getFullYear()} Novocy Ltd
        </div>
      </section>

      {/* Auth panel */}
      <section className='relative flex items-center justify-center p-6 bg-background overflow-hidden col-span-2'>
        {/* Background glow (disciplined, focus-aware, reduced motion safe) */}
        <div>
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <div
              className={cn(
                'h-[420px] w-[420px] rounded-full blur-3xl transition-opacity duration-500',
                'bg-violet-500/20 opacity-20',
                // stronger glow on focus within the auth card wrapper (see wrapper group below)
                'group-focus-within:opacity-35',
                // reduce distraction on motion-reduced setups
                'motion-reduce:transition-none',
              )}
            />
          </div>

          <div className='group relative w-full max-w-lg'>
            {/* Logo */}
            <div className='mb-6 flex justify-center'>
              <img
                src='/logo.svg'
                alt='Novocy'
                className='
        h-12 w-auto
        opacity-90
        select-none
      '
                draggable={false}
              />
            </div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={cn('motion-reduce:transform-none')}
            >
              <Card className='backdrop-blur-xl bg-background/85 border shadow-xl'>
                <CardContent
                  className='<CardContent className="md:p-9 px-5 md:space-y-8">
'
                >
                  <div className='md:space-y-2 space-y-1 mb-8'>
                    <h2 className='text-xl md:text-2xl font-semibold tracking-tight'>
                      Log in
                    </h2>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                      Continue with Google, or sign in with your email.
                    </p>
                  </div>

                  {/* Google first */}
                  <Button
                    type='button'
                    variant='outline'
                    className={cn(
                      'w-full h-11 justify-center gap-2',
                      'hover:bg-muted/50 transition-colors',
                      'motion-reduce:transition-none',
                    )}
                    onClick={handleGoogleLogin}
                    disabled={loading || googleLoading}
                    aria-label='Continue with Google'
                  >
                    {googleLoading ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <FaGoogle className='h-4 w-4' />
                    )}
                    <span>
                      {googleLoading
                        ? 'Opening Google…'
                        : 'Continue with Google'}
                    </span>
                  </Button>

                  {/* Divider */}
                  <div className='my-6 flex items-center gap-3'>
                    <div className='h-px flex-1 bg-border' />
                    <span className='text-xs uppercase tracking-wide text-muted-foreground'>
                      or sign in with email
                    </span>
                    <div className='h-px flex-1 bg-border' />
                  </div>

                  <form
                    onSubmit={handleLogin}
                    className='md:space-y-6 space-y-5'
                    aria-busy={loading}
                  >
                    {/* Email */}
                    <div className='space-y-2'>
                      <Label htmlFor='email'>Email</Label>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                          id='email'
                          placeholder='you@company.com'
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete='email'
                          inputMode='email'
                          disabled={loading || googleLoading}
                          aria-invalid={emailInvalid}
                          className={cn(
                            'pl-10 h-11',
                            emailInvalid &&
                              'ring-1 ring-destructive focus-visible:ring-destructive',
                          )}
                        />
                      </div>
                      {emailInvalid ? (
                        <p className='text-xs text-destructive'>
                          Enter a valid email address.
                        </p>
                      ) : (
                        <p className='text-xs text-muted-foreground'></p>
                      )}
                    </div>

                    {/* Password */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='password'>Password</Label>
                        <Link
                          href='/auth/reset-password'
                          className={cn(
                            'text-xs text-muted-foreground hover:text-foreground transition-colors',
                            'motion-reduce:transition-none',
                          )}
                        >
                          Forgot password?
                        </Link>
                      </div>

                      <div className='relative'>
                        <Lock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />

                        <Input
                          id='password'
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete='current-password'
                          disabled={loading || googleLoading}
                          aria-invalid={passwordInvalid}
                          className={cn(
                            'pl-10 pr-10 h-11',
                            passwordInvalid &&
                              'ring-1 ring-destructive focus-visible:ring-destructive',
                          )}
                        />

                        <button
                          type='button'
                          onClick={() => setShowPassword((v) => !v)}
                          className={cn(
                            'absolute right-2 top-1/2 -translate-y-1/2',
                            'inline-flex h-8 w-8 items-center justify-center rounded-md',
                            'text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            'motion-reduce:transition-none',
                          )}
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                          disabled={loading || googleLoading}
                        >
                          {showPassword ? (
                            <EyeOff className='h-4 w-4' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </button>
                      </div>

                      {passwordInvalid ? (
                        <p className='text-xs text-destructive'>
                          Enter your password.
                        </p>
                      ) : (
                        <p className='text-xs text-muted-foreground'></p>
                      )}
                    </div>

                    {/* Primary action */}
                    <Button
                      type='submit'
                      disabled={!canSubmit}
                      className={cn(
                        'group relative w-full h-11 overflow-hidden rounded-md',
                        'bg-gradient-to-br from-[#ded4bd] via-[#c7b89a] to-[#998061]',
                        'text-white font-medium',
                        'drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]',

                        // Base shadow only when enabled
                        canSubmit
                          ? 'shadow-[0_8px_30px_rgba(153,128,97,0.30)]'
                          : 'shadow-none',

                        'transition-all duration-300 ease-out',

                        // Hover / active only when enabled
                        canSubmit &&
                          'hover:shadow-[0_12px_40px_rgba(153,128,97,0.40)] hover:scale-[1.01] active:scale-[0.99]',

                        'disabled:opacity-60 disabled:cursor-not-allowed',
                        'motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100',
                      )}
                    >
                      {/* subtle highlight sweep */}
                      {canSubmit && (
                        <span
                          className={cn(
                            'pointer-events-none absolute inset-0',

                            // Glow sweep
                            'bg-gradient-to-r from-transparent via-white/20 to-transparent',

                            // Animate IN when enabled
                            'opacity-0 scale-95',
                            'animate-[glow-in_400ms_ease-out_forwards]',

                            // Hover interaction
                            'group-hover:opacity-100',

                            'motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:scale-100',
                          )}
                        />
                      )}

                      <span className='relative z-10 inline-flex items-center justify-center gap-2'>
                        {loading ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : null}
                        {loading ? 'Signing in…' : 'Continue'}
                      </span>
                    </Button>

                    {/* Secondary / sign-up */}
                    <div className='pt-2 text-center'>
                      <p className='text-sm text-muted-foreground'>
                        Need an account?{' '}
                        <Link
                          href='/auth/register'
                          className={cn(
                            'text-foreground underline underline-offset-4',
                            'hover:text-foreground/90 transition-colors',
                            'motion-reduce:transition-none',
                          )}
                        >
                          Create one
                        </Link>
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <AuthFooterLegal />
        </div>
      </section>
    </main>
  );
}
