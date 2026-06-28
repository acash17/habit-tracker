// Goals sync between localStorage (cache) and Supabase (cloud truth).
// Strategy:
//   - When user signs in: pull cloud goals; if cloud is empty, push local; else replace local.
//   - When goals change locally (and signed in): debounced upsert to cloud.
//   - Last-write-wins per goal (updated_at). Good enough for MVP.
import React from 'react';
import { supabase, cloudEnabled } from './supabase.js';
import { save as saveLocal } from './storage.js';
import { clearLocalCloudCache } from './use-auth.js';
import { habitLogRow, loadLog, saveLog, mergeCloudLogs } from './habit-log.js';
import { loadConsent, consentCloudRow } from './consent.js';
import { pullEntitlement } from './entitlement-sync.js';

const LAST_USER_KEY = 'cadence:last-user-id';

const TABLE = 'goals';

// Original demo seed (id → title). Early builds seeded these three goals locally
// and they got pushed to some accounts' cloud before we removed the demo. They
// re-appear on every login via pullGoals, so we strip them once — but ONLY when
// still unedited (id matches AND title unchanged), so a user who renamed a demo
// goal keeps their data. User-created goals use a `g_` id prefix and never match.
const DEMO_CLOUD_GOALS = {
  g1: 'Finish Q3 design review',
  g2: 'Run a 5K by August',
  g3: 'Read “Thinking in Systems”',
};

function isUneditedDemoGoal(g) {
  return !!g && DEMO_CLOUD_GOALS[g.id] !== undefined && g.title === DEMO_CLOUD_GOALS[g.id];
}

// Remove unedited demo goals from a freshly-pulled cloud list and delete those
// rows server-side so they don't come back. Returns the cleaned list.
async function purgeDemoFromCloud(userId, cloud) {
  const stale = (cloud || []).filter(isUneditedDemoGoal);
  if (stale.length === 0) return cloud || [];
  await Promise.all(stale.map(g => deleteGoalCloud(userId, g.id).catch(() => {})));
  return (cloud || []).filter(g => !isUneditedDemoGoal(g));
}

function toRow(userId, g) {
  return {
    id: g.id,
    user_id: userId,
    title: g.title || 'Untitled',
    color: g.color || 'terracotta',
    cadence: g.cadence || 'oneoff',
    recurring: !!g.recurring,
    deadline: g.deadline || null,
    sequence: g.sequence || [],
    updated_at: new Date().toISOString(),
  };
}
function fromRow(r) {
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    cadence: r.cadence,
    recurring: r.recurring,
    deadline: r.deadline,
    sequence: r.sequence || [],
  };
}

export async function pullGoals(userId) {
  if (!cloudEnabled) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) { console.warn('[cloud] pull failed:', error.message); return null; }
  return data.map(fromRow);
}

export async function pushGoals(userId, goals) {
  if (!cloudEnabled) return;
  const rows = goals.map(g => toRow(userId, g));
  if (rows.length === 0) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert(rows, { onConflict: 'id' });
  if (error) console.warn('[cloud] push failed:', error.message);
}

export async function deleteGoalCloud(userId, goalId) {
  if (!cloudEnabled) return;
  const { error } = await supabase
    .from(TABLE).delete().eq('user_id', userId).eq('id', goalId);
  if (error) console.warn('[cloud] delete failed:', error.message);
}

// ── habit_logs (completion events → heatmap + rhythm) ─────────────────────────

const LOGS_TABLE = 'habit_logs';

// Pull all of a user's completion rows so the heatmap is populated cross-device.
// Returns minimal { goal_id, day, level } rows for mergeCloudLogs(), or null on failure.
export async function pullHabitLogs(userId) {
  if (!cloudEnabled) return null;
  const { data, error } = await supabase
    .from(LOGS_TABLE)
    .select('goal_id, day, level')
    .eq('user_id', userId);
  if (error) { console.warn('[cloud] pull logs failed:', error.message); return null; }
  return data;
}

// Upsert one completion row (immediate — volume is low). Conflict target is the
// per-cell unique index (user_id, goal_id, day, coalesce(step_id,'')).
export async function pushHabitLog(userId, row) {
  if (!cloudEnabled) return;
  const { error } = await supabase
    .from(LOGS_TABLE)
    .upsert(row, { onConflict: 'user_id,goal_id,day,step_id' });
  if (error) console.warn('[cloud] push log failed:', error.message);
}

// Remove a completion row when a day is unlogged (level cycled back to 0).
export async function deleteHabitLogCloud(userId, goalId, day) {
  if (!cloudEnabled) return;
  const { error } = await supabase
    .from(LOGS_TABLE)
    .delete()
    .eq('user_id', userId).eq('goal_id', goalId).eq('day', day)
    .eq('step_id', '');
  if (error) console.warn('[cloud] delete log failed:', error.message);
}

// ── consents (Data Fiduciary's record of consent under the DPDP Act) ──────────

// Persist the user's local consent record to the server-side ledger so the
// fiduciary can demonstrate who consented, to which policy version, and when.
// Upsert on (user_id, policy_version) — one row per user per policy version.
export async function pushConsent(userId) {
  if (!cloudEnabled || !userId) return;
  const record = loadConsent();
  if (!record) return;
  const { error } = await supabase
    .from('consents')
    .upsert(consentCloudRow(userId, record), { onConflict: 'user_id,policy_version' });
  if (error) console.warn('[cloud] push consent failed:', error.message);
}

// Mirror one local heatmap cell to the cloud after a tap-to-log.
// level > 0 → upsert with the current timestamp (drives rhythm); level 0 → delete.
// No-op when signed out (userId falsy) — local-only mode.
export function syncCellToCloud(userId, goalId, day, level) {
  if (!userId || !cloudEnabled) return;
  if (level > 0) {
    pushHabitLog(userId, habitLogRow(userId, goalId, day, level, new Date().toISOString()));
  } else {
    deleteHabitLogCloud(userId, goalId, day);
  }
}

/**
 * useCloudSync — keeps the in-memory goals state mirrored to Supabase.
 * - On sign-in: pull cloud → if any rows, replace local; else seed cloud with current local.
 * - On every goals change while signed in: debounced upsert (1.2s).
 */
export function useCloudSync({ user, goals, setGoals }) {
  const syncedKey = `cadence:sync-bootstrapped:${user?.id || ''}`;
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef(null);

  // Initial pull/seed when user becomes available. Detect a user-id switch
  // (different user signed in since last time) and clear local cache first to
  // prevent the previous user's goals from being pushed into this user's cloud.
  React.useEffect(() => {
    if (!user || !cloudEnabled) return;
    let cancelled = false;

    const lastUserId = (() => { try { return localStorage.getItem(LAST_USER_KEY); } catch { return null; } })();
    const userSwitched = lastUserId && lastUserId !== user.id;
    if (userSwitched) {
      clearLocalCloudCache();
      setGoals([]); // drop the previous account's goals from memory before pull
    }

    (async () => {
      const bootstrapped = localStorage.getItem(syncedKey) === '1';
      const pulled = await pullGoals(user.id);
      if (cancelled) return;
      // Strip any stale, unedited demo goals that an old build pushed to cloud.
      const cloud = await purgeDemoFromCloud(user.id, pulled);
      if (cancelled) return;
      const purgedSome = (pulled || []).length !== (cloud || []).length;
      if (cloud && cloud.length > 0) {
        setGoals(cloud);
        saveLocal('goals', cloud);
      } else if (purgedSome) {
        // Cloud held only demo goals; after purge it's empty. Reconcile local so
        // the stale demo doesn't linger in the cache, and land on a clean Today.
        setGoals([]);
        saveLocal('goals', []);
      } else if (!bootstrapped && !userSwitched && goals.length > 0) {
        // Only push local-only goals to cloud when this is the FIRST sign-in on this
        // device for this user (not a re-sign-in after switching accounts).
        await pushGoals(user.id, goals);
      }

      // Pull completion history into the local heatmap cache. Written straight to
      // localStorage; useHabitLog re-reads it the next time a goal detail mounts.
      const cloudLogs = await pullHabitLogs(user.id);
      if (!cancelled && cloudLogs && cloudLogs.length > 0) {
        saveLog(mergeCloudLogs(loadLog(), cloudLogs));
      }

      // Pull the user's Pro entitlement into the local cache (read-only here).
      if (!cancelled) await pullEntitlement(user.id);

      // Record consent server-side now that we know who the user is (the gate
      // captured consent before the OAuth round-trip resolved their identity).
      if (!cancelled) await pushConsent(user.id);
      try {
        localStorage.setItem(syncedKey, '1');
        localStorage.setItem(LAST_USER_KEY, user.id);
      } catch { /* fine */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Debounced push on changes (only after first bootstrap done)
  React.useEffect(() => {
    if (!user || !cloudEnabled) return;
    if (localStorage.getItem(syncedKey) !== '1') return;
    if (!dirtyRef.current) { dirtyRef.current = true; return; } // skip first ref after mount
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { pushGoals(user.id, goals); }, 1200);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, user?.id]);
}
