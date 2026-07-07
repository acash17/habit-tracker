// Finance dashboard — chart primitives drawn as plain SVG/CSS.
//
// No charting library on purpose: the app shell ships under a strict CSP
// (script-src 'self', see ../../vite.config.js), so everything is hand-rolled
// SVG. These are small, dependency-free, and themable via the CSS palette.
import React from 'react';
import { formatMoney, monthLabel } from './finance-data.js';

// --- Donut: spending split by category ------------------------------------

export function DonutChart({ slices, total, currency, size = 168, stroke = 26 }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const [hover, setHover] = React.useState(null);

  let offset = 0;
  const arcs = slices.map((s) => {
    const frac = total > 0 ? s.amount / total : 0;
    const arc = { ...s, frac, dash: frac * circ, gap: circ - frac * circ, offset };
    offset += frac * circ;
    return arc;
  });

  const focus = hover != null ? arcs[hover] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(31,27,22,0.06)" strokeWidth={stroke} />
          {arcs.map((a, i) => (
            <circle
              key={a.category}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={-a.offset}
              strokeLinecap="butt"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'stroke-width 140ms ease' }}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(31,27,22,0.5)', fontWeight: 600 }}>
            {focus ? focus.label : 'Spent'}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.1, color: 'var(--ink)' }}>
            {formatMoney(focus ? focus.amount : total, currency, { compact: true })}
          </div>
          {focus && (
            <div style={{ fontSize: 11, color: 'rgba(31,27,22,0.55)', marginTop: 2 }}>
              {Math.round(focus.frac * 100)}%
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 150 }}>
        {arcs.length === 0 && (
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.5)' }}>No spending yet this month.</div>
        )}
        {arcs.map((a, i) => (
          <div
            key={a.category}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
              opacity: hover == null || hover === i ? 1 : 0.45, transition: 'opacity 140ms ease',
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.icon} {a.label}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, fontFeatureSettings: '"tnum"' }}>
              {formatMoney(a.amount, currency, { compact: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Grouped bars: income vs expense by month ------------------------------

export function MonthlyBars({ data, currency, height = 150 }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const [hover, setHover] = React.useState(null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, padding: '0 2px' }}>
        {data.map((d, i) => {
          const ih = (d.income / max) * height;
          const eh = (d.expense / max) * height;
          const active = hover === i;
          return (
            <div
              key={d.month}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
            >
              {active && (
                <div style={{
                  position: 'absolute', bottom: height + 8, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--ink)', color: '#fff', borderRadius: 8, padding: '6px 9px',
                  fontSize: 11, whiteSpace: 'nowrap', zIndex: 2, lineHeight: 1.5,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                }}>
                  <div>In {formatMoney(d.income, currency, { compact: true })}</div>
                  <div>Out {formatMoney(d.expense, currency, { compact: true })}</div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, width: '100%', justifyContent: 'center' }}>
                <div style={{
                  width: '38%', maxWidth: 18, height: Math.max(2, ih), background: 'var(--sage)',
                  borderRadius: '4px 4px 0 0', opacity: active ? 1 : 0.85, transition: 'opacity 140ms',
                }} />
                <div style={{
                  width: '38%', maxWidth: 18, height: Math.max(2, eh), background: 'var(--terra)',
                  borderRadius: '4px 4px 0 0', opacity: active ? 1 : 0.85, transition: 'opacity 140ms',
                }} />
              </div>
              <div style={{ fontSize: 10, color: 'rgba(31,27,22,0.5)', marginTop: 6, fontFamily: 'var(--mono)' }}>
                {monthLabel(d.month, { short: true })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', fontSize: 11.5, color: 'rgba(31,27,22,0.6)' }}>
        <Legend color="var(--sage)" label="Income" />
        <Legend color="var(--terra)" label="Expenses" />
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}

// --- Area sparkline: running balance over time -----------------------------

export function BalanceArea({ data, currency, width = 320, height = 96 }) {
  if (data.length === 0) return null;
  const vals = data.map((d) => d.balance);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 1);
  const span = max - min || 1;
  const x = (i) => (data.length === 1 ? width / 2 : (i / (data.length - 1)) * width);
  const y = (v) => height - ((v - min) / span) * (height - 8) - 4;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.balance).toFixed(1)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const last = data[data.length - 1].balance;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="balfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lav)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--lav)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#balfill)" />
      <path d={line} fill="none" stroke="var(--lav)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={d.month} cx={x(i)} cy={y(d.balance)} r={i === data.length - 1 ? 4 : 2.5}
          fill={i === data.length - 1 ? 'var(--lav)' : '#FBF7EE'} stroke="var(--lav)" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

// --- Progress bar (budgets & goals) ----------------------------------------

export function ProgressBar({ value, max, color = 'var(--sage)', over = false, height = 8 }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div style={{ background: 'rgba(31,27,22,0.08)', borderRadius: 999, height, overflow: 'hidden' }}>
      <div style={{
        width: `${pct * 100}%`, height: '100%', borderRadius: 999,
        background: over ? 'var(--terra)' : color, transition: 'width 320ms ease',
      }} />
    </div>
  );
}
