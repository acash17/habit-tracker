import React from 'react';
import { cellColor, legendColors } from './palette.js';
import { buildGrid, goalStats, getLevel, dayKey } from './habit-log.js';

const CELL = 13;   // px
const GAP = 3;     // px
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

// GitHub-style contribution heatmap for a single goal.
function Heatmap({ log, goalId, colorKey, weeksBack = 17 }) {
  const { weeks, monthLabels } = React.useMemo(
    () => buildGrid(log, goalId, weeksBack),
    [log, goalId, weeksBack]
  );
  const scrollRef = React.useRef(null);
  // Auto-scroll to the right edge (most recent) on mount/update.
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
  }, [weeks.length]);

  const gridWidth = weeks.length * (CELL + GAP);

  return (
    <div>
      <div
        ref={scrollRef}
        className="phone-scroll"
        style={{ overflowX: 'auto', margin: '0 -2px', paddingBottom: 2 }}
      >
        <div style={{ display: 'inline-block', minWidth: gridWidth }}>
          {/* month labels */}
          <div style={{ position: 'relative', height: 14, marginLeft: 26 }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{
                position: 'absolute', left: m.col * (CELL + GAP),
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 0.3,
                color: 'rgba(31,27,22,0.64)',
              }}>{m.label}</span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: GAP }}>
            {/* weekday labels column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, width: 22, flexShrink: 0 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} style={{
                  height: CELL, lineHeight: `${CELL}px`,
                  fontFamily: 'var(--mono)', fontSize: 8.5,
                  color: 'rgba(31,27,22,0.4)', textAlign: 'right', paddingRight: 2,
                }}>{d}</div>
              ))}
            </div>

            {/* week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    title={cell ? `${cell.date} · level ${cell.level}` : ''}
                    style={{
                      width: CELL, height: CELL, borderRadius: 3,
                      background: cell ? cellColor(colorKey, cell.level) : 'transparent',
                      outline: cell && cell.date === dayKey()
                        ? '1.5px solid var(--ink)' : 'none',
                      outlineOffset: -1,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
        fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(31,27,22,0.64)',
      }}>
        <span>Less</span>
        {legendColors(colorKey).map((c, i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 2.5, background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function StatCell({ value, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--ink)',
        letterSpacing: -0.5, lineHeight: 1, fontFeatureSettings: '"tnum"',
      }}>{value}</div>
      <div style={{
        fontSize: 9.5, color: 'rgba(31,27,22,0.64)', marginTop: 4,
        textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600,
      }}>{label}</div>
    </div>
  );
}

function HeatmapStats({ log, goalId }) {
  const s = React.useMemo(() => goalStats(log, goalId), [log, goalId]);
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '14px 8px',
      background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.08)',
      borderRadius: 14, marginTop: 12,
    }}>
      <StatCell value={s.totalEntries} label="Entries" />
      <StatCell value={s.activeDays} label="Active days" />
      <StatCell value={s.avgPerActive.toFixed(1)} label="Avg / day" />
      <StatCell value={s.streak} label="Streak" />
      <StatCell value={s.best} label="Best" />
    </div>
  );
}

// "Log today" control — tap cycles 0→1→2→3, matching intensity mode.
function LogTodayButton({ log, goalId, colorKey, onCycle }) {
  const level = getLevel(log, goalId);
  const labels = ['Mark today done', 'Logged · 1', 'Logged · 2', 'Logged · 3+'];
  return (
    <button onClick={onCycle} style={{
      width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
      border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      background: level ? cellColor(colorKey, level) : 'var(--ink)',
      color: '#fff', transition: 'all 160ms ease',
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: 4,
        background: 'rgba(255,255,255,0.9)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        color: level ? cellColor(colorKey, 3) : 'var(--ink)', fontSize: 12, fontWeight: 800,
      }}>{level || '+'}</span>
      {labels[level]}
      {level > 0 && <span style={{ opacity: 0.7, fontWeight: 400, fontSize: 13 }}>· tap to change</span>}
    </button>
  );
}

export { Heatmap, HeatmapStats, LogTodayButton };
