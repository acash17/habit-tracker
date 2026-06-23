import React from 'react';
import { usePersistedState, missedDayCount, setLastActiveDate, dayKey } from './storage.js';
import { newId } from './utils.js';
import { useAuth } from './use-auth.js';
import { useCloudSync, deleteGoalCloud } from './cloud-sync.js';
import { INITIAL_GOALS, TIMELINE_BLOCKS, reschedule } from './data.jsx';
import { Icon, Chip } from './ui.jsx';
import { TodayScreen } from './screen-today.jsx';
import { GoalsScreen } from './screen-goals.jsx';
import { InsightsScreen } from './screen-insights.jsx';
import { SettingsScreen } from './screen-settings.jsx';
import { NewGoalSheet } from './screen-newgoal.jsx';
import { GoalEditSheet } from './sheet-goal-edit.jsx';
import { EnergyProfileSheet } from './sheet-energy.jsx';
import { LibrarySheet } from './sheet-library.jsx';
import { LifeHappenedSheet } from './sheet-life-happened.jsx';
import { VoiceSheet } from './sheet-voice.jsx';
import { RunningLongSheet, WhyOrderSheet } from './planner.jsx';
import { AddEventSheet } from './sheet-add-event.jsx';
import { OnboardingFlow } from './onboarding.jsx';
import { TourOverlay } from './tour.jsx';
import { ConsentGate } from './consent-sheet.jsx';

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
  const [eventOpen, setEventOpen] = React.useState(false);
  const [editingGoalId, setEditingGoalId] = React.useState(null);

  // Compute missed days once on mount (before we mark today as active).
  const [missedDays] = React.useState(() => missedDayCount());
  React.useEffect(() => { setLastActiveDate(dayKey()); }, []);

  // Cloud sync — no-op when env vars / Supabase not set up.
  const { user } = useAuth();
  useCloudSync({ user, goals, setGoals });

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

  // Keep an up-to-date ref to goals so the demo bus can resolve indexes
  // without stale-closure bugs.
  const goalsRef = React.useRef(goals);
  React.useEffect(() => { goalsRef.current = goals; }, [goals]);

  // Demo bus — drives the phone from outside (used by demo.html marketing page).
  // Listens for `cadence:demo` CustomEvents with detail = { tab?, sheet?, close?, editGoalIndex?, editGoalId?, editGoalClose? }.
  React.useEffect(() => {
    const closeAllSheets = (alsoEditor = true) => {
      setSheetOpen(false); setRunningLongOpen(false); setWhyOpen(false);
      setLifeOpen(false); setVoiceOpen(false); setLibraryOpen(false); setEnergyOpen(false); setEventOpen(false);
      if (alsoEditor) setEditingGoalId(null);
    };
    const setSheet = (name, open) => {
      switch (name) {
        case 'new-goal':     setSheetOpen(open); break;
        case 'running-long': setRunningLongOpen(open); break;
        case 'why':          setWhyOpen(open); break;
        case 'life':         setLifeOpen(open); break;
        case 'voice':        setVoiceOpen(open); break;
        case 'library':      setLibraryOpen(open); break;
        case 'energy':       setEnergyOpen(open); break;
      }
    };
    const onDemo = (e) => {
      const d = e.detail || {};
      const willOpenEditor = !!(d.editGoalId || typeof d.editGoalIndex === 'number');
      // Close sheets on any navigation. Only close the editor if the next event is NOT opening it.
      if (d.close === 'all' || d.tab || willOpenEditor) closeAllSheets(!willOpenEditor);
      if (d.editGoalClose) { setEditingGoalId(null); return; }
      if (d.tab) setTab(d.tab);
      if (d.sheet) setSheet(d.sheet, true);
      if (d.dismissOnboarding) finishOnboarding();
      if (d.editGoalId) { setTab('goals'); setEditingGoalId(d.editGoalId); }
      else if (typeof d.editGoalIndex === 'number') {
        const list = goalsRef.current || [];
        const g = list[d.editGoalIndex];
        if (g) { setTab('goals'); setEditingGoalId(g.id); }
        else setEditingGoalId(null);
      }
    };
    window.addEventListener('cadence:demo', onDemo);
    return () => window.removeEventListener('cadence:demo', onDemo);
  }, []);

  function flash(msg) {
    setToast(msg);
    clearTimeout(window.__cadToastT);
    window.__cadToastT = setTimeout(() => setToast(null), 2600);
  }

  // Listen for non-React code dispatching toasts (auth handler, etc.)
  React.useEffect(() => {
    const onToast = (e) => { if (e?.detail) flash(String(e.detail)); };
    window.addEventListener('cadence:toast', onToast);
    return () => window.removeEventListener('cadence:toast', onToast);
  }, []);

  function adapt() {
    setBlocks(prev => prev.map(b => b.done ? b : { ...b, dur: Math.max(8, Math.round(b.dur * 0.75)) }));
    flash('Sequence rebalanced · lighter blocks first');
  }
  function commitNewGoal(goalTitle, sequence, opts) {
    setSheetOpen(false);
    const title = (goalTitle || '').trim();
    if (!title) { flash('Goal needs a name'); return; }
    const steps = Array.isArray(sequence) ? sequence : [];
    const palette = ['terracotta', 'sage', 'lavender'];
    const cadence = (opts && opts.cadence) || 'oneoff';
    const recurring = !!(opts && opts.recurring) && cadence !== 'oneoff';
    const deadlineKey = (opts && opts.deadline) || 'this-week';
    const deadlineLabel = {
      'today': 'Today', 'this-week': 'This week',
      'this-month': 'This month', 'no-rush': 'Slow burn',
    }[deadlineKey] || deadlineKey;
    const newGoal = {
      id: newId('g_'),
      title,
      color: palette[goals.length % palette.length],
      cadence,
      recurring,
      deadline: cadence === 'oneoff' ? deadlineLabel : (cadence === 'daily' ? 'Every day' : cadence === 'weekly' ? 'Every week' : 'Every month'),
      sequence: steps.map((s, i) => ({
        id: newId('s_'),
        label: s.label || `Step ${i + 1}`,
        est: typeof s.est === 'number' ? s.est : 10,
        done: false,
        active: i === 0,
        why: s.why || '',
        kind: s.kind || 'focus',
      })),
    };
    setGoals(prev => [newGoal, ...prev]);
    flash(`Added · ${title.length > 28 ? title.slice(0, 28) + '…' : title}`);
  }

  function openGoal(id) { setEditingGoalId(id); }
  function saveGoal(updated) {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
    setEditingGoalId(null);
    flash('Goal updated');
  }
  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id));
    setEditingGoalId(null);
    flash('Goal deleted');
  }
  const editingGoal = React.useMemo(
    () => goals.find(g => g.id === editingGoalId) || null,
    [goals, editingGoalId]
  );
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
            onAddEvent={() => setEventOpen(true)}
            missedDays={missedDays}
          />
        )}
        {tab === 'goals' && (
          <GoalsScreen
            goals={goals}
            openNewGoal={() => setSheetOpen(true)}
            openGoal={openGoal}
            detailGoalId={editingGoalId}
            setDetailGoalId={setEditingGoalId}
            updateGoal={(g) => setGoals(prev => prev.map(x => x.id === g.id ? g : x))}
            deleteGoal={(id) => {
              setGoals(prev => prev.filter(g => g.id !== id));
              setEditingGoalId(null);
              if (user) deleteGoalCloud(user.id, id);
              flash('Goal deleted');
            }}
          />
        )}
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
          missedDays={missedDays}
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

      {eventOpen && (
        <AddEventSheet
          onClose={() => setEventOpen(false)}
          onCommit={(ev) => {
            const newEvent = {
              id: newId('ev_'),
              type: 'event',
              startMin: ev.startMin,
              dur: ev.dur,
              label: ev.label,
              cat: ev.cat,
              anchor: ev.anchor,
              reminder: ev.reminder,
              done: false,
              deps: [],
            };
            const prev = blocks;
            const next = reschedule([...blocks, newEvent]);
            setBlocks(next);
            setEventOpen(false);
            const moved = next.find(n => {
              const o = prev.find(b => b.id === n.id);
              return o && o.type === 'habit' && o.startMin !== n.startMin;
            });
            flash(moved
              ? `"${ev.label}" added · moved "${moved.label}" to fit`
              : `"${ev.label}" added to your day`
            );
          }}
        />
      )}

      {/* Goal editor is now inline inside GoalsScreen (no overlay sheet) */}

      {/* DPDP consent gate — intercepts sign-in CTAs (cadence-request-signin) */}
      <ConsentGate />

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
