// Cadence shared UI primitives

// Color tokens come from CSS vars defined in index.html.

function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }) {
  const s = { width: size, height: size, color };
  const sp = { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'plus':
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 5v14M5 12h14" {...sp}/></svg>;
    case 'check':
      return <svg viewBox="0 0 24 24" style={s}><path d="M4 12l5 5L20 6" {...sp}/></svg>;
    case 'circle':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...sp}/></svg>;
    case 'dot':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>;
    case 'today':
      return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="5" width="18" height="16" rx="2" {...sp}/><path d="M3 10h18M8 3v4M16 3v4" {...sp}/></svg>;
    case 'goals':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9" {...sp}/><circle cx="12" cy="12" r="5" {...sp}/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>;
    case 'insights':
      return <svg viewBox="0 0 24 24" style={s}><path d="M4 19V9M10 19V4M16 19v-8M22 19H2" {...sp}/></svg>;
    case 'settings':
      return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="3" {...sp}/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 012.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 012.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" {...sp}/></svg>;
    case 'chev':
      return <svg viewBox="0 0 24 24" style={s}><path d="M9 6l6 6-6 6" {...sp}/></svg>;
    case 'chev-down':
      return <svg viewBox="0 0 24 24" style={s}><path d="M6 9l6 6 6-6" {...sp}/></svg>;
    case 'sparkle':
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" {...sp}/></svg>;
    case 'mic':
      return <svg viewBox="0 0 24 24" style={s}><rect x="9" y="3" width="6" height="12" rx="3" {...sp}/><path d="M5 11a7 7 0 0014 0M12 18v3" {...sp}/></svg>;
    case 'pause':
      return <svg viewBox="0 0 24 24" style={s}><rect x="6" y="5" width="4" height="14" rx="1" {...sp}/><rect x="14" y="5" width="4" height="14" rx="1" {...sp}/></svg>;
    case 'shuffle':
      return <svg viewBox="0 0 24 24" style={s}><path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" {...sp}/></svg>;
    case 'arrow-down':
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 5v14M5 12l7 7 7-7" {...sp}/></svg>;
    case 'lock':
      return <svg viewBox="0 0 24 24" style={s}><rect x="4" y="11" width="16" height="10" rx="2" {...sp}/><path d="M8 11V7a4 4 0 018 0v4" {...sp}/></svg>;
    case 'x':
      return <svg viewBox="0 0 24 24" style={s}><path d="M6 6l12 12M6 18L18 6" {...sp}/></svg>;
    case 'back':
      return <svg viewBox="0 0 24 24" style={s}><path d="M15 6l-6 6 6 6" {...sp}/></svg>;
    case 'leaf':
      return <svg viewBox="0 0 24 24" style={s}><path d="M20 4c-2 8-7 14-16 16 2-8 7-14 16-16zM4 20c4-4 8-8 14-12" {...sp}/></svg>;
    case 'edit':
      return <svg viewBox="0 0 24 24" style={s}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4 12.5-12.5z" {...sp}/></svg>;
    default:
      return null;
  }
}

// Soft "bloom" graphic — visual replacement for streaks.
// `value` 0..1 controls petal opacity, scale, center pulse.
function Bloom({ value = 0.7, size = 80, color }) {
  const petals = 8;
  const c = color || 'var(--terra)';
  const inner = 12 + value * 8;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {[...Array(petals)].map((_, i) => {
        const angle = (i / petals) * 360;
        const op = 0.18 + value * 0.55 + (i % 2) * 0.05;
        const scale = 0.5 + value * 0.55;
        return (
          <ellipse
            key={i}
            cx="50" cy="22"
            rx={9 * scale} ry={18 * scale}
            fill={c}
            opacity={op}
            transform={`rotate(${angle} 50 50)`}
          />
        );
      })}
      <circle cx="50" cy="50" r={inner} fill="var(--paper)" />
      <circle cx="50" cy="50" r={inner - 4} fill={c} opacity={0.85} />
    </svg>
  );
}

function Chip({ children, tone = 'ink', size = 'sm', style = {}, onClick }) {
  const tones = {
    ink:   { bg: 'rgba(31,27,22,0.06)', fg: 'var(--ink)' },
    terra: { bg: 'rgba(200,96,47,0.12)', fg: 'var(--terra)' },
    sage:  { bg: 'rgba(107,142,90,0.14)', fg: 'var(--sage)' },
    butter:{ bg: 'rgba(232,194,107,0.22)', fg: '#8a6b1f' },
    lav:   { bg: 'rgba(155,138,196,0.18)', fg: 'var(--lav)' },
    paper: { bg: 'var(--paper-2)', fg: 'var(--ink)' },
  };
  const t = tones[tone] || tones.ink;
  const padding = size === 'lg' ? '8px 14px' : '4px 10px';
  const fs = size === 'lg' ? 14 : 12;
  return (
    <span onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding, borderRadius: 999, background: t.bg, color: t.fg,
      fontSize: fs, fontWeight: 500, letterSpacing: -0.1,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</span>
  );
}

function Btn({ children, variant = 'primary', size = 'md', onClick, style = {}, disabled, full, ...rest }) {
  const variants = {
    primary: { bg: 'var(--ink)', fg: 'var(--paper)', bd: 'transparent' },
    terra:   { bg: 'var(--terra)', fg: '#fff', bd: 'transparent' },
    ghost:   { bg: 'transparent', fg: 'var(--ink)', bd: 'rgba(31,27,22,0.14)' },
    soft:    { bg: 'var(--paper-2)', fg: 'var(--ink)', bd: 'transparent' },
  };
  const sizes = {
    sm: { p: '8px 14px', fs: 13, h: 32 },
    md: { p: '12px 18px', fs: 15, h: 44 },
    lg: { p: '14px 22px', fs: 16, h: 52 },
  };
  const v = variants[variant], sz = sizes[size];
  return (
    <button onClick={onClick} disabled={disabled} {...rest} style={{
      background: v.bg, color: v.fg,
      border: `1px solid ${v.bd}`,
      padding: sz.p, height: sz.h,
      borderRadius: 999, fontSize: sz.fs, fontWeight: 500,
      fontFamily: 'inherit', letterSpacing: -0.1,
      cursor: 'pointer',
      width: full ? '100%' : undefined,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.5 : 1,
      transition: 'transform 120ms ease, opacity 120ms ease',
      ...style,
    }}>{children}</button>
  );
}

// Card with soft warm shadow on cream paper
function Card({ children, style = {}, onClick, tone = 'paper', ...rest }) {
  const bg = tone === 'paper' ? 'var(--card)' : 'var(--paper-2)';
  return (
    <div onClick={onClick} {...rest} style={{
      background: bg,
      borderRadius: 22,
      boxShadow: '0 1px 0 rgba(31,27,22,0.04), 0 8px 24px -16px rgba(31,27,22,0.18)',
      border: '0.5px solid rgba(31,27,22,0.06)',
      ...style,
    }}>{children}</div>
  );
}

// Headline serif text
function H({ children, size = 28, style = {} }) {
  return (
    <h1 style={{
      fontFamily: 'var(--serif)',
      fontSize: size, fontWeight: 400,
      lineHeight: 1.05, letterSpacing: -0.4,
      margin: 0, color: 'var(--ink)',
      textWrap: 'pretty',
      ...style,
    }}>{children}</h1>
  );
}

Object.assign(window, { Icon, Bloom, Chip, Btn, Card, H });
