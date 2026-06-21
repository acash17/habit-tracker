import React from 'react';
import { Icon, Chip, Btn, Card, H } from './ui.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';

// Micro-sequence library — pre-built templates for common goals.
// Especially powerful for ADHD users: zero decision cost to start.

const TEMPLATES = [
  {
    id: 'deep-work',
    title: 'Deep work block',
    sub: 'One important thing, in a row.',
    accent: 'terra',
    tag: 'Focus',
    when: 'Morning · 110 min',
    steps: [
      { label: 'Close all open tabs except one', est: 3, kind: 'self', why: 'Visible decluttering reduces overwhelm.' },
      { label: 'Set a single sentence intent', est: 2, kind: 'self', why: 'Tiny commitment beats vague resolve.' },
      { label: 'First 50-min focus block',     est: 50, kind: 'focus', why: 'Pomodoro-ish; your sweet spot.' },
      { label: 'Walk + water',                 est: 10, kind: 'rest', why: 'Mandatory reset, not optional.' },
      { label: 'Second 50-min focus block',    est: 50, kind: 'focus', why: 'Pair-blocks finish 71% vs 28% for triples.' },
    ],
  },
  {
    id: 'adhd-reset',
    title: 'ADHD reset',
    sub: 'You\u2019re scattered. Land back here.',
    accent: 'lav',
    tag: 'Reset',
    when: 'Any time · 18 min',
    steps: [
      { label: 'Stand up. Drink water.',                est: 2,  kind: 'body', why: 'Body before thoughts.' },
      { label: '5 deep breaths · box pattern',          est: 3,  kind: 'self', why: 'Re-engages parasympathetic system.' },
      { label: 'Brain-dump 2 min · everything on mind', est: 2,  kind: 'self', why: 'Externalize working memory.' },
      { label: 'Pick ONE item. Star it.',               est: 1,  kind: 'self', why: 'Decision once, do many times.' },
      { label: '10 min on the starred item',            est: 10, kind: 'focus', why: 'Tiny entrance to flow.' },
    ],
  },
  {
    id: 'morning',
    title: 'Calm morning',
    sub: 'No phone until step 5.',
    accent: 'sage',
    tag: 'Routine',
    when: 'Morning · 35 min',
    steps: [
      { label: 'Make the bed',           est: 2,  kind: 'self', why: 'First small win, free.' },
      { label: 'Glass of water',         est: 1,  kind: 'self', why: 'Hydration > caffeine first.' },
      { label: '5 min sun on the face',  est: 5,  kind: 'body', why: 'Sets circadian rhythm.' },
      { label: 'Shower',                 est: 12, kind: 'self', why: 'Wake-up cue.' },
      { label: 'Phone on, day starts',   est: 5,  kind: 'self', why: 'You decide when the world enters.' },
      { label: 'Write today\u2019s one thing', est: 10, kind: 'focus', why: 'One thing > a list of ten.' },
    ],
  },
  {
    id: 'workout',
    title: 'Lazy workout',
    sub: 'For days when you don\u2019t want to.',
    accent: 'butter',
    tag: 'Body',
    when: 'Any · 20 min',
    steps: [
      { label: 'Put on the shoes', est: 1, kind: 'self', why: 'Tiny entry to defeat resistance.' },
      { label: 'Walk for 5 min',   est: 5, kind: 'body', why: 'Movement starts the engine.' },
      { label: '5 min mobility',   est: 5, kind: 'body', why: 'Low-stakes, joints first.' },
      { label: '1 set of 10 push-ups', est: 2, kind: 'body', why: 'One set is enough today.' },
      { label: 'Walk back · breathe',  est: 7, kind: 'rest', why: 'Cool down counts.' },
    ],
  },
  {
    id: 'wind-down',
    title: 'Wind down for sleep',
    sub: 'For light sleepers.',
    accent: 'lav',
    tag: 'Sleep',
    when: 'Evening · 45 min',
    steps: [
      { label: 'Dim every light',                 est: 2,  kind: 'self', why: 'Lower light = higher melatonin.' },
      { label: 'No screens · pick a book',        est: 3,  kind: 'self', why: 'Boundary > willpower.' },
      { label: '5 min stretch',                   est: 5,  kind: 'body', why: 'Loosens tension.' },
      { label: 'Read 20 min',                     est: 20, kind: 'reading', why: 'Off-screen wind-down.' },
      { label: 'Tomorrow\u2019s one thing on paper', est: 5, kind: 'self', why: 'Empties anxious looping.' },
      { label: 'Lights out',                      est: 1,  kind: 'self', why: 'Same time each night, when possible.' },
    ],
  },
  {
    id: 'inbox',
    title: 'Inbox zero, gently',
    sub: 'Process, don\u2019t answer.',
    accent: 'terra',
    tag: 'Admin',
    when: 'Afternoon · 30 min',
    steps: [
      { label: 'Sort by date · oldest first',         est: 2,  kind: 'self', why: 'Fixed order beats triage paralysis.' },
      { label: 'Delete or archive first 20',          est: 8,  kind: 'self', why: 'Volume first, value second.' },
      { label: '2-min rule replies',                  est: 10, kind: 'focus', why: 'Quick wins.' },
      { label: 'Snooze anything >5 min · move on',    est: 5,  kind: 'self', why: 'Defer is a strategy.' },
      { label: 'Last 5 min · star 3 for tomorrow',    est: 5,  kind: 'self', why: 'Set up your future self.' },
    ],
  },
];

function TemplateCard({ t, onPick }) {
  const accentMap = {
    terra:  { bg: 'rgba(200,96,47,0.10)',  fg: 'var(--terra)' },
    sage:   { bg: 'rgba(107,142,90,0.12)', fg: 'var(--sage)' },
    lav:    { bg: 'rgba(155,138,196,0.16)',fg: 'var(--lav)' },
    butter: { bg: 'rgba(232,194,107,0.22)',fg: '#a87f1f' },
  };
  const a = accentMap[t.accent];
  const totalMin = t.steps.reduce((s, x) => s + x.est, 0);
  return (
    <button onClick={() => onPick(t)} style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: 16, width: '100%', textAlign: 'left',
      background: 'var(--card)', border: '0.5px solid rgba(31,27,22,0.06)',
      borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'transform 120ms ease',
    }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
      onMouseUp={(e) => e.currentTarget.style.transform = ''}
      onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          padding: '3px 10px', borderRadius: 999,
          background: a.bg, color: a.fg,
          fontSize: 10.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>{t.tag}</div>
        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.5)', fontFamily: 'var(--mono)' }}>
          {totalMin}m · {t.steps.length} steps
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 21, lineHeight: 1.15, color: 'var(--ink)', letterSpacing: -0.3 }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.6)', marginTop: 4, lineHeight: 1.4 }}>{t.sub}</div>
      </div>
      {/* tiny preview bars */}
      <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
        {t.steps.map((s, i) => {
          const k = blockKindStyle(s.kind);
          return (
            <div key={i} style={{
              flex: s.est, height: 4, borderRadius: 2, background: k.bar, opacity: 0.7,
            }}/>
          );
        })}
      </div>
    </button>
  );
}

function LibrarySheet({ onClose, onApply }) {
  const [picked, setPicked] = React.useState(null);

  if (picked) {
    return <TemplatePreview t={picked} onBack={() => setPicked(null)} onApply={onApply}/>;
  }

  return (
    <SheetShell title="Plan library" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div>
          <H size={26}>Start from a tested shape.</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
            Plans refined across thousands of completions. Tap one to preview — adjust before adding.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TEMPLATES.map(t => <TemplateCard key={t.id} t={t} onPick={setPicked}/>)}
        </div>

        <Card style={{ padding: 14, background: 'rgba(155,138,196,0.06)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="sparkle" size={16} color="var(--lav)"/>
            <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.7)', lineHeight: 1.5 }}>
              Or describe your own — the AI breaker handles anything. Open the <b>+</b> button.
            </div>
          </div>
        </Card>
      </div>
    </SheetShell>
  );
}

function TemplatePreview({ t, onBack, onApply }) {
  const totalMin = t.steps.reduce((s, x) => s + x.est, 0);
  function add() {
    let cursor = 10 * 60 + 50;
    const blocks = t.steps.map((s, i) => {
      const b = {
        id: t.id + '-' + i, startMin: cursor, dur: s.est, label: s.label, kind: s.kind, done: false,
        active: false,
        scores: { urgency: 0.45, importance: 0.6, energyMatch: 0.75, success: 0.85, effort: 0.3 },
        optional: false, deps: [],
      };
      cursor += s.est;
      return b;
    });
    onApply(blocks, `Added "${t.title}"`);
  }
  return (
    <SheetShell title="Preview" onClose={onBack}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'rgba(31,27,22,0.6)', fontSize: 13, fontFamily: 'inherit',
        }}><Icon name="back" size={14}/> All plans</button>

        <div>
          <H size={26}>{t.title}</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6 }}>{t.sub}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Chip tone="paper">{t.steps.length} steps</Chip>
            <Chip tone="paper">{totalMin} min</Chip>
            <Chip tone="sage">tested</Chip>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {t.steps.map((s, i) => {
            const k = blockKindStyle(s.kind);
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: 14,
                background: 'var(--card)', borderRadius: 16,
                border: '0.5px solid rgba(31,27,22,0.06)',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                  background: k.bar, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--serif)', fontSize: 13,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'rgba(31,27,22,0.55)' }}>{s.est}m</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 4 }}>
                    <span style={{ color: k.bar, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{k.label} · </span>
                    {s.why}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter>
          <Btn variant="ghost" size="lg" onClick={onBack}>Back</Btn>
          <Btn variant="terra" size="lg" full onClick={add}>Add to today</Btn>
        </SheetFooter>
      </div>
    </SheetShell>
  );
}

Object.assign(window, { LibrarySheet, TEMPLATES });

export { TEMPLATES, TemplateCard, LibrarySheet, TemplatePreview };
