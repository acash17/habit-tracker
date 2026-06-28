// Pure entitlement logic + a local cache. No network, no React.
import { load, save } from './storage.js';

export const FREE_GOAL_LIMIT = 3;
const KEY = 'entitlement';

export function freeEntitlement() {
  return { plan: 'free', source: null, expiresAt: null };
}

export function isPro(ent, now = Date.now()) {
  if (!ent || ent.plan !== 'pro') return false;
  if (!ent.expiresAt) return true;            // lifetime
  return Date.parse(ent.expiresAt) > now;     // annual / timed
}

export function goalLimitReached(count, ent) {
  return !isPro(ent) && count >= FREE_GOAL_LIMIT;
}

export function loadEntitlement() {
  const e = load(KEY, null);
  return e && e.plan ? e : freeEntitlement();
}

export function saveEntitlement(ent) { save(KEY, ent); }
