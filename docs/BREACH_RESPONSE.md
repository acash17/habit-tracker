# Cadence — Personal Data Breach Response Plan

**Owner:** Data Fiduciary (Cadence operator)
**Grievance / DPO contact:** grievance@vinkashis.com
**Regulator:** Data Protection Board of India (DPBI)
**Last reviewed:** 2026-06-02 · review every 6 months

> Legal basis: Digital Personal Data Protection Act, 2023 (DPDP) requires the Data
> Fiduciary to report a **personal data breach** to the Data Protection Board of India
> and to each affected Data Principal. Treat *every* suspected breach as reportable
> until assessed otherwise. **This is a process document, not legal advice** — involve
> a lawyer for any real incident.

A "personal data breach" = any unauthorised processing, accidental disclosure,
acquisition, sharing, use, alteration, destruction, or loss of access to personal
data that compromises its confidentiality, integrity, or availability.

---

## 0. At a glance (the 6 steps)

1. **Detect & log** → 2. **Contain** → 3. **Assess** → 4. **Notify** (Board + users)
→ 5. **Remediate** → 6. **Review**

Start the **incident log** (Appendix A) the moment a breach is suspected. Record times in IST + UTC.

---

## 1. Detect & log (immediately)

Triggers: Supabase/GitHub security alert, anomalous DB access, leaked credentials,
a user/researcher report, unexpected data in logs, lost device with admin access.

- Open an incident log entry (Appendix A). Assign an incident ID: `INC-YYYYMMDD-n`.
- Note: what was noticed, when, by whom, and the first evidence.
- Do **not** wipe evidence — you'll need it for the assessment and the Board.

## 2. Contain (within hours)

- **Rotate secrets:** Supabase service-role key, database password, any API keys,
  GitHub tokens. Re-issue the Supabase anon key only if it's implicated.
- **Cut access:** disable compromised accounts/sessions; if a key leaked, revoke it
  in Supabase → Project Settings → API.
- **Lock the surface:** if a specific endpoint/table is exposed, tighten RLS or take
  the affected feature offline (e.g. disable sync) until safe.
- **Preserve logs:** export Supabase logs / GitHub audit log before they roll off.

## 3. Assess (within 24–72 hours)

Determine and write down:
- **What data** was involved (email, name, goals, completion history, consent records).
- **Whose** — which/how many Data Principals (query `auth.users` / affected rows).
- **How** it happened (root cause).
- **Likely harm** to principals (identity exposure, etc.). For Cadence the data is
  low-sensitivity (no payment, no health, no location), but email + activity still count.
- **Whether** it's a genuine personal-data breach (vs. a near-miss with no exposure).

## 4. Notify

> Under DPDP, notify the **Data Protection Board of India** and **affected Data
> Principals** of *any* personal data breach, in the manner and within timelines the
> Board prescribes. **Default to prompt notification — do not sit on it.** Confirm
> current exact timelines/format with counsel and the Board's portal at the time.

**4a. Data Protection Board of India**
- Report via the Board's official channel/portal.
- Include: nature of breach, data and principals affected (scope), likely consequences,
  measures taken/proposed, and contact point (grievance@vinkashis.com).

**4b. Affected Data Principals** — email each affected user (template in Appendix B):
- what happened, what data, what you've done, what they should do (e.g. stay alert to
  phishing; the app uses Google sign-in so advise reviewing Google account security),
  and your contact for questions.

**4c. Platform/processor notices** as applicable: Supabase support, and Google Play if
the incident affects the app/store posture.

## 5. Remediate

- Fix the root cause (patch, tighten RLS, fix a misconfiguration, enforce least privilege).
- Add a **regression test or control** so it can't silently recur.
- Confirm all rotated credentials are in place and old ones are dead.
- Verify no residual unauthorized access remains.

## 6. Review (within 2 weeks of closure)

- Write a short blameless post-incident review: timeline, cause, impact, fixes, lessons.
- Update this plan, `docs/COMPLIANCE.md`, and controls as needed.
- File the incident log + review for your records (the Board may ask).

---

## Severity quick-guide

| Level | Example | Action |
|---|---|---|
| **High** | DB dump exfiltrated; service-role key leaked | Full plan; notify Board + all affected users promptly |
| **Medium** | One user's rows exposed to another via a bug | Contain + fix; notify affected user(s); assess Board notice |
| **Low / near-miss** | Leaked key caught before any access; no data touched | Rotate, log, document why not reportable; no notice if truly no breach |

---

## Appendix A — Incident log template

```
Incident ID:        INC-YYYYMMDD-n
Detected (IST/UTC):
Detected by:
Summary:
Systems involved:   (Supabase / GitHub / device / 3rd party)
Data types:         (email, name, goals, completion history, consents)
Principals affected: (count + how identified)
Root cause:
Containment actions + times:
Assessment / harm:
Reportable? (Y/N + reason):
Board notified (when/how):
Users notified (when/how):
Remediation:
Closed (date):
Post-incident review link:
```

## Appendix B — User notification email (template)

```
Subject: Important security notice about your Cadence account

Hi [name],

We're writing to let you know about a security incident that may have affected
your Cadence account.

What happened: [plain-language description, date].
What data was involved: [e.g. your email address and your goal/completion history].
What we've done: [contained the issue, rotated credentials, fixed the cause].
What you can do: [e.g. review your Google account security at myaccount.google.com;
be cautious of unexpected emails]. Cadence never asks for your password.

We've reported this to the Data Protection Board of India as required under the
DPDP Act, 2023. We're sorry this happened and have taken steps to prevent a repeat.

Questions or to exercise your data rights: grievance@vinkashis.com

— The Cadence team
```

## Appendix C — Key facts to have ready

- Supabase project ref + where the service-role key lives (rotate point).
- GitHub repo + who has admin.
- This plan's owner + grievance contact: grievance@vinkashis.com.
- Data inventory: see `docs/COMPLIANCE.md` §2.
