'use client';

import { supabase } from './supabaseClient';

let initialized = false;

export function initAuthAnalyticsListener() {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event !== 'SIGNED_IN' || !session?.user) return;

    const user = session.user;

    const createdAt = user.created_at
      ? new Date(user.created_at).getTime()
      : null;

    const lastSignInAt = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).getTime()
      : null;

    const isFirstLogin =
      createdAt !== null &&
      (lastSignInAt === null || Math.abs(createdAt - lastSignInAt) < 1000);

    const endpoint = isFirstLogin
      ? '/api/events/firstlogin'
      : '/api/events/login';
    console.log(endpoint, 'logged');
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        userUuid: user.id,
        loginTimestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // intentionally ignored
    });
  });
}
