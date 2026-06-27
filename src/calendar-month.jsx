import React from 'react';
import { Card, Icon } from './ui.jsx';
import { useHabitLog, dayKey, dayBreakdown } from './habit-log.js';
import { cellColor, paletteHex } from './palette.js';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const HEAT_LABEL = { 1: 'Started', 2: 'Halfway', 3: 'Complete' };

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

function friendlyDate(k, todayKey) {
  if (k === todayKey) return 'Today';
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function CalendarMonth({ goals }) {
  const [log] = useHabitLog();
  const today = new Date();
  const todayKey = dayKey(today);
  const [view, setView] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = React.useState(todayKey);

  const weeks = React.useMemo(() => monthCells(view.y, view.m), [view.y, view.m]);

  // Only surface the user's real goals — never orphan log rows (e.g. demo seed or
  // a since-deleted goal). Recompute the day total from the filtered set.
  const knownIds = React.useMemo(() => new Set(goals.map(g => g.id)), [goals]);
  const breakdown = React.useCallback((day) => {
    const filtered = dayBreakdown(log, day).goals.filter(x => knownIds.has(x.goalId));
    return { total: filtered.reduce((s, x) => s + x.level, 0), goals: filtered };
  }, [log, knownIds]);

  // Busiest day → ramp denominator; active-day count → the header summary.
  const { monthMax, activeDays } = React.useMemo(() => {
    let max = 0, active = 0;
    for (const wk of weeks) for (const d of wk) {
      if (!d) continue;
      const { total } = breakdown(dayKey(d));
      if (total > 0) active++;
      if (total > max) max = total;
    }
    return { monthMax: max, activeDays: active };
  }, [weeks, breakdown]);

  const titleOf = (gid) => (goals.find(g => g.id === gid) || {}).title || 'Goal';
  const colorOf = (gid) => paletteHex((goals.find(g => g.id === gid) || {}).color);

  const sel = breakdown(selected);
  const selFuture = selected > todayKey;

  function shift(delta) {
    setView(v => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <Card style={{ padding: 18 }}>
      {/* Header: eyebrow + serif month, soft pill nav */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 3 }}>
            {activeDays === 0 ? 'No activity yet' : `${activeDays} active day${activeDays === 1 ? '' : 's'}`}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 21, color: 'var(--ink)', letterSpacing: -0.3, lineHeight: 1.1 }}>
            {MONTHS[view.m]} <span style={{ color: 'rgba(31,27,22,0.45)' }}>{view.y}</span>
          </div>
        </div>
        <div style={{ display: 'inline-flex', gap: 4, background: 'var(--paper-2)', borderRadius: 999, padding: 3, border: '0.5px solid rgba(31,27,22,0.07)' }}>
          <NavBtn dir="prev" onClick={() => shift(-1)} />
          <NavBtn dir="next" onClick={() => shift(1)} />
        </div>
      </div>

      {/* Weekday rail */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 7 }}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 0.5, color: 'rgba(31,27,22,0.35)' }}>{l}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const k = dayKey(d);
          const { total } = breakdown(k);
          const lvl = toLevel(total, monthMax);
          const isSel = k === selected;
          const isToday = k === todayKey;
          const future = k > todayKey;
          const filled = lvl > 0;
          return (
            <button
              key={i}
              onClick={() => setSelected(k)}
              aria-label={k}
              aria-pressed={isSel}
              style={{
                position: 'relative', aspectRatio: '1', borderRadius: 11, cursor: 'pointer', padding: 0,
                background: filled ? cellColor('terracotta', lvl) : 'var(--paper-2)',
                border: isSel
                  ? '1.5px solid var(--ink)'
                  : filled ? '0.5px solid rgba(200,96,47,0.18)' : '0.5px solid rgba(31,27,22,0.05)',
                color: lvl >= 2 ? '#fff' : future ? 'rgba(31,27,22,0.28)' : 'rgba(31,27,22,0.66)',
                fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: isToday ? 700 : 400,
                fontFeatureSettings: '"tnum"', lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isSel ? '0 4px 12px -4px rgba(31,27,22,0.22)' : 'none',
                transition: 'transform 140ms ease, box-shadow 160ms ease, background 220ms ease',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.9)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              {d.getDate()}
              {/* today marker — a dot under the numeral, hidden once selected ring is on */}
              {isToday && !isSel && (
                <span style={{
                  position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                  width: 4, height: 4, borderRadius: 999,
                  background: lvl >= 2 ? '#fff' : 'var(--terra)',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(31,27,22,0.4)' }}>less</span>
        {[0, 1, 2, 3].map(l => (
          <span key={l} style={{
            width: 10, height: 10, borderRadius: 3,
            background: l === 0 ? 'var(--paper-2)' : cellColor('terracotta', l),
            border: l === 0 ? '0.5px solid rgba(31,27,22,0.08)' : 'none',
          }} />
        ))}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(31,27,22,0.4)' }}>more</span>
      </div>

      {/* Selected-day detail */}
      <div key={selected} style={{ marginTop: 14, borderTop: '0.5px solid rgba(31,27,22,0.08)', paddingTop: 14, animation: 'fadein 220ms ease' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)', letterSpacing: -0.2 }}>
            {friendlyDate(selected, todayKey)}
          </div>
          {sel.goals.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.5)' }}>
              {sel.goals.length} goal{sel.goals.length === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {sel.goals.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            background: 'var(--paper-2)', borderRadius: 12, fontSize: 13, color: 'rgba(31,27,22,0.5)',
          }}>
            <Icon name="leaf" size={15} color="rgba(31,27,22,0.3)" />
            {selFuture ? 'Nothing planned here yet.' : 'A quiet day — nothing logged.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sel.goals.map(({ goalId, level }) => (
              <div key={goalId} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 12,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: 999, background: colorOf(goalId), flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', letterSpacing: -0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {titleOf(goalId)}
                </span>
                <span style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11.5, fontWeight: 600, color: 'var(--terra)',
                  padding: '3px 9px', borderRadius: 999, background: 'rgba(200,96,47,0.10)',
                }}>
                  <span style={{ display: 'flex', gap: 2.5 }}>
                    {[1, 2, 3].map(n => (
                      <span key={n} style={{ width: 5, height: 5, borderRadius: 999, background: n <= level ? 'var(--terra)' : 'rgba(200,96,47,0.25)' }} />
                    ))}
                  </span>
                  {HEAT_LABEL[level]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function NavBtn({ dir, onClick }) {
  return (
    <button onClick={onClick} aria-label={dir === 'prev' ? 'previous month' : 'next month'} style={{
      width: 30, height: 30, borderRadius: 999, cursor: 'pointer', padding: 0,
      border: 'none', background: 'transparent', color: 'rgba(31,27,22,0.7)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 140ms ease',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ display: 'inline-flex', transform: dir === 'prev' ? 'rotate(180deg)' : 'none' }}>
        <Icon name="chev" size={15} />
      </span>
    </button>
  );
}

Object.assign(window, { CalendarMonth });
export { CalendarMonth as default };
