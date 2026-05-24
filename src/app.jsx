import React from 'react';
import { usePersistedState } from './storage.js';
import { INITIAL_GOALS, TIMELINE_BLOCKS } from './data.jsx';
import { Icon, Chip } from './ui.jsx';
import { TodayScreen } from './screen-today.jsx';
import { GoalsScreen } from './screen-goals.jsx';
import { InsightsScreen } from './screen-insights.jsx';
import { SettingsScreen } from './screen-settings.jsx';
import { NewGoalSheet } from './screen-newgoal.jsx';
import { EnergyProfileSheet } from './sheet-energy.jsx';
import { LibrarySheet } from './sheet-library.jsx';
import { LifeHappenedSheet } from './sheet-life-happened.jsx';
import { VoiceSheet } from './sheet-voice.jsx';
import { RunningLongSheet, WhyOrderSheet } from './planner.jsx';
import { OnboardingFlow } from './onboarding.jsx';
import { TourOverlay } from './tour.jsx';

// Cadence — app shell (with onboarding gate + all sheets wired)

function TabBar({ tab, setTab, onAdd }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: 'today' },
    { id: 'goals', label: 'Goals', icon: 'goals' },
    { id: 'insights', label: 'Insights', icon: 'insights' },
    { id: 'settings', label: 'You', icon: 'settings' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12, bottom: 18, zIndex: 100,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        flex: 1, display: 'flex',
        background: 'rgba(247,243,236,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '0.5px solid rgba(31,27,22,0.08)',
        borderRadius: 999, padding: 4,
        boxShadow: '0 8px 28px -10px rgba(31,27,22,0.18), 0 2px 6px -3px rgba(31,27,22,0.08)',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 0',
            background: tab === t.id ? 'var(--ink)' : 'transparent',
            color: tab === t.id ? 'var(--paper)' : 'rgba(31,27,22,0.6)',
            border: 'none', borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            transition: 'all 180ms ease',
          }}>
            <Icon name={t.icon} size={18} />
            <span style={{ letterSpacing: -0.05 }}>{t.label}</span>
          </button>
        ))}
      </div>
      <button onClick={onAdd} aria-label="new" style={{
        width: 56, height: 56, borderRadius: 999, flexShrink: 0,
        background: 'var(--terra)', color: '#fff',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 24px -6px rgba(200,96,47,0.55), 0 2px 6px -2px rgba(200,96,47,0.4)',
        transition: 'transform 150ms ease',
      }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.94)'}
        onMouseUp={(e) => e.currentTarget.style.transform = ''}
        onMouseLeave={(e) => e.currentTarget.style.transform = ''}>
        <Icon name="plus" size={22} strokeWidth={2.4}/>
      </button>
    </div>
  );
}

function CadenceHeader() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
      padding: '54px 18px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'linear-gradient(180deg, var(--paper) 65%, rgba(247,243,236,0))',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--ink)',
        letterSpacing: -0.3, pointerEvents: 'auto',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--terra)" strokeWidth="1.5"/>
          <path d="M12 6v6l4 2.5" stroke="var(--terra)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
        Cadence
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <Chip tone="paper" size="sm">
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--sage)', display: 'inline-block' }}/>
          Local
        </Chip>
      </div>
    </div>
  );
}

function App() {
  const [tab, setTab] = React.useState('today');
  const [blocks, setBlocks] = usePersistedState('blocks', TIMELINE_BLOCKS);
  const [goals, setGoals] = usePersistedState('goals', INITIAL_GOALS);
  const [toast, setToast] = React.useState(null);

  // Sheets
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [runningLongOpen, setRunningLongOpen] = React.useState(false);
  const [whyOpen, setWhyOpen] = React.useState(false);
  const [lifeOpen, setLifeOpen] = React.useState(false);
  const [voiceOpen, setVoiceOpen] = React.useState(false);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [energyOpen, setEnergyOpen] = React.useState(false);

  // Tour gate: ?tour=1 starts the guided investor tour; closes when finished.
  const [tourOn, setTourOn] = React.useState(() => {
    try { return typeof location !== 'undefined' && location.search.includes('tour=1'); }
    catch { return false; }
  });

  // Onboarding gate — show on first run; "Replay onboarding" in settings sets it back.
  // ?skip=1 or ?tour=1 in URL bypasses (for demos and screenshots).
  const [onboarding, setOnboarding] = React.useState(() => {
    try {
      if (typeof location !== 'undefined' && /skip=1|tour=1|bare=1/.test(location.search)) return false;
      return !localStorage.getItem('cadence-onboarded');
    } catch { return true; }
  });

  // Tour action bus — listens for events from the TourOverlay to switch tabs / open sheets.
  React.useEffect(() => {
    if (!tourOn) return;
    const onAction = (e) => {
      switch (e.detail) {
        case 'open-why':       setWhyOpen(true); break;
        case 'go-insights':    setWhyOpen(false); setTab('insights'); break;
        case 'go-today-life':  setTab('today'); setTimeout(() => setLifeOpen(true), 250); break;
        case 'go-today':       setLifeOpen(false); setWhyOpen(false); setTab('today'); break;
        default: break;
      }
    };
    window.addEventListener('cadence-tour-action', onAction);
    return () => window.removeEventListener('cadence-tour-action', onAction);
  }, [tourOn]);

  function flash(msg) {
    setToast(msg);
    clearTimeout(window.__cadToastT);
    window.__cadToastT = setTimeout(() => setToast(null), 2600);
  }

  function adapt() {
    setBlocks(prev => prev.map(b => b.done ? b : { ...b, dur: Math.max(8, Math.round(b.dur * 0.75)) }));
    flash('Sequence rebalanced · lighter blocks first');
  }
  function commitNewGoal() { setSheetOpen(false); flash('Sequence added to today'); }
  function finishOnboarding() {
    try { localStorage.setItem('cadence-onboarded', '1'); } catch {}
    setOnboarding(false);
  }
  function replayOnboarding() {
    try { localStorage.removeItem('cadence-onboarded'); } catch {}
    setOnboarding(true);
  }

  // Generic helper: insert a sequence into today, with toast
  function applyDayChange(newBlocks, msg) {
    setBlocks(newBlocks);
    setLifeOpen(false); setVoiceOpen(false); setLibraryOpen(false);
    flash(msg);
  }

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'var(--paper)', overflow: 'hidden',
      fontFamily: 'var(--sans)', color: 'var(--ink)',
    }}>
      <CadenceHeader/>

      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', paddingTop: 92, paddingBottom: 110 }}>
        {tab === 'today' && (
          <TodayScreen
            blocks={blocks}
            setBlocks={setBlocks}
            onAdapt={adapt}
            onRunningLong={() => setRunningLongOpen(true)}
            onWhy={() => setWhyOpen(true)}
            onLife={() => setLifeOpen(true)}
            onVoice={() => setVoiceOpen(true)}
            onLibrary={() => setLibraryOpen(true)}
          />
        )}
        {tab === 'goals' && <GoalsScreen goals={goals} openNewGoal={() => setSheetOpen(true)} openGoal={() => {}} />}
        {tab === 'insights' && <InsightsScreen />}
        {tab === 'settings' && <SettingsScreen onOpenEnergy={() => setEnergyOpen(true)} onReplay={replayOnboarding}/>}
      </div>

      <TabBar tab={tab} setTab={setTab} onAdd={() => setSheetOpen(true)} />

      {sheetOpen && (
        <NewGoalSheet
          onClose={() => setSheetOpen(false)}
          onCommit={commitNewGoal}
          onOpenLibrary={() => { setSheetOpen(false); setLibraryOpen(true); }}
        />
      )}

      {runningLongOpen && (
        <RunningLongSheet
          blocks={blocks}
          onClose={() => setRunningLongOpen(false)}
          onConfirm={(newBlocks, diff) => {
            setBlocks(newBlocks);
            setRunningLongOpen(false);
            const parts = [];
            if (diff.shifted) parts.push(`Moved ${diff.shifted} block${diff.shifted === 1 ? '' : 's'}`);
            if (diff.dropped.length) parts.push(`dropped ${diff.dropped.join(', ')}`);
            flash(parts.length ? parts.join(' · ') : 'Today reshaped');
          }}
        />
      )}

      {whyOpen && <WhyOrderSheet blocks={blocks} onClose={() => setWhyOpen(false)} />}

      {lifeOpen && (
        <LifeHappenedSheet
          blocks={blocks}
          onClose={() => setLifeOpen(false)}
          onApply={applyDayChange}
        />
      )}

      {voiceOpen && (
        <VoiceSheet
          onClose={() => setVoiceOpen(false)}
          onApply={applyDayChange}
        />
      )}

      {libraryOpen && (
        <LibrarySheet
          onClose={() => setLibraryOpen(false)}
          onApply={(newBlocks, msg) => {
            // append rather than replace
            applyDayChange([...blocks.filter(b => b.done), ...newBlocks], msg);
          }}
        />
      )}

      {energyOpen && (
        <EnergyProfileSheet
          onClose={() => setEnergyOpen(false)}
          onSave={() => { setEnergyOpen(false); flash('Energy profile saved'); }}
        />
      )}

      {/* Onboarding gate */}
      {onboarding && <OnboardingFlow onDone={finishOnboarding}/>}

      {/* Guided investor tour overlay */}
      {tourOn && <TourOverlay onExit={() => setTourOn(false)} />}

      {toast && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 96,
          transform: 'translateX(-50%)', zIndex: 150,
          background: 'var(--ink)', color: 'var(--paper)',
          padding: '10px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 500, letterSpacing: -0.1,
          boxShadow: '0 12px 30px -8px rgba(31,27,22,0.5)',
          animation: 'slideup 220ms cubic-bezier(.2,.8,.2,1)',
          maxWidth: '80%', textAlign: 'center',
        }}>{toast}</div>
      )}
    </div>
  );
}

Object.assign(window, { App });

export { TabBar, CadenceHeader, App };
