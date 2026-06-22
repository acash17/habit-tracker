import React from 'react';
import { Icon, Bloom, Card, H } from './ui.jsx';
import { analyzeBreakpoints } from './breakpoints.js';
import { cellColor } from './palette.js';
import { useAuth } from './use-auth.js';
import { cloudEnabled } from './supabase.js';
import { requestSignIn } from './consent.js';
import { getRhythm, bucketsToMatrix, deriveRhythmStats, DAYS, BINS, binLabel } from './rhythm.js';

// Insights — real rhythm from the user's own completion history (signed in),
// computed by the rhythm_by_hour RPC. Non-punitive: peaks and slumps, not scores.

const RHYTHM_COLOR = 'terracotta';

function InsightCard({ i }) {
  const tone = i.kind === 'celebrate' ? 'lav' : 'terra';
  const accent = i.kind === 'celebrate' ? 'var(--lav)' : 'var(--terra)';
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: i.kind === 'celebrate' ? 'rgba(155,138,196,0.16)' : 'rgba(200,96,47,0.12)',
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={i.kind === 'celebrate' ? 'leaf' : 'sparkle'} size={16}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.2,
            color: 'var(--ink)', letterSpacing: -0.25, textWrap: 'pretty',
          }}>{i.headline}</div>
          <div style={{
            fontSize: 13, color: 'rgba(31,27,22,0.64)',
            marginTop: 8, lineHeight: 1.45,
          }}>{i.detail}</div>
        </div>
      </div>
    </Card>
  );
}

// Discretize a raw bucket total into a 0..3 intensity for the cell color ramp,
// relative to the busiest cell so the heatmap reads well at any data volume.
function toLevel(total, max) {
  if (!total || max <= 0) return 0;
  return Math.max(1, Math.min(3, Math.ceil((total / max) * 3)));
}

function RhythmPanel({ matrix, stats }) {
  const [day, setDay] = React.useState(stats.peakDay);
  React.useEffect(() => { setDay(stats.peakDay); }, [stats.peakDay]);

  const max = Math.max(1, ...matrix.flat());
  const dayRow = matrix[day] || [];
  const rowMax = Math.max(1, ...dayRow);

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 4 }}>
        Your rhythm
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3, marginBottom: 14 }}>
        When you actually show up
      </div>

      {/* callouts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(31,27,22,0.64)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--terra)' }} />
          Peak · <strong style={{ color: 'var(--ink)' }}>{DAYS[stats.peakDay]} {binLabel(stats.peakBin)}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(31,27,22,0.64)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'rgba(31,27,22,0.3)' }} />
          Laziest · <strong style={{ color: 'var(--ink)' }}>daily {binLabel(stats.lazyBin)}</strong>
        </div>
      </div>

      {/* day × bin matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4, paddingLeft: 30 }}>
          {BINS.map(b => (
            <span key={b} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(31,27,22,0.4)' }}>{b}</span>
          ))}
        </div>
        {matrix.map((row, d) => (
          <div key={d} onClick={() => setDay(d)} style={{
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            opacity: day === d ? 1 : 0.8,
          }}>
            <span style={{
              width: 26, fontFamily: 'var(--mono)', fontSize: 9,
              color: day === d ? 'var(--ink)' : 'rgba(31,27,22,0.45)',
              fontWeight: day === d ? 700 : 400,
            }}>{DAYS[d]}</span>
            {row.map((v, b) => (
              <div key={b} style={{
                flex: 1, height: 18, borderRadius: 3,
                background: cellColor(RHYTHM_COLOR, toLevel(v, max)),
                outline: (d === stats.peakDay && b === stats.peakBin) ? '1.5px solid var(--ink)' : 'none',
                outlineOffset: -1,
              }} />
            ))}
          </div>
        ))}
      </div>

      {/* selected day hourly bars */}
      <div style={{ marginTop: 16, borderTop: '0.5px solid rgba(31,27,22,0.08)', paddingTop: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(31,27,22,0.64)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {DAYS[day]} · by time of day
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90, marginTop: 10 }}>
          {dayRow.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: '100%', borderRadius: 4,
                height: `${Math.max(6, (v / rowMax) * 76)}px`,
                background: cellColor(RHYTHM_COLOR, toLevel(v, max)),
                transition: 'height 200ms ease',
              }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(31,27,22,0.64)' }}>{BINS[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// Empty / prompt cards keep the same Card language as the data view.
function RhythmPrompt({ title, body, children }) {
  return (
    <Card style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)' }}>
        Your rhythm
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3, lineHeight: 1.15 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', lineHeight: 1.45 }}>{body}</div>
      {children}
    </Card>
  );
}

function RhythmSection() {
  const { user, ready } = useAuth();
  const [state, setState] = React.useState({ loading: true, matrix: null, stats: null });

  React.useEffect(() => {
    if (!cloudEnabled || !user) { setState({ loading: false, matrix: null, stats: null }); return; }
    let cancelled = false;
    setState(s => ({ ...s, loading: true }));
    getRhythm().then(buckets => {
      if (cancelled) return;
      const matrix = bucketsToMatrix(buckets || []);
      setState({ loading: false, matrix, stats: deriveRhythmStats(matrix) });
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Routes through the app-level ConsentGate (prompts for consent if needed).
  function onSignIn() { requestSignIn(); }

  // Cloud not configured — rhythm needs the backend.
  if (!cloudEnabled) {
    return (
      <RhythmPrompt
        title="Rhythm needs sync"
        body="Time-of-day insights are computed in the cloud. Configure Supabase (docs/SUPABASE_SETUP.md) to unlock your rhythm." />
    );
  }

  // Signed out — CTA.
  if (!user) {
    return (
      <RhythmPrompt
        title="See your rhythm"
        body="Sign in to discover your peak and laziest hours, computed from your own completion history.">
        <button
          onClick={onSignIn}
          disabled={!ready}
          style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
            background: '#fff', color: '#1F1B16', border: '0.5px solid rgba(31,27,22,0.18)',
            boxShadow: '0 1px 2px rgba(31,27,22,0.05)', fontFamily: 'inherit', fontSize: 14,
            fontWeight: 500, opacity: ready ? 1 : 0.6,
          }}>
          Continue with Google
        </button>
      </RhythmPrompt>
    );
  }

  if (state.loading) {
    return <RhythmPrompt title="Reading your rhythm…" body="Pulling your completion history." />;
  }

  // Signed in, no data yet.
  if (!state.stats || !state.stats.hasData) {
    return (
      <RhythmPrompt
        title="Log a few days"
        body="Tap to log completions on your goals and your rhythm — peak and laziest hours — appears here." />
    );
  }

  return <RhythmPanel matrix={state.matrix} stats={state.stats} />;
}

// ── "Where your sequences stall" — chain break-point insight ─────────────────
// Computed from local per-step data, so it works offline (no cloud needed).
function StallDots({ total, stallIndex }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < stallIndex;
        const isStall = i === stallIndex;
        return (
          <div key={i} title={`Step ${i + 1}`} style={{
            width: 14, height: 14, borderRadius: 999,
            background: done ? 'var(--sage)' : isStall ? 'transparent' : 'rgba(31,27,22,0.08)',
            border: isStall ? '2px solid var(--terra)' : 'none',
            boxShadow: isStall ? '0 0 0 3px rgba(194,106,56,0.15)' : 'none',
          }} />
        );
      })}
    </div>
  );
}

function BreakpointInsight({ goals }) {
  const analysis = React.useMemo(() => analyzeBreakpoints(goals || []), [goals]);
  if (!analysis.hasSignal) return null; // nothing stalled → don't nag

  const { stalled, commonStep, commonCount } = analysis;
  const headline = commonStep && commonCount >= 2
    ? `Your plans tend to stall at step ${commonStep}.`
    : 'Here’s where your plans are paused right now.';

  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.1, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 6 }}>
        Where momentum dips
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3, lineHeight: 1.2 }}>
        {headline}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.5 }}>
        Not a failure — usually the next step just needs to be smaller. Tap a goal to shrink it.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {stalled.slice(0, 4).map(g => (
          <div key={g.goalId} style={{ padding: 12, background: 'var(--paper-2)', borderRadius: 12 }}>
            <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{g.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 3 }}>
              Stuck at step {g.stallIndex + 1}: <span style={{ color: 'var(--terra)', fontWeight: 500 }}>{g.stallStep}</span>
              {g.stallEst ? ` · ${g.stallEst}m` : ''} — {g.doneBefore}/{g.total} done
            </div>
            <StallDots total={g.total} stallIndex={g.stallIndex} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function InsightsScreen({ goals }) {
  // Insights are derived from real goals/completions — no canned template cards.
  // With no goals there's nothing to analyse, so show a prompt instead.
  const hasGoals = Array.isArray(goals) && goals.length > 0;
  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.64)', textTransform: 'uppercase', marginBottom: 6,
        }}>Patterns · not scores</div>
        <H size={32}>Insights</H>
        <div style={{
          marginTop: 6, fontSize: 14, color: 'rgba(31,27,22,0.64)',
          lineHeight: 1.4, textWrap: 'pretty',
        }}>
          What’s working, in your own words. We measure effort and patterns — never failure.
        </div>
      </div>

      {hasGoals ? (
        <>
          <BreakpointInsight goals={goals} />
          <RhythmSection />
        </>
      ) : (
        <Card style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
          <Bloom value={0.4} size={92} color="var(--lav)" />
          <div style={{ fontFamily: 'var(--serif)', fontSize: 21, color: 'var(--ink)', letterSpacing: -0.3 }}>
            No insights yet.
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.64)', lineHeight: 1.5, maxWidth: 270 }}>
            Add a goal and start working your plans — your patterns and rhythm appear here, drawn from what you actually do.
          </div>
        </Card>
      )}
    </div>
  );
}

Object.assign(window, { InsightsScreen });

export { InsightCard, RhythmPanel, BreakpointInsight, InsightsScreen };
