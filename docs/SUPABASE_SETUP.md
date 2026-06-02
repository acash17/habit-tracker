# Cadence — Supabase + Google sign-in setup

End-to-end: project create → Google OAuth → schema → env wiring → verify.
Total time: ~25 minutes. All free tier.

---

## A. Create a Supabase project (5 min)

1. Go to https://supabase.com → sign in with GitHub
2. **New project**
   - Name: `cadence`
   - Database password: generate strong (save to 1Password — you may need it for SQL admin later)
   - Region: closest to you (e.g. `Mumbai (ap-south-1)`)
   - Pricing plan: **Free**
3. Wait ~2 minutes for provisioning to finish.

Once ready, grab two values from **Project Settings → API**:
- **Project URL** → e.g. `https://abcdefghijklm.supabase.co`
- **Project API keys → anon public** → starts with `eyJhbGci...`

Save these — you'll paste them into `.env.local` in step D.

---

## B. Create the Google OAuth client (8 min)

You need a Google Cloud project that issues OAuth credentials. Supabase plugs Google's token verifier into its own auth.

### B1. Google Cloud Console

1. https://console.cloud.google.com → if no project yet, **Create project** (name: `cadence-auth`)
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: **Cadence**
   - User support email: your email
   - Developer contact: your email
   - Save → **App domain** can be left blank for now
   - **Scopes** → add `email`, `profile`, `openid` (the three default ones; should already be there)
   - **Test users** → add **your own Gmail address** (required while the app is in "Testing" mode)
   - Save & continue → back to dashboard

3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Cadence Web Client`
   - **Authorized JavaScript origins** (add both):
     - `https://YOUR-PROJECT-REF.supabase.co`
     - `http://localhost:5173` (for local dev)
     - (later) `https://your-vercel-url.vercel.app` once you deploy
   - **Authorized redirect URIs** (add both):
     - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`  ← this is the key one
     - `http://localhost:5173`
     - (later) your production URL
   - Create → a modal pops with **Client ID** and **Client secret**. Copy both. Save to 1Password.

### B2. Wire Google → Supabase

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Toggle **Enable Sign in with Google** on
3. Paste **Client ID** and **Client secret** from B1.3
4. **Callback URL** is shown right above the form — confirm it matches what you put in Google Cloud (`https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`)
5. Save

### B3. (Optional but recommended) Tell Supabase what URL to redirect to after login

Supabase Dashboard → **Authentication → URL Configuration**
- **Site URL**: `http://localhost:5173` (and later your production URL)
- **Redirect URLs** (whitelist): add both `http://localhost:5173` and your production URL once you have one.

> If Site URL is wrong, after Google login the user gets bounced back to an unrelated page.

---

## C. Run the schema migration (2 min)

1. Supabase Dashboard → **SQL Editor → New query**
2. Open `supabase/migrations/001_init.sql` in this repo
3. Paste the entire file into the SQL editor → **Run**
4. You should see "Success. No rows returned."
5. Verify under **Table Editor**: there should now be a `goals` table with RLS enabled (small lock icon).
6. Repeat for `002_full_schema.sql`, then `003_rhythm.sql`, then `004_rhythm_cron.sql`, in order.

### Daily rhythm precompute (migration 004)

`004_rhythm_cron.sql` schedules a nightly job that pre-aggregates each user's
rhythm. It needs the **pg_cron** extension:

1. Supabase → **Database → Extensions** → search **`pg_cron`** → enable.
2. Then run `004_rhythm_cron.sql` in the SQL editor.
3. Verify the job exists: `select * from cron.job;` — you should see
   `refresh-rhythm-cache` scheduled `30 20 * * *` (daily at **20:30 UTC = 02:00 IST**
   — pg_cron runs in UTC, so change the expression in the migration for a different
   time/zone).
4. Test it immediately without waiting for the schedule:
   `select public.refresh_rhythm_cache();` then `select * from public.rhythm_cache;`.

---

## D. Wire the env vars (1 min)

In the repo root, create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   # the anon public key from A.3
```

Restart the dev server (Vite reads env on boot):

```bash
npm run dev
```

---

## E. Verify the flow (5 min)

1. Open http://localhost:5173 → **Settings tab** (the You icon, bottom right)
2. Profile card should now say **"Sync your sequences"** with a Google button
3. Click **Continue with Google** → opens Google's chooser → pick your Gmail → consent screen → redirects back to localhost
4. Profile card now shows your Google name + avatar + "Synced" badge
5. **Go to Goals → tap any card → edit a sub-habit's name → wait ~1 second**
6. In Supabase Dashboard → **Table Editor → goals** → refresh. You should see your rows with your user_id.
7. Sign out → sign in with the same account on a different browser → goals appear pulled from cloud.

If something fails:
- Check browser console for `[cloud] push failed:` messages
- Check Supabase Dashboard → **Authentication → Users** — your row should be there
- Check Supabase Dashboard → **Logs → Auth** for OAuth errors

---

## F. Deploying to Vercel — add prod env vars

1. Vercel Dashboard → your project → **Settings → Environment Variables**
2. Add both:
   - `VITE_SUPABASE_URL` = same value as local
   - `VITE_SUPABASE_ANON_KEY` = same value as local
3. Add your Vercel URL to:
   - Google Cloud Console → OAuth client → **Authorized JavaScript origins** + **Authorized redirect URIs**
   - Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**
4. Redeploy.

---

## G. Mobile (Capacitor) OAuth — SHIPPED

The native Android + iOS flow is wired:

| Piece | Where |
|---|---|
| Custom URL scheme `cadence://auth-callback` | `AndroidManifest.xml` (intent-filter) + `Info.plist` (CFBundleURLTypes) |
| In-app browser opens Google's URL | `@capacitor/browser` |
| Deep-link listener parses tokens, calls `setSession` | `@capacitor/app` + `initNativeAuthHandler()` in `src/main.jsx` |
| Same `signInWithGoogle()` call routes to web flow on web, native flow on Capacitor | `src/use-auth.js` (`isNative()` branch) |

### ONE manual step before mobile sign-in works:

Add `cadence://auth-callback` to Supabase's redirect URL allowlist:

1. Supabase Dashboard → **Authentication → URL Configuration**
2. **Redirect URLs** → click "Add URL"
3. Paste: `cadence://auth-callback`
4. Save

Without this Supabase will refuse to redirect to the custom scheme and the OAuth flow dead-ends on the consent screen.

### Security model — PKCE flow

The native flow uses **PKCE (Proof Key for Code Exchange)**. Custom URL schemes like `cadence://` can technically be claimed by any other installed app, so we **never** put `access_token` in the redirect URL. Instead:

1. When the client calls `signInWithOAuth`, Supabase generates a **PKCE verifier** that only this app instance knows (stored in localStorage of this app's WebView).
2. The callback URL contains only a short-lived `?code=` — useless on its own.
3. Our deep-link handler calls `supabase.auth.exchangeCodeForSession(code)`, which sends both the code AND the PKCE verifier to Supabase to obtain the actual tokens.
4. A hijacker app that intercepts the `?code=` cannot exchange it without the verifier.

This is the same model OAuth 2.1 mandates for native apps.

### How it works end-to-end on native:

1. User taps **Continue with Google** in Settings
2. App calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'cadence://auth-callback', skipBrowserRedirect: true } })` → Supabase returns the Google URL
3. `Browser.open({ url })` opens an in-app browser tab (Chrome Custom Tabs on Android, SFSafariViewController on iOS)
4. User picks their Google account → consents
5. Google redirects to Supabase's callback (`https://YOUR-REF.supabase.co/auth/v1/callback`) which exchanges the code for tokens
6. Supabase then redirects to `cadence://auth-callback#access_token=...&refresh_token=...`
7. Android/iOS routes the `cadence://` URL back to our app via the intent-filter / URL scheme
8. `App.addListener('appUrlOpen', ...)` fires → handler parses tokens from the URL fragment → calls `supabase.auth.setSession({ access_token, refresh_token })`
9. `Browser.close()` dismisses the in-app browser
10. `onAuthStateChange` fires → React updates → user lands on the signed-in profile card

### Testing it

```bash
# Wire env vars + Supabase allowlist first (see step D + the manual step above)
npm run android:apk
# Install on phone:
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# Open app → Settings → Continue with Google → real Google chooser → returns to app
```

If the deep link doesn't return:
- Verify the intent-filter exists: `grep -A6 'cadence' android/app/src/main/AndroidManifest.xml`
- Test deep link manually: `adb shell am start -W -a android.intent.action.VIEW -d "cadence://auth-callback?test=1"`
- Check that `cadence://auth-callback` is in Supabase redirect allowlist
- Check Logcat for `[auth] OAuth error:` or `[auth] setSession failed:` messages

---

## H. Quick recap

| What | Where |
|---|---|
| Supabase project URL + anon key | `.env.local` (local), Vercel env vars (prod) |
| Google OAuth client ID + secret | Pasted into Supabase Auth → Providers → Google |
| Schema | Applied via `supabase/migrations/001_init.sql` |
| Redirect URI whitelist | Google Cloud OAuth client + Supabase URL Configuration |
| Test user during "Testing" consent screen | You + anyone else you want to invite (max 100 before app must be verified) |
| Cost | $0 for everything until ~50k MAU |
