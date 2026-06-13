// Finance dashboard — top-level app. A personal, local-first money dashboard.
//
// Tabs: Overview · Transactions · Budgets · Goals. All state persists to
// localStorage; nothing leaves the device. Seeded with sample data on first
// run so the charts are immediately meaningful.
import React from 'react';
import {
  usePersistedState, CATEGORIES, INCOME_CATEGORIES, categoryMeta, CURRENCIES,
  formatMoney, todayKey, monthKey, monthLabel, recentMonths, uid,
  totalsForMonth, allTimeTotals, spendingByCategory, monthlySeries,
  balanceSeries, savingsRate, seedTransactions, defaultBudgets, defaultGoals,
} from './finance-data.js';
import { DonutChart, MonthlyBars, BalanceArea, ProgressBar } from './finance-charts.jsx';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '◎' },
  { id: 'txns', label: 'Transactions', icon: '≡' },
  { id: 'budgets', label: 'Budgets', icon: '◐' },
  { id: 'goals', label: 'Goals', icon: '✦' },
];

export default function FinanceApp() {
  const [txns, setTxns] = usePersistedState('fin:txns', seedTransactions);
  const [budgets, setBudgets] = usePersistedState('fin:budgets', defaultBudgets);
  const [goals, setGoals] = usePersistedState('fin:goals', defaultGoals);
  const [currency, setCurrency] = usePersistedState('fin:currency', 'USD');
  const [tab, setTab] = React.useState('overview');
  const [month, setMonth] = React.useState(() => monthKey(todayKey()));
  const [adding, setAdding] = React.useState(false);

  const addTxn = (t) => setTxns((prev) => [{ id: uid(), ...t }, ...prev].sort((a, b) => (a.date < b.date ? 1 : -1)));
  const removeTxn = (id) => setTxns((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fin-app">
      <Header currency={currency} setCurrency={setCurrency} />

      <main className="fin-main">
        {tab === 'overview' && (
          <Overview txns={txns} budgets={budgets} currency={currency} month={month} setMonth={setMonth} />
        )}
        {tab === 'txns' && (
          <Transactions txns={txns} currency={currency} onRemove={removeTxn} />
        )}
        {tab === 'budgets' && (
          <Budgets txns={txns} budgets={budgets} setBudgets={setBudgets} currency={currency} month={month} />
        )}
        {tab === 'goals' && (
          <Goals goals={goals} setGoals={setGoals} currency={currency} />
        )}
      </main>

      <nav className="fin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="fin-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <button className="fin-fab" onClick={() => setAdding(true)} aria-label="Add transaction">+</button>
      {adding && (
        <AddTransaction
          currency={currency}
          onClose={() => setAdding(false)}
          onSave={(t) => { addTxn(t); setAdding(false); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header({ currency, setCurrency }) {
  return (
    <header className="fin-header">
      <div>
        <div className="fin-eyebrow">Personal Finance</div>
        <h1 className="fin-title">Money Dashboard</h1>
      </div>
      <label className="fin-currency">
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {Object.keys(CURRENCIES).map((c) => (
            <option key={c} value={c}>{CURRENCIES[c].symbol} {c}</option>
          ))}
        </select>
      </label>
    </header>
  );
}

function MonthSwitcher({ month, setMonth }) {
  const shift = (delta) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const isCurrent = month >= monthKey(todayKey());
  return (
    <div className="fin-monthswitch">
      <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>
      <span>{monthLabel(month)}</span>
      <button onClick={() => shift(1)} disabled={isCurrent} aria-label="Next month">›</button>
    </div>
  );
}

function Card({ title, action, children, className = '' }) {
  return (
    <section className={`fin-card ${className}`}>
      {(title || action) && (
        <div className="fin-card-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// --- Overview --------------------------------------------------------------

function Overview({ txns, budgets, currency, month, setMonth }) {
  const monthTotals = React.useMemo(() => totalsForMonth(txns, month), [txns, month]);
  const slices = React.useMemo(() => spendingByCategory(txns, month), [txns, month]);
  const months = React.useMemo(() => recentMonths(6, month), [month]);
  const series = React.useMemo(() => monthlySeries(txns, months), [txns, months]);
  const balSeries = React.useMemo(() => balanceSeries(txns, months), [txns, months]);
  const allTime = React.useMemo(() => allTimeTotals(txns), [txns]);
  const rate = savingsRate(monthTotals.income, monthTotals.expense);

  const budgetTotal = Object.values(budgets).reduce((a, b) => a + b, 0);
  const budgetUsed = monthTotals.expense;

  return (
    <div className="fin-stack">
      <MonthSwitcher month={month} setMonth={setMonth} />

      <div className="fin-kpis">
        <Kpi label="Net Balance" value={formatMoney(allTime.balance, currency, { compact: true })} accent="lav" sub="All time" />
        <Kpi label="Income" value={formatMoney(monthTotals.income, currency, { compact: true })} accent="sage" sub="This month" />
        <Kpi label="Expenses" value={formatMoney(monthTotals.expense, currency, { compact: true })} accent="terra" sub="This month" />
        <Kpi label="Saved" value={`${Math.round(rate * 100)}%`} accent="ink" sub={formatMoney(monthTotals.net, currency, { compact: true })} />
      </div>

      <Card title="Balance trend" className="fin-card-trend">
        <BalanceArea data={balSeries} currency={currency} />
        <div className="fin-trend-foot">
          <span>{monthLabel(months[0], { short: true })}</span>
          <span className="fin-trend-now">
            {formatMoney(balSeries[balSeries.length - 1].balance, currency, { compact: true })}
          </span>
          <span>{monthLabel(months[months.length - 1], { short: true })}</span>
        </div>
      </Card>

      <Card title="Spending by category">
        <DonutChart slices={slices} total={monthTotals.expense} currency={currency} />
      </Card>

      <Card title="Income vs expenses">
        <MonthlyBars data={series} currency={currency} />
      </Card>

      <Card title="Monthly budget">
        <div className="fin-budget-summary">
          <div>
            <div className="fin-big">{formatMoney(budgetUsed, currency, { compact: true })}</div>
            <div className="fin-muted">of {formatMoney(budgetTotal, currency, { compact: true })} budgeted</div>
          </div>
          <div className={`fin-pill ${budgetUsed > budgetTotal ? 'over' : 'ok'}`}>
            {budgetUsed > budgetTotal
              ? `${formatMoney(budgetUsed - budgetTotal, currency, { compact: true })} over`
              : `${formatMoney(budgetTotal - budgetUsed, currency, { compact: true })} left`}
          </div>
        </div>
        <ProgressBar value={budgetUsed} max={budgetTotal} over={budgetUsed > budgetTotal} height={10} />
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className={`fin-kpi accent-${accent}`}>
      <div className="fin-kpi-label">{label}</div>
      <div className="fin-kpi-value">{value}</div>
      {sub && <div className="fin-kpi-sub">{sub}</div>}
    </div>
  );
}

// --- Transactions ----------------------------------------------------------

function Transactions({ txns, currency, onRemove }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    return txns.filter((t) => {
      if (filter === 'income' && t.type !== 'income') return false;
      if (filter === 'expense' && t.type !== 'expense') return false;
      if (query) {
        const meta = categoryMeta(t.category);
        const hay = `${t.note} ${meta.label}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [txns, filter, query]);

  // Group by date for a clean ledger feel.
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="fin-stack">
      <input
        className="fin-search"
        placeholder="Search notes or categories…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="fin-seg">
        {['all', 'income', 'expense'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="fin-empty">No transactions match.</div>}

      {groups.map(([date, items]) => (
        <div key={date} className="fin-day">
          <div className="fin-day-head">
            <span>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="fin-day-sum">
              {formatMoney(items.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0), currency, { compact: true })}
            </span>
          </div>
          {items.map((t) => {
            const meta = categoryMeta(t.category);
            return (
              <div key={t.id} className="fin-row">
                <span className="fin-row-icon" style={{ background: meta.color + '22', color: meta.color }}>{meta.icon}</span>
                <div className="fin-row-body">
                  <div className="fin-row-title">{t.note || meta.label}</div>
                  <div className="fin-row-cat">{meta.label}</div>
                </div>
                <div className={`fin-row-amt ${t.type}`}>
                  {t.type === 'income' ? '+' : '–'}{formatMoney(t.amount, currency).replace('-', '')}
                </div>
                <button className="fin-row-del" onClick={() => onRemove(t.id)} aria-label="Delete">×</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Budgets ---------------------------------------------------------------

function Budgets({ txns, budgets, setBudgets, currency, month }) {
  const spent = React.useMemo(() => {
    const map = {};
    for (const s of spendingByCategory(txns, month)) map[s.category] = s.amount;
    return map;
  }, [txns, month]);

  const setLimit = (cat, val) => setBudgets((prev) => ({ ...prev, [cat]: Math.max(0, Number(val) || 0) }));

  return (
    <div className="fin-stack">
      <div className="fin-section-note">Set a monthly cap per category. Bars turn red when you go over.</div>
      {CATEGORIES.map((c) => {
        const limit = budgets[c.id] || 0;
        const used = spent[c.id] || 0;
        const over = limit > 0 && used > limit;
        return (
          <div key={c.id} className="fin-budget-row">
            <div className="fin-budget-top">
              <span className="fin-budget-name">{c.icon} {c.label}</span>
              <span className={`fin-budget-nums ${over ? 'over' : ''}`}>
                {formatMoney(used, currency, { compact: true })}
                <span className="fin-muted"> / </span>
                <input
                  className="fin-budget-input"
                  type="number" min="0" inputMode="decimal"
                  value={limit || ''}
                  placeholder="0"
                  onChange={(e) => setLimit(c.id, e.target.value)}
                />
              </span>
            </div>
            <ProgressBar value={used} max={limit} color={c.color} over={over} />
          </div>
        );
      })}
    </div>
  );
}

// --- Goals -----------------------------------------------------------------

function Goals({ goals, setGoals, currency }) {
  const [name, setName] = React.useState('');
  const [target, setTarget] = React.useState('');

  const addGoal = () => {
    const t = Number(target);
    if (!name.trim() || !(t > 0)) return;
    const palette = ['#6B8E5A', '#C26A38', '#8E7CB8', '#4F8A8B', '#D49A3A'];
    setGoals((prev) => [
      ...prev,
      { id: uid(), name: name.trim(), target: t, saved: 0, color: palette[prev.length % palette.length] },
    ]);
    setName(''); setTarget('');
  };

  const contribute = (id, delta) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: Math.max(0, g.saved + delta) } : g)));
  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));

  return (
    <div className="fin-stack">
      {goals.map((g) => {
        const pct = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
        const done = g.saved >= g.target;
        return (
          <div key={g.id} className="fin-goal">
            <div className="fin-goal-head">
              <span className="fin-goal-name">{g.name} {done && '🎉'}</span>
              <button className="fin-row-del" onClick={() => removeGoal(g.id)} aria-label="Delete goal">×</button>
            </div>
            <div className="fin-goal-nums">
              <span style={{ color: g.color, fontWeight: 600 }}>{formatMoney(g.saved, currency, { compact: true })}</span>
              <span className="fin-muted"> of {formatMoney(g.target, currency, { compact: true })} · {Math.round(pct * 100)}%</span>
            </div>
            <ProgressBar value={g.saved} max={g.target} color={g.color} height={10} />
            <div className="fin-goal-actions">
              <button onClick={() => contribute(g.id, 50)}>+50</button>
              <button onClick={() => contribute(g.id, 100)}>+100</button>
              <button onClick={() => contribute(g.id, 500)}>+500</button>
              <button className="ghost" onClick={() => contribute(g.id, -50)}>−50</button>
            </div>
          </div>
        );
      })}

      <Card title="New savings goal">
        <div className="fin-goal-form">
          <input placeholder="Goal name (e.g. New car)" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Target amount" type="number" min="0" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          <button className="fin-primary" onClick={addGoal}>Add goal</button>
        </div>
      </Card>
    </div>
  );
}

// --- Add transaction sheet -------------------------------------------------

function AddTransaction({ currency, onClose, onSave }) {
  const [type, setType] = React.useState('expense');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState('groceries');
  const [date, setDate] = React.useState(todayKey());
  const [note, setNote] = React.useState('');

  const cats = type === 'income' ? INCOME_CATEGORIES : CATEGORIES;
  React.useEffect(() => { setCategory(cats[0].id); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const amt = Number(amount);
    if (!(amt > 0)) return;
    onSave({ type, amount: Math.round(amt * 100) / 100, category, date, note: note.trim() });
  };

  const sym = (CURRENCIES[currency] || CURRENCIES.USD).symbol;

  return (
    <div className="fin-sheet-backdrop" onClick={onClose}>
      <div className="fin-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="fin-sheet-handle" />
        <h2>Add transaction</h2>

        <div className="fin-seg fin-seg-lg">
          <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Expense</button>
          <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Income</button>
        </div>

        <label className="fin-field fin-amount-field">
          <span className="fin-amount-sym">{sym}</span>
          <input
            autoFocus type="number" min="0" inputMode="decimal" placeholder="0.00"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </label>

        <div className="fin-cat-grid">
          {cats.map((c) => (
            <button
              key={c.id}
              className={`fin-cat-chip ${category === c.id ? 'active' : ''}`}
              style={category === c.id ? { borderColor: c.color, background: c.color + '1A' } : undefined}
              onClick={() => setCategory(c.id)}
            >
              <span>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        <label className="fin-field">
          <span>Date</span>
          <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="fin-field">
          <span>Note</span>
          <input placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="fin-sheet-actions">
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="fin-primary" disabled={!(Number(amount) > 0)} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
