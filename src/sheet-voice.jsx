// Voice planning sheet — natural language → full day sequence.
// Simulates a voice capture, shows live transcript, then parses into a plan.

function VoiceSheet({ onClose, onApply }) {
  const [stage, setStage] = React.useState('listening'); // listening | parsing | result
  const fullTranscript = "Plan my day — gym, two hours of deep work on the deck, lunch, emails, medium energy, around four hours free.";
  const [transcript, setTranscript] = React.useState('');
  const [plan, setPlan] = React.useState(null);

  // Type out the transcript word-by-word for a "voice" feel.
  React.useEffect(() => {
    if (stage !== 'listening') return;
    const words = fullTranscript.split(' ');
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
  }, [stage]);

  React.useEffect(() => {
    if (stage !== 'parsing') return;
    const t = setTimeout(() => {
      setPlan([
        { label: '20-min gym (low-rep)',          est: 20, kind: 'body',    why: 'Movement first lifts your next focus block by ~18%.' },
        { label: 'Shower + transition',           est: 15, kind: 'self',    why: 'Buffer to switch modes.' },
        { label: 'Deep work block 1 · deck draft',est: 50, kind: 'focus',   why: 'High energy + your morning peak.' },
        { label: 'Walk + water',                  est: 10, kind: 'rest',    why: 'Protects focus for round two.' },
        { label: 'Deep work block 2 · deck draft',est: 50, kind: 'focus',   why: 'Pair-block pattern — your sweet spot.' },
        { label: 'Lunch · phone away',            est: 30, kind: 'rest',    why: 'Real break, not desk-eating.' },
        { label: 'Email triage',                  est: 25, kind: 'self',    why: 'Lower-stakes work fits afternoon dip.' },
      ]);
      setStage('result');
    }, 900);
    return () => clearTimeout(t);
  }, [stage]);

  function apply() {
    let cursor = 9 * 60;
    const blocks = plan.map((p, i) => {
      const b = {
        id: 'v' + i, startMin: cursor, dur: p.est, label: p.label, kind: p.kind, done: false,
        active: i === 0,
        scores: { urgency: 0.5, importance: 0.65, energyMatch: 0.8, success: 0.75, effort: 0.4 },
        optional: p.kind === 'reading', deps: [],
      };
      cursor += p.est;
      return b;
    });
    onApply(blocks, 'Day built from your voice plan');
  }

  return (
    <SheetShell title="Voice plan" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {stage === 'listening' && (
          <div style={{ paddingTop: 8 }}>
            <H size={24}>Tell me about your day.</H>
            <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.45 }}>
              Goals, energy, how much time you have — say it naturally. I'll handle the order.
            </div>

            <div style={{
              marginTop: 24, padding: '28px 20px',
              background: 'rgba(155,138,196,0.08)', borderRadius: 22,
              border: '0.5px solid rgba(155,138,196,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
            }}>
              <VoiceWave/>
              <div style={{
                fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.35,
                color: 'var(--ink)', textAlign: 'center', letterSpacing: -0.2,
                minHeight: 96, textWrap: 'pretty',
              }}>
                "{transcript}<span style={{ color: 'var(--lav)' }}>{transcript.length < fullTranscript.length ? '\u2588' : ''}</span>"
              </div>
              <Chip tone="lav" size="sm">Listening · local</Chip>
            </div>
          </div>
        )}

        {stage === 'parsing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 32, alignItems: 'center', textAlign: 'center' }}>
            <Bloom value={0.4} size={110} color="var(--lav)" />
            <H size={22} style={{ maxWidth: 280 }}>Parsing constraints & sequencing…</H>
            <div style={{ fontSize: 12.5, color: 'rgba(31,27,22,0.55)', maxWidth: 260, lineHeight: 1.5 }}>
              gym · 2h deep work · lunch · emails · medium energy · 4h
            </div>
          </div>
        )}

        {stage === 'result' && plan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 4 }}>
                Heard you · drafted this
              </div>
              <H size={22}>Your day, in order.</H>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.map((s, i) => {
                const k = blockKindStyle(s.kind);
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 12, padding: 12,
                    background: 'var(--card)', borderRadius: 14,
                    border: '0.5px solid rgba(31,27,22,0.06)',
                  }}>
                    <div style={{ width: 4, borderRadius: 2, background: k.bar, flexShrink: 0 }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'rgba(31,27,22,0.55)' }}>{s.est}m</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.55)', marginTop: 4, lineHeight: 1.4 }}>{s.why}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === 'result' && (
          <SheetFooter>
            <Btn variant="ghost" size="lg" onClick={() => { setStage('listening'); setTranscript(''); }}>Redo</Btn>
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
