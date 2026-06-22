import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';
import { newId } from './utils.js';
import { PALETTE, paletteHex, cellColor } from './palette.js';
import { Heatmap, HeatmapStats, LogTodayButton } from './heatmap.jsx';
import { useHabitLog, cycleLevel, buildGrid, getLevel, dayKey } from './habit-log.js';
import { goalToICS, icsFilename } from './calendar.js';
import { exportICS } from './calendar-export.js';
import { useAuth } from './use-auth.js';
import { syncCellToCloud } from './cloud-sync.js';

// Goals / Library — list + inline detail navigation.
// Tap a card → drill into a full goal detail page inside the same tab.
// Inside detail, paginate left/right between goals. No overlay sheet.

const CADENCE_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', oneoff: 'Project' };

// ── List view ────────────────────────────────────────────────────────────────

function GoalCard({ g, onOpen, log }) {
  const done = g.sequence.filter(s => s.done).length;
  const total = g.sequence.length;
  const mins = g.sequence.reduce((s, x) => s + x.est, 0);
  const c = paletteHex(g.color);
  const cad = g.cadence || 'oneoff';
  const complete = total > 0 && done === total;   // all sub-habits done
  const started  = done > 0;
  return (
    <Card onClick={onOpen} style={{ padding: 18, cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: c }} />
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', fontWeight: 500 }}>{g.deadline}</div>
            <div style={{
              fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999,
              background: cad === 'oneoff' ? 'rgba(31,27,22,0.06)' : 'rgba(107,142,90,0.12)',
              color: cad === 'oneoff' ? 'rgba(31,27,22,0.55)' : 'var(--sage)',
            }}>
              {CADENCE_LABEL[cad]}{g.recurring ? ' · ↻' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            {complete && <Icon name="check" size={16} color="var(--sage)" />}
            <div style={{
              fontFamily: 'var(--serif)', fontSize: 20,
              color: complete ? 'rgba(31,27,22,0.55)' : 'var(--ink)',
              lineHeight: 1.15, letterSpacing: -0.3,
            }}>{g.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip tone="paper">{total} sub-habit{total === 1 ? '' : 's'}</Chip>
            <Chip tone="paper">{mins}m total</Chip>
            {/* Clear completion status so users know what's done vs not */}
            {complete ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--sage)', color: '#fff' }}>
                <Icon name="check" size={12} color="#fff" /> Done
              </span>
            ) : started ? (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'rgba(194,106,56,0.12)', color: 'var(--terra)' }}>
                In progress · {done}/{total}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'rgba(31,27,22,0.06)', color: 'rgba(31,27,22,0.64)' }}>
                Not started
              </span>
            )}
          </div>
        </div>
        <Icon name="chev" size={18} color="rgba(31,27,22,0.3)"/>
      </div>

      {/* compact heatmap (last ~10 weeks) */}
      {log && <MiniHeatmap log={log} goalId={g.id} colorKey={g.color} />}
    </Card>
  );
}

// Small read-only heatmap strip for list cards (~10 weeks, no labels).
function MiniHeatmap({ log, goalId, colorKey }) {
  const { weeks } = React.useMemo(() => buildGrid(log, goalId, 10), [log, goalId]);
  const C = 9, G = 2.5;
  return (
    <div style={{ display: 'flex', gap: G, marginTop: 14, overflow: 'hidden' }}>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: G }}>
          {week.map((cell, di) => (
            <div key={di} style={{
              width: C, height: C, borderRadius: 2,
              background: cell ? cellColor(colorKey, cell.level) : 'transparent',
            }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Sub-habit row (used inside detail) ───────────────────────────────────────

function SubHabitRow({ s, color, onChange, onDelete, onMoveUp, onMoveDown, canUp, canDown }) {
  const [editing, setEditing] = React.useState(s.label === '');
  const ref = React.useRef(null);
  React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: s.done ? 'rgba(107,142,90,0.08)' : 'var(--card)',
      border: `0.5px solid ${s.done ? 'rgba(107,142,90,0.3)' : 'rgba(31,27,22,0.08)'}`,
      borderRadius: 12,
      transition: 'background 200ms ease, border-color 200ms ease',
    }}>
      <button
        onClick={() => onChange({ ...s, done: !s.done })}
        aria-label={s.done ? 'mark not done' : 'mark done'}
        style={{
          width: 22, height: 22, borderRadius: 999, flexShrink: 0,
          border: `1.5px solid ${s.done ? color : 'rgba(31,27,22,0.25)'}`,
          background: s.done ? color : 'transparent',
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 160ms ease',
        }}
      >
        {s.done && <Icon name="check" size={12} color="#fff" />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={ref}
            value={s.label}
            onChange={(e) => onChange({ ...s, label: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.currentTarget.blur(); } }}
            placeholder="Name this sub-habit…"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
              background: 'transparent', border: 'none', outline: 'none',
              padding: 0,
            }}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={{
              fontSize: 14, color: 'var(--ink)',
              textDecoration: s.done ? 'line-through' : 'none',
              opacity: s.done ? 0.55 : 1,
              cursor: 'text', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {s.label || <em style={{ color: 'rgba(31,27,22,0.4)' }}>Tap to name…</em>}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number"
          min={1}
          max={240}
          value={s.est}
          onChange={(e) => onChange({ ...s, est: Math.max(1, Math.min(240, parseInt(e.target.value, 10) || 1)) })}
          style={{
            width: 42, padding: '4px 6px', textAlign: 'right',
            fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)',
            background: 'rgba(31,27,22,0.04)', border: '0.5px solid rgba(31,27,22,0.08)',
            borderRadius: 8, outline: 'none',
            fontFeatureSettings: '"tnum"',
          }}
        />
        <span style={{ fontSize: 12, color: 'rgba(31,27,22,0.64)' }}>m</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button onClick={onMoveUp} disabled={!canUp} aria-label="move up" style={{
          background: 'transparent', border: 'none', padding: 2,
          opacity: canUp ? 0.6 : 0.18, cursor: canUp ? 'pointer' : 'default',
          color: 'var(--ink)', lineHeight: 0, fontSize: 9,
        }}>▲</button>
        <button onClick={onMoveDown} disabled={!canDown} aria-label="move down" style={{
          background: 'transparent', border: 'none', padding: 2,
          opacity: canDown ? 0.6 : 0.18, cursor: canDown ? 'pointer' : 'default',
          color: 'var(--ink)', lineHeight: 0, fontSize: 9,
        }}>▼</button>
      </div>

      <button
        onClick={onDelete}
        aria-label="delete sub-habit"
        style={{
          background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
          color: 'rgba(31,27,22,0.4)',
        }}
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

// ── Detail view (inline; no sheet overlay) ───────────────────────────────────

function GoalDetail({ goal, allGoals, onBack, onPrev, onNext, onUpdate, onDelete, indexLabel }) {
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [titleEditing, setTitleEditing] = React.useState(false);
  const [log, setLog] = useHabitLog();
  const { user } = useAuth();

  // Tap-to-log: advance the local cell, then mirror it to the cloud (if signed in)
  // so the heatmap syncs cross-device and the timestamp feeds rhythm insights.
  function logToday() {
    const next = cycleLevel(log, goal.id);
    setLog(next);
    const day = dayKey();
    syncCellToCloud(user?.id, goal.id, day, getLevel(next, goal.id, day));
  }
  const titleRef = React.useRef(null);
  React.useEffect(() => { if (titleEditing && titleRef.current) titleRef.current.focus(); }, [titleEditing]);
  React.useEffect(() => { setConfirmDel(false); setTitleEditing(false); }, [goal.id]);

  const colorHex = paletteHex(goal.color);
  const totalMin = goal.sequence.reduce((s, x) => s + (x.est || 0), 0);
  const doneCount = goal.sequence.filter(s => s.done).length;

  function patch(next) { onUpdate({ ...goal, ...next }); }
  function patchStep(idx, next) {
    onUpdate({ ...goal, sequence: goal.sequence.map((s, i) => i === idx ? next : s) });
  }
  function deleteStep(idx) {
    onUpdate({ ...goal, sequence: goal.sequence.filter((_, i) => i !== idx) });
  }
  function moveStep(idx, delta) {
    const arr = [...goal.sequence];
    const j = idx + delta;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    onUpdate({ ...goal, sequence: arr });
  }
  function addStep() {
    onUpdate({
      ...goal,
      sequence: [...goal.sequence, { id: newId('s_'), label: '', est: 10, done: false, why: '', kind: 'focus' }],
    });
  }

  const cadenceList = [['daily','Daily'], ['weekly','Weekly'], ['monthly','Monthly'], ['oneoff','Project']];

  return (
    <div style={{
      padding: '0 18px 32px',
      animation: 'fadein 200ms ease',
    }}>
      {/* sticky-ish nav row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 8, paddingBottom: 12, gap: 10,
      }}>
        <button onClick={onBack} aria-label="back to goals" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.1)',
          borderRadius: 999, padding: '7px 12px 7px 9px',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
          color: 'rgba(31,27,22,0.7)',
        }}>
          <Icon name="back" size={14} /> Goals
        </button>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.1)',
          borderRadius: 999, padding: 3,
        }}>
          <button onClick={onPrev} aria-label="previous goal" style={{
            background: 'transparent', border: 'none', padding: '5px 8px', cursor: 'pointer',
            color: 'rgba(31,27,22,0.7)', borderRadius: 999, display: 'inline-flex',
          }}>
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="chev" size={14} />
            </span>
          </button>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1,
            color: 'rgba(31,27,22,0.64)', padding: '0 4px',
            fontFeatureSettings: '"tnum"',
          }}>
            {indexLabel}
          </div>
          <button onClick={onNext} aria-label="next goal" style={{
            background: 'transparent', border: 'none', padding: '5px 8px', cursor: 'pointer',
            color: 'rgba(31,27,22,0.7)', borderRadius: 999, display: 'inline-flex',
          }}>
            <Icon name="chev" size={14} />
          </button>
        </div>
      </div>

      {/* hero */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: colorHex }} />
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 999,
            background: goal.cadence === 'oneoff' ? 'rgba(31,27,22,0.06)' : 'rgba(107,142,90,0.12)',
            color: goal.cadence === 'oneoff' ? 'rgba(31,27,22,0.55)' : 'var(--sage)',
          }}>
            {CADENCE_LABEL[goal.cadence || 'oneoff']}{goal.recurring ? ' · ↻' : ''}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)' }}>{goal.deadline}</div>
        </div>

        {titleEditing ? (
          <input
            ref={titleRef}
            value={goal.title}
            onChange={(e) => patch({ title: e.target.value })}
            onBlur={() => setTitleEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--ink)',
              letterSpacing: -0.5, lineHeight: 1.05,
              background: 'transparent', border: 'none', outline: 'none',
              padding: 0, borderBottom: '1px solid rgba(31,27,22,0.2)',
            }}
          />
        ) : (
          <h2
            onClick={() => setTitleEditing(true)}
            style={{
              fontFamily: 'var(--serif)', fontSize: 30, color: 'var(--ink)',
              letterSpacing: -0.5, lineHeight: 1.05, margin: 0, cursor: 'text',
              textWrap: 'pretty',
            }}
          >
            {goal.title}
            <span style={{ marginLeft: 8, verticalAlign: 'middle', display: 'inline-block' }}>
              <Icon name="edit" size={14} color="rgba(31,27,22,0.25)" />
            </span>
          </h2>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <Chip tone="paper">{goal.sequence.length} sub-habit{goal.sequence.length === 1 ? '' : 's'}</Chip>
          <Chip tone="paper">{totalMin}m total</Chip>
          <Chip tone="sage">{doneCount}/{goal.sequence.length} done</Chip>
        </div>
      </div>

      {/* activity heatmap */}
      <Section label="Activity">
        <Heatmap log={log} goalId={goal.id} colorKey={goal.color} />
        <HeatmapStats log={log} goalId={goal.id} />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <LogTodayButton
              log={log}
              goalId={goal.id}
              colorKey={goal.color}
              onCycle={logToday}
            />
          </div>
          <button
            onClick={() => exportICS(goalToICS(goal), icsFilename(goal.title))}
            aria-label="add to calendar"
            title={goal.recurring ? 'Add as recurring event' : 'Add to calendar'}
            style={{
              flexShrink: 0, width: 48, borderRadius: 14, cursor: 'pointer',
              border: '0.5px solid rgba(31,27,22,0.15)', background: 'var(--card)',
              color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Icon name="calendar" size={18} />
          </button>
        </div>
      </Section>

      {/* color picker */}
      <Section label="Color">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PALETTE.map(([key, hex]) => (
            <button key={key} onClick={() => patch({ color: key })} aria-label={`color ${key}`} style={{
              width: 28, height: 28, borderRadius: 999, background: hex, cursor: 'pointer',
              border: goal.color === key ? '2px solid var(--ink)' : '0.5px solid rgba(31,27,22,0.15)',
              boxShadow: goal.color === key ? '0 0 0 3px rgba(31,27,22,0.06)' : 'none',
              padding: 0, transition: 'all 160ms ease',
            }} />
          ))}
        </div>
      </Section>

      {/* cadence */}
      <Section label="Frequency">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {cadenceList.map(([k, label]) => {
            const active = (goal.cadence || 'oneoff') === k;
            return (
              <button key={k} onClick={() => patch({ cadence: k, recurring: k === 'oneoff' ? false : goal.recurring })} style={{
                padding: '7px 13px', borderRadius: 999,
                border: `0.5px solid ${active ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
                background: active ? 'var(--ink)' : 'var(--paper)',
                color: active ? 'var(--paper)' : 'var(--ink)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 160ms ease',
              }}>{label}</button>
            );
          })}
        </div>
        {(goal.cadence && goal.cadence !== 'oneoff') && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
            padding: '9px 12px',
            background: goal.recurring ? 'rgba(107,142,90,0.10)' : 'var(--card)',
            border: `0.5px solid ${goal.recurring ? 'rgba(107,142,90,0.4)' : 'rgba(31,27,22,0.08)'}`,
            borderRadius: 12, cursor: 'pointer',
          }}>
            <input type="checkbox" checked={!!goal.recurring}
              onChange={(e) => patch({ recurring: e.target.checked })}
              style={{ accentColor: 'var(--sage)', width: 16, height: 16 }}
            />
            <div style={{ fontSize: 13, color: 'var(--ink)' }}>
              Repeat each {goal.cadence === 'daily' ? 'day' : goal.cadence === 'weekly' ? 'week' : 'month'}
            </div>
          </label>
        )}
      </Section>

      {/* sub-habits */}
      <Section label="Sub-habits">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {goal.sequence.map((s, i) => (
            <SubHabitRow
              key={s.id}
              s={s}
              color={colorHex}
              onChange={(next) => patchStep(i, next)}
              onDelete={() => deleteStep(i)}
              onMoveUp={() => moveStep(i, -1)}
              onMoveDown={() => moveStep(i, +1)}
              canUp={i > 0}
              canDown={i < goal.sequence.length - 1}
            />
          ))}
          <button onClick={addStep} style={{
            padding: '11px 14px', borderRadius: 12,
            border: '0.5px dashed rgba(31,27,22,0.25)',
            background: 'transparent', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, color: 'rgba(31,27,22,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 160ms ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--terra)'; e.currentTarget.style.color = 'var(--terra)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(31,27,22,0.25)'; e.currentTarget.style.color = 'rgba(31,27,22,0.65)'; }}
          >
            <Icon name="plus" size={16} /> Add sub-habit
          </button>
        </div>
      </Section>

      {/* delete */}
      <Card style={{ padding: 14, background: 'rgba(194,106,56,0.06)', border: '0.5px dashed rgba(194,106,56,0.3)', marginTop: 18 }}>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} style={{
            background: 'transparent', border: 'none', padding: 0,
            fontFamily: 'inherit', fontSize: 13, color: 'var(--terra)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="x" size={14} /> Delete this goal
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, fontSize: 13, color: 'rgba(31,27,22,0.7)' }}>
              Delete “{goal.title}” permanently?
            </div>
            <button onClick={() => setConfirmDel(false)} style={{
              background: 'transparent', border: '0.5px solid rgba(31,27,22,0.15)',
              padding: '5px 11px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={onDelete} style={{
              background: 'var(--terra)', color: '#fff', border: 'none',
              padding: '5px 11px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', fontWeight: 500,
            }}>Delete</button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase',
        color: 'rgba(31,27,22,0.64)', marginBottom: 8,
      }}>{label}</div>
      {children}
    </div>
  );
}

// ── Top-level GoalsScreen ────────────────────────────────────────────────────

function GoalsScreen({ goals, openNewGoal, openGoal, detailGoalId, setDetailGoalId, updateGoal, deleteGoal }) {
  const [filter, setFilter] = React.useState('all');
  const [log] = useHabitLog();

  // Allow parent to drive detail mode via detailGoalId (used by demo bus).
  const activeIdx = React.useMemo(
    () => detailGoalId ? goals.findIndex(g => g.id === detailGoalId) : -1,
    [goals, detailGoalId]
  );
  const inDetail = activeIdx >= 0;

  function go(idx) {
    if (idx < 0 || idx >= goals.length) return;
    setDetailGoalId(goals[idx].id);
  }
  function backToList() { setDetailGoalId(null); }

  // Per-cadence counts for the filter pills. Computed unconditionally and BEFORE
  // the detail-view early return — React requires the same hooks to run on every
  // render, so a useMemo placed after the `if (inDetail) return` would be skipped
  // when entering detail mode and crash with "rendered fewer hooks than expected".
  const isComplete = (g) => (g.sequence?.length || 0) > 0 && g.sequence.every(s => s.done);
  const counts = React.useMemo(() => {
    const c = { all: goals.length, daily: 0, weekly: 0, monthly: 0, oneoff: 0, completed: 0 };
    for (const g of goals) { c[g.cadence || 'oneoff']++; if (isComplete(g)) c.completed++; }
    return c;
  }, [goals]);

  // Detail view
  if (inDetail) {
    const goal = goals[activeIdx];
    return (
      <GoalDetail
        goal={goal}
        allGoals={goals}
        onBack={backToList}
        onPrev={() => go((activeIdx - 1 + goals.length) % goals.length)}
        onNext={() => go((activeIdx + 1) % goals.length)}
        onUpdate={updateGoal}
        onDelete={() => deleteGoal(goal.id)}
        indexLabel={`${String(activeIdx + 1).padStart(2, '0')} / ${String(goals.length).padStart(2, '0')}`}
      />
    );
  }

  // List view
  const visible =
    filter === 'all'       ? goals :
    filter === 'completed' ? goals.filter(isComplete) :
    goals.filter(g => (g.cadence || 'oneoff') === filter);

  const FILTERS = [
    ['all',       'All'],
    ['completed', 'Completed'],
    ['daily',     'Daily'],
    ['weekly',    'Weekly'],
    ['monthly',   'Monthly'],
    ['oneoff',    'Projects'],
  ];

  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.64)', textTransform: 'uppercase', marginBottom: 6,
        }}>{goals.length} active</div>
        <H size={32}>Plans</H>
        <div style={{
          marginTop: 6, fontSize: 14, color: 'rgba(31,27,22,0.64)',
          lineHeight: 1.4, textWrap: 'pretty',
        }}>
          Each goal becomes a plan of micro-steps. Tap any card to edit it inline.
        </div>
      </div>

      <Btn variant="primary" size="md" onClick={openNewGoal} full>
        <Icon name="sparkle" size={16}/> New goal → plan
      </Btn>

      {/* Cadence filter pills */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        margin: '0 -18px', padding: '2px 18px 4px',
        scrollbarWidth: 'none',
      }} className="phone-scroll">
        {FILTERS.map(([k, label]) => {
          const isActive = filter === k;
          const n = counts[k] ?? 0;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              flexShrink: 0,
              padding: '8px 14px', borderRadius: 999,
              border: `0.5px solid ${isActive ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
              background: isActive ? 'var(--ink)' : 'var(--paper)',
              color: isActive ? 'var(--paper)' : 'var(--ink)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'all 160ms ease',
            }}>
              {label}
              <span style={{ fontSize: 12, opacity: 0.7, fontFeatureSettings: '"tnum"' }}>{n}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.length === 0 ? (
          <Card style={{ padding: 24, textAlign: 'center', background: 'var(--paper-2)' }}>
            <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.64)' }}>
              No {filter === 'oneoff' ? 'projects' : filter} goals yet.
            </div>
          </Card>
        ) : (
          visible.map(g => <GoalCard key={g.id} g={g} log={log} onOpen={() => setDetailGoalId(g.id)} />)
        )}
      </div>

      <Card style={{ padding: 16, background: 'var(--paper-2)' }}>
        <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', lineHeight: 1.5 }}>
          Tip: it’s fine to have many. Filter by frequency to focus, or drill into any card to edit sub-habits.
        </div>
      </Card>
    </div>
  );
}

export { GoalCard, GoalsScreen };
