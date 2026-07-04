// Direct calendar write (native only). Requests the OS calendar write
// permission, then inserts one event per timed step with a reminder alarm —
// no share sheet, no manual import. Callers fall back to the ICS export
// (calendar-export.js) when this returns not-ok, so web and permission-denied
// paths still work. Never throws.
import { Capacitor } from '@capacitor/core';

export function nativeCalendarAvailable() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// blocks → plugin createEvent() option objects. Pure and testable: resolves
// each block's minutes-from-midnight against `date` into epoch-ms start/end.
export function blocksToCalendarEvents(blocks, date = new Date(), alertMin = 5) {
  return (blocks || []).map((b) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(b.startMin || 0);
    const durMin = Math.max(1, b.dur || 30);
    const startMs = start.getTime();
    const notes = [b.goalTitle, b.why].filter(Boolean).join(' — ');
    return {
      title: b.label || 'Pacely task',
      startDate: startMs,
      endDate: startMs + durMin * 60000,
      alertOffsetInMinutes: alertMin,
      ...(notes ? { notes } : {}),
    };
  });
}

// Requests permission and writes every block as a calendar event.
// Returns { ok, added, reason }:
//   reason 'unavailable' → not native / plugin missing → caller uses ICS
//   reason 'denied'      → user declined the permission prompt
//   reason 'ok'|'error'  → attempted; `added` counts successful inserts
export async function addPlanToCalendar(blocks, date = new Date()) {
  if (!nativeCalendarAvailable()) return { ok: false, added: 0, reason: 'unavailable' };

  let plugin;
  try {
    ({ CapacitorCalendar: plugin } = await import('@ebarooni/capacitor-calendar'));
  } catch {
    return { ok: false, added: 0, reason: 'unavailable' };
  }

  try {
    const { result } = await plugin.requestWriteOnlyCalendarAccess();
    if (result !== 'granted') return { ok: false, added: 0, reason: 'denied' };

    const events = blocksToCalendarEvents(blocks, date);
    let added = 0;
    for (const ev of events) {
      try { await plugin.createEvent(ev); added += 1; }
      catch { /* skip a single bad event, keep going */ }
    }
    return { ok: added > 0, added, reason: added ? 'ok' : 'error' };
  } catch (e) {
    return { ok: false, added: 0, reason: 'error', error: e?.message };
  }
}
