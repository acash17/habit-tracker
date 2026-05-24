// Insights — non-punitive pattern surfaces

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
            fontSize: 13, color: 'rgba(31,27,22,0.62)',
            marginTop: 8, lineHeight: 1.45,
          }}>{i.detail}</div>
        </div>
      </div>
    </Card>
  );
}

// Lightweight bar chart for time-of-day completion
function CompletionByHour() {
  const data = [
    { h: '6a', v: 0.92 }, { h: '8a', v: 0.86 }, { h: '10a', v: 0.78 },
    { h: '12p', v: 0.52 }, { h: '2p', v: 0.61 }, { h: '4p', v: 0.48 },
    { h: '6p', v: 0.41 }, { h: '8p', v: 0.32 },
  ];
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', marginBottom: 4 }}>
        Last 28 days
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)', letterSpacing: -0.3, marginBottom: 16 }}>
        Completion by start hour
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110, padding: '0 4px' }}>
        {data.map(d => (
          <div key={d.h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: `${d.v * 100}%`,
                background: d.v >= 0.7 ? 'var(--terra)' : d.v >= 0.5 ? 'rgba(200,96,47,0.4)' : 'rgba(31,27,22,0.12)',
                borderRadius: 4,
              }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(31,27,22,0.5)', fontFamily: 'var(--mono)' }}>{d.h}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.55)', marginTop: 14, lineHeight: 1.4 }}>
        Your mornings are pulling more weight than you think. No judgment on afternoons — just data.
      </div>
    </Card>
  );
}

function InsightsScreen() {
  return (
    <div style={{ padding: '0 18px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 1.2,
          color: 'rgba(31,27,22,0.5)', textTransform: 'uppercase', marginBottom: 6,
        }}>Patterns · not scores</div>
        <H size={32}>Insights</H>
        <div style={{
          marginTop: 6, fontSize: 14, color: 'rgba(31,27,22,0.62)',
          lineHeight: 1.4, textWrap: 'pretty',
        }}>
          What’s working, in your own words. We measure effort and patterns — never failure.
        </div>
      </div>

      {/* Bloom hero */}
      <Card style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Bloom value={0.78} size={92} color="var(--terra)" />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 28, lineHeight: 1, color: 'var(--ink)', letterSpacing: -0.4,
          }}>14 days</div>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.6)', marginTop: 6, lineHeight: 1.4 }}>
            of stacked effort. The bloom keeps growing whether you show up daily or not.
          </div>
        </div>
      </Card>

      <CompletionByHour />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {INSIGHTS.map(i => <InsightCard key={i.id} i={i}/>)}
      </div>
    </div>
  );
}

Object.assign(window, { InsightsScreen });
