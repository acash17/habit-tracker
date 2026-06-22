import React from 'react';
import { Chip, Btn, Card, H } from './ui.jsx';
import { Toggle } from './screen-settings.jsx';
import { SheetShell, SheetFooter } from './planner.jsx';
import { minToTime } from './data.jsx';

// Energy profile editor — visible 24h energy curve.
// Settings -> opens this. The profile feeds the "Energy match" sub-score.

const DEFAULT_CURVE = [
  // 24 hours, value 0..1
  0.20, 0.15, 0.10, 0.10, 0.15, 0.30,  // 12am - 5am (sleep)
  0.55, 0.78, 0.92, 0.95, 0.88, 0.75,  // 6am - 11am (morning peak)
  0.55, 0.42, 0.50, 0.62, 0.55, 0.48,  // 12pm - 5pm (afternoon dip)
  0.40, 0.35, 0.30, 0.25, 0.22, 0.20,  // 6pm - 11pm (wind down)
];

function EnergyCurveEditor({ value, onChange }) {
  const [hover, setHover] = React.useState(null);
  const W = 320, H = 140, P = 8;
  const stepX = (W - P * 2) / 23;

  const points = value.map((v, i) => [
    P + i * stepX,
    P + (1 - v) * (H - P * 2),
  ]);

  // smooth path via Catmull-Rom-ish
  function path(pts) {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const cx = (x1 + x2) / 2;
      d += ` Q${x1} ${y1} ${cx} ${(y1 + y2) / 2}`;
      d += ` Q${x2} ${y2} ${x2} ${y2}`;
    }
    return d;
  }

  function handlePointer(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.touches?.[0]?.clientX ?? e.clientX) - rect.left) / rect.width * W;
    const y = ((e.touches?.[0]?.clientY ?? e.clientY) - rect.top) / rect.height * H;
    const idx = Math.round((x - P) / stepX);
    if (idx < 0 || idx > 23) return;
    const newVal = Math.max(0.05, Math.min(1, 1 - (y - P) / (H - P * 2)));
    const next = [...value];
    next[idx] = newVal;
    onChange(next);
    setHover(idx);
  }

  const peakHour = value.indexOf(Math.max(...value));
  const dipHour = value.slice(6).indexOf(Math.min(...value.slice(6, 22))) + 6;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', touchAction: 'none', cursor: 'crosshair' }}
        onMouseMove={(e) => e.buttons === 1 && handlePointer(e)}
        onMouseDown={handlePointer}
        onTouchMove={handlePointer}
        onTouchStart={handlePointer}
      >
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1={P} y1={P + (1 - g) * (H - P * 2)} x2={W - P} y2={P + (1 - g) * (H - P * 2)}
            stroke="rgba(31,27,22,0.06)" strokeDasharray="2 4"/>
        ))}
        {/* area fill */}
        <path d={`${path(points)} L${W - P} ${H - P} L${P} ${H - P} Z`} fill="rgba(200,96,47,0.12)"/>
        {/* curve */}
        <path d={path(points)} stroke="var(--terra)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* peak marker */}
        <circle cx={points[peakHour][0]} cy={points[peakHour][1]} r="4" fill="var(--terra)"/>
        {/* hour labels */}
        {[6, 12, 18].map(h => (
          <text key={h} x={P + h * stepX} y={H - 0} fontSize="9" fill="rgba(31,27,22,0.45)"
            textAnchor="middle" fontFamily="var(--mono)">
            {h === 12 ? '12p' : h > 12 ? `${h-12}p` : `${h}a`}
          </text>
        ))}
        {hover != null && (
          <g>
            <line x1={points[hover][0]} y1={P} x2={points[hover][0]} y2={H - P}
              stroke="var(--ink)" strokeWidth="0.5" opacity="0.3"/>
            <circle cx={points[hover][0]} cy={points[hover][1]} r="5" fill="var(--ink)"/>
          </g>
        )}
      </svg>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11.5, color: 'rgba(31,27,22,0.64)' }}>
        <Chip tone="terra">Peak {minToTime(peakHour * 60)}</Chip>
        <Chip tone="ink">Dip {minToTime(dipHour * 60)}</Chip>
      </div>
    </div>
  );
}

function EnergyProfileSheet({ onClose, onSave, initial }) {
  const [curve, setCurve] = React.useState(initial || DEFAULT_CURVE);
  const [learn, setLearn] = React.useState(true);

  return (
    <SheetShell title="Energy profile" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <H size={26}>When does your brain show up?</H>
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.45 }}>
            Drag the curve to match your real pattern. The planner uses this to route focus blocks into peaks and lighter work into dips.
          </div>
        </div>

        <Card style={{ padding: 16 }}>
          <EnergyCurveEditor value={curve} onChange={setCurve}/>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ProfilePreset label="Morning lark" curve={[0.1,0.1,0.1,0.1,0.2,0.5,0.8,0.95,0.98,0.92,0.85,0.7,0.55,0.4,0.45,0.5,0.45,0.4,0.35,0.3,0.25,0.2,0.15,0.1]} onPick={setCurve}/>
          <ProfilePreset label="Night owl"    curve={[0.55,0.6,0.5,0.3,0.2,0.15,0.2,0.3,0.45,0.55,0.6,0.6,0.55,0.5,0.55,0.62,0.7,0.78,0.85,0.92,0.95,0.88,0.78,0.65]} onPick={setCurve}/>
          <ProfilePreset label="Two-peak"     curve={[0.15,0.1,0.1,0.1,0.15,0.4,0.7,0.85,0.92,0.85,0.7,0.5,0.4,0.5,0.62,0.75,0.85,0.78,0.65,0.5,0.4,0.3,0.25,0.2]} onPick={setCurve}/>
        </div>

        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>Auto-learn from check-ins</div>
              <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.64)', marginTop: 3, lineHeight: 1.4 }}>
                Refine the curve from your daily energy logs. On-device only.
              </div>
            </div>
            <Toggle on={learn} onChange={setLearn}/>
          </div>
        </Card>

        <SheetFooter>
          <Btn variant="ghost" size="lg" onClick={onClose}>Cancel</Btn>
          <Btn variant="terra" size="lg" full onClick={() => onSave(curve)}>Save profile</Btn>
        </SheetFooter>
      </div>
    </SheetShell>
  );
}

function ProfilePreset({ label, curve, onPick }) {
  // tiny sparkline
  const W = 80, H = 22;
  const pts = curve.map((v, i) => `${(i / 23) * W},${H - v * H}`).join(' ');
  return (
    <button onClick={() => onPick(curve)} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px', background: 'var(--card)',
      border: '0.5px solid rgba(31,27,22,0.06)', borderRadius: 14,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{label}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 80, height: 22 }}>
        <polyline points={pts} fill="none" stroke="var(--terra)" strokeWidth="1.5"/>
      </svg>
    </button>
  );
}

Object.assign(window, { EnergyProfileSheet, DEFAULT_CURVE });

export { DEFAULT_CURVE, EnergyCurveEditor, EnergyProfileSheet, ProfilePreset };
