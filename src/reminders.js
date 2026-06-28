// Per-device reminder store, keyed by goalId: cadence:reminders = { [goalId]: reminder }.
// Kept separate from the goal object so it needs no Supabase column and survives the
// cloud-goal replacement that happens on sign-in. Notifications are per-device anyway.
import { load, save } from './storage.js';

const KEY = 'reminders';

export function loadReminders() { return load(KEY, {}); }

export function getReminder(goalId) { return loadReminders()[goalId]; }

// reminder === null/undefined deletes the key.
export function setReminder(goalId, reminder) {
  const all = loadReminders();
  if (reminder == null) delete all[goalId];
  else all[goalId] = reminder;
  save(KEY, all);
}

export function removeReminder(goalId) { setReminder(goalId, null); }
