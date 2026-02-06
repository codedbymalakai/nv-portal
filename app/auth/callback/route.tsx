import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getBaseUrl(request: Request) {
  const derived =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${new URL(request.url).protocol}//${new URL(request.url).host}` ||
    'http://localhost:3000';

  console.log('[auth/callback] baseUrl resolved to:', derived);
  return derived;
}

export async function GET(request: Request) {
  console.log('[auth/callback] handler invoked');

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  console.log('[auth/callback] code present?', !!code);

  if (!code) {
    console.warn('[auth/callback] no code found, skipping auth exchange');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  console.log('[auth/callback] exchanging code for session');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error);
  }

  const user = data?.user;
  console.log('[auth/callback] user returned?', !!user);

  if (!user) {
    console.warn('[auth/callback] no user on session');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  console.log('[auth/callback] user:', {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
  });

  if (!user.email || !user.id) {
    console.warn('[auth/callback] missing email or id, skipping analytics');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const createdAt = user.created_at
    ? new Date(user.created_at).getTime()
    : null;

  const lastSignInAt = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).getTime()
    : null;

  const isFirstLogin =
    createdAt !== null &&
    (lastSignInAt === null || Math.abs(createdAt - lastSignInAt) < 1000);

  console.log('[auth/callback] isFirstLogin?', isFirstLogin);

  const baseUrl = getBaseUrl(request);
  const endpoint = isFirstLogin
    ? '/api/events/firstlogin'
    : '/api/events/login';

  console.log('[auth/callback] sending analytics →', `${baseUrl}${endpoint}`);

  fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      userUuid: user.id,
      loginTimestamp: new Date().toISOString(),
    }),
  })
    .then(() => {
      console.log('[auth/callback] analytics request fired successfully');
    })
    .catch((err) => {
      console.error('[auth/callback] analytics request failed:', err);
    });

  console.log('[auth/callback] redirecting to /dashboard');

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
