// Guided product tour overlay. Activated via ?tour=1 on Cadence.html
// Steps walk investors through the key value props in 60-90 seconds.

const TOUR_STEPS = [
  {
    target: null, // intro modal
    title: 'A 60-second tour.',
    body: "Cadence turns goals into ordered micro-sequences, reshapes the day in real time, and never punishes a missed day. Let's walk through it.",
    cta: 'Start tour',
    placement: 'center',
  },
  {
    target: 'energy-card',
    title: 'Today, in a glance.',
    body: "Every day opens to a visual sequence — blocks, not lists. The energy check-in rebalances the rest of the day in one tap.",
    placement: 'bottom',
  },
  {
    target: 'why-button',
    title: 'Transparent, not magic.',
    body: 'Every order is explainable. "Why this order?" tells you in plain language why the day is shaped the way it is — based on your real patterns.',
    placement: 'bottom',
    action: 'open-why',
  },
  {
    target: null,
    title: 'Patterns, never failure rates.',
    body: 'Insights surface what works for YOU — "82% completion before 10am" — and never lost streaks. Effort is measured as a growing bloom, not a chain that breaks.',
    placement: 'center',
    action: 'go-insights',
  },
  {
    target: null,
    title: 'When life happens, one tap.',
    body: 'The killer feature. Delay, simplify, swap, or generate a gentle recovery. The constraint solver moves blocks, drops the lowest-score optional one, shows you the diff. No shame.',
    placement: 'center',
    action: 'go-today-life',
  },
  {
    target: null,
    title: 'And the AI is real.',
    body: 'Speak or type any goal — gym, deadline, novel, anything. Cadence generates 5–7 ordered micro-steps with realistic time estimates and a rationale for each. Try it with the + button.',
    placement: 'center',
    action: 'go-today',
  },
  {
    target: null,
    title: "That's the product.",
    body: "Local-first by default. ADHD-friendly. Designed for real brains and real life. Explore freely — or jump to the deck.",
    cta: 'Open the deck',
    placement: 'center',
    finalLink: 'Pitch Deck.html',
  },
];

function TourOverlay({ onExit }) {
  const [step, setStep] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState(null);
  const s = TOUR_STEPS[step];

  // Locate target element (within the phone)
  React.useEffect(() => {
    if (!s.target) { setTargetRect(null); return; }
    const el = document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) { setTargetRect(null); return; }
    const r = el.getBoundingClientRect();
    setTargetRect(r);
  }, [step]);

  // Trigger side actions (open sheet, switch tab) on entering a step
  React.useEffect(() => {
    if (!s.action) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cadence-tour-action', { detail: s.action }));
    }, 300);
    return () => clearTimeout(t);
  }, [step]);

  function next() {
    if (step === TOUR_STEPS.length - 1) {
      if (s.finalLink) location.href = s.finalLink;
      else onExit();
      return;
    }
    setStep(step + 1);
  }
  function prev() { setStep(Math.max(0, step - 1)); }

  const isCenter = s.placement === 'center';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      pointerEvents: 'none',
    }}>
      {/* Backdrop with optional cutout */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(31,27,22,0.55)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
        pointerEvents: 'auto',
        animation: 'fadein 280ms ease',
      }} onClick={() => {}}/>

      {/* Spotlight cutout on target */}
      {targetRect && (
        <div style={{
          position: 'absolute',
          left: targetRect.left - 8, top: targetRect.top - 8,
          width: targetRect.width + 16, height: targetRect.height + 16,
          borderRadius: 22,
          boxShadow: '0 0 0 9999px rgba(31,27,22,0.6), 0 0 0 2px rgba(232,180,124,0.7), 0 0 40px 4px rgba(232,180,124,0.35)',
          pointerEvents: 'none',
          transition: 'all 320ms cubic-bezier(.2,.8,.2,1)',
        }}/>
      )}

      {/* Caption card */}
      <div style={{
        position: 'absolute',
        ...(isCenter ? {
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          maxWidth: 520,
        } : {
          left: '50%', transform: 'translateX(-50%)',
          top: targetRect ? Math.min(targetRect.bottom + 24, window.innerHeight - 280) : 60,
          maxWidth: 460,
        }),
        background: 'var(--paper, #F6F1E8)',
        borderRadius: 24, padding: '28px 28px 24px',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
        animation: 'tour-pop 360ms cubic-bezier(.2,.8,.2,1)',
        fontFamily: 'var(--sans, system-ui)',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
          {TOUR_STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 22 : 5, height: 5, borderRadius: 999,
              background: i <= step ? 'var(--terra, #C26A38)' : 'rgba(31,27,22,0.12)',
              transition: 'all 280ms cubic-bezier(.2,.8,.2,1)',
            }}/>
          ))}
        </div>

        <div style={{
          fontFamily: 'var(--serif, "Instrument Serif", Georgia, serif)',
          fontSize: 28, lineHeight: 1.1, letterSpacing: -0.4,
          color: 'var(--ink, #1F1B16)',
          marginBottom: 10,
        }}>{s.title}</div>

        <div style={{
          fontSize: 14.5, color: 'rgba(31,27,22,0.65)',
          lineHeight: 1.5, marginBottom: 22,
        }}>{s.body}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <button onClick={onExit} style={{
            background: 'transparent', border: 'none', padding: '6px 4px',
            fontFamily: 'inherit', fontSize: 12.5, color: 'rgba(31,27,22,0.5)',
            cursor: 'pointer', letterSpacing: 0.2,
          }}>Skip tour</button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={prev} style={{
                padding: '10px 16px', borderRadius: 999,
                background: 'transparent', border: '1px solid rgba(31,27,22,0.16)',
                color: 'var(--ink, #1F1B16)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
              }}>Back</button>
            )}
            <button onClick={next} style={{
              padding: '10px 18px', borderRadius: 999,
              background: 'var(--terra, #C26A38)', border: 'none',
              color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 8px 20px -8px rgba(200,96,47,0.6)',
            }}>{s.cta || (step === TOUR_STEPS.length - 1 ? 'Finish' : 'Next →')}</button>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--mono, ui-monospace, monospace)',
          fontSize: 10, letterSpacing: 1.2, color: 'rgba(31,27,22,0.35)',
          marginTop: 18, textTransform: 'uppercase',
        }}>Step {step + 1} of {TOUR_STEPS.length} · Investor tour</div>
      </div>
    </div>
  );
}

Object.assign(window, { TourOverlay, TOUR_STEPS });
