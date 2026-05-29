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

## G. Mobile (Capacitor) OAuth — DEFERRED but planned

The current code uses the **web** OAuth flow (browser redirect). On a native Android/iOS app, this opens the system browser and never gets back to the app cleanly. To support mobile sign-in, three pieces are needed:

1. **Custom URL scheme**: add `cadence://` to `AndroidManifest.xml` + iOS `Info.plist`
2. **Deep-link listener**: `@capacitor/app` `App.addListener('appUrlOpen', ...)` → reads the tokens from the redirect URL → calls `supabase.auth.setSession(...)`
3. **In-app browser**: `@capacitor/browser` to open the OAuth page so the app stays alive

The Capacitor + Supabase community has a documented pattern for this:
https://supabase.com/docs/guides/auth/quickstarts/with-capacitor

I'll add this layer when you're ready to ship a signed Play Store build with auth. For now, web OAuth works in the Capacitor WebView for *testing* purposes — the redirect happens inside the WebView and stays put, which is good enough for QA on a real phone via `npm run android:run`.

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
