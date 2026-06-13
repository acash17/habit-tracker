// Finance dashboard — data model, persistence, and derived analytics.
//
// Everything is local-first: state lives in localStorage under the `cadence:`
// prefix (shared with the rest of the app, see ../storage.js). No backend,
// no network — this is a personal dashboard that runs entirely in the browser.
import React from 'react';

const PREFIX = 'cadence:';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or disabled — silently ignore */
  }
}

// React hook: state mirrored to localStorage. Mirrors usePersistedState in
// ../storage.js so the finance module stays self-contained.
export function usePersistedState(key, initial) {
  const [value, setValue] = React.useState(() =>
    load(key, typeof initial === 'function' ? initial() : initial),
  );
  React.useEffect(() => { save(key, value); }, [key, value]);
  return [value, setValue];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

// Expense categories with a stable colour each, so charts and budgets agree.
export const CATEGORIES = [
  { id: 'housing',    label: 'Housing',        color: '#C26A38', icon: '🏠' },
  { id: 'groceries',  label: 'Groceries',      color: '#6B8E5A', icon: '🛒' },
  { id: 'dining',     label: 'Dining Out',     color: '#D49A3A', icon: '🍽️' },
  { id: 'transport',  label: 'Transport',      color: '#8E7CB8', icon: '🚗' },
  { id: 'utilities',  label: 'Utilities',      color: '#4F8A8B', icon: '💡' },
  { id: 'health',     label: 'Health',         color: '#C45D7C', icon: '🩺' },
  { id: 'shopping',   label: 'Shopping',       color: '#B8884F', icon: '🛍️' },
  { id: 'fun',        label: 'Entertainment',  color: '#5A7DB8', icon: '🎬' },
  { id: 'subscriptions', label: 'Subscriptions', color: '#9A6BB8', icon: '🔁' },
  { id: 'other',      label: 'Other',          color: '#8A8276', icon: '✦' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary',     label: 'Salary',     color: '#6B8E5A', icon: '💼' },
  { id: 'freelance',  label: 'Freelance',  color: '#4F8A8B', icon: '✏️' },
  { id: 'investment', label: 'Investments', color: '#8E7CB8', icon: '📈' },
  { id: 'gift',       label: 'Gifts',      color: '#D49A3A', icon: '🎁' },
  { id: 'other-inc',  label: 'Other',      color: '#8A8276', icon: '✦' },
];

export function categoryMeta(id) {
  return (
    CATEGORIES.find((c) => c.id === id) ||
    INCOME_CATEGORIES.find((c) => c.id === id) ||
    { id, label: id, color: '#8A8276', icon: '✦' }
  );
}

export const CURRENCIES = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  INR: { symbol: '₹', locale: 'en-IN' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
};

export function formatMoney(amount, currency = 'USD', { compact = false } = {}) {
  const { locale } = CURRENCIES[currency] || CURRENCIES.USD;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact && Math.abs(amount) >= 1000 ? 1 : 2,
      minimumFractionDigits: compact && Math.abs(amount) >= 1000 ? 0 : 2,
      notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    }).format(amount || 0);
  } catch {
    const sym = (CURRENCIES[currency] || CURRENCIES.USD).symbol;
    return `${sym}${(amount || 0).toFixed(2)}`;
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function monthLabel(mKey, { short = false } = {}) {
  const [y, m] = mKey.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', {
    month: short ? 'short' : 'long',
    year: short ? undefined : 'numeric',
  });
}

// Last `n` month keys ending at (and including) the given month, oldest first.
export function recentMonths(n, endMonth = monthKey(todayKey())) {
  const [y, m] = endMonth.split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Derived analytics — all pure functions over a transaction array.
// A transaction: { id, type:'income'|'expense', amount, category, date, note }
// ---------------------------------------------------------------------------

export function totalsForMonth(txns, mKey) {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (monthKey(t.date) !== mKey) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export function allTimeTotals(txns) {
  let income = 0;
  let expense = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

// Expense breakdown by category for a month, largest first.
export function spendingByCategory(txns, mKey) {
  const map = new Map();
  for (const t of txns) {
    if (t.type !== 'expense' || monthKey(t.date) !== mKey) continue;
    map.set(t.category, (map.get(t.category) || 0) + t.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount, ...categoryMeta(category) }))
    .sort((a, b) => b.amount - a.amount);
}

// Income vs expense per month over a window.
export function monthlySeries(txns, months) {
  return months.map((m) => ({ month: m, ...totalsForMonth(txns, m) }));
}

// Running balance at the end of each month in the window (cumulative net).
export function balanceSeries(txns, months) {
  // Sum everything strictly before the window start, then accumulate.
  const start = months[0];
  let running = 0;
  for (const t of txns) {
    if (monthKey(t.date) < start) running += t.type === 'income' ? t.amount : -t.amount;
  }
  return months.map((m) => {
    const { net } = totalsForMonth(txns, m);
    running += net;
    return { month: m, balance: running };
  });
}

export function savingsRate(income, expense) {
  if (income <= 0) return 0;
  return Math.max(0, Math.min(1, (income - expense) / income));
}

// ---------------------------------------------------------------------------
// Seed data — a realistic-looking 6 months of activity so a brand-new
// dashboard is immediately legible instead of an empty void. Generated once.
// ---------------------------------------------------------------------------

export function seedTransactions() {
  const txns = [];
  const months = recentMonths(6);
  const rand = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

  months.forEach((m) => {
    const [y, mo] = m.split('-').map(Number);
    const day = (d) => `${m}-${String(d).padStart(2, '0')}`;
    const daysInMonth = new Date(y, mo, 0).getDate();

    // Income
    txns.push({ id: uid(), type: 'income', amount: 4200, category: 'salary', date: day(1), note: 'Monthly salary' });
    if (Math.random() > 0.5)
      txns.push({ id: uid(), type: 'income', amount: rand(200, 900), category: 'freelance', date: day(15), note: 'Side project' });

    // Recurring expenses
    txns.push({ id: uid(), type: 'expense', amount: 1450, category: 'housing', date: day(2), note: 'Rent' });
    txns.push({ id: uid(), type: 'expense', amount: rand(90, 160), category: 'utilities', date: day(5), note: 'Electricity + water' });
    txns.push({ id: uid(), type: 'expense', amount: 45.99, category: 'subscriptions', date: day(7), note: 'Streaming + cloud' });

    // Variable spending sprinkled through the month
    const variable = [
      ['groceries', 3, 60, 140],
      ['dining', 4, 18, 55],
      ['transport', 3, 12, 60],
      ['shopping', 2, 25, 120],
      ['fun', 2, 15, 70],
      ['health', 1, 20, 90],
    ];
    variable.forEach(([cat, count, lo, hi]) => {
      for (let i = 0; i < count; i++) {
        txns.push({
          id: uid(),
          type: 'expense',
          amount: rand(lo, hi),
          category: cat,
          date: day(Math.min(daysInMonth, Math.ceil(Math.random() * daysInMonth))),
          note: '',
        });
      }
    });
  });

  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function defaultBudgets() {
  return {
    housing: 1500,
    groceries: 450,
    dining: 250,
    transport: 200,
    utilities: 180,
    shopping: 200,
    fun: 150,
    health: 120,
    subscriptions: 60,
    other: 100,
  };
}

export function defaultGoals() {
  return [
    { id: uid(), name: 'Emergency Fund', target: 10000, saved: 6200, color: '#6B8E5A' },
    { id: uid(), name: 'Vacation', target: 3000, saved: 1150, color: '#C26A38' },
    { id: uid(), name: 'New Laptop', target: 2200, saved: 1800, color: '#8E7CB8' },
  ];
}
