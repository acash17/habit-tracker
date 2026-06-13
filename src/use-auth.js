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
import { toast } from './utils.js';

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

/**
 * Clear local copies of cloud-synced data so a different account that signs in next
 * doesn't inherit the previous user's goals. Called on sign-out and on user-id change.
 */
export function clearLocalCloudCache() {
  try {
    // Wipe goals cache — bootstrap will pull fresh from cloud on next sign-in.
    localStorage.removeItem('cadence:goals');
    // Wipe every per-user bootstrap flag so the next user starts clean.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('cadence:sync-bootstrapped:')) localStorage.removeItem(k);
    }
  } catch { /* localStorage disabled — fine */ }
}

export async function signOut() {
  if (!cloudEnabled) return;
  await supabase.auth.signOut();
  clearLocalCloudCache();
  // Reload so the React tree re-reads fresh (now-default) goals from storage.
  if (typeof window !== 'undefined') window.location.reload();
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

    // PKCE flow returns `cadence://auth-callback?code=...`. We exchange the code with
    // Supabase using the PKCE verifier the client created when we called
    // signInWithOAuth — a malicious app that intercepts the same scheme can grab the
    // code but cannot exchange it without the verifier.
    //
    // Deliberately NO `#access_token=` handling: the client is PKCE-only, so a
    // token-bearing callback can only come from another app firing a forged
    // `cadence://` intent. Calling setSession() with attacker-supplied tokens
    // would silently log the user into the attacker's account (session
    // fixation), so such URLs are ignored.
    let code = null;
    try {
      const queryIdx = url.indexOf('?');
      const hashIdx  = url.indexOf('#');
      const query  = queryIdx >= 0 ? new URLSearchParams(url.slice(queryIdx + 1, hashIdx >= 0 ? hashIdx : undefined)) : new URLSearchParams();
      const hash   = hashIdx  >= 0 ? new URLSearchParams(url.slice(hashIdx + 1)) : new URLSearchParams();
      code = query.get('code');
      const errDesc = query.get('error_description') || hash.get('error_description') || query.get('error') || hash.get('error');
      if (errDesc) {
        console.warn('[auth] OAuth error:', errDesc);
        toast(`Sign-in failed · ${errDesc.slice(0, 60)}`);
      }
    } catch (e) {
      console.warn('[auth] failed to parse callback URL:', e);
      toast('Sign-in failed · could not read response');
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('[auth] exchangeCodeForSession failed:', error.message);
        toast(`Sign-in failed · ${error.message.slice(0, 60)}`);
      } else {
        toast('Signed in');
      }
    }

    try { await Browser.close(); } catch { /* already closed is fine */ }
  });
}
