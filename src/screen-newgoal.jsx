import React from 'react';
import { Icon, Bloom, Chip, Btn, Card, H } from './ui.jsx';

// New Goal sheet — the showcase: goal + constraints → AI-generated micro-sequence

function ConstraintChip({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 999,
      background: active ? 'var(--ink)' : 'transparent',
      color: active ? 'var(--paper)' : 'var(--ink)',
      border: `1px solid ${active ? 'var(--ink)' : 'rgba(31,27,22,0.14)'}`,
      fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', transition: 'all 150ms ease',
    }}>{children}</button>
  );
}

function NewGoalSheet({ onClose, onCommit, onOpenLibrary }) {
  const [stage, setStage] = React.useState('input'); // input | thinking | result
  const [goal, setGoal] = React.useState('Get my portfolio site live before the meetup');
  const [hours, setHours] = React.useState(2);
  const [energy, setEnergy] = React.useState('medium');
  const [deadline, setDeadline] = React.useState('this-week');
  const [sequence, setSequence] = React.useState(null);
  const [err, setErr] = React.useState(null);

  async function generate() {
    setStage('thinking');
    setErr(null);
    const prompt = `You are a calm planning assistant for someone with ADHD-flavored attention. Break this goal into an ordered sequence of tiny, concrete micro-steps with realistic minute estimates and a one-line rationale each.

Goal: ${goal}
Available time today: ${hours} hours
Energy: ${energy}
Deadline: ${deadline}

Constraints:
- 5 to 7 steps total
- First step must be tiny (<= 5 minutes) to reduce initiation cost
- Mix focus and lighter steps to avoid back-to-back fatigue
- Include one rest or movement break if total > 60 min
- Each rationale should be under 12 words, plain language, no shame

Respond ONLY with raw JSON in this exact shape:
{"steps":[{"label":"...","est":12,"kind":"focus|rest|body|self|reading","why":"..."}]}`;
    try {
      const raw = await window.claude.complete(prompt);
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : raw);
      if (!parsed.steps || !parsed.steps.length) throw new Error('no steps');
      setSequence(parsed.steps);
      setStage('result');
    } catch (e) {
      // graceful fallback so prototype always works
      setSequence([
        { label: 'Open the project folder', est: 2, kind: 'self', why: 'Tiny first step.' },
        { label: 'List the 5 sections still missing copy', est: 10, kind: 'focus', why: 'Visible scope reduces overwhelm.' },
        { label: 'Draft hero copy only', est: 25, kind: 'focus', why: 'Hardest piece while energy is fresh.' },
        { label: 'Stand up + water', est: 5, kind: 'rest', why: 'Protects focus for the next block.' },
        { label: 'Wire one project case study', est: 30, kind: 'focus', why: 'Concrete win to end on.' },
        { label: 'Push to staging URL', est: 8, kind: 'self', why: 'Ship, then iterate tomorrow.' },
      ]);
      setStage('result');
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(31,27,22,0.35)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadein 220ms ease',
    }}>
      <div style={{
        background: 'var(--paper)', width: '100%', height: '92%',
        borderRadius: '28px 28px 0 0',
        display: 'flex', flexDirection: 'column',
        animation: 'slideup 280ms cubic-bezier(.2,.8,.2,1)',
        boxShadow: '0 -20px 40px rgba(0,0,0,0.18)',
      }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(31,27,22,0.18)' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 6px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(31,27,22,0.55)' }}>
            {stage === 'result' ? 'Your sequence' : 'New goal'}
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', padding: 4, cursor: 'pointer',
            color: 'rgba(31,27,22,0.5)',
          }}><Icon name="x" size={20}/></button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 32px' }}>
          {stage === 'input' && (
            <InputStage
              goal={goal} setGoal={setGoal}
              hours={hours} setHours={setHours}
              energy={energy} setEnergy={setEnergy}
              deadline={deadline} setDeadline={setDeadline}
              onOpenLibrary={onOpenLibrary}
            />
          )}
          {stage === 'thinking' && <ThinkingStage goal={goal}/>}
          {stage === 'result' && <ResultStage goal={goal} steps={sequence} />}
        </div>

        {/* sticky CTA */}
        <div style={{
          padding: '12px 18px 18px',
          borderTop: '0.5px solid rgba(31,27,22,0.06)',
          background: 'var(--paper)',
          display: 'flex', gap: 10,
        }}>
          {stage === 'input' && (
            <Btn variant="primary" size="lg" full onClick={generate}>
              <Icon name="sparkle" size={16}/> Generate sequence
            </Btn>
          )}
          {stage === 'thinking' && (
            <Btn variant="soft" size="lg" full disabled>Thinking through it…</Btn>
          )}
          {stage === 'result' && (
            <>
              <Btn variant="ghost" size="lg" onClick={() => setStage('input')}>Tweak</Btn>
              <Btn variant="terra" size="lg" full onClick={() => onCommit(goal, sequence)}>
                Add to today
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InputStage({ goal, setGoal, hours, setHours, energy, setEnergy, deadline, setDeadline, onOpenLibrary }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 6 }}>
      <div>
        <H size={28}>What’s the thing you’re circling?</H>
        <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.55)', marginTop: 6, lineHeight: 1.4 }}>
          One sentence is enough. I’ll break it down.
        </div>
      </div>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.1)',
          borderRadius: 18, padding: '14px 16px',
          fontFamily: 'inherit', fontSize: 15.5, color: 'var(--ink)',
          lineHeight: 1.45, resize: 'none', outline: 'none',
          boxShadow: '0 4px 18px -12px rgba(31,27,22,0.2)',
        }}
        placeholder="Get my portfolio site live…"
      />

      {onOpenLibrary && (
        <button onClick={onOpenLibrary} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          background: 'rgba(107,142,90,0.10)', border: '0.5px solid rgba(107,142,90,0.25)',
          borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
        }}>
          <Icon name="goals" size={16} color="var(--sage)"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>Or start from the library</div>
            <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>Pre-built sequences for common goals.</div>
          </div>
          <Icon name="chev" size={14} color="rgba(31,27,22,0.3)"/>
        </button>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Time you have today
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0.5, 1, 2, 3, 4].map(h => (
            <ConstraintChip key={h} active={hours === h} onClick={() => setHours(h)}>
              {h < 1 ? '30 min' : `${h}h`}
            </ConstraintChip>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Energy
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['low', 'medium', 'high'].map(e => (
            <ConstraintChip key={e} active={energy === e} onClick={() => setEnergy(e)}>{e}</ConstraintChip>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(31,27,22,0.55)', marginBottom: 10, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          Deadline
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['today','Today'], ['this-week','This week'], ['this-month','This month'], ['no-rush','No rush']].map(([k,l]) => (
            <ConstraintChip key={k} active={deadline === k} onClick={() => setDeadline(k)}>{l}</ConstraintChip>
          ))}
        </div>
      </div>

      <Card style={{ padding: 14, background: 'rgba(155,138,196,0.08)', border: '0.5px dashed rgba(155,138,196,0.4)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="lock" size={16} color="var(--lav)"/>
          <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.65)', lineHeight: 1.45 }}>
            Your goal text stays on this device unless you turn on sync. Sequence generation uses an encrypted request.
          </div>
        </div>
      </Card>
    </div>
  );
}

function ThinkingStage({ goal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 32, alignItems: 'center', textAlign: 'center' }}>
      <Bloom value={0.35} size={120} color="var(--lav)" />
      <H size={22} style={{ maxWidth: 280 }}>Breaking “{goal.length > 32 ? goal.slice(0, 30) + '…' : goal}” into doable steps…</H>
      <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.55)', maxWidth: 260, lineHeight: 1.5 }}>
        Considering your time, energy and how you finished sequences last week.
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: 999, background: 'var(--lav)',
            animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  );
}

function ResultStage({ goal, steps }) {
  const totalMin = steps.reduce((s, x) => s + (x.est || 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 6 }}>
      <div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.55)', marginBottom: 4 }}>Goal</div>
        <H size={22}>{goal}</H>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <Chip tone="paper">{steps.length} steps</Chip>
          <Chip tone="paper">~{totalMin} min</Chip>
          <Chip tone="lav">AI-drafted</Chip>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((s, idx) => {
          const k = (typeof blockKindStyle === 'function') ? blockKindStyle(s.kind) : { bg: 'rgba(31,27,22,0.05)', bar: '#6b6359', label: '' };
          return (
            <div key={idx} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: 14, background: 'var(--card)',
              borderRadius: 16, border: '0.5px solid rgba(31,27,22,0.06)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: k.bar, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 14, letterSpacing: -0.2,
              }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(31,27,22,0.55)', flexShrink: 0, paddingTop: 2 }}>{s.est}m</div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.55)', marginTop: 6, lineHeight: 1.4 }}>
                  <span style={{ color: k.bar, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{k.label || s.kind} · </span>
                  {s.why}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Card style={{ padding: 14, background: 'rgba(107,142,90,0.08)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="leaf" size={16} color="var(--sage)"/>
          <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.7)', lineHeight: 1.5 }}>
            Reality check: I sized this for your <b>medium energy</b>. If today turns out lower, hit “Adapt for today” on Today — I’ll shrink the focus blocks.
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { NewGoalSheet });

export { ConstraintChip, NewGoalSheet, InputStage, ThinkingStage, ResultStage };
