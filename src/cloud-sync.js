// Goals sync between localStorage (cache) and Supabase (cloud truth).
// Strategy:
//   - When user signs in: pull cloud goals; if cloud is empty, push local; else replace local.
//   - When goals change locally (and signed in): debounced upsert to cloud.
//   - Last-write-wins per goal (updated_at). Good enough for MVP.
import React from 'react';
import { supabase, cloudEnabled } from './supabase.js';
import { save as saveLocal } from './storage.js';

const TABLE = 'goals';

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

/**
 * useCloudSync — keeps the in-memory goals state mirrored to Supabase.
 * - On sign-in: pull cloud → if any rows, replace local; else seed cloud with current local.
 * - On every goals change while signed in: debounced upsert (1.2s).
 */
export function useCloudSync({ user, goals, setGoals }) {
  const syncedKey = `cadence:sync-bootstrapped:${user?.id || ''}`;
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef(null);

  // Initial pull/seed when user becomes available
  React.useEffect(() => {
    if (!user || !cloudEnabled) return;
    let cancelled = false;
    (async () => {
      const bootstrapped = localStorage.getItem(syncedKey) === '1';
      const cloud = await pullGoals(user.id);
      if (cancelled) return;
      if (cloud && cloud.length > 0) {
        setGoals(cloud);
        saveLocal('goals', cloud);
      } else if (!bootstrapped && goals.length > 0) {
        await pushGoals(user.id, goals);
      }
      localStorage.setItem(syncedKey, '1');
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
