import React from 'react';
import ReactDOM from 'react-dom/client';
import { PALETTE, paletteHex } from './palette.js';
import './styles.css';
import './prototype.css';

// ── Theme-aware cell color (light paper OR dark) ──────────────────────────────
function rgb(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function cell(colorKey, level, dark) {
  if (!level) return dark ? 'rgba(255,255,255,0.06)' : 'rgba(31,27,22,0.07)';
  const { r, g, b } = rgb(paletteHex(colorKey));
  const a = level === 1 ? 0.34 : level === 2 ? 0.64 : 1;
  return `rgba(${r},${g},${b},${a})`;
}

// Deterministic pseudo-random grid so renders are stable.
function makeGrid(weeks, seed = 1, density = 0.6) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const g = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      col.push(rnd() < density ? 1 + Math.floor(rnd() * 3) : 0);
    }
    g.push(col);
  }
  return g;
}

function Grid({ grid, colorKey, dark, size = 11, gap = 3, radius = 2.5 }) {
  return (
    <div style={{ display: 'flex', gap }}>
      {grid.map((col, wi) => (
        <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap }}>
          {col.map((lvl, di) => (
            <div key={di} style={{ width: size, height: size, borderRadius: radius, background: cell(colorKey, lvl, dark) }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Panel 1: Dark mode ────────────────────────────────────────────────────────
function DarkModePanel() {
  const [dark, setDark] = React.useState(true);
  const grid = React.useMemo(() => makeGrid(13, 7, 0.62), []);
  return (
    <div className="panel">
      <div className="panel-copy">
        <div className="tag"><span className="num">01</span> · Dark mode</div>
        <h2>A theme for every hour.</h2>
        <p>One toggle flips the whole app between warm paper and true black. The heatmap, sheets, and timeline all recolor. Respects the system setting by default.</p>
        <ul>
          <li>System / Light / Dark — three-way switch in Settings</li>
          <li>OLED-friendly true black (#0E0D0C) saves battery</li>
          <li>Goal colors stay vivid on both backgrounds</li>
        </ul>
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <button className={`ctl-btn ${dark ? 'ghost' : ''}`} onClick={() => setDark(false)}>Light</button>
          <button className={`ctl-btn ${dark ? '' : 'ghost'}`} onClick={() => setDark(true)}>Dark</button>
        </div>
      </div>
      <div className="panel-stage">
        <div className={`mini-phone ${dark ? 'dark' : ''}`}>
          <div className="screen" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 4 }}>Learn Spanish</div>
            <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 16, fontFamily: 'var(--mono)' }}>DAILY · ↻</div>
            <Grid grid={grid} colorKey="emerald" dark={dark} size={12} />
            <div style={{ display: 'flex', gap: 6, marginTop: 14, fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.5, alignItems: 'center' }}>
              Less {[0,1,2,3].map(l => <span key={l} style={{ width: 10, height: 10, borderRadius: 2, background: cell('emerald', l, dark) }} />)} More
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
              {['Today','Goals','Insights','You'].map((t,i) => (
                <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 9, opacity: i === 1 ? 1 : 0.4, fontWeight: i === 1 ? 600 : 400 }}>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel 2: Home-screen widget ───────────────────────────────────────────────
function WidgetPanel() {
  const [size, setSize] = React.useState('medium'); // small | medium
  const grid = React.useMemo(() => makeGrid(size === 'small' ? 7 : 15, 13, 0.66), [size]);
  return (
    <div className="panel reverse">
      <div className="panel-copy">
        <div className="tag"><span className="num">02</span> · Home-screen widget</div>
        <h2>Your streak, on the lock screen.</h2>
        <p>A native widget renders the heatmap straight on the home or lock screen — no app open required. Tap it to jump into that goal.</p>
        <ul>
          <li>Small (single goal) and Medium (heatmap + stats) sizes</li>
          <li>WidgetKit on iOS, Glance/AppWidget on Android</li>
          <li>Refreshes a few times a day in the background</li>
        </ul>
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          <button className={`ctl-btn ${size==='small'?'':'ghost'}`} onClick={() => setSize('small')}>Small</button>
          <button className={`ctl-btn ${size==='medium'?'':'ghost'}`} onClick={() => setSize('medium')}>Medium</button>
        </div>
        <div className="status-row"><span className="status-dot" style={{ background: '#E0922B' }} /> Native build — not yet implemented</div>
      </div>
      <div className="panel-stage">
        {/* wallpaper */}
        <div style={{
          width: 300, height: 300, borderRadius: 28, padding: 22,
          background: 'linear-gradient(150deg, #1a4d8f, #0b2d63 60%, #06224f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 30px 60px -25px rgba(11,45,99,0.6)',
        }}>
          <div style={{
            width: size === 'small' ? 130 : 256,
            background: 'rgba(14,13,12,0.78)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 20, padding: 16,
            border: '0.5px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: paletteHex('emerald') }} />
              <span style={{ color: '#F2EAD7', fontSize: 12, fontWeight: 600 }}>Learn Spanish</span>
            </div>
            <Grid grid={grid} colorKey="emerald" dark size={size === 'small' ? 12 : 13} gap={3} />
            {size === 'medium' && (
              <div style={{ display: 'flex', gap: 14, marginTop: 14, color: '#F2EAD7' }}>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>49</div><div style={{ fontSize: 8.5, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</div></div>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>12</div><div style={{ fontSize: 8.5, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Streak</div></div>
                <div><div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>4.2</div><div style={{ fontSize: 8.5, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg</div></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel 3: Cloud sync ───────────────────────────────────────────────────────
function SyncPanel() {
  const [state, setState] = React.useState('idle'); // idle | syncing | synced
  function run() {
    if (state === 'syncing') return;
    setState('syncing');
    setTimeout(() => setState('synced'), 1600);
  }
  const color = state === 'synced' ? 'var(--sage)' : state === 'syncing' ? '#E0922B' : 'rgba(31,27,22,0.4)';
  const label = state === 'synced' ? 'Synced · just now' : state === 'syncing' ? 'Syncing…' : 'Idle';
  return (
    <div className="panel">
      <div className="panel-copy">
        <div className="tag"><span className="num">03</span> · Cloud sync</div>
        <h2>Local-first, cloud-backed.</h2>
        <p>Every goal and completion lives on the device instantly. When signed in, changes mirror to Supabase with row-level security — pick up your streaks on any device.</p>
        <ul>
          <li>Debounced upserts; offline edits queue and flush on reconnect</li>
          <li>Append-only completion log = conflict-free history</li>
          <li>End-to-end per-user isolation via Postgres RLS</li>
        </ul>
        <div style={{ marginTop: 18 }}>
          <button className="ctl-btn" onClick={run}>Simulate sync</button>
          <span className="status-row" style={{ marginLeft: 12 }}><span className="status-dot" style={{ background: color, transition: 'background 200ms' }} /> {label}</span>
        </div>
      </div>
      <div className="panel-stage">
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* device */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 84, height: 130, borderRadius: 16, background: '#15110d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 70, height: 116, borderRadius: 11, background: 'var(--paper)' }} />
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, marginTop: 8, color: 'rgba(31,27,22,0.64)' }}>DEVICE</div>
          </div>
          {/* link */}
          <div style={{ position: 'relative', width: 90, height: 4 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(31,27,22,0.12)' }} />
            <div style={{
              position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 999,
              width: state === 'idle' ? '0%' : '100%', background: color,
              transition: 'width 1.5s ease',
            }} />
            {state === 'syncing' && (
              <div style={{ position: 'absolute', top: -7, left: 0, width: 18, height: 18, borderRadius: 999, background: '#E0922B', animation: 'protoMove 1.5s linear' }} />
            )}
          </div>
          {/* cloud */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 96, height: 70, borderRadius: 20,
              background: state === 'synced' ? 'rgba(107,142,90,0.18)' : 'var(--card)',
              border: `0.5px solid ${state === 'synced' ? 'var(--sage)' : 'rgba(31,27,22,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)',
              transition: 'all 300ms ease',
            }}>☁</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, marginTop: 8, color: 'rgba(31,27,22,0.64)' }}>SUPABASE</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel 4: Auto-log from Today ──────────────────────────────────────────────
function AutoLogPanel() {
  const blocks = [
    { id: 'b1', label: 'Morning pages', goal: 'Write daily', color: 'amber' },
    { id: 'b2', label: 'Run intervals', goal: 'Run a 5K', color: 'rose' },
    { id: 'b3', label: 'Read 1 chapter', goal: 'Learn Spanish', color: 'emerald' },
  ];
  const [done, setDone] = React.useState({});
  // grid that grows as you complete blocks
  const grids = {
    amber:   React.useMemo(() => makeGrid(11, 3, 0.5), []),
    rose:    React.useMemo(() => makeGrid(11, 5, 0.45), []),
    emerald: React.useMemo(() => makeGrid(11, 9, 0.6), []),
  };
  function toggle(b) {
    setDone(d => ({ ...d, [b.id]: !d[b.id] }));
  }
  return (
    <div className="panel reverse">
      <div className="panel-copy">
        <div className="tag"><span className="num">04</span> · Auto-log</div>
        <h2>Finish a block, light a square.</h2>
        <p>Completing a timeline block on the Today screen automatically logs its goal — the heatmap fills in without a second tap. One action, two places updated.</p>
        <ul>
          <li>Check a block → its goal's heatmap gains today's cell</li>
          <li>Intensity rises if you complete multiple blocks for one goal</li>
          <li>Undo by unchecking — the cell clears</li>
        </ul>
        <div className="status-row"><span className="status-dot" style={{ background: 'var(--terra)' }} /> Tap the blocks →</div>
      </div>
      <div className="panel-stage">
        <div className="mini-phone">
          <div className="screen" style={{ padding: 16 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, marginBottom: 12 }}>Today</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocks.map(b => {
                const isDone = !!done[b.id];
                return (
                  <button key={b.id} onClick={() => toggle(b)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    background: isDone ? cell(b.color, 1, false) : '#FBF7EE',
                    border: `0.5px solid ${isDone ? paletteHex(b.color) : 'rgba(31,27,22,0.1)'}`,
                    fontFamily: 'inherit', transition: 'all 160ms ease',
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                      border: `1.5px solid ${paletteHex(b.color)}`,
                      background: isDone ? paletteHex(b.color) : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12,
                    }}>{isDone ? '✓' : ''}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink)', textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }}>{b.label}</span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'rgba(31,27,22,0.64)' }}>{b.goal}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16, fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(31,27,22,0.64)', marginBottom: 6 }}>
              LEARN SPANISH · live
            </div>
            <Grid
              grid={(() => {
                const g = grids.emerald.map(c => c.slice());
                if (done.b3) { g[g.length - 1][6] = 3; } // light today's cell
                return g;
              })()}
              colorKey="emerald" dark={false} size={11}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel 5: Active hours / laziest time ──────────────────────────────────────
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
// 8 three-hour bins covering 06:00 → 06:00 next-day. Index 0 = 6-9am.
const BINS = ['6a','9a','12p','3p','6p','9p','12a','3a'];

// Deterministic activity matrix [day][bin] = 0..3. Skewed so mornings/evenings
// hot, mid-afternoon cold (the "laziest" dip), nights near-zero.
function makeHourMatrix(seed = 42) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  // base curve per bin: how productive that time-of-day tends to be
  const curve = [0.75, 0.95, 0.55, 0.25, 0.7, 0.6, 0.15, 0.05]; // 3pm dip, night dead
  const m = [];
  for (let d = 0; d < 7; d++) {
    const weekendDamp = (d >= 5) ? 0.6 : 1;
    const row = [];
    for (let b = 0; b < 8; b++) {
      const p = curve[b] * weekendDamp;
      const lvl = rnd() < p ? 1 + Math.floor(rnd() * (p > 0.7 ? 3 : 2)) : 0;
      row.push(Math.min(3, lvl));
    }
    m.push(row);
  }
  return m;
}

function HourBars({ row, colorKey }) {
  const max = Math.max(1, ...row);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 90, marginTop: 10 }}>
      {row.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: '100%', borderRadius: 4,
            height: `${Math.max(6, (v / max) * 76)}px`,
            background: cell(colorKey, v || 0, false),
            transition: 'height 200ms ease, background 200ms ease',
          }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'rgba(31,27,22,0.64)' }}>{BINS[i]}</span>
        </div>
      ))}
    </div>
  );
}

function ActiveHoursPanel() {
  const colorKey = 'azure';
  const matrix = React.useMemo(() => makeHourMatrix(42), []);
  const [day, setDay] = React.useState(1); // Tue default (peak)

  // Aggregate per-bin across week → peak + laziest (waking hours only, skip night bins 6,7).
  const stats = React.useMemo(() => {
    const binTotals = BINS.map((_, b) => matrix.reduce((s, row) => s + row[b], 0));
    let peakBin = 0, peakV = -1, lazyBin = 0, lazyV = Infinity;
    for (let b = 0; b < 6; b++) { // 6a..9p waking window
      if (binTotals[b] > peakV) { peakV = binTotals[b]; peakBin = b; }
      if (binTotals[b] < lazyV) { lazyV = binTotals[b]; lazyBin = b; }
    }
    // peak day = day with highest total
    const dayTotals = matrix.map(r => r.reduce((a, c) => a + c, 0));
    const peakDay = dayTotals.indexOf(Math.max(...dayTotals));
    return { peakBin, lazyBin, peakDay };
  }, [matrix]);

  const binLabel = (b) => ({ '6a':'6–9am','9a':'9am–12pm','12p':'12–3pm','3p':'3–6pm','6p':'6–9pm','9p':'9pm–12am' }[BINS[b]] || BINS[b]);

  return (
    <div className="panel">
      <div className="panel-copy">
        <div className="tag"><span className="num">05</span> · Rhythm insights</div>
        <h2>Know your best — and worst — hours.</h2>
        <p>A time-of-day heatmap across the week shows exactly when you get things done. Tap a day for its hourly breakdown. Pacely biases new plans toward your peak and protects your slump.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <div className="status-row" style={{ marginTop: 0 }}>
            <span className="status-dot" style={{ background: paletteHex(colorKey) }} />
            Peak · <strong style={{ color: 'var(--ink)' }}>{DAYS[stats.peakDay]} {binLabel(stats.peakBin)}</strong>
          </div>
          <div className="status-row" style={{ marginTop: 0 }}>
            <span className="status-dot" style={{ background: 'rgba(31,27,22,0.3)' }} />
            Laziest · <strong style={{ color: 'var(--ink)' }}>daily {binLabel(stats.lazyBin)}</strong>
          </div>
        </div>
      </div>

      <div className="panel-stage" style={{ alignItems: 'stretch' }}>
        <div style={{
          width: '100%', maxWidth: 360, background: 'var(--paper)',
          border: '0.5px solid rgba(31,27,22,0.1)', borderRadius: 20, padding: 18,
        }}>
          {/* hour × day matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 4, paddingLeft: 30 }}>
              {BINS.map(b => (
                <span key={b} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 7.5, color: 'rgba(31,27,22,0.4)' }}>{b}</span>
              ))}
            </div>
            {matrix.map((row, d) => (
              <div key={d} onClick={() => setDay(d)} style={{
                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                opacity: day === d ? 1 : 0.78,
              }}>
                <span style={{
                  width: 26, fontFamily: 'var(--mono)', fontSize: 9,
                  color: day === d ? 'var(--ink)' : 'rgba(31,27,22,0.45)',
                  fontWeight: day === d ? 700 : 400,
                }}>{DAYS[d]}</span>
                {row.map((v, b) => (
                  <div key={b} style={{
                    flex: 1, height: 18, borderRadius: 3,
                    background: cell(colorKey, v, false),
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
              {DAYS[day]} · hourly
            </div>
            <HourBars row={matrix[day]} colorKey={colorKey} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Prototype() {
  return (
    <div className="proto-shell">
      <header className="proto-header">
        <div className="proto-brand">
          <span className="dot" /> Pacely <em>· feature prototypes</em>
        </div>
        <div className="proto-pills">
          <a className="proto-pill" href="/">App</a>
          <a className="proto-pill" href="/demo.html">Demo</a>
          <a className="proto-pill" href="https://github.com/acash17/habit-tracker" target="_blank" rel="noreferrer">GitHub →</a>
        </div>
      </header>

      <div className="proto-hero">
        <div className="kicker">Pacely · proposed · v0.6</div>
        <h1>Five features, prototyped.</h1>
        <p>Interactive mockups of what's next. Play with each one, then tell me which to build for real. Nothing here is wired to your data yet.</p>
      </div>

      <div className="proto-grid">
        <DarkModePanel />
        <WidgetPanel />
        <SyncPanel />
        <AutoLogPanel />
        <ActiveHoursPanel />
      </div>

      <div className="footer-note">
        These are visual prototypes — interactive but not connected to the live app or cloud. Pick the ones worth building and they'll get wired into the real Pacely.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('proto-mount')).render(<Prototype />);
