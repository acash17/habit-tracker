// Pure: turn today's timeline blocks into the daily-reminder notification body.
// Native notifications can't read live state at fire time, so the daily reminder is
// re-scheduled with a fresh body on each app launch (rescheduleOnLaunch) — the body
// reflects the plan as of the last time the app was opened.

const MAX_LABEL = 24;

function clip(s) {
  const t = String(s || '').trim();
  return t.length > MAX_LABEL ? t.slice(0, MAX_LABEL - 1) + '…' : t;
}

export function dailyReminderBody(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  if (list.length === 0) return 'A clean slate — open Pacely and plan your day. 🌱';
  const undone = list.filter((b) => !b.done);
  if (undone.length === 0) return 'All done today — nice work. 🌿';
  const names = undone.slice(0, 2).map((b) => clip(b.label)).join(', ');
  const more = undone.length > 2 ? ' …' : '';
  return `${undone.length} left today: ${names}${more}`;
}
