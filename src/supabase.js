// Supabase client. Returns null if env vars aren't set so the app keeps
// running in local-only mode (every cloud helper short-circuits when null).
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (URL && ANON)
  ? createClient(URL, ANON, {
      auth: {
        // PKCE flow: callback URL carries `?code=` (not tokens). Client exchanges the
        // code using a PKCE verifier known only to this app instance. This neutralises
        // the deep-link hijack risk on Android/iOS where the `cadence://` scheme can
        // technically be claimed by another installed app — a hijacker who intercepts
        // the code cannot exchange it without the verifier.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles OAuth callback ?code= on web
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'cadence-sb-auth',
      },
    })
  : null;

export const cloudEnabled = !!supabase;
