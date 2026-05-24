# Cadence

Habit sequence planner — iOS-style React prototype, wrapped with Capacitor for Android + iOS native builds.

---

## 1. Run in browser (dev)

```bash
npm install
npm start
```

Open http://localhost:5173/Cadence.html

---

## 2. Build Android APK (Windows / Mac / Linux)

### One-time setup

1. Install **Android Studio**: https://developer.android.com/studio
2. During setup, accept SDK licenses and install:
   - Android SDK Platform 34 (or latest)
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
3. Install **JDK 17** (Android Studio bundles one; or install separately).
4. Set env vars:
   - `ANDROID_HOME` → e.g. `C:\Users\<you>\AppData\Local\Android\Sdk`
   - `JAVA_HOME` → JDK 17 path
   - Add `%ANDROID_HOME%\platform-tools` to PATH

### Build debug APK

```bash
npm run android:apk
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

Install on phone:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or open Android Studio to build / sign / release:
```bash
npm run android
```

### Build signed release APK

1. Generate keystore (one-time):
   ```bash
   keytool -genkey -v -keystore cadence.keystore -alias cadence -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Open `android/` in Android Studio → Build → Generate Signed Bundle / APK.

---

## 3. Build iOS IPA (requires Mac)

Cannot build on Windows. On a Mac:

```bash
# After cloning the repo:
npm install
sudo gem install cocoapods   # if not present
npm run build
npx cap sync ios
npm run ios                  # opens Xcode
```

In Xcode: select team, product → archive → distribute.
Requires Apple Developer account ($99/yr) for App Store / TestFlight.

---

## 4. Sync changes after editing JSX

Whenever you edit files in `src/` or `Cadence.html`:

```bash
npm run sync         # copies web assets into native projects
npm run android:apk  # rebuild APK
```

---

## Project layout

```
Cadence.html             — main app shell (Babel-in-browser React)
src/                     — JSX components
  app.jsx                — root + tab bar
  screen-*.jsx           — Today / Goals / Insights / Settings
  sheet-*.jsx            — bottom sheets
  onboarding.jsx, planner.jsx, tour.jsx, ui.jsx, data.jsx, ios-frame.jsx
standalone/              — alternate HTML entry points
Investor Landing.html    — marketing page
Pitch Deck.html          — investor deck
build.js                 — copies app → www/ for Capacitor
capacitor.config.json    — app id, name, webDir
android/                 — native Android project (generated)
ios/                     — native iOS project (generated, build on Mac)
www/                     — build output (gitignored)
```

## Tech

- React 18.3 via UMD CDN
- Babel Standalone (in-browser JSX transform — slow first load on phone)
- Capacitor 6 (native wrapper)

## Known limitations

- **Babel-in-browser**: first paint slow on phone (~2-3s). Migrate to Vite + `@vitejs/plugin-react` for production. Needs JSX file refactor to ES modules.
- **No offline storage yet**: data lost on app restart. Add `@capacitor/preferences` plugin for persistence.
- **No push notifications**: add `@capacitor/push-notifications`.
