import React from 'react';
import { Icon, Bloom, Btn, Card, H } from './ui.jsx';
import { minToTime, composite } from './data.jsx';

// Planner-internals UI: score drawer, "Running long" reschedule sheet,
// and "Why this order?" plain-language explainer.

// ─────────────────────────────────────────────────────────────
// Small bar primitive
// ─────────────────────────────────────────────────────────────
function ScoreBar({ label, value, hint, color = 'var(--terra)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.7)', fontWeight: 500, letterSpacing: -0.05 }}>{label}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'rgba(31,27,22,0.5)' }}>
          {Math.round(value * 100)}
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(31,27,22,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${value * 100}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 320ms cubic-bezier(.2,.8,.2,1)',
        }}/>
      </div>
      {hint && (
        <div style={{ fontSize: 10.5, color: 'rgba(31,27,22,0.5)', lineHeight: 1.35, marginTop: 1 }}>{hint}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. Score drawer — opens inline beneath a tapped block
// ─────────────────────────────────────────────────────────────
function ScoreDrawer({ block, allBlocks }) {
  const s = block.scores;
  if (!s) return null;
  const c = composite(s);
  const dep = (block.deps || []).map(id => allBlocks.find(b => b.id === id)).filter(Boolean);
  const hints = {
    urgency:     block.goal === 'g1' ? 'Friday review deadline.' : 'No hard deadline.',
    importance:  'Tagged high-priority for this goal.',
    energyMatch: block.kind === 'focus' ? 'Your focus peaks 9–11am.' : 'Light task — works at any energy.',
    success:     'Based on 28 similar blocks you ran.',
    effort:      `${block.dur} min · ${block.kind}.`,
  };
  return (
    <div style={{
      marginTop: 10, paddingTop: 12,
      borderTop: '0.5px dashed rgba(31,27,22,0.14)',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: 'fadein 220ms ease',
    }}>
      {/* Composite header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'rgba(31,27,22,0.5)' }}>
            Composite score
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1, color: 'var(--ink)', letterSpacing: -0.4, marginTop: 2 }}>
            {Math.round(c * 100)}
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(31,27,22,0.4)', marginLeft: 4 }}>/100</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'rgba(31,27,22,0.5)' }}>
            Rank today
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1, color: 'var(--terra)', marginTop: 4 }}>
            #{computeRank(block, allBlocks)}
          </div>
        </div>
      </div>

      {/* 5 sub-scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ScoreBar label="Urgency"     value={s.urgency}     hint={hints.urgency} />
        <ScoreBar label="Importance"  value={s.importance}  hint={hints.importance} />
        <ScoreBar label="Energy match" value={s.energyMatch} hint={hints.energyMatch} color="var(--sage)" />
        <ScoreBar label="Success likelihood" value={s.success} hint={hints.success} color="var(--lav)" />
        <ScoreBar label="Low effort"  value={1 - s.effort} hint={hints.effort} color="#c89a3a" />
      </div>

      {dep.length > 0 && (
        <div style={{
          padding: '8px 10px', background: 'rgba(31,27,22,0.04)',
          borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <Icon name="goals" size={13} color="rgba(31,27,22,0.55)"/>
          <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.65)' }}>
            Depends on <b style={{ color: 'var(--ink)' }}>{dep.map(d => d.label).join(', ')}</b>
          </div>
        </div>
      )}
    </div>
  );
}

function computeRank(block, all) {
  const remaining = all.filter(b => !b.done);
  const sorted = [...remaining].sort((a, b) => composite(b.scores) - composite(a.scores));
  return sorted.findIndex(b => b.id === block.id) + 1;
}

// ─────────────────────────────────────────────────────────────
// 2. Running long sheet — recompute & show diff
// ─────────────────────────────────────────────────────────────
// Auto-reschedule logic:
//   - The active block runs +overrunMin longer than planned.
//   - All subsequent (not-done) blocks shift forward by overrunMin.
//   - If shifted blocks exceed dayEnd, drop the lowest-composite optional block.
//   - Return { newBlocks, diff: { shifted: N, dropped: [labels] } }
function recomputeForOverrun(blocks, overrunMin = 20, dayEndMin = 17 * 60) {
  const activeIdx = blocks.findIndex(b => b.active);
  if (activeIdx < 0) return { newBlocks: blocks, diff: { shifted: 0, dropped: [] } };

  let next = blocks.map((b, i) => i > activeIdx && !b.done
    ? { ...b, startMin: b.startMin + overrunMin }
    : b);
  // Also extend the active block's duration
  next = next.map((b, i) => i === activeIdx ? { ...b, dur: b.dur + overrunMin } : b);

  const dropped = [];
  // Check overflow — drop lowest-composite optional remaining block
  function endOfDay(arr) {
    const last = arr.filter(b => !b.done).pop();
    return last ? last.startMin + last.dur : 0;
  }
  while (endOfDay(next) > dayEndMin) {
    const candidates = next
      .filter(b => !b.done && !b.active && b.optional)
      .sort((a, b) => composite(a.scores) - composite(b.scores));
    if (!candidates.length) break;
    const drop = candidates[0];
    dropped.push(drop.label);
    next = next.filter(b => b.id !== drop.id);
    // re-pack remaining (collapse start times after the dropped one)
    let cursor = null;
    next = next.map(b => {
      if (b.done) return b;
      if (cursor === null && b.id === drop.id) return b;
      if (cursor !== null) {
        const updated = { ...b, startMin: cursor };
        cursor = cursor + b.dur;
        return updated;
      }
      return b;
    });
  }

  const shifted = next.filter((b, i) => i > activeIdx && !b.done).length;
  return { newBlocks: next, diff: { shifted, dropped } };
}

function RunningLongSheet({ blocks, onConfirm, onClose }) {
  const [overrun, setOverrun] = React.useState(20);
  const preview = React.useMemo(
    () => recomputeForOverrun(blocks, overrun),
    [blocks, overrun]
  );

  const activeBlock = blocks.find(b => b.active);
  const movedBlocks = preview.newBlocks
    .filter(b => !b.done && !b.active)
    .filter(b => blocks.find(o => o.id === b.id)?.startMin !== b.startMin);

  return (
    <SheetShell title="Running long" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <H size={24}>How much more time do you need?</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
            I'll push the rest of today forward. If we run past 5pm, I'll drop the lowest-priority optional block.
          </div>
        </div>

        {/* Overrun chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[10, 20, 30, 45, 60].map(m => (
            <button key={m} onClick={() => setOverrun(m)} style={{
              padding: '10px 16px', borderRadius: 999,
              background: overrun === m ? 'var(--ink)' : 'transparent',
              color: overrun === m ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${overrun === m ? 'var(--ink)' : 'rgba(31,27,22,0.14)'}`,
              fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
            }}>+{m} min</button>
          ))}
        </div>

        {/* Diff card */}
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 12 }}>
            What changes
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <DiffRow
              icon="pause" color="var(--terra)"
              title={`"${activeBlock?.label}" extends by ${overrun} min`}
              sub={`Now ${minToTime(activeBlock?.startMin)} → ${minToTime((activeBlock?.startMin || 0) + (activeBlock?.dur || 0) + overrun)}`}
            />
            {preview.diff.shifted > 0 && (
              <DiffRow
                icon="arrow-down" color="var(--lav)"
                title={`${preview.diff.shifted} block${preview.diff.shifted === 1 ? '' : 's'} pushed forward`}
                sub={movedBlocks.slice(0, 3).map(b => `${b.label} → ${minToTime(b.startMin)}`).join(' · ')}
              />
            )}
            {preview.diff.dropped.length > 0 && (
              <DiffRow
                icon="x" color="#b35e5e"
                title={`Dropped: ${preview.diff.dropped.join(', ')}`}
                sub="Lowest composite score · marked optional. Nothing is lost — moves to tomorrow's draft."
              />
            )}
            {preview.diff.dropped.length === 0 && preview.diff.shifted === 0 && (
              <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.55)' }}>No downstream impact — you have buffer.</div>
            )}
          </div>
        </Card>

        <Card style={{ padding: 14, background: 'rgba(107,142,90,0.08)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="leaf" size={16} color="var(--sage)"/>
            <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.7)', lineHeight: 1.5 }}>
              No streak penalty. No shame. Today just got reshaped.
            </div>
          </div>
        </Card>
      </div>

      <SheetFooter>
        <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
        <Btn variant="terra" size="lg" full onClick={() => onConfirm(preview.newBlocks, preview.diff)}>
          Reshape today
        </Btn>
      </SheetFooter>
    </SheetShell>
  );
}

function DiffRow({ icon, color, title, sub }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 24, height: 24, borderRadius: 8, flexShrink: 0,
        background: 'rgba(31,27,22,0.04)', color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}><Icon name={icon} size={13}/></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Why this order sheet — plain-language explanation
// ─────────────────────────────────────────────────────────────
function WhyOrderSheet({ blocks, onClose }) {
  const remaining = blocks.filter(b => !b.done);
  const sorted = [...remaining].sort((a, b) => composite(b.scores) - composite(a.scores));
  const top = sorted[0];

  return (
    <SheetShell title="Why this order" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 6 }}>
            The planner's reasoning
          </div>
          <H size={26}>Today is shaped by four things.</H>
        </div>

        <ReasonCard
          n="1" tone="terra"
          title="Your morning advantage"
          body="You complete 82% of focus blocks started before 10am, 41% after. I front-loaded the highest-stakes work into your peak window."
        />

        <ReasonCard
          n="2" tone="sage"
          title="One dependency chain"
          body={`"Decision summary" can't start until "Draft nav-bar reply" is done — they share the same goal thread. The planner enforces this with a topological sort.`}
        />

        <ReasonCard
          n="3" tone="lav"
          title="A rest between focus blocks"
          body="You finish three focus blocks back-to-back only 28% of the time. Lunch is wedged between blocks 2 and 3 to lift the third to 71%."
        />

        <ReasonCard
          n="4" tone="butter"
          title="Two optional blocks"
          body="Run intervals and Read 1 chapter are flagged optional. If anything overruns, they're the first to move to tomorrow — never the deadline work."
        />

        {top && (
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 8 }}>
              Top-ranked block right now
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3 }}>
                  {top.label}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 4 }}>
                  Composite {Math.round(composite(top.scores) * 100)} · {minToTime(top.startMin || 0)}
                </div>
              </div>
              <Bloom value={composite(top.scores)} size={48} color="var(--terra)"/>
            </div>
          </Card>
        )}
      </div>

      <SheetFooter>
        <Btn variant="primary" size="lg" full onClick={onClose}>Got it</Btn>
      </SheetFooter>
    </SheetShell>
  );
}

function ReasonCard({ n, tone, title, body }) {
  const tones = {
    terra:  { bg: 'rgba(200,96,47,0.08)',  c: 'var(--terra)' },
    sage:   { bg: 'rgba(107,142,90,0.10)', c: 'var(--sage)' },
    lav:    { bg: 'rgba(155,138,196,0.10)',c: 'var(--lav)' },
    butter: { bg: 'rgba(232,194,107,0.18)',c: '#a87f1f' },
  };
  const t = tones[tone];
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: t.bg, color: t.c,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 17,
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)', letterSpacing: -0.15 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.65)', marginTop: 5, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Generic sheet shell (used by both sheets above)
// ─────────────────────────────────────────────────────────────
function SheetShell({ title, children, onClose, zIndex = 200 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex,
      background: 'rgba(31,27,22,0.35)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadein 220ms ease',
    }}>
      <div style={{
        background: 'var(--paper)', width: '100%', maxHeight: '92%',
        borderRadius: '28px 28px 0 0',
        display: 'flex', flexDirection: 'column',
        animation: 'slideup 280ms cubic-bezier(.2,.8,.2,1)',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(31,27,22,0.18)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(31,27,22,0.55)' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
            color: 'rgba(31,27,22,0.5)',
          }}><Icon name="x" size={20}/></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 18px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function SheetFooter({ children }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, marginLeft: -18, marginRight: -18,
      padding: '12px 18px 18px', background: 'var(--paper)',
      borderTop: '0.5px solid rgba(31,27,22,0.06)',
      display: 'flex', gap: 10, marginTop: 20,
    }}>{children}</div>
  );
}

Object.assign(window, {
  ScoreDrawer, RunningLongSheet, WhyOrderSheet,
  recomputeForOverrun, computeRank,
});

export { ScoreBar, ScoreDrawer, RunningLongSheet, DiffRow, WhyOrderSheet, ReasonCard, SheetShell, SheetFooter };
