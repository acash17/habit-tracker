import React from 'react';
import { Icon, Btn, H } from './ui.jsx';
import { SheetShell } from './planner.jsx';

const PLANS = [
  { id: 'lifetime', name: 'Lifetime', price: '₹1299', tag: 'Best value', sub: 'Pay once. Yours forever.' },
  { id: 'annual',   name: 'Annual',   price: '₹999',  tag: null,        sub: 'Billed yearly.' },
];
const PERKS = [
  'Unlimited goals',
  'Insights — your rhythm & full calendar history',
  'Due-day reminders for every plan',
];

function PaywallSheet({ onClose, reason }) {
  const [picked, setPicked] = React.useState('lifetime');
  const [info, setInfo] = React.useState(false);
  return (
    <SheetShell title="Pacely Pro" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div>
          <H size={26}>Go further with Pro.</H>
          <div style={{ fontSize: 13.5, color: 'rgba(31,27,22,0.64)', marginTop: 6, lineHeight: 1.45 }}>
            {reason === 'goals' ? 'You’ve hit the free limit of 3 goals.' :
             reason === 'insights' ? 'Insights are a Pro feature.' :
             reason === 'reminders' ? 'Due-day reminders are a Pro feature.' :
             'Unlock everything Pacely can do.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PERKS.map((p) => (
            <div key={p} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, color: 'var(--ink)' }}>
              <Icon name="check" size={16} color="var(--sage)" /> {p}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {PLANS.map((pl) => {
            const on = picked === pl.id;
            return (
              <button key={pl.id} onClick={() => setPicked(pl.id)} style={{
                flex: 1, textAlign: 'left', cursor: 'pointer', padding: 14, borderRadius: 16,
                background: on ? 'rgba(200,96,47,0.08)' : 'var(--card)',
                border: `1.5px solid ${on ? 'var(--terra)' : 'rgba(31,27,22,0.1)'}`,
                fontFamily: 'inherit',
              }}>
                {pl.tag && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--terra)' }}>{pl.tag}</div>}
                <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{pl.price}</div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>{pl.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(31,27,22,0.6)', marginTop: 2 }}>{pl.sub}</div>
              </button>
            );
          })}
        </div>

        <Btn variant="terra" size="lg" full onClick={() => setInfo(true)}>
          <Icon name="sparkle" size={16} /> Upgrade
        </Btn>

        {info && (
          <div style={{ fontSize: 13, color: 'rgba(31,27,22,0.7)', background: 'var(--paper-2)', borderRadius: 12, padding: '12px 14px', lineHeight: 1.5 }}>
            Checkout opens in the Pacely <b>web app</b> — coming next. Your unlock will sync to this device automatically.
          </div>
        )}
        <div style={{ fontSize: 11.5, color: 'rgba(31,27,22,0.45)', textAlign: 'center' }}>
          One-time & yearly options · pay by UPI or card on the web.
        </div>
      </div>
    </SheetShell>
  );
}

Object.assign(window, { PaywallSheet });
export { PaywallSheet };
