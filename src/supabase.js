// Supabase client. Returns null if env vars aren't set so the app keeps
// running in local-only mode (every cloud helper short-circuits when null).
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (URL && ANON)
  ? createClient(URL, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles OAuth callback ?code=... on web
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'cadence-sb-auth',
      },
    })
  : null;

export const cloudEnabled = !!supabase;
