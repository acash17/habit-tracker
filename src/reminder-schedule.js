// Pure helpers for per-goal local-notification scheduling. No Capacitor import.

// Stable, positive, per-goal notification id. djb2 hash of the goalId mapped into a
// fixed band well clear of the single global daily reminder id (1001).
export function goalReminderId(goalId) {
  const s = String(goalId);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 100000 + (h % 800000);
}

// Capacitor LocalNotifications schedule for a goal's reminder, or null when there's no
// reminder or the cadence isn't monthly/yearly. Capacitor months are 1-based.
export function buildGoalSchedule(cadence, reminder) {
  if (!reminder) return null;
  const { day, month, hour, minute } = reminder;
  if (cadence === 'monthly') return { on: { day, hour, minute }, repeats: true };
  if (cadence === 'yearly') return { on: { month: (month || 0) + 1, day, hour, minute }, repeats: true };
  return null;
}
