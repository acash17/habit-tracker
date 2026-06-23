import React from 'react';

// Guided tour overlay — floating-cloud coachmarks over real UI.
// Two step sets share one engine:
//   • TOUR_STEPS         — investor walkthrough, activated via ?tour=1.
//   • FEATURE_TOUR_STEPS — user feature tour, auto-runs once after onboarding
//     and is replayable from the floating "?" button or Settings.

// ── User feature tour ────────────────────────────────────────────────────────
// Anchored to real elements via data-tour. `action` events are dispatched on the
// `cadence-tour-action` bus so the app can switch tabs as the tour advances.
const FEATURE_TOUR_STEPS = [
  {
    target: null,
    title: 'Welcome to Pacely.',
    body: "A 30-second tour of what each part does. You can skip anytime — and replay it later from the ? button.",
    cta: 'Show me',
    placement: 'center',
    action: 'go-today',
  },
  {
    target: 'today-timeline',
    title: 'Your day, as blocks.',
    body: 'Today opens to a visual plan — time-estimated blocks, not a checklist. Tap a block to expand it; tap the circle to mark it done.',
    placement: 'auto',
  },
  {
    target: 'energy-card',
    title: 'Set your energy.',
    body: 'Tell Pacely how you feel and it rebalances the rest of the day. “Adapt for today” reshuffles in one tap.',
    placement: 'auto',
  },
  {
    target: 'why-button',
    title: 'Never a black box.',
    body: '“Why this order?” explains, in plain language, why your day is shaped the way it is — based on your real patterns.',
    placement: 'auto',
  },
  {
    target: 'quick-actions',
    title: 'Three fast ways in.',
    body: 'Speak a plan with Voice, start from a tested Library template, or hit “Life happened” to reshape the day with no guilt.',
    placement: 'auto',
  },
  {
    target: 'fab-new',
    title: 'Turn any goal into a plan.',
    body: 'Tap + and name a goal. Pacely breaks it into ordered micro-steps with time estimates — and every step is editable before you save.',
    placement: 'auto',
  },
  {
    target: 'tab-goals',
    title: 'All your plans live here.',
    body: 'Goals become cards of micro-steps. Tap any card to rename it, change its rhythm, or edit sub-habits inline.',
    placement: 'auto',
    action: 'go-goals',
  },
  {
    target: 'tab-insights',
    title: 'Patterns, never failure.',
    body: 'Insights surface what works for you — your peak hours, where plans stall — and never punish a missed day.',
    placement: 'auto',
    action: 'go-insights',
  },
  {
    target: 'tab-you',
    title: 'Yours, and private.',
    body: 'Local-first by default. Sync is opt-in. Manage your profile, reminders, and data — export or erase anytime.',
    placement: 'auto',
    action: 'go-you',
  },
  {
    target: null,
    title: "That's the tour.",
    body: 'Replay it anytime from the ? button, or in You → Replay feature tour. Now go build your first plan.',
    cta: 'Start using Pacely',
    placement: 'center',
    action: 'go-today',
  },
];

// ── Investor tour ────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    target: null, // intro modal
    title: 'A 60-second tour.',
    body: "Pacely turns goals into organised daily plans, reshapes the day in real time, and never punishes a missed day. Let's walk through it.",
    cta: 'Start tour',
    placement: 'center',
  },
  {
    target: 'energy-card',
    title: 'Today, in a glance.',
    body: "Every day opens to a visual plan — blocks, not lists. The energy check-in rebalances the rest of the day in one tap.",
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
    body: 'Speak or type any goal — gym, deadline, novel, anything. Pacely generates 5–7 ordered micro-steps with realistic time estimates and a rationale for each. Try it with the + button.',
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

function TourOverlay({ onExit, steps = TOUR_STEPS, label = 'Investor tour' }) {
  const [step, setStep] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState(null);
  const s = steps[step];

  // Locate target element (within the phone). Re-measure after the step's side
  // action (tab switch) has had a moment to render the anchor.
  React.useEffect(() => {
    if (!s.target) { setTargetRect(null); return; }
    let tries = 0;
    function locate() {
      const el = document.querySelector(`[data-tour="${s.target}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        // allow the scroll to settle before measuring
        setTimeout(() => setTargetRect(el.getBoundingClientRect()), 220);
        return;
      }
      if (tries++ < 8) setTimeout(locate, 80); else setTargetRect(null);
    }
    locate();
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
    if (step === steps.length - 1) {
      if (s.finalLink) location.href = s.finalLink;
      else onExit();
      return;
    }
    setStep(step + 1);
  }
  function prev() { setStep(Math.max(0, step - 1)); }

  const isCenter = s.placement === 'center' || (s.placement === 'auto' && !targetRect);
  // For anchored steps, float the cloud below the target — unless the target sits
  // in the lower half of the screen (tab bar, FAB), where we float it above so it
  // never runs off-screen. The tail flips to keep pointing at the element.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = !targetRect || (targetRect.top + targetRect.height / 2) < vh * 0.55;
  const tailX = targetRect
    ? Math.max(28, Math.min((typeof window !== 'undefined' ? window.innerWidth : 380) - 28, targetRect.left + targetRect.width / 2))
    : 0;

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

      {/* Caption card — the floating cloud */}
      <div style={{
        position: 'absolute',
        ...(isCenter ? {
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          maxWidth: 520,
        } : below ? {
          left: 16, right: 16,
          top: targetRect ? Math.min(targetRect.bottom + 18, vh - 300) : 60,
        } : {
          left: 16, right: 16,
          bottom: targetRect ? Math.max(18, vh - targetRect.top + 18) : 60,
        }),
        background: 'var(--paper, #F6F1E8)',
        borderRadius: 24, padding: '24px 24px 20px',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
        pointerEvents: 'auto',
        animation: isCenter
          ? 'tour-pop 360ms cubic-bezier(.2,.8,.2,1)'
          : 'tour-cloud-in 360ms cubic-bezier(.2,.8,.2,1)',
        fontFamily: 'var(--sans, system-ui)',
      }}>
        {/* Pointer tail toward the spotlighted element */}
        {!isCenter && targetRect && (
          <div style={{
            position: 'fixed',
            left: tailX - 9,
            ...(below
              ? { top: targetRect.bottom + 18 - 8 }
              : { top: targetRect.top - 18 - 8 }),
            width: 18, height: 18,
            background: 'var(--paper, #F6F1E8)',
            transform: 'rotate(45deg)',
            borderRadius: 4,
            boxShadow: below ? 'none' : '6px 6px 14px -8px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: -1,
          }}/>
        )}
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 18 }}>
          {steps.map((_, i) => (
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
            fontFamily: 'inherit', fontSize: 13, color: 'rgba(31,27,22,0.64)',
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
            }}>{s.cta || (step === steps.length - 1 ? 'Finish' : 'Next →')}</button>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--mono, ui-monospace, monospace)',
          fontSize: 12, letterSpacing: 1.2, color: 'rgba(31,27,22,0.35)',
          marginTop: 18, textTransform: 'uppercase',
        }}>Step {step + 1} of {steps.length} · {label}</div>
      </div>
    </div>
  );
}

Object.assign(window, { TourOverlay, TOUR_STEPS, FEATURE_TOUR_STEPS });

export { TOUR_STEPS, FEATURE_TOUR_STEPS, TourOverlay };
