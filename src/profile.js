// Customer profile (first/last name, phone, email) collected via the post-sign-in
// profile chat. Saved locally and, when signed in, to the Supabase `profiles` row.
import { load, save } from './storage.js';
import { supabase, cloudEnabled } from './supabase.js';

const KEY = 'profile';

// Per-user "have we collected the profile yet" flag, so we prompt once per account.
const doneKey = (userId) => `profile-complete:${userId || 'local'}`;

export function loadProfile() { return load(KEY, null); }

export function isProfileComplete(userId) {
  try { return localStorage.getItem(`cadence:${doneKey(userId)}`) === '1'; }
  catch { return false; }
}

function markComplete(userId) {
  try { localStorage.setItem(`cadence:${doneKey(userId)}`, '1'); } catch { /* ignore */ }
}

// ── validation helpers (pure, unit-testable) ─────────────────────────────────
export const isName  = (s) => typeof s === 'string' && s.trim().length >= 1 && s.trim().length <= 60;
export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
// Phone: optional leading +, 7–15 digits (E.164-ish); allow spaces/dashes/parens in input.
export const isPhone = (s) => {
  if (typeof s !== 'string') return false;
  const digits = s.replace(/[^\d+]/g, '');
  return /^\+?\d{7,15}$/.test(digits);
};
export const normalizePhone = (s) => (s || '').replace(/[^\d+]/g, '');

/**
 * Persist the collected profile. Always writes locally; upserts to Supabase when
 * a user is signed in. Returns { ok, cloud } so the UI can report what happened.
 */
export async function saveProfile(fields) {
  const profile = {
    first_name: (fields.first_name || '').trim(),
    last_name:  (fields.last_name || '').trim(),
    email:      (fields.email || '').trim(),
    phone:      normalizePhone(fields.phone),
    updatedAt:  new Date().toISOString(),
  };
  save(KEY, profile);

  let cloud = false;
  let userId = null;
  if (cloudEnabled) {
    try {
      // getSession() reads the locally-stored session (no network round-trip just
      // to read the id); the upsert itself is authenticated by the session token
      // and RLS enforces auth.uid() = user_id server-side.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        userId = user.id;
        const { error } = await supabase.from('profiles').upsert({
          user_id:      user.id,
          first_name:   profile.first_name,
          last_name:    profile.last_name,
          phone:        profile.phone,
          display_name: `${profile.first_name} ${profile.last_name}`.trim(),
        }, { onConflict: 'user_id' });
        if (error) console.warn('[profile] cloud upsert failed:', error.message);
        else cloud = true;
      }
    } catch (e) {
      console.warn('[profile] cloud save error:', e?.message || e);
    }
  }

  markComplete(userId);
  return { ok: true, cloud };
}
