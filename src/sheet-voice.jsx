import React from 'react';
import { Bloom, Chip, Btn, H, EditableSteps } from './ui.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';
import { voicePlanEnabled, startRecording, requestVoicePlan, warmVoiceBackend, MAX_RECORD_SEC } from './voice-plan.js';

// Voice planning sheet — natural language → full day plan.
// With cloud enabled it records the mic and sends audio to the self-hosted
// Whisper + Qwen backend (via the `voice-plan` Edge Function). Without cloud
// (local-only mode, demo pages) it falls back to the original simulation.

const DEMO_TRANSCRIPT = "Plan my day — gym, two hours of deep work on the deck, lunch, emails, medium energy, around four hours free.";
const DEMO_PLAN = [
  { label: '20-min gym (low-rep)',          est: 20, kind: 'body',    why: 'Movement first lifts your next focus block by ~18%.' },
  { label: 'Shower + transition',           est: 15, kind: 'self',    why: 'Buffer to switch modes.' },
  { label: 'Deep work block 1 · deck draft',est: 50, kind: 'focus',   why: 'High energy + your morning peak.' },
  { label: 'Walk + water',                  est: 10, kind: 'rest',    why: 'Protects focus for round two.' },
  { label: 'Deep work block 2 · deck draft',est: 50, kind: 'focus',   why: 'Pair-block pattern — your sweet spot.' },
  { label: 'Lunch · phone away',            est: 30, kind: 'rest',    why: 'Real break, not desk-eating.' },
  { label: 'Email triage',                  est: 25, kind: 'self',    why: 'Lower-stakes work fits afternoon dip.' },
];

const VOICE_ERRORS = {
  'empty-plan':      "Didn't catch a plan in that — try describing your day again.",
  'backend-warming': 'The planner is waking up — give it a minute, then try again.',
  'unauthorized':    'Your session expired — sign in again to use voice planning.',
  fallback:          'Planning service unavailable right now — try again in a minute.',
};

// Offered when the backend is down so the sheet never dead-ends: a generic,
// editable day the user can reshape instead of walking away with nothing.
const STARTER_PLAN = [
  { label: '20-min walk or gym',   est: 20, kind: 'body',  why: 'Movement first lifts your next focus block.' },
  { label: 'Deep work block 1',    est: 50, kind: 'focus', why: 'Your most important thing, while energy is high.' },
  { label: 'Short break · water',  est: 10, kind: 'rest',  why: 'Protects focus for round two.' },
  { label: 'Deep work block 2',    est: 50, kind: 'focus', why: 'Pair-block pattern — finish the morning strong.' },
  { label: 'Lunch · phone away',   est: 30, kind: 'rest',  why: 'Real break, not desk-eating.' },
  { label: 'Admin & email triage', est: 25, kind: 'self',  why: 'Lower-stakes work fits the afternoon dip.' },
];

function VoiceSheet({ onClose, onApply }) {
  const live = voicePlanEnabled;
  const [stage, setStage] = React.useState('listening'); // listening | parsing | result | error
  const [transcript, setTranscript] = React.useState('');
  const [plan, setPlan] = React.useState(null);
  const [title, setTitle] = React.useState('Voice plan');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [errorCode, setErrorCode] = React.useState('');
  const [warming, setWarming] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [toCalendar, setToCalendar] = React.useState(false);
  const recRef = React.useRef(null);
  const lastAudioRef = React.useRef(null);
  const [recording, setRecording] = React.useState(false); // mic actually live?

  // --- live mode: record the mic, then send to the backend ---
  React.useEffect(() => {
    if (!live || stage !== 'listening') return;
    let cancelled = false;
    let timer = null;
    setRecording(false);
    setSeconds(0);
    warmVoiceBackend(); // cold-start the GPU container while the user talks

    // getUserMedia shows the OS permission prompt and does NOT capture any
    // audio until the user approves. Only once it resolves do we mark the mic
    // live — so the timer and the "Recording" label never appear before the
    // user has granted access, and the user knows exactly when to start talking.
    startRecording()
      .then((rec) => {
        if (cancelled) { rec.cancel(); return; }
        recRef.current = rec;
        setRecording(true);
        timer = setInterval(() => setSeconds((s) => s + 1), 1000);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg('Microphone unavailable — check app permissions.');
          setStage('error');
        }
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      recRef.current?.cancel();
      recRef.current = null;
      setRecording(false);
    };
  }, [live, stage]);

  async function finishRecording() {
    const rec = recRef.current;
    recRef.current = null;
    if (!rec) return;
    const audioBlob = await rec.stop();
    lastAudioRef.current = audioBlob;
    await submitAudio(audioBlob);
  }

  // Hit the recording cap → stop and submit automatically, so the flow never
  // stalls on a maxed-out recorder. finishRecording no-ops if already stopped.
  React.useEffect(() => {
    if (live && recording && stage === 'listening' && seconds >= MAX_RECORD_SEC) {
      finishRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, recording, stage, seconds]);

  async function submitAudio(audioBlob) {
    setStage('parsing');
    try {
      const result = await requestVoicePlan({ audioBlob, onRetry: () => setWarming(true) });
      setTranscript(result.transcript);
      setTitle(result.title);
      setPlan(result.steps);
      setStage('result');
    } catch (e) {
      setErrorCode(e?.message || '');
      setErrorMsg(VOICE_ERRORS[e?.message] || VOICE_ERRORS.fallback);
      setStage('error');
    } finally {
      setWarming(false);
    }
  }

  // Backend failures keep the recorded audio, so "Try again" resends it
  // instead of making the user re-record; speech problems re-record.
  function tryAgain() {
    const backendIssue = errorCode !== 'empty-plan' && errorCode !== 'unauthorized';
    if (backendIssue && lastAudioRef.current) submitAudio(lastAudioRef.current);
    else redo();
  }

  function useStarterDay() {
    setTranscript('');
    setTitle('Starter day');
    setPlan(STARTER_PLAN);
    setStage('result');
  }

  // --- demo mode: type out the transcript word-by-word for a "voice" feel ---
  React.useEffect(() => {
    if (live || stage !== 'listening') return;
    const words = DEMO_TRANSCRIPT.split(' ');
    let i = 0;
    const tick = setInterval(() => {
      i++;
      setTranscript(words.slice(0, i).join(' '));
      if (i >= words.length) {
        clearInterval(tick);
        setTimeout(() => setStage('parsing'), 500);
      }
    }, 120);
    return () => clearInterval(tick);
  }, [live, stage]);

  React.useEffect(() => {
    if (live || stage !== 'parsing') return;
    const t = setTimeout(() => { setPlan(DEMO_PLAN); setStage('result'); }, 900);
    return () => clearTimeout(t);
  }, [live, stage]);

  function apply() {
    onApply({ title, steps: plan }, 'Day built from your voice plan', { calendar: toCalendar });
  }

  function redo() {
    setTranscript(''); setPlan(null); setErrorMsg(''); setErrorCode('');
    lastAudioRef.current = null;
    setStage('listening');
  }

  return (
    <SheetShell title="Voice plan" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {stage === 'listening' && (
          <div style={{ paddingTop: 8 }}>
            <H size={24}>Tell me about your day.</H>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.45 }}>
              Goals, energy, how much time you have — say it naturally. I'll handle the order.
            </div>

            <div style={{
              marginTop: 24, padding: '28px 20px',
              background: 'rgba(155,138,196,0.08)', borderRadius: 22,
              border: '0.5px solid rgba(155,138,196,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
            }}>
              <VoiceWave/>
              {live ? (
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.35,
                  color: 'var(--ink)', textAlign: 'center', letterSpacing: -0.2,
                  minHeight: 96, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {!recording ? (
                    'Allow microphone access to start…'
                  ) : (() => {
                    const remaining = Math.max(0, MAX_RECORD_SEC - seconds);
                    const low = remaining <= 10;
                    return (
                      <>
                        <span>{`Recording · 0:${String(seconds).padStart(2, '0')}`}</span>
                        <span style={{
                          fontFamily: 'var(--sans)', fontSize: 12.5,
                          color: low ? 'var(--terra)' : 'rgba(31,27,22,0.5)',
                          fontWeight: low ? 600 : 400,
                        }}>
                          {`auto-stops in 0:${String(remaining).padStart(2, '0')}`}
                        </span>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.35,
                  color: 'var(--ink)', textAlign: 'center', letterSpacing: -0.2,
                  minHeight: 96, textWrap: 'pretty',
                }}>
                  "{transcript}<span style={{ color: 'var(--lav)' }}>{transcript.length < DEMO_TRANSCRIPT.length ? '█' : ''}</span>"
                </div>
              )}
              <Chip tone="lav" size="sm">{live ? (recording ? 'Recording · private' : 'Waiting for mic') : 'Listening · local'}</Chip>
            </div>
          </div>
        )}

        {stage === 'parsing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 32, alignItems: 'center', textAlign: 'center' }}>
            <Bloom value={0.4} size={110} color="var(--lav)" />
            <H size={22} style={{ maxWidth: 280 }}>Parsing constraints & organising…</H>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', maxWidth: 260, lineHeight: 1.5 }}>
              {!live ? 'gym · 2h deep work · lunch · emails · medium energy · 4h'
                : warming ? 'The planner is waking up — this first run can take an extra minute…'
                : 'Transcribing and building your day…'}
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 32, alignItems: 'center', textAlign: 'center' }}>
            <H size={22} style={{ maxWidth: 280 }}>Hmm, that didn't work.</H>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', maxWidth: 280, lineHeight: 1.5 }}>
              {errorMsg}
            </div>
            {errorCode !== 'empty-plan' && errorCode !== 'unauthorized' && (
              <Chip tone="sage" size="lg" onClick={useStarterDay} style={{ cursor: 'pointer', userSelect: 'none' }}>
                Use a starter day instead →
              </Chip>
            )}
          </div>
        )}

        {stage === 'result' && plan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(31,27,22,0.64)', marginBottom: 4 }}>
                Heard you · drafted this
              </div>
              <H size={22}>Your day, in order.</H>
            </div>

            {live && transcript && (
              <div style={{
                fontSize: 13, lineHeight: 1.5, color: 'rgba(31,27,22,0.64)',
                padding: '10px 14px', background: 'rgba(155,138,196,0.08)',
                borderRadius: 14, border: '0.5px solid rgba(155,138,196,0.3)',
              }}>
                "{transcript}"
              </div>
            )}

            <Chip tone="lav" size="sm" style={{ alignSelf: 'flex-start' }}>Edit before adding</Chip>
            <EditableSteps steps={plan} setSteps={setPlan} />
            <Chip
              tone={toCalendar ? 'sage' : 'ink'}
              size="lg"
              onClick={() => setToCalendar((v) => !v)}
              style={{ alignSelf: 'flex-start', cursor: 'pointer', userSelect: 'none' }}
            >
              {toCalendar ? '✓ Will add to your calendar' : '+ Add to my calendar too'}
            </Chip>
          </div>
        )}

        {live && stage === 'listening' && (
          <SheetFooter>
            <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
            <Btn variant="terra" size="lg" full onClick={finishRecording} disabled={!recording}>Done talking</Btn>
          </SheetFooter>
        )}

        {stage === 'error' && (
          <SheetFooter>
            <Btn variant="ghost" size="lg" onClick={onClose}>Close</Btn>
            <Btn variant="terra" size="lg" full onClick={tryAgain}>Try again</Btn>
          </SheetFooter>
        )}

        {stage === 'result' && (
          <SheetFooter>
            <Btn variant="ghost" size="lg" onClick={redo}>Redo</Btn>
            <Btn variant="terra" size="lg" full onClick={apply}>Use this day</Btn>
          </SheetFooter>
        )}
      </div>
    </SheetShell>
  );
}

function VoiceWave() {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 36 }}>
      {[0.4, 0.7, 0.9, 0.6, 1, 0.5, 0.8, 0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
        <div key={i} style={{
          width: 4, height: `${h * 100}%`,
          background: 'var(--lav)', borderRadius: 999,
          animation: `wave 1.2s ease-in-out ${i * 0.07}s infinite`,
        }}/>
      ))}
    </div>
  );
}

Object.assign(window, { VoiceSheet });

export { VoiceSheet, VoiceWave };
