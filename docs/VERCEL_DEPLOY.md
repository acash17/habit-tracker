# Cadence — Vercel deploy (~10 min, $0)

Goes from "code on GitHub" to a live URL like `cadence.vercel.app`. Free tier covers 100 GB/month bandwidth — plenty until you have ~50k monthly visitors.

---

## 1. Import the repo

1. Visit https://vercel.com → **Sign in with GitHub** (allow the app to read your repos)
2. **Add New → Project**
3. Find `acash17/habit-tracker` → **Import**
4. Project settings page appears. Defaults are correct (Vite detected, `vercel.json` already in repo):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
5. **Environment Variables** — expand this section and add:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR-REF.supabase.co` (from Supabase Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | the anon public key (NOT service-role) |

Leave **Production / Preview / Development** all checked so previews work too.

6. Click **Deploy**. First build takes ~60 seconds.

---

## 2. Your URLs

You'll get three:

| URL | What |
|---|---|
| `https://cadence-XYZ.vercel.app/` | The app shell (lives at `index.html`) |
| `https://cadence-XYZ.vercel.app/demo.html` | The interactive prototype with narrative chapters |
| `https://cadence-XYZ.vercel.app/privacy.html` | Privacy policy (use this URL in the Play Store listing) |

Vercel also gives every PR a unique preview URL — useful for showing changes before merging.

---

## 3. After-deploy housekeeping (5 min, REQUIRED for sign-in)

### 3a. Tell Google your production origin is allowed

Google Cloud Console → APIs & Services → Credentials → your OAuth client → **Edit**

- **Authorized JavaScript origins** — add `https://cadence-XYZ.vercel.app`
- **Authorized redirect URIs** — add `https://cadence-XYZ.vercel.app` (Google requires explicit list)

### 3b. Tell Supabase your production URL

Supabase Dashboard → **Authentication → URL Configuration**

- **Site URL** → set to `https://cadence-XYZ.vercel.app`
- **Redirect URLs** allowlist → add `https://cadence-XYZ.vercel.app` (and keep `http://localhost:5173` for dev, and `cadence://auth-callback` for the mobile app)

Without 3a + 3b, the Google chooser will show "Error 400: redirect_uri_mismatch" or Supabase will refuse the callback.

---

## 4. Custom domain (optional, ~$10/year)

If you want `cadence.app` or similar:

1. Buy from Porkbun, Namecheap, or Cloudflare
2. Vercel Project → **Settings → Domains → Add**
3. Vercel shows you DNS records to add at your registrar (one A record + one CNAME, or full nameserver transfer)
4. SSL cert is provisioned automatically (Let's Encrypt) — usually within 30 seconds

Repeat **3a + 3b** with the new domain.

---

## 5. Continuous deploys

Already on. Every push to `main` triggers a production deploy. Every PR gets its own preview URL. No further setup.

---

## 6. Performance notes

- Vite produces a single 80 KB gzipped JS bundle — Lighthouse should score 95+ on mobile
- Assets are cached with `immutable` headers (filename-hashed via Vite)
- Static HTML pages (`/`, `/demo.html`, `/privacy.html`) are served from the edge with sub-50ms TTFB worldwide

---

## 7. Alternative — GitHub Pages

If you'd rather not create a Vercel account:

- Pros: free, no new login, lives at `acash17.github.io/habit-tracker/`
- Cons: cold-deploy ~5 min, no PR previews, slower CDN, requires path adjustments in `vite.config.js` (`base: '/habit-tracker/'`)

If you want this instead I can wire the workflow — say the word.

---

## Troubleshooting

**Build failed: "Cannot find module …"** → `npm ci` ran fine locally but Vercel's lockfile is stricter. Ensure `package-lock.json` is committed (it is).

**Blank page after deploy** → check browser console. Most likely env vars missing → cloud code throws → no fallback. Should not happen because `cloudEnabled` is null-safe, but worth checking.

**OAuth opens but bounces to a Vercel 404** → step 3b missing. Re-check Supabase Site URL.

**Google OAuth fails with `redirect_uri_mismatch`** → step 3a missing.
