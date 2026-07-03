import React from 'react';
import ReactDOM from 'react-dom/client';
import { IOSDevice } from './ios-frame.jsx';
import { App } from './app.jsx';
import './styles.css';
import './demo.css';

// Each chapter dispatches a `cadence:demo` event payload to drive the phone.
const CHAPTERS = [
  {
    id: 'welcome',
    title: 'Meet Pacely',
    body: 'A habit planner for real brains and real life. Turns vague goals into tiny, time-estimated steps you can actually start.',
    action: { close: 'all', tab: 'today', dismissOnboarding: true },
    cta: 'Start at Today',
  },
  {
    id: 'today',
    title: 'Today, organised for you',
    body: 'Your day arrives pre-planned as time-estimated blocks. No empty calendar. No willpower tax. Just press play.',
    action: { tab: 'today' },
    cta: 'See timeline',
  },
  {
    id: 'newgoal',
    title: 'Goal in, plan out',
    body: '"Run a 5K" turns into 12 micro-steps with realistic durations. AI breakdown, not a wishlist.',
    action: { tab: 'today', sheet: 'new-goal' },
    cta: 'Create a goal',
  },
  {
    id: 'why',
    title: 'Why this order?',
    body: 'Tap any block to see the reasoning. Energy curve, dependencies, deadline math — exposed, not magic.',
    action: { tab: 'today', sheet: 'why' },
    cta: 'See the planner',
  },
  {
    id: 'life',
    title: 'When life happens',
    body: 'Missed a day? Slept badly? Pacely rebalances the rest — no guilt, no broken streaks.',
    action: { tab: 'today', sheet: 'life' },
    cta: 'Life happened',
  },
  {
    id: 'library',
    title: 'Templates that respect you',
    body: 'Browse curated plans for sleep, focus, fitness. Apply in one tap, then bend them to your reality.',
    action: { tab: 'today', sheet: 'library' },
    cta: 'Open library',
  },
  {
    id: 'voice',
    title: 'Speak your intent',
    body: 'No typing. "I want to write more." Pacely catches the verb, names a goal, drafts a plan.',
    action: { tab: 'today', sheet: 'voice' },
    cta: 'Use voice',
  },
  {
    id: 'goals',
    title: 'All your plans, one place',
    body: 'Cards instead of lists. See effort bloom, not red streaks. Progress without punishment.',
    action: { tab: 'goals' },
    cta: 'View goals',
  },
  {
    id: 'cadence',
    title: 'Daily, weekly, monthly, or one-off',
    body: 'Every goal carries its own rhythm. Tap a filter to see only the daily habits, or only the long-form projects. Each card shows its cadence at a glance — the ↻ marks the ones that loop.',
    action: { tab: 'goals' },
    cta: 'Sort by rhythm',
    isNew: true,
  },
  {
    id: 'edit-goal',
    title: 'Tap to shape it',
    body: 'Open any goal inline — rename it, change its color, switch its cadence, rewrite its sub-habits. Use ‹ › at the top to jump between goals without ever leaving the Goals tab.',
    action: { tab: 'goals', editGoalIndex: 0 },
    cta: 'Edit a goal',
    isNew: true,
  },
  {
    id: 'sub-habits',
    title: 'Sub-habits, by hand',
    body: 'Tap a sub-habit to rename. Punch a new duration. Reorder with ▲▼. Add a blank row and start typing. Manual mode for when the AI guessed wrong.',
    action: { tab: 'goals', editGoalIndex: 0 },
    cta: 'Edit sub-habits',
    isNew: true,
  },
  {
    id: 'insights',
    title: 'Patterns, not pressure',
    body: 'Which hours work? Which goals stall? Insights that suggest small tweaks, never demand discipline.',
    action: { tab: 'insights' },
    cta: 'See insights',
  },
  {
    id: 'settings',
    title: 'Your shape, your rules',
    body: 'Tune your energy profile, replay onboarding, opt out of features. Local-first by default.',
    action: { tab: 'settings' },
    cta: 'Open settings',
  },
  {
    id: 'energy',
    title: 'Your energy, drawn',
    body: 'A literal curve, not a vibes-based morning person/night owl toggle. Pacely organises against it.',
    action: { tab: 'settings', sheet: 'energy' },
    cta: 'Edit profile',
  },
];

function fire(payload) {
  window.dispatchEvent(new CustomEvent('cadence:demo', { detail: payload }));
}

function ChapterCard({ chapter, active, onActivate, index }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [active]);

  return (
    <div
      ref={ref}
      className={`chapter ${active ? 'is-active' : ''} ${chapter.isNew ? 'is-new' : ''}`}
      onClick={() => onActivate(index)}
    >
      <div className="chapter-meta">
        <span className="chapter-num">{String(index + 1).padStart(2, '0')}</span>
        {chapter.isNew && <span className="chapter-tag">v0.5 · new</span>}
      </div>
      <h2>{chapter.title}</h2>
      <p>{chapter.body}</p>
      <button
        className="chapter-cta"
        onClick={(e) => { e.stopPropagation(); onActivate(index); }}
      >
        {chapter.cta} →
      </button>
    </div>
  );
}

function Demo() {
  const [active, setActive] = React.useState(0);
  const [autoplay, setAutoplay] = React.useState(false);

  // While a CTA-initiated smooth scroll is in flight, chapters passing
  // through the viewport must not fire their actions — they'd override the
  // one the user actually clicked. settleRef mutes the observer until then.
  const settleRef = React.useRef(0);

  const go = React.useCallback((idx) => {
    settleRef.current = Date.now() + 1200;
    setActive(idx);
    fire(CHAPTERS[idx].action);
  }, []);

  // Fire initial chapter once on mount
  React.useEffect(() => {
    const t = setTimeout(() => fire(CHAPTERS[0].action), 200);
    return () => clearTimeout(t);
  }, []);

  // Autoplay timer
  React.useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => {
      setActive(a => {
        const next = (a + 1) % CHAPTERS.length;
        fire(CHAPTERS[next].action);
        return next;
      });
    }, 5500);
    return () => clearInterval(t);
  }, [autoplay]);

  // Scroll observer — sync active chapter to scroll position
  React.useEffect(() => {
    if (autoplay) return;
    const els = Array.from(document.querySelectorAll('.chapter'));
    const obs = new IntersectionObserver((entries) => {
      if (Date.now() < settleRef.current) return;
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) {
        const idx = els.indexOf(visible[0].target);
        if (idx >= 0 && idx !== active) {
          setActive(idx);
          fire(CHAPTERS[idx].action);
        }
      }
    }, { threshold: [0.55] });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  return (
    <div className="demo-shell">
      <header className="demo-header">
        <div className="brand">
          <div className="brand-dot" />
          <span>Pacely</span>
          <em>· interactive prototype</em>
        </div>
        <div className="demo-controls">
          <button
            className={`pill ${autoplay ? 'on' : ''}`}
            onClick={() => setAutoplay(a => !a)}
            title="Auto-advance every 5.5s"
          >
            {autoplay ? '■ Stop' : '▶ Autoplay'}
          </button>
          <a className="pill ghost" href="https://github.com/acash17/habit-tracker" target="_blank" rel="noreferrer">GitHub →</a>
        </div>
      </header>

      <div className="demo-body">
        <aside className="phone-stage">
          <IOSDevice width={402} height={874}>
            <App requireAuth={false} />
          </IOSDevice>
          <div className="phone-caption">
            Chapter <strong>{String(active + 1).padStart(2, '0')}</strong> / {String(CHAPTERS.length).padStart(2, '0')}
            &nbsp;·&nbsp; {CHAPTERS[active].title}
          </div>
        </aside>

        <main className="narrative">
          <div className="hero">
            <div className="kicker">Pacely · v0.4 prototype</div>
            <h1>The planner that plans for you.</h1>
            <p>Scroll, or hit autoplay. The phone follows along.</p>
          </div>
          {CHAPTERS.map((c, i) => (
            <ChapterCard key={c.id} chapter={c} index={i} active={i === active} onActivate={go} />
          ))}
          <footer className="demo-footer">
            <p>Built with React + Vite + Capacitor. Same source code ships to web, iOS, and Android.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('demo-mount')).render(<Demo />);
