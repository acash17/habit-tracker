// React hook + helpers for Supabase auth.
// Two flows behind one signInWithGoogle() call:
//   - Web:     Supabase redirects the current tab; detectSessionInUrl picks the token up on return.
//   - Native:  open the Google URL in @capacitor/browser, listen for the `cadence://auth-callback`
//              deep link, parse tokens from the hash, call supabase.auth.setSession(...).
//
// initNativeAuthHandler() must be invoked ONCE from the app entry (main.jsx) on native
// platforms so the deep-link listener is armed before the user taps Sign-in.
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase, cloudEnabled } from './supabase.js';

// Custom scheme registered in AndroidManifest + iOS Info.plist + Capacitor config.
// Must also be added to Supabase's Auth → URL Configuration → Redirect URLs allowlist.
const NATIVE_CALLBACK = 'cadence://auth-callback';

function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

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

  if (isNative()) {
    // Dynamic import keeps the web bundle slim (Browser plugin is native-only weight).
    const { Browser } = await import('@capacitor/browser');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: NATIVE_CALLBACK,
        skipBrowserRedirect: true, // we open it ourselves so the app stays alive
      },
    });
    if (error) throw error;
    if (data?.url) {
      await Browser.open({ url: data.url, presentationStyle: 'popover', windowName: '_self' });
    }
    return data;
  }

  // Web
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

/**
 * Arm the native deep-link handler. Idempotent; safe to call on web (no-op).
 * Call from main.jsx BEFORE the React tree mounts so we don't race the first
 * redirect after sign-in.
 */
let nativeHandlerInstalled = false;
export async function initNativeAuthHandler() {
  if (!cloudEnabled) return;
  if (!isNative()) return;
  if (nativeHandlerInstalled) return;
  nativeHandlerInstalled = true;

  const { App } = await import('@capacitor/app');
  const { Browser } = await import('@capacitor/browser');

  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url || typeof url !== 'string') return;
    if (!url.startsWith(NATIVE_CALLBACK)) return;

    // Supabase returns tokens in the URL fragment: `cadence://auth-callback#access_token=...&refresh_token=...&expires_in=...`
    // Some providers/paths use ?query instead — handle both.
    let access_token = null;
    let refresh_token = null;
    try {
      const hashIdx = url.indexOf('#');
      const queryIdx = url.indexOf('?');
      const raw = hashIdx >= 0 ? url.slice(hashIdx + 1)
                 : queryIdx >= 0 ? url.slice(queryIdx + 1)
                 : '';
      const params = new URLSearchParams(raw);
      access_token  = params.get('access_token');
      refresh_token = params.get('refresh_token');
      const errDesc = params.get('error_description') || params.get('error');
      if (errDesc) console.warn('[auth] OAuth error:', errDesc);
    } catch (e) {
      console.warn('[auth] failed to parse callback URL:', e);
    }

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) console.warn('[auth] setSession failed:', error.message);
    }

    try { await Browser.close(); } catch { /* already closed is fine */ }
  });
}
