import React from 'react';
import { Icon, Btn } from './ui.jsx';
import { minToTime } from './data.jsx';

// Add Event sheet — place a fixed anchor in the day (hard or soft).

const TIME_OPTIONS = [
  420, 480, 510, 540, 570, 600, 630, 660, 690, 720,
  780, 840, 900, 960, 1020, 1080, 1140,
];

const DUR_OPTIONS = [15, 30, 45, 60, 90, 120];

const CAT_OPTIONS = [
  { id: 'meeting', label: '📅 Meeting' },
  { id: 'meal',    label: '🍽 Meal' },
  { id: 'errand',  label: '📦 Errand' },
  { id: 'movie',   label: '🎬 Movie' },
  { id: 'custom',  label: '✏️ Other' },
];

const REMINDER_OPTIONS = [0, 5, 10, 15, 30];

function chipBtn(active, onClick, children) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 999,
      background: active ? 'var(--ink)' : 'var(--card)',
      color: active ? 'var(--paper)' : 'var(--ink)',
      border: `0.5px solid ${active ? 'var(--ink)' : 'rgba(31,27,22,0.12)'}`,
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', transition: 'all 140ms ease',
      flexShrink: 0,
    }}>{children}</button>
  );
}

function AddEventSheet({ onClose, onCommit }) {
  const [title, setTitle] = React.useState('');
  const [cat, setCat] = React.useState('meeting');
  const [startMin, setStartMin] = React.useState(660);
  const [dur, setDur] = React.useState(30);
  const [anchor, setAnchor] = React.useState('hard');
  const [reminder, setReminder] = React.useState(10);

  function commit() {
    const label = title.trim() || CAT_OPTIONS.find(c => c.id === cat)?.label.replace(/^.+? /, '') || 'Event';
    onCommit({ label, cat, startMin, dur, anchor, reminder });
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(31,27,22,0.34)',
      backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadein 200ms ease',
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--paper)', width: '100%', maxHeight: '92%',
        borderRadius: '28px 28px 0 0',
        overflowY: 'auto', scrollbarWidth: 'none',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.18)',
        animation: 'slideup 280ms cubic-bezier(.2,.8,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(31,27,22,0.18)' }} />
        </div>

        <div style={{ flex: 1, padding: '14px 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, letterSpacing: -0.4, color: 'var(--ink)' }}>
              A fixed point in your day
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'rgba(31,27,22,0.5)', padding: 4,
            }}><Icon name="x" size={20}/></button>
          </div>

          {/* title input */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is it? e.g. Movie with Sam"
            style={{
              width: '100%', background: 'var(--card)',
              border: '0.5px solid rgba(31,27,22,0.1)', borderRadius: 16,
              padding: '14px 16px', fontFamily: 'inherit', fontSize: 15.5,
              color: 'var(--ink)', outline: 'none',
            }}
          />

          {/* Category */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Type</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CAT_OPTIONS.map(c => chipBtn(cat === c.id, () => setCat(c.id), c.label))}
            </div>
          </div>

          {/* Starts at */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Starts at</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TIME_OPTIONS.map(t => chipBtn(startMin === t, () => setStartMin(t), minToTime(t)))}
            </div>
          </div>

          {/* Lasts */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Lasts</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DUR_OPTIONS.map(d => chipBtn(dur === d, () => setDur(d), d >= 60 ? `${d / 60}h` : `${d}m`))}
            </div>
          </div>

          {/* How firm */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>How firm is it?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'hard', title: 'Fixed', sub: 'Can\'t move — habits flow around it.' },
                { id: 'soft', title: 'Flexible', sub: 'Can shift if the day needs room.' },
              ].map(a => (
                <button key={a.id} onClick={() => setAnchor(a.id)} style={{
                  flex: 1, padding: '12px 14px', borderRadius: 16, textAlign: 'left',
                  background: anchor === a.id ? 'var(--ink)' : 'var(--card)',
                  color: anchor === a.id ? 'var(--paper)' : 'var(--ink)',
                  border: `0.5px solid ${anchor === a.id ? 'var(--ink)' : 'rgba(31,27,22,0.1)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 140ms ease',
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 11.5, opacity: anchor === a.id ? 0.7 : 0.55, lineHeight: 1.35 }}>{a.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Remind me */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>Remind me</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {REMINDER_OPTIONS.map(r => chipBtn(reminder === r, () => setReminder(r), r === 0 ? 'No reminder' : `${r}m before`))}
            </div>
          </div>

          {/* CTA */}
          <button onClick={commit} style={{
            width: '100%', height: 52, borderRadius: 999,
            background: 'var(--terra)', color: '#fff',
            border: 'none', fontFamily: 'inherit', fontSize: 16, fontWeight: 500,
            cursor: 'pointer',
          }}>Add to my day</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddEventSheet });

export { AddEventSheet };
