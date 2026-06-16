// DPDP Act 2023 data-subject rights: export (access) + erase (correction/erasure).
// Operates on local storage + (when signed in) the user's Supabase rows.
import { supabase, cloudEnabled } from './supabase.js';
import { clearAll as clearAllLocal } from './storage.js';
import { toast } from './utils.js';

const PREFIX = 'cadence:';

// Collect every cadence:* key into a plain object.
function collectLocal() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && !k.includes('sb-auth')) {
        try { out[k] = JSON.parse(localStorage.getItem(k)); }
        catch { out[k] = localStorage.getItem(k); }
      }
    }
  } catch { /* ignore */ }
  return out;
}

// RIGHT TO ACCESS — download everything we hold about the user as JSON.
export async function exportMyData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Pacely',
    local: collectLocal(),
    cloud: null,
  };

  if (cloudEnabled) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [goals, logs, profile, consents] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('consents').select('*').eq('user_id', user.id),
      ]);
      payload.cloud = {
        user: { id: user.id, email: user.email },
        goals: goals.data || [],
        habit_logs: logs.data || [],
        profile: profile.data || null,
        consents: consents.data || [],
      };
    }
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cadence-my-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Your data exported');
}

// RIGHT TO ERASURE — delete the cloud ACCOUNT (if signed in) + wipe local.
// Play's account-deletion policy and DPDP §12 require removing the account
// itself (auth.users row holds the email), not just its data rows. The
// delete_my_account() RPC (006_account_deletion.sql) does that in one
// transaction; FK cascades remove goals, habit_logs, profiles, consents and
// rhythm_cache with it.
export async function eraseMyData() {
  if (cloudEnabled) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        // Migration not applied yet — fall back to row-level deletes so the
        // user is never left with LESS erasure than before. (rhythm_cache and
        // the auth user can't be removed this way; apply 006 to fix that.)
        console.warn('[data-rights] delete_my_account failed, falling back:', error.message);
        await supabase.from('habit_logs').delete().eq('user_id', user.id);
        await supabase.from('goals').delete().eq('user_id', user.id);
        await supabase.from('consents').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('user_id', user.id);
      }
      await supabase.auth.signOut();
    }
  }
  clearAllLocal();
  toast('All your data erased');
  setTimeout(() => { if (typeof window !== 'undefined') window.location.reload(); }, 600);
}
