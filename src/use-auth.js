// React hook + helpers for Supabase auth. Safe to import when cloud is disabled.
import React from 'react';
import { supabase, cloudEnabled } from './supabase.js';

export function useAuth() {
  const [session, setSession] = React.useState(null);
  const [ready, setReady] = React.useState(!cloudEnabled);

  React.useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setReady(true); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (alive) setSession(s);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return { session, user: session?.user || null, ready };
}

export async function signInWithGoogle() {
  if (!cloudEnabled) throw new Error('Cloud disabled — set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY');
  // Web: Supabase redirects back to current origin and stores the session.
  // Mobile (Capacitor): needs deep-link handler — see docs/SUPABASE_SETUP.md.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!cloudEnabled) return;
  await supabase.auth.signOut();
}
