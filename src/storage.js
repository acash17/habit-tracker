// Tiny persistence layer. Uses localStorage which is available natively in
// Capacitor WebView on both Android and iOS — no plugin needed.
import React from 'react';

const PREFIX = 'cadence:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or disabled — silently ignore */
  }
}

export function clear(key) {
  try { localStorage.removeItem(PREFIX + key); } catch {}
}

export function clearAll() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
}

/**
 * React hook: state synced to localStorage under `cadence:<key>`.
 * Lazy initializer reads on mount; effect writes on every change.
 */
export function usePersistedState(key, initial) {
  const [value, setValue] = React.useState(() => load(key, typeof initial === 'function' ? initial() : initial));
  React.useEffect(() => { save(key, value); }, [key, value]);
  return [value, setValue];
}

export function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function setLastActiveDate(dateStr) {
  save('lastActive', dateStr);
}

// Returns how many days the user skipped before today.
// 0 = active today or yesterday; 1 = skipped yesterday; 2 = skipped two days; etc.
export function missedDayCount() {
  const last = load('lastActive', null);
  if (!last) return 0;
  const today = dayKey();
  if (last >= today) return 0;
  const diff = Math.round(
    (new Date(today + 'T12:00:00') - new Date(last + 'T12:00:00')) / 86400000
  );
  return Math.max(0, diff - 1);
}
