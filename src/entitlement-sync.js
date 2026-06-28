// Read-only in Build 1: pull the user's entitlement row → local cache, then notify.
// Build 2's Cashfree webhook is what writes the row.
import { supabase, cloudEnabled } from './supabase.js';
import { saveEntitlement, freeEntitlement } from './entitlement.js';

export async function pullEntitlement(userId) {
  if (!cloudEnabled || !userId) return;
  const { data, error } = await supabase
    .from('entitlements')
    .select('plan, source, expires_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.warn('[entitlement] pull failed:', error.message); return; } // keep cache; never downgrade on error
  const ent = data
    ? { plan: data.plan || 'free', source: data.source || null, expiresAt: data.expires_at || null }
    : freeEntitlement();
  saveEntitlement(ent);
  try { window.dispatchEvent(new Event('cadence:entitlement-changed')); } catch { /* SSR/none */ }
}
