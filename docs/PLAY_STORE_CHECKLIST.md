# Cadence — Play Store launch checklist

Work order. Strike each line as you go.

---

## A. Things only you can do (human steps)

### A1. Generate your release keystore

```bash
# Run ONCE on your Windows machine. Pick strong passwords. WRITE THEM DOWN.
keytool -genkey -v \
  -keystore cadence-release.keystore \
  -alias cadence \
  -keyalg RSA -keysize 2048 -validity 10000
```

You will be prompted for:
- Keystore password (≥ 12 chars, save to 1Password / KeePass)
- Key password (same or different — save both)
- First/last name, org, city, country (used in cert metadata; can be your name)

After:
- [ ] Move `cadence-release.keystore` to a folder **outside the repo**, e.g. `C:\Users\achau\secrets\`
- [ ] Back up the keystore file to **3 places** (Google Drive + USB stick + 1Password attachment)
- [ ] Copy `android/keystore.properties.example` → `android/keystore.properties`
- [ ] Edit `android/keystore.properties` and fill in your real paths + passwords
- [ ] Confirm `android/keystore.properties` is `.gitignored` (it is) — never commit it

> If you lose this keystore, you can **never publish updates** to the app under this package id. Google's "Play App Signing" can recover it later if you opt in during upload.

### A2. Create a Google Play Console account

- [ ] Sign in at https://play.google.com/console with the Google account you want to own the app
- [ ] Pay the one-time **$25** developer registration fee
- [ ] Complete identity verification (Google emails you a form; usually instant, sometimes ~24h)

### A3. Take screenshots

You need a minimum of **2 phone screenshots** (max 8). Recommended dimensions: **1080×1920** (9:16). Grab from the running APK or `npm run demo`.

Suggested 4 shots:
1. Today screen with the timeline blocks visible
2. Goals screen with the **Daily/Weekly/Monthly** filter pills
3. Goal detail with sub-habits being edited inline
4. Insights or energy profile (for design polish)

Save as PNG into `docs/play-store/screenshots/`.

### A4. Create a feature graphic

- Dimensions: **1024×500 PNG** (no transparency)
- Required for the Play Store listing header
- Suggested content: serif "Cadence" + tagline "The planner that plans for you", with a single phone mock
- Quick path: take a wide screenshot of `npm run demo` running, crop to 1024×500. Or hand-design.
- Save to `docs/play-store/feature-graphic.png`.

---

## B. Things already done by the codebase (no action needed)

- [x] App id: `com.acash.cadence`
- [x] App name: `Cadence`
- [x] Version code: `1`, version name: `0.5.0` (bump in `android/app/build.gradle` for each release)
- [x] Icons + splash generated at all densities (`npm run assets`)
- [x] Signing config reads from `keystore.properties` OR CI env vars
- [x] ProGuard rules preserve Capacitor bridge classes; minify + shrink enabled for release
- [x] Debug builds use `.debug` suffix so they can coexist with the release build
- [x] Privacy policy at `privacy.html` (deploy with the web build → host on Vercel)

---

## C. Build the release Android App Bundle (AAB)

After A1 + A2:

```bash
# In repo root
npm run android:aab
```

Output: `android/app/build/outputs/bundle/release/app-release.aab` (~5 MB)

Verify it’s signed:
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab | head -20
```

> If you see `jar is unsigned` → `keystore.properties` is not being picked up. Re-check the path in it.

---

## D. Upload to Play Console (internal track first)

1. Play Console → **Create app**
   - App name: `Cadence`
   - Default language: English (US)
   - App or game: App
   - Free or paid: Free
   - Tick declarations
2. **App content** (left nav) — fill these required items:
   - [ ] Privacy policy URL → `https://<your-vercel-url>/privacy.html`
   - [ ] App access → the core planner works without login, but sign-in unlocks
         sync. Tick "All or some functionality is restricted" and provide a
         **test Google account** (email + password) so reviewers can exercise
         sign-in and sync.
   - [ ] Ads → "No, my app does not contain ads"
   - [ ] Content rating → fill questionnaire (all "no" → likely Everyone)
   - [ ] Target audience → **18 and over** (must match the in-app 18+ consent gate)
   - [ ] Data safety → ⚠️ do **NOT** declare "No data collected" — optional
         Google sign-in + Supabase sync collects data, and a false Data safety
         form violates Play's User Data policy (rejection/removal). Declare:
     - **Personal info → Email address**: collected (optional), purpose: account
       management, encrypted in transit, deletion mechanism available
     - **Personal info → Name**: collected (optional), purpose: account
       management/personalisation, encrypted in transit, deletable
     - **Personal info → User IDs**: collected (optional), purpose: account
       management, encrypted in transit, deletable
     - **App activity → Other user-generated content**: goals/sub-habits and
       completion history, collected (optional), purpose: app functionality,
       encrypted in transit, deletable
     - Everything else (location, contacts, photos, device IDs, health,
       financial, browsing, advertising ID): **not collected**
     - Data shared with third parties: **No** (Supabase acts as a service
       provider/processor, which is not "sharing" under Play's definition)
   - [ ] Account deletion URL → `https://<your-vercel-url>/delete-account.html`
         (required for any app that supports account creation; in-app path is
         Settings → "Erase all my data", which now deletes the auth account too —
         run `supabase/migrations/006_account_deletion.sql` first)
3. **Main store listing**
   - Short description (≤ 80 chars): see `docs/play-store/copy.md`
   - Full description (≤ 4000 chars): see `docs/play-store/copy.md`
   - Upload icon, feature graphic, screenshots
4. **Release → Testing → Internal testing**
   - Create new release → upload `app-release.aab`
   - Opt into **Play App Signing** when prompted (recommended — Google holds the upload key)
   - Release notes: `Initial internal build for testing.`
   - Save → Review → Start rollout
   - Add internal testers by email (you + 5-10 friends)
   - Internal builds are **available within minutes**, no review

5. **Test on real devices** for 2-3 days. Crash logs appear in Play Console under "Quality → Android vitals".

6. When stable: **Promote to Closed testing → Open testing → Production**.

> First production release typically takes **1-3 days of Google review**. Subsequent updates: hours.

---

## E. Optional but recommended

- [ ] Wire CI to build the AAB automatically (see `.github/workflows/build-aab.yml` once you add `KEYSTORE_BASE64` + 3 password secrets to GitHub)
- [ ] Set up Play Console’s pre-launch report (free; runs your APK on 10 real devices and flags issues)
- [ ] Hook up Firebase Crashlytics (optional, but invaluable)
- [ ] Add `@capacitor/preferences` later if you outgrow `localStorage`'s 5 MB cap

---

## F. Update cadence later

```bash
# Bump versionCode (integer, +1) and versionName in android/app/build.gradle
# Then:
npm run android:aab
# Upload the new AAB to Play Console → Production → Create release
```
