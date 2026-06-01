# Cadence — secrets & environment variables

Where every secret lives, its exact variable name, and whether it's safe to expose.

## The two Supabase values

| Variable name | Where to get it | Secret? | Used by |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** | Public (safe in client) | web + APK |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → **anon public** | Public by design — RLS protects rows | web + APK |

> The `VITE_` prefix is required. Vite only exposes env vars starting with `VITE_` to the browser bundle. Without it the value is `undefined` at runtime.

> NEVER put the **service_role** key in the app. It bypasses RLS. It belongs only in server-side / Edge Functions, never in client code or git.

## Where the values are stored, per environment

| Environment | File / location | Committed to git? |
|---|---|---|
| Local dev | `.env.local` in repo root | NO — gitignored |
| Production (Vercel) | Vercel → Settings → Environment Variables | NO — stored by Vercel |
| CI (GitHub Actions) | GitHub → Settings → Secrets → Actions | NO — encrypted by GitHub |

`.env.example` (committed) documents the names with placeholder values. `.env.local` (gitignored) holds the real ones.

## Local file — exact contents

Create `C:\Users\achau\OneDrive\Desktop\Habit-tracker\.env.local`:

```
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Restart the dev server after editing (`npm run dev`) — env is read at boot.

## Android keystore secrets (separate, for Play Store release)

| Variable | Where | Notes |
|---|---|---|
| stored in `android/keystore.properties` (local, gitignored) | you generate via `keytool` | back up the `.keystore` to 3 places |
| `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` | GitHub → Secrets → Actions | only needed for CI-built signed AAB |

See `docs/PLAY_STORE_CHECKLIST.md` for keystore generation.

## Quick rules

- Anything `VITE_*` → shipped to the browser → assume public. Only put public keys there.
- Real secrets (service_role, keystore passwords) → never in `VITE_*`, never in git.
- `.env.local`, `*.keystore`, `keystore.properties` are all gitignored — verify with `git status` before committing.
