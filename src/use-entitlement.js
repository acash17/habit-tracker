// Shared entitlement store so all gates re-render together when it changes.
import React from 'react';
import { loadEntitlement, isPro } from './entitlement.js';

let _ent = null;
const _subs = new Set();
function _init() { if (_ent === null) _ent = loadEntitlement(); return _ent; }

export function getEntitlementSnapshot() { return _init(); }
export function subscribeEntitlement(fn) { _subs.add(fn); return () => _subs.delete(fn); }

// Re-read the cache (call after a pull/unlock) and notify gates.
export function refreshEntitlement() {
  _ent = loadEntitlement();
  _subs.forEach((fn) => fn());
}

// Non-React code (sync layer) dispatches this after caching a fresh entitlement.
if (typeof window !== 'undefined') {
  window.addEventListener('cadence:entitlement-changed', refreshEntitlement);
}

export function useEntitlement() {
  const ent = React.useSyncExternalStore(subscribeEntitlement, getEntitlementSnapshot, getEntitlementSnapshot);
  return { ent, pro: isPro(ent) };
}
