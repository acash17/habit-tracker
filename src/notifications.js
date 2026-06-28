// On-device daily reminder via @capacitor/local-notifications.
// Everything is scheduled locally on the phone — no server, no API, no data leaves
// the device. All functions are safe no-ops on web (plugin dynamic-imported and
// native-guarded) so the web build never breaks.
import { Capacitor } from '@capacitor/core';
import { load, save } from './storage.js';
import { goalReminderId, buildGoalSchedule } from './reminder-schedule.js';

const KEY = 'reminder';
const NOTIF_ID = 1001; // single repeating daily reminder

export function isNativeNotify() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function getReminder() {
  return load(KEY, { enabled: false, hour: 9, minute: 0 });
}
export function saveReminder(r) { save(KEY, r); }

// Dynamic import keeps the plugin out of the web bundle (native-only weight).
async function ln() {
  const m = await import('@capacitor/local-notifications');
  return m.LocalNotifications;
}

export async function ensurePermission() {
  if (!isNativeNotify()) return false;
  try {
    const LN = await ln();
    let p = await LN.checkPermissions();
    if (p.display !== 'granted') p = await LN.requestPermissions();
    return p.display === 'granted';
  } catch (e) { console.warn('[notify] permission check failed:', e?.message || e); return false; }
}

async function scheduleDaily(hour, minute) {
  if (!isNativeNotify()) return false;
  try {
    const LN = await ln();
    await LN.cancel({ notifications: [{ id: NOTIF_ID }] });
    await LN.schedule({
      notifications: [{
        id: NOTIF_ID,
        title: 'Pacely',
        body: 'A gentle nudge — open today’s plan and take one small step. 🌱',
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
      }],
    });
    return true;
  } catch (e) { console.warn('[notify] schedule failed:', e?.message || e); return false; }
}

async function cancelDaily() {
  if (!isNativeNotify()) return;
  try { const LN = await ln(); await LN.cancel({ notifications: [{ id: NOTIF_ID }] }); }
  catch (e) { console.warn('[notify] cancel failed:', e?.message || e); }
}

// Turn the reminder on at a given time. Returns {ok} or {ok:false, reason}.
export async function enableReminder(hour, minute) {
  if (!isNativeNotify()) { saveReminder({ enabled: true, hour, minute }); return { ok: true, native: false }; }
  const granted = await ensurePermission();
  if (!granted) return { ok: false, reason: 'permission' };
  await scheduleDaily(hour, minute);
  saveReminder({ enabled: true, hour, minute });
  return { ok: true, native: true };
}

export async function disableReminder() {
  await cancelDaily();
  const r = getReminder();
  saveReminder({ ...r, enabled: false });
}

// Reschedule on app launch so the reminder survives reinstalls of the schedule.
export async function rescheduleOnLaunch() {
  const r = getReminder();
  if (r.enabled && isNativeNotify()) {
    if (await ensurePermission()) await scheduleDaily(r.hour, r.minute);
  }
}

// ── Per-goal due-day reminders (Monthly/Yearly) ───────────────────────────────
// Schedules a recurring local notification for one goal. Native-only; on web this is
// a no-op. Always cancels the goal's existing alarm first so edits don't stack.
export async function applyGoalReminder(goal, reminder) {
  if (!isNativeNotify()) return;
  try {
    const LN = await ln();
    const id = goalReminderId(goal.id);
    await LN.cancel({ notifications: [{ id }] });
    const schedule = buildGoalSchedule(goal.cadence, reminder);
    if (!schedule) return; // off, or non monthly/yearly → cancel only
    if (!(await ensurePermission())) return;
    await LN.schedule({
      notifications: [{ id, title: 'Pacely', body: `${goal.title} is due today.`, schedule }],
    });
  } catch (e) { console.warn('[notify] goal reminder failed:', e?.message || e); }
}

// Re-arm every per-goal reminder on launch (alarms otherwise reset on reinstall).
export async function rescheduleGoalReminders(goals, reminders) {
  if (!isNativeNotify()) return;
  for (const g of goals || []) await applyGoalReminder(g, (reminders || {})[g.id]);
}
