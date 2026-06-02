// Rhythm insights — turn the `rhythm_by_hour` RPC's sparse (dow, hour, total)
// buckets into a 7×8 day×bin matrix and derive peak / laziest callouts.
//
// Bins: 8 three-hour slots starting at 6am (matches the prototype's BINS):
//   0=6–9a 1=9–12 2=12–3p 3=3–6p 4=6–9p 5=9p–12a 6=12–3a 7=3–6a
// Rows: Mon..Sun (Mon=0), remapped from Postgres extract(dow) (0=Sun..6=Sat).
import { supabase, cloudEnabled } from './supabase.js';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const BINS = ['6a', '9a', '12p', '3p', '6p', '9p', '12a', '3a'];
const WAKING_BINS = 6; // bins 0..5 cover 6am–midnight; 6,7 are night

const BIN_LABELS = ['6–9am', '9am–12pm', '12–3pm', '3–6pm', '6–9pm', '9pm–12am', '12–3am', '3–6am'];
export function binLabel(b) { return BIN_LABELS[b] || BINS[b]; }

// 0..23 → 0..7. 6am is the day's start, then 3-hour steps wrapping past midnight.
export function hourToBin(hour) {
  return Math.floor(((hour - 6 + 24) % 24) / 3);
}

// Postgres dow (0=Sun..6=Sat) → matrix row (Mon=0..Sun=6).
export function dowToRow(dow) {
  return (dow + 6) % 7;
}

// [{dow, hour, total}] (sparse) → dense 7×8 matrix of summed totals.
export function bucketsToMatrix(buckets) {
  const m = Array.from({ length: 7 }, () => Array(8).fill(0));
  for (const b of buckets || []) {
    m[dowToRow(b.dow)][hourToBin(b.hour)] += Number(b.total) || 0;
  }
  return m;
}

// Peak (busiest waking bin), laziest (quietest waking bin), peak day.
// Peak/laziest only consider bins 0..5 so a dead 3am never wins "laziest".
export function deriveRhythmStats(matrix) {
  const binTotals = BINS.map((_, b) => matrix.reduce((s, row) => s + row[b], 0));
  let peakBin = 0, peakV = -1, lazyBin = 0, lazyV = Infinity;
  for (let b = 0; b < WAKING_BINS; b++) {
    if (binTotals[b] > peakV) { peakV = binTotals[b]; peakBin = b; }
    if (binTotals[b] < lazyV) { lazyV = binTotals[b]; lazyBin = b; }
  }
  const dayTotals = matrix.map(row => row.reduce((a, c) => a + c, 0));
  const peakDay = dayTotals.indexOf(Math.max(...dayTotals));
  const hasData = binTotals.some(v => v > 0) || dayTotals.some(v => v > 0);
  return { peakDay, peakBin, lazyBin, hasData };
}

function resolveTz(tz) {
  if (tz) return tz;
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

// Full live aggregation of the signed-in user's rows (security definer +
// auth.uid() in the RPC). Used for new users and as a fallback before the first
// nightly precompute has run.
async function liveRhythm(p_tz) {
  const { data, error } = await supabase.rpc('rhythm_by_hour', { p_tz });
  if (error) { console.warn('[rhythm] rpc failed:', error.message); return null; }
  return data;
}

// Hybrid read: precomputed nightly cache (rhythm_cache) + today's live delta.
// The nightly job aggregates everything up to its run time (stamped on each cache
// row's updated_at); we add only the rows logged since then, so the view is both
// cheap and always fresh. bucketsToMatrix sums the concatenated buckets.
export async function getRhythm(tz) {
  if (!cloudEnabled) return null;
  const p_tz = resolveTz(tz);

  const { data: cache, error: cacheErr } = await supabase
    .from('rhythm_cache')
    .select('dow, hour, total, updated_at');

  // No cache yet (new user, or job hasn't run) — compute everything live.
  if (cacheErr || !cache || cache.length === 0) return liveRhythm(p_tz);

  const cutoff = cache.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), cache[0].updated_at);
  const { data: delta, error: deltaErr } = await supabase
    .rpc('rhythm_by_hour', { p_tz, p_since: cutoff });
  if (deltaErr) { console.warn('[rhythm] delta rpc failed:', deltaErr.message); return cache; }

  return [...cache, ...(delta || [])]; // [{ dow, hour, total }] — summed by bucketsToMatrix
}
