import React from 'react';
import { Card } from './ui.jsx';
import { useHabitLog, dayKey, dayBreakdown } from './habit-log.js';
import { cellColor, paletteHex } from './palette.js';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Raw day total → 0..3 ramp, relative to the busiest day in view.
function toLevel(total, max) {
  if (!total || max <= 0) return 0;
  return Math.max(1, Math.min(3, Math.ceil((total / max) * 3)));
}

// Build a weeks×7 grid for a given month (cells outside the month are null).
function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarMonth({ goals }) {
  const [log] = useHabitLog();
  const today = new Date();
  const [view, setView] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = React.useState(dayKey(today));

  const weeks = React.useMemo(() => monthCells(view.y, view.m), [view.y, view.m]);

  // Only surface the user's real goals — never orphan log rows (e.g. demo seed or
  // a since-deleted goal). Recompute the day total from the filtered set.
  const knownIds = React.useMemo(() => new Set(goals.map(g => g.id)), [goals]);
  const breakdown = React.useCallback((day) => {
    const filtered = dayBreakdown(log, day).goals.filter(x => knownIds.has(x.goalId));
    return { total: filtered.reduce((s, x) => s + x.level, 0), goals: filtered };
  }, [log, knownIds]);

  // Busiest day this month → ramp denominator.
  const monthMax = React.useMemo(() => {
    let max = 0;
    for (const wk of weeks) for (const d of wk) {
      if (!d) continue;
      const { total } = breakdown(dayKey(d));
      if (total > max) max = total;
    }
    return max;
  }, [weeks, breakdown]);

  const titleOf = (gid) => (goals.find(g => g.id === gid) || {}).title || 'Goal';
  const colorOf = (gid) => paletteHex((goals.find(g => g.id === gid) || {}).color);

  const sel = breakdown(selected);
  const todayKey = dayKey(today);

  function shift(delta) {
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => shift(-1)} aria-label="previous month" style={navBtn}>‹</button>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--ink)', letterSpacing: -0.2 }}>
          {MONTHS[view.m]} {view.y}
        </div>
        <button onClick={() => shift(1)} aria-label="next month" style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(31,27,22,0.4)' }}>{l}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dayKey(d);
          const { total } = breakdown(k);
          const lvl = toLevel(total, monthMax);
          const isSel = k === selected;
          const isToday = k === todayKey;
          return (
            <button key={i} onClick={() => setSelected(k)} aria-label={k} style={{
              aspectRatio: '1', borderRadius: 8, cursor: 'pointer', padding: 0,
              border: isSel ? '1.5px solid var(--ink)' : isToday ? '1px solid var(--terra)' : '0.5px solid rgba(31,27,22,0.06)',
              background: lvl ? cellColor('terracotta', lvl) : 'var(--paper-2)',
              color: lvl >= 2 ? '#fff' : 'rgba(31,27,22,0.7)',
              fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{d.getDate()}</button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, borderTop: '0.5px solid rgba(31,27,22,0.08)', paddingTop: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.6, color: 'rgba(31,27,22,0.64)', marginBottom: 8 }}>
          {selected}
        </div>
        {sel.goals.length === 0 ? (
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.5)' }}>Nothing logged this day.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sel.goals.map(({ goalId, level }) => (
              <div key={goalId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(goalId) }} />
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>{titleOf(goalId)}</span>
                <span style={{ display: 'flex', gap: 3 }}>
                  {[1, 2, 3].map(n => (
                    <span key={n} style={{ width: 6, height: 6, borderRadius: 999, background: n <= level ? 'var(--terra)' : 'rgba(31,27,22,0.12)' }} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

const navBtn = {
  width: 30, height: 30, borderRadius: 999, cursor: 'pointer',
  border: '0.5px solid rgba(31,27,22,0.12)', background: 'var(--card)',
  color: 'var(--ink)', fontSize: 16, lineHeight: 1,
};

Object.assign(window, { CalendarMonth });
export { CalendarMonth as default };
