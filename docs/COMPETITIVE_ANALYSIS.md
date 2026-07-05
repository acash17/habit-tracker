# Cadence — Competitive Analysis (Habit / AI Planner Market)

_Prepared: July 2026 · Senior product-analyst review_

> **Data-source note:** The brief requested a Semrush-driven market analysis. The
> connected Semrush account **does not include MCP/API access** on its current
> plan, so live traffic and keyword data could not be pulled (see
> https://www.semrush.com/mcp-access to view plans). This analysis is instead
> built from current (2026) app-store listings, third-party review roundups, and
> published user-feedback themes. All sources are listed at the end.

---

## 0. What Cadence is (the baseline we're measuring against)

Reconstructed from `docs/play-store/copy.md` and the source tree:

- **Goal → sequence in one tap** — type or **speak** a goal; AI returns a 5–7 step
  micro-sequence with per-step minute estimates and a one-line "why."
- **Energy-aware ordering** — hardest step lands at peak energy; rests between heavy steps.
- **Cadences** — daily / weekly / monthly / one-off, each goal on its own rhythm, auto-reset.
- **Editable sub-habits** — rename, re-time, reorder, check off; build by hand if AI missed.
- **Adaptive replan** — "Life happened" rebalances the rest of the sequence; no broken-streak punishment.
- **Visual timeline blocks** ("Today" as a stacked schedule, not a checklist).
- **Effort bloom** — progress shown as light, not red misses.
- **Local-first / offline / no account**; per-event reminders; Insights (completion-by-hour).
- **In progress:** paywall/entitlement, smarter daily reminders, push notifications, persistence.

**Positioning:** an AI *sequence planner* for variable-attention brains (ADHD, burnout,
neurodivergent) — anti-streak, anti-guilt. This puts Cadence's closest rivals in the
**neuro-inclusive planning** lane (Tiimo, Routinery, Llama Life, Peakly) rather than the
classic streak-tracker lane (Streaks, Habitica).

---

## 1. Per-app deep dives

### Streaks (Apple Design Award classic)
- **Differentiators:** deepest **Apple Health** integration — "walk 10k steps," "sleep 7h,"
  "mindful minutes" auto-complete with zero manual input; **home/lock-screen widgets**;
  **Siri Shortcuts** voice check-in; **Apple Watch** app with haptic reminders; up to 24 habits
  on a clean circular grid; tracks positive *and* negative habits.
- **Timed events + habits:** habit-centric, not calendar-centric. Per-habit time-of-day
  reminders and "X times per week / custom pattern" scheduling — no true calendar/event layer.
- **Onboarding:** minimal, self-serve; strength is immediacy, not guidance.
- **AI:** essentially none. Its "intelligence" is Apple Health automation.
- **Strengths:** rock-solid, fast, beautiful, deep OS integration. **Weaknesses:** iOS-only,
  no goal breakdown, no adaptive planning, widgets occasionally fail to refresh (top-2 complaint).

### Habitica (gamified RPG)
- **Differentiators:** full RPG layer — XP, gold, avatars, parties, quests; social accountability.
- **Timed events + habits:** Habits / Dailies / To-Dos split; Dailies have due-days and reminders,
  but no calendar or time-blocking.
- **Onboarding:** heavy — class selection, avatar, mechanics to learn before value.
- **AI:** none.
- **Strengths:** for the minority the game hooks, it's genuinely motivating; strong community DNA.
- **Weaknesses (well-documented, 2025–26):** last-100-reviews avg ~3.9; **HP-loss punishes
  misses → anxiety, not motivation** (the exact failure Cadence is designed against); gamification
  goes stale and slows simple tracking; bugs/lag/broken widgets; removal of Guilds/Tavern (2023)
  hurt community; contributor activity down ~50% YoY. **A cautionary tale, not a feature target.**

### TickTick (task+calendar+habit all-in-one)
- **Differentiators:** genuine **task manager + native calendar + habit tracker + Pomodoro** in one.
  **Calendar view with drag-to-time-slot time-blocking**; tasks and events in one timeline.
- **Timed events + habits:** best-in-class of this set at *coexistence* — drag any task onto a
  time slot; habits live alongside calendar events without app-switching.
- **Onboarding:** functional, power-user oriented; deep but not hand-held.
- **AI:** **NLP quick-add** ("gym tomorrow 6pm" → parsed), voice-to-task. No goal decomposition
  or auto-scheduling.
- **Strengths:** cross-platform, mature, cheap (~$36/yr), huge feature surface.
- **Weaknesses:** breadth = complexity; habit module is basic (streak/stat oriented); not adaptive,
  no energy model, no goal breakdown.

### Fabulous (behavior-science coaching)
- **Differentiators:** Duke Behavioral-Econ-Lab pedigree (Dan Ariely); **daily coaching series**,
  journeys, narrated content; strong "ritual" framing (morning/evening routines).
- **Timed events + habits:** routine/ritual-centric with reminders; not a calendar/event planner.
- **Onboarding:** **famous long, story-driven onboarding** — and famously **critiqued**: asks for
  a lot before building trust or showing how the app works; throws behavioral tactics at users.
- **AI:** light; largely scripted coaching, not generative.
- **Strengths:** motivation/coaching content, aesthetics, habit-stacking education.
- **Weaknesses:** "busy" cluttered UI, animation overload, **aggressive upsell** and billing-after-
  cancellation complaints (Trustpilot). Onboarding is a lesson in what *not* to over-do.

### Motion (AI auto-scheduler, prosumer)
- **Differentiators:** **AI auto-scheduling** — continuously reads tasks, deadlines, dependencies,
  meetings, availability and **auto-slots + reshuffles your whole calendar in real time**.
- **Timed events + habits:** the strongest *"habits/tasks flow around fixed events"* engine in market —
  this is the single closest thing to Cadence's core promise, executed at calendar scale.
- **Onboarding:** widely called **difficult/steep**; heavy setup.
- **AI:** the product *is* the AI scheduler (plus newer "AI employees" agents).
- **Strengths:** genuinely rebuilds a packed day fast; deadline-driven auto-placement.
- **Weaknesses:** **expensive (~$49/mo)**, opaque annual billing + surprise charges; **weak mobile
  app (Google Play ~2.7/5)**; unreliable notifications, recurring-event glitches; **over-packs the day,
  leaving no slack** — a real, repeated complaint that Cadence's energy/rest model can beat.

### Reclaim.ai (AI calendar defense)
- **Differentiators:** **Smart Habits** = flexible recurring blocks (lunch, exercise, email triage,
  planning) that the AI **places in the best open slot and defends** as the week shifts; Reactive vs.
  scheduled modes; "calendar defense" (186M focus hours defended, ~7.6h/wk reclaimed claims).
- **Timed events + habits:** best-in-class *habit-around-events* for Google Calendar users — habits
  are first-class flexible blocks, auto-resolved against conflicts (880M+ resolved).
- **Onboarding:** cleaner than Motion; Google-Calendar-centric.
- **AI:** scheduling optimization (not generative goal breakdown).
- **Strengths:** **best value** (free-forever Lite; Starter ~$8/mo); the reference implementation of
  "flexible habits that flow around fixed events."
- **Weaknesses:** **still no native Outlook** in 2026; mobile behind web; requires living in Google Cal;
  no goal decomposition, no energy model, no neuro-inclusive framing.

### Peakly (AI Habit Planner) — closest positioning twin
- **Differentiators:** **goal → small realistic daily micro-actions, planned for you**;
  **"fits your energy, even on low-motivation days"; no rigid schedules, no streak pressure.**
  This is almost verbatim Cadence's pitch.
- **Timed events + habits:** light — guidance/micro-actions, not a hard calendar layer.
- **Onboarding:** pick an area (focus/health/balance/consistency) → immediate micro-actions.
- **AI:** goal-to-micro-action generation + AI insights (paid).
- **Strengths:** clean, sustainable, anti-burnout; validates Cadence's exact thesis in-market.
- **Weaknesses:** newer/thin; no deep event handling; **direct competitor to watch — differentiate on
  sequence depth, adaptive replan, timeline, and reminders.**

### Tiimo (Apple iPhone App of the Year 2025 — the one to beat)
- **Differentiators:** **neurodivergent-first visual timeline** — day as flowing color/icon blocks
  ("see time, don't list it"); reusable routines; visual timers; widgets; **State of Mind** mood
  check-in tied to task completion (adaptive, non-punitive).
- **Timed events + habits:** strong visual timeline; routines + scheduled blocks; gentle transitions.
- **Onboarding:** co-designed with neurodivergent users; low cognitive load.
- **AI:** **AI Co-Planner (late 2025)** — speak/type a brain-dump → it breaks tasks down, **estimates
  durations, and organizes them into a realistic day.** Deliberately *restrained*.
- **Strengths:** Apple AOTY 2025 credibility, exactly Cadence's audience, polished, ~500k users.
- **Weaknesses:** subscription ($7–12/mo); AI is intentionally limited (no deep goal→sequence with
  "why" per step, no energy-peak ordering). **This is Cadence's most dangerous direct competitor;
  Cadence's edge must be sequence intelligence + energy model + adaptive replan.**

### Honorable mentions (AI/ADHD productivity)
- **Sunsama** — daily *planning ritual* (not auto-schedule); AI nudges you to **plan less when
  overcommitting** (great anti-overpacking idea Cadence should borrow). Timebox pulled tasks.
- **Llama Life** — ADHD, **one-task-at-a-time timeboxing** with countdowns; anti-list-overwhelm.
- **Routinery** — 5M users; **step-by-step routine execution with countdown timers + voice alerts**
  (execution mode, not just planning — a gap for Cadence).
- **Structured** — visual day timeline, closest Tiimo look-alike; time-blindness aid.
- **Finch** — self-care pet gamification done *gently* (contrast to Habitica's punitive model).

---

## 2. Feature-gap matrix (✅ Cadence has · ⚠️ partial · ❌ missing)

| Capability | Cadence | Who does it well |
|---|---|---|
| AI goal → micro-sequence w/ "why" + minutes | ✅ (a real edge) | Peakly, Tiimo (lighter) |
| Energy-aware ordering (hard step at peak) | ✅ (rare) | almost nobody |
| Adaptive replan on miss (no broken streak) | ✅ | Reclaim (calendar), Tiimo (mood) |
| Voice capture | ✅ | TickTick, Tiimo, Streaks (Siri) |
| **Calendar sync (Google/Apple/Outlook)** | ❌ | Reclaim, Motion, TickTick |
| **Habits auto-flow around *fixed* calendar events** | ⚠️ (own events only) | **Reclaim, Motion** |
| **Home/lock-screen + interactive widgets** | ❌ | Streaks, Tiimo, most |
| **Push notifications / reliable reminders** | ⚠️ (in progress) | Streaks, Routinery |
| **Apple Health / auto-completing habits** | ❌ | Streaks (deepest) |
| **Wearable (Watch) app** | ❌ | Streaks |
| **Persistence / cloud sync / multi-device** | ❌ (in-memory) | TickTick, Reclaim |
| **Execution mode (guided step timers + voice)** | ❌ | Routinery, Llama Life |
| Mood / state check-in tied to completion | ❌ | Tiimo (State of Mind) |
| Overcommitment guardrail ("plan less today") | ❌ | Sunsama |
| Gamification (gentle) | ❌ (by design) | Finch (good), Habitica (bad) |
| Cross-platform / web | ⚠️ (Cap iOS+Android) | TickTick, Motion, Reclaim |

---

## 3. Which missing features are *actually* valuable (per user feedback)

Grounded in 2026 review themes, not feature-envy:

**High signal — users repeatedly reward / punish these:**
1. **Reliable reminders + widgets.** The #1 and #2 *complaints* across trackers are notification
   timing and widgets failing to refresh. Getting this boringly right beats any new AI feature.
   Widgets that let you tick off without opening the app are the single most-loved convenience.
2. **Persistence / sync.** Cadence resets on close (in-memory state). This is table-stakes; its
   absence is a silent churn driver no review will forgive.
3. **Auto-completing habits via Apple Health.** Streaks' most-praised feature — "habits that
   complete themselves." High value for the health/movement subset of goals.
4. **Habits that flow around *fixed* calendar events.** Reclaim/Motion prove strong demand — but
   Motion's #1 complaint is **over-packing the day**. Cadence's energy+rest model is the antidote;
   this is a *differentiated* opportunity, not a copy.
5. **Guided execution mode.** Routinery (5M users) and Llama Life show that *doing* the sequence
   (countdown per step, voice cue, one-thing-at-a-time) retains ADHD users better than *planning* alone.

**Medium signal:**
6. Mood/state check-in tied to completion (Tiimo) — makes "adaptive" real and on-brand.
7. Overcommitment guardrail (Sunsama) — reinforces anti-guilt positioning.
8. Web/desktop presence — expands beyond mobile-only.

**Low signal / avoid:**
- **Heavy gamification** (Habitica) — actively backfires (HP-loss anxiety, staleness). If any, do it
  Finch-gentle. Cadence's "effort bloom" is already the right instinct — don't regress.
- **Fabulous-style long story onboarding** — repeatedly critiqued. Keep time-to-first-value short.
- **"AI employees"/agent sprawl** (Motion) — off-thesis for a calm planner.

---

## 4. Prioritized roadmap — next 2–3 versions

Sequenced by **(value from real feedback) × (fit with Cadence's thesis) ÷ (effort)**, and mindful
that persistence/reminders are already flagged as known limitations.

### v-next (foundations — non-negotiable, mostly already on your radar)
1. **Persistence + reminders/push done right.** `@capacitor/preferences` (or SQLite) + reliable
   `@capacitor/local-notifications`. Nail timing and per-step reminders. *Without this, nothing else
   matters — it's the #1/#2 complaint category industry-wide.*
2. **Home-screen + interactive widget** ("today's next step," tap-to-complete). Highest loved-to-
   effort ratio in the whole market.
3. **Cloud sync / account (optional, privacy-preserving).** Keep local-first default; offer opt-in
   sync so users don't lose data on device change. Guards against silent churn.

### v+1 (the differentiated wedge — lean into the thesis)
4. **Calendar read + "flow around fixed events."** Read-only Google/Apple Calendar import; sequence
   fills the *gaps* between fixed events. **Explicitly cap the day and protect rest** — market yourself
   as "the planner that *won't* over-pack you," directly countering Motion's #1 flaw.
5. **Guided execution mode.** A "Start sequence" runner: one step at a time, countdown timer, gentle
   voice/haptic cue, auto-advance. Converts Cadence from planner → *doer* (Routinery/Llama Life demand).
6. **Mood/state check-in → adaptive replan input.** Lightweight "how's your energy right now?" that
   feeds the rebalance. Makes "adaptive" tangible and is squarely on-brand (Tiimo's most praised 2025 add).

### v+2 (deepen the moat)
7. **Apple Health integration** for auto-completing movement/sleep/mindfulness habits.
8. **Overcommitment guardrail** — when the day's estimated minutes exceed available/energy budget,
   Cadence proactively suggests deferring, à la Sunsama. Reinforces anti-guilt brand.
9. **Web/desktop companion** (Vite app already → PWA is low-lift) for planning at a keyboard.
10. **Apple Watch / wearable check-off** (nice-to-have; Streaks owns this, lower priority for your base).

### Explicitly *don't* build
- Punitive gamification, RPG mechanics, long narrative onboarding, agent/"AI employee" sprawl.
  Every one of these has documented backlash and pulls against Cadence's calm, anti-guilt identity.

---

## 5. One-line strategic read

Cadence already owns the **rarest** and most defensible pieces — *AI goal→sequence with per-step "why,"
energy-peak ordering, and non-punitive adaptive replan* (only Peakly and a restrained Tiimo come close).
The gaps are almost entirely **foundational plumbing** (persistence, reminders, widgets, sync) plus one
**strategic wedge** (flow-around-fixed-events done *without over-packing*). Win the plumbing first, then
plant the flag as *"the AI planner that plans around your real day and refuses to burn you out."*

---

## Sources
- Streaks: [App Store](https://apps.apple.com/us/app/streaks/id963034692) · [Calmevo review](https://calmevo.com/streaks-app-review/) · [Habi roundup](https://habi.app/insights/best-streak-tracker-apps/)
- Habitica: [ProdApps](https://productivity-apps.com/apps/habitica) · [HabitNoon 2025 review](https://habitnoon.app/habit-tracker-app/habitica) · [G2](https://www.g2.com/products/habitica-habitica/reviews) · [Habi alternatives](https://habi.app/insights/habitica-alternatives/)
- TickTick: [Features](https://ticktick.com/features) · [ProductivityStack](https://productivitystack.io/tools/ticktick/) · [ClickUp review](https://clickup.com/learn/topic/task-management/tools/ticktick/)
- Fabulous: [Behavioral Scientist onboarding critique](https://www.thebehavioralscientist.com/articles/fabulous-app-product-critique-onboarding) · [Makeheadway review](https://makeheadway.com/blog/fabulous-app-review/) · [Trustpilot](https://www.trustpilot.com/review/thefabulous.co)
- Motion: [Saner.AI review](https://www.saner.ai/blogs/motion-reviews) · [Efficient.app](https://efficient.app/apps/motion) · [Morgen pricing](https://www.morgen.so/blog-posts/motion-pricing) · [App Store](https://apps.apple.com/us/app/motion-tasks-ai-scheduling/id1580440623)
- Reclaim.ai: [Habits feature](https://reclaim.ai/features/habits) · [ClickUp review](https://clickup.com/learn/topic/productivity/tools/reclaim/) · [Calmevo](https://calmevo.com/reclaim-ai-review/)
- Peakly: [App Store](https://apps.apple.com/br/app/peakly-ai-habit-planner/id6757604996)
- Tiimo: [Product](https://www.tiimoapp.com/product) · [Skywork deep dive](https://skywork.ai/skypage/en/Tiimo-AI-Review-A-Deep-Dive-into-Neuro-Inclusive-Productivity/1976118803497545728) · [AI Insights review](https://aiinsightsnews.net/tiimo/)
- Field / ADHD: [Saner.AI best AI planners](https://www.saner.ai/blogs/best-ai-planners) · [Saner.AI best ADHD planners](https://www.saner.ai/blogs/best-adhd-planners) · [Llama Life](https://llamalife.co/) · [Routinery](https://www.routinery.app/blog/best-routines-planner-apps) · [Habi ADHD planners](https://habi.app/insights/best-adhd-planner-apps/)
- Feedback themes: [RoutineBase](https://routinebase.com/best-habit-tracker-apps/) · [Zapier](https://zapier.com/blog/best-habit-tracker-app/) · [AppRundown](https://apprundown.com/best/habit-tracker-apps)
