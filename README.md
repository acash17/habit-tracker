# Cadence

Habit sequence planner — iOS-style React app. **Vite + React 18 + Capacitor 6** for Android + iOS.

## Feature tour

A ~60-second walkthrough of the app. See [`docs/demo/`](docs/demo/) for the
higher-quality video and how to regenerate it.

![Cadence feature tour](docs/demo/cadence-tour.gif)

---

## 1. Run in browser (dev)

```bash
npm install
npm run dev
```

Open http://localhost:5173 — Vite HMR, sub-second reload.

---

## 2. Build Android APK (Windows / Mac / Linux)

### One-time setup

1. Install **Android Studio**: https://developer.android.com/studio
2. SDK Manager → install Android SDK Platform 34, Build-Tools, Platform-Tools.
3. Env vars:
   - `ANDROID_HOME` → e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`
   - `JAVA_HOME` → JDK 17–21 (Android Studio bundles JDK 21 at `C:\Program Files\Android\Android Studio\jbr`)
   - Add `%ANDROID_HOME%\platform-tools` to PATH

> JDK 22+ may fail Gradle. JDK 25 confirmed broken with Gradle 8.11.

### Build debug APK

```bash
npm run android:apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on phone:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or sideload: copy APK → phone → enable "Install unknown apps" → tap APK.

### Open in Android Studio (signed release / Play Store)

```bash
npm run android
```
Build → Generate Signed Bundle / APK.

---

## 3. Build iOS IPA (requires Mac)

Cannot build on Windows. On a Mac:

```bash
git clone https://github.com/acash17/habit-tracker.git
cd habit-tracker
npm install
sudo gem install cocoapods
npm run ios   # opens Xcode
```

Xcode: select team → Product → Archive → Distribute. Apple Developer account needed for TestFlight / App Store ($99/yr).

---

## 4. After editing source

```bash
npm run sync         # vite build + cap sync — pushes to native projects
npm run android:apk  # rebuild APK
```

---

## Stack

- **React 18.3** — ES modules, named imports
- **Vite 5** — dev server, prod bundle (~73 KB gzipped)
- **Capacitor 6** — native iOS + Android wrappers
- No Tailwind / styled-components — uses CSS variables + inline `style` props

## Project layout

```
index.html               — Vite entry (loads /src/main.jsx)
vite.config.js           — Vite + React plugin
capacitor.config.json    — appId, appName, webDir=dist
src/
  main.jsx               — bootstrap, mounts <App/> inside <IOSDevice/>
  styles.css             — global CSS (fonts, keyframes, layout)
  app.jsx                — root: tab bar, screens, sheets, toasts
  data.jsx               — initial goals / timeline blocks / insights
  ui.jsx                 — Icon, Bloom, Chip, Btn, Card, H primitives
  ios-frame.jsx          — phone chrome (IOSDevice, IOSStatusBar, ...)
  screen-today.jsx       — Today timeline + quick chips
  screen-goals.jsx       — Goals list
  screen-insights.jsx    — Insights cards + completion-by-hour chart
  screen-settings.jsx    — Settings
  screen-newgoal.jsx     — New goal wizard
  sheet-energy.jsx       — Energy profile editor
  sheet-library.jsx      — Template library
  sheet-life-happened.jsx— Life-happened recovery flow
  sheet-voice.jsx        — Voice capture
  planner.jsx            — Sheet shells + planner UI
  onboarding.jsx         — First-run onboarding
  tour.jsx               — Tour overlay
  tweaks-panel.jsx       — Dev tweak controls (unused at runtime)
dist/                    — Vite build output (gitignored)
android/                 — Capacitor Android project
ios/                     — Capacitor iOS project (build on Mac)
standalone/              — Self-contained HTML bundles (older)
Investor Landing.html    — Marketing page
Pitch Deck.html          — Investor deck
Cadence.html             — Legacy Babel-in-browser entry (kept for reference)
```

## Known limitations

- **No persistence** — state resets when app closes. Add `@capacitor/preferences` for storage.
- **No push notifications** — add `@capacitor/push-notifications`.
- **No backend** — all data is in-memory React state.
- **Tweaks panel + ios-frame device chrome** are loaded but largely passive in the mobile build (the device chrome looks redundant inside a real native shell — consider stripping for native builds).
