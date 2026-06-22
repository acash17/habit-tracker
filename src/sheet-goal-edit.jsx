import React from 'react';
import { Icon, Btn, Card, H, Chip } from './ui.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';
import { newId } from './utils.js';
import { PALETTE } from './palette.js';

// Intuitive goal editor — edit title, cadence, recurring, and add/edit/reorder/delete sub-habits.
// Surfaces as a bottom sheet over the goals screen. Tap a sub-habit to edit inline.
// NOTE: superseded at runtime by the inline GoalDetail in screen-goals.jsx; kept for reference.

const CADENCES = [
  ['daily',   'Daily'],
  ['weekly',  'Weekly'],
  ['monthly', 'Monthly'],
  ['oneoff',  'Project'],
];

const uid = (prefix = 's_') => newId(prefix);

function SubHabitRow({ s, color, onChange, onDelete, onMoveUp, onMoveDown, canUp, canDown }) {
  const [editing, setEditing] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      background: s.done ? 'rgba(107,142,90,0.08)' : 'var(--card)',
      border: `0.5px solid ${s.done ? 'rgba(107,142,90,0.3)' : 'rgba(31,27,22,0.08)'}`,
      borderRadius: 12,
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
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
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
            fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink)',
            background: 'rgba(31,27,22,0.04)', border: '0.5px solid rgba(31,27,22,0.08)',
            borderRadius: 8, outline: 'none',
            fontFeatureSettings: '"tnum"',
          }}
        />
        <span style={{ fontSize: 11, color: 'rgba(31,27,22,0.64)' }}>m</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button onClick={onMoveUp} disabled={!canUp} aria-label="move up" style={{
          background: 'transparent', border: 'none', padding: 2,
          opacity: canUp ? 0.6 : 0.18, cursor: canUp ? 'pointer' : 'default',
          color: 'var(--ink)', lineHeight: 0,
        }}>▲</button>
        <button onClick={onMoveDown} disabled={!canDown} aria-label="move down" style={{
          background: 'transparent', border: 'none', padding: 2,
          opacity: canDown ? 0.6 : 0.18, cursor: canDown ? 'pointer' : 'default',
          color: 'var(--ink)', lineHeight: 0,
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

function GoalEditSheet({ goal, onClose, onSave, onDelete }) {
  // Local draft — only commit on Save. Lets user cancel cleanly.
  const [draft, setDraft] = React.useState(() => ({
    ...goal,
    cadence: goal.cadence || 'oneoff',
    recurring: !!goal.recurring,
    color: goal.color || 'terracotta',
    sequence: (goal.sequence || []).map(s => ({ ...s })),
  }));
  const [confirmDel, setConfirmDel] = React.useState(false);

  const colorHex = (PALETTE.find(([k]) => k === draft.color) || PALETTE[0])[1];

  const totalMin = draft.sequence.reduce((s, x) => s + (x.est || 0), 0);
  const doneCount = draft.sequence.filter(s => s.done).length;

  function updateStep(idx, next) {
    setDraft(d => ({ ...d, sequence: d.sequence.map((s, i) => i === idx ? next : s) }));
  }
  function deleteStep(idx) {
    setDraft(d => ({ ...d, sequence: d.sequence.filter((_, i) => i !== idx) }));
  }
  function moveStep(idx, delta) {
    setDraft(d => {
      const arr = [...d.sequence];
      const j = idx + delta;
      if (j < 0 || j >= arr.length) return d;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...d, sequence: arr };
    });
  }
  function addStep() {
    setDraft(d => ({
      ...d,
      sequence: [...d.sequence, { id: uid('s'), label: '', est: 10, done: false, why: '', kind: 'focus' }],
    }));
  }
  function save() {
    const cleaned = {
      ...draft,
      title: (draft.title || '').trim() || 'Untitled goal',
      recurring: draft.cadence === 'oneoff' ? false : draft.recurring,
      deadline: draft.cadence === 'oneoff'
        ? (draft.deadline || 'This week')
        : (draft.cadence === 'daily' ? 'Every day' : draft.cadence === 'weekly' ? 'Every week' : 'Every month'),
      sequence: draft.sequence.filter(s => (s.label || '').trim().length > 0),
    };
    onSave(cleaned);
  }

  return (
    <SheetShell title={goal.id ? 'Edit goal' : 'New goal'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 16 }}>
        {/* Title */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 6 }}>
            Goal
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="What are you circling?"
            style={{
              width: '100%', boxSizing: 'border-box',
              fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)',
              padding: '12px 14px', background: 'var(--card)',
              border: '0.5px solid rgba(31,27,22,0.1)', borderRadius: 14,
              outline: 'none',
            }}
          />
        </div>

        {/* Color swatches */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 8 }}>
            Color
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PALETTE.map(([key, hex]) => (
              <button key={key} onClick={() => setDraft(d => ({ ...d, color: key }))} aria-label={`color ${key}`} style={{
                width: 30, height: 30, borderRadius: 999,
                background: hex, cursor: 'pointer',
                border: draft.color === key ? '2px solid var(--ink)' : '0.5px solid rgba(31,27,22,0.15)',
                boxShadow: draft.color === key ? '0 0 0 3px rgba(31,27,22,0.06)' : 'none',
                padding: 0,
              }} />
            ))}
          </div>
        </div>

        {/* Cadence */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 8 }}>
            Frequency
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CADENCES.map(([k, label]) => {
              const active = draft.cadence === k;
              return (
                <button key={k} onClick={() => setDraft(d => ({ ...d, cadence: k }))} style={{
                  padding: '8px 14px', borderRadius: 999,
                  border: `0.5px solid ${active ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
                  background: active ? 'var(--ink)' : 'var(--paper)',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 160ms ease',
                }}>{label}</button>
              );
            })}
          </div>
          {draft.cadence !== 'oneoff' && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
              padding: '10px 14px',
              background: draft.recurring ? 'rgba(107,142,90,0.10)' : 'var(--card)',
              border: `0.5px solid ${draft.recurring ? 'rgba(107,142,90,0.4)' : 'rgba(31,27,22,0.08)'}`,
              borderRadius: 14, cursor: 'pointer',
            }}>
              <input type="checkbox" checked={draft.recurring}
                onChange={(e) => setDraft(d => ({ ...d, recurring: e.target.checked }))}
                style={{ accentColor: 'var(--sage)', width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>Repeat each {draft.cadence === 'daily' ? 'day' : draft.cadence === 'weekly' ? 'week' : 'month'}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.64)', marginTop: 2 }}>
                  Sub-habits reset at the start of each {draft.cadence === 'daily' ? 'day' : draft.cadence === 'weekly' ? 'week' : 'month'}.
                </div>
              </div>
            </label>
          )}
        </div>

        {/* Sub-habits */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)' }}>
              Sub-habits
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip tone="paper">{draft.sequence.length} item{draft.sequence.length === 1 ? '' : 's'}</Chip>
              <Chip tone="paper">{totalMin}m</Chip>
              <Chip tone="sage">{doneCount}/{draft.sequence.length} done</Chip>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {draft.sequence.map((s, i) => (
              <SubHabitRow
                key={s.id}
                s={s}
                color={colorHex}
                onChange={(next) => updateStep(i, next)}
                onDelete={() => deleteStep(i)}
                onMoveUp={() => moveStep(i, -1)}
                onMoveDown={() => moveStep(i, +1)}
                canUp={i > 0}
                canDown={i < draft.sequence.length - 1}
              />
            ))}
            <button onClick={addStep} style={{
              padding: '12px 14px', borderRadius: 12,
              border: '0.5px dashed rgba(31,27,22,0.25)',
              background: 'transparent', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13.5, color: 'rgba(31,27,22,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <Icon name="plus" size={16} /> Add sub-habit
            </button>
          </div>
        </div>

        {/* Danger zone — only for existing goals */}
        {onDelete && (
          <Card style={{ padding: 14, background: 'rgba(194,106,56,0.06)', border: '0.5px dashed rgba(194,106,56,0.3)' }}>
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
                <div style={{ flex: 1, fontSize: 12.5, color: 'rgba(31,27,22,0.7)' }}>
                  Delete “{draft.title}” and all sub-habits?
                </div>
                <button onClick={() => setConfirmDel(false)} style={{
                  background: 'transparent', border: '0.5px solid rgba(31,27,22,0.15)',
                  padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12,
                  cursor: 'pointer',
                }}>Cancel</button>
                <button onClick={onDelete} style={{
                  background: 'var(--terra)', color: '#fff', border: 'none',
                  padding: '6px 12px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12,
                  cursor: 'pointer', fontWeight: 500,
                }}>Delete</button>
              </div>
            )}
          </Card>
        )}
      </div>

      <SheetFooter>
        <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
        <Btn variant="terra" size="lg" full onClick={save}>
          <Icon name="check" size={16} /> Save
        </Btn>
      </SheetFooter>
    </SheetShell>
  );
}

export { GoalEditSheet };
