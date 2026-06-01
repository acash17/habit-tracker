// ICS (RFC 5545) generation. Pure — no DOM, no platform. Testable.
// Timeline blocks carry startMin (minutes from midnight) + dur (minutes).
// Goals carry cadence (daily/weekly/monthly/oneoff) → RRULE.

function pad(n) { return String(n).padStart(2, '0'); }

// Local "floating" timestamp (no Z) so the event lands at the user's wall clock.
function fmtLocal(d) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
// UTC stamp for DTSTAMP / UID freshness.
function fmtUTC(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// RFC5545 text escaping for SUMMARY/DESCRIPTION values.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Fold lines longer than 75 octets per spec (continuation lines start with a space).
function fold(line) {
  if (line.length <= 75) return line;
  const out = [];
  let i = 0;
  out.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) { out.push(' ' + line.slice(i, i + 74)); i += 74; }
  return out.join('\r\n');
}

function uid(seed) {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@cadence.app`;
}

const RRULE = {
  daily:   'FREQ=DAILY',
  weekly:  'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
};

// Build one VEVENT. opts: { uidSeed, start:Date, durMin, summary, description, rrule, alarmMin }
function vevent({ uidSeed, start, durMin, summary, description, rrule, alarmMin = 10 }) {
  const end = new Date(start.getTime() + durMin * 60000);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid(uidSeed)}`,
    `DTSTAMP:${fmtUTC(new Date())}`,
    `DTSTART:${fmtLocal(start)}`,
    `DTEND:${fmtLocal(end)}`,
    fold(`SUMMARY:${esc(summary)}`),
  ];
  if (description) lines.push(fold(`DESCRIPTION:${esc(description)}`));
  if (rrule) lines.push(`RRULE:${rrule}`);
  if (alarmMin != null) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${alarmMin}M`, 'DESCRIPTION:Reminder', 'END:VALARM');
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function wrap(events) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadence//Habit Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

// A Date at `date` (defaults today) with given minutes-from-midnight.
function atMinute(startMin, date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(startMin);
  return d;
}

// ── Public builders ───────────────────────────────────────────────────────────

// Whole Today timeline → one ICS with N events (no recurrence; concrete day).
export function blocksToICS(blocks, date = new Date()) {
  const events = blocks.map((b, i) => vevent({
    uidSeed: b.id || `block${i}`,
    start: atMinute(b.startMin, date),
    durMin: b.dur || 30,
    summary: b.label || 'Cadence block',
    description: [b.goalTitle, b.why].filter(Boolean).join(' — '),
    alarmMin: 5,
  }));
  return wrap(events);
}

// One goal → a (possibly recurring) event. Sub-habits become the description.
// Goals lack a clock time, so default to 9:00 and span the total estimate.
export function goalToICS(goal, opts = {}) {
  const startHour = opts.startHour ?? 9;
  const totalMin = (goal.sequence || []).reduce((s, x) => s + (x.est || 0), 0) || 30;
  const start = atMinute(startHour * 60);
  const steps = (goal.sequence || []).map((s, i) => `${i + 1}. ${s.label} (${s.est}m)`).join('\n');
  const rrule = RRULE[goal.cadence] && goal.recurring ? RRULE[goal.cadence] : (RRULE[goal.cadence] || null);
  return wrap([vevent({
    uidSeed: goal.id || 'goal',
    start,
    durMin: totalMin,
    summary: goal.title || 'Cadence goal',
    description: steps,
    rrule,
    alarmMin: 10,
  })]);
}

export function icsFilename(name) {
  const safe = (name || 'cadence').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${safe || 'cadence'}.ics`;
}
