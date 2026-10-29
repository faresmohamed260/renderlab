# Instagram clone — private Android device development lab

**Status (2026-10-27):** work in progress. Isolated under draft PR #401; separate from RenderLab production and Expo SDK58 Phase M0 PR #399. This is an experiment for observing UI changes on a personally controlled Android phone, not a product feature, release, public APK, approved app architecture, or migration of user accounts.

## Components and evidence

- Immutable third-party MIT source: [hernanhawryluk/instagram-clone-app](https://github.com/hernanhawryluk/instagram-clone-app) commit `24777fc335530a9c4285c7ef5974053ba7b39104`. The source is not copied into the RenderLab application package. `instagram-clone-device-lab.py` applies the existing offline fixture, restores original bottom-tab layout, and configures an unrelated debug-only Android ID (`dev.renderlab.instagramclonelab`).
- Existing offline fixture fakes all profile/posts/stories data; Firebase credentials are replaced by null and backend-backed actions disabled. Existing camera/microphone/private-media/contact/location Android permissions are blocked in the debug app config. **Do not connect real accounts, personal media, or service credentials.**
- `instagram-clone-device-dev-apk.yml` builds a local Android **debug development client** in a credential-free GitHub runner. This is **not** a release build or a standalone APK with offline JS. Its JS is loaded from **Metro** while the dev server is running.
- `instagram-clone-overrides/src/navigation/BottomTabs.jsx` contains the unchanged upstream UI source as the initial, editable reference; future **approved user-directed UI edits** can be recorded under `instagram-clone-overrides/src/navigation`, `src/screens`, `src/components`, or `src/constants`. `instagram-clone-live-sync.py` copies those overlay files into a developer's checked-out clone after it detects a new PR branch commit, causing Metro Fast Refresh.
- Keep PR #401 **draft and unmerged**. Do not merge old dependencies into `apps/mobile` or into production. Existing 41 dependency findings including 4 critical remain **not security accepted**.

## First installation requirements

The user must receive and install the debug APK on their Android phone (via trusted transfer or `adb install`). A real phone touchscreen test remains an explicit separate checkpoint. The phone must be able to connect to a Metro server running on an accessible, persistent development machine; GitHub Actions jobs stop after build and **do not host Metro**.

The installed APK is an executable **development client**. Without Metro it may show a development-server selector/connection screen, not the cloned UI. A JavaScript change normally does **not** require APK reinstall. Native dependency changes, app config, permission changes and incompatible SDK upgrades **do** require another build.

### Developer machine setup (one-time; no Expo/EAS account)

Use Node 24, Python 3, Android SDK only if locally building/installing via ADB. On a trusted LAN, arrange the directories side-by-side:

```bash
git clone -b experiment/instagram-clone-android-emulator-20261026 https://github.com/faresmohamed260/renderlab.git renderlab
git clone https://github.com/hernanhawryluk/instagram-clone-app.git clone
cd clone
git checkout 24777fc335530a9c4285c7ef5974053ba7b39104
npm ci --ignore-scripts --no-audit --no-fund
python3 ../renderlab/.github/reference-tests/instagram-clone-device-lab.py
npx expo install expo-dev-client -- --ignore-scripts --no-audit --no-fund
npm install --save-exact expo@53.0.27 expo-image@2.4.1 expo-updates@0.28.18 react-native@0.79.6 --ignore-scripts --no-audit --no-fund
npx expo install --check
```

Terminal A (inside `clone`) — start Metro for the **development client**:

```bash
npx expo start --dev-client --lan --port 8081
```

Connect phone to the same **trusted Wi-Fi** as the machine, open `RenderLab Clone Lab`, then use the displayed QR/address in its dev-client launcher. Where Android USB debugging is already configured, a USB alternative is `adb reverse tcp:8081 tcp:8081` plus `--localhost`. Avoid a public Metro tunnel or untrusted Wi-Fi by default.

Terminal B (from directory *above* `renderlab` and `clone`) — mirror future approved GitHub UI changes into the running Metro source:

```bash
python3 renderlab/.github/reference-tests/instagram-clone-live-sync.py \
  --renderlab renderlab --clone clone --interval 8
```

This polling process fetches only the lab branch, rejects non-UI overlay paths, does not run downloaded commands and does not change external/real APIs. ChatGPT can subsequently commit user-requested JSX changes into the overlay path; the watcher writes those changes into `clone/src/...` where Metro reloads them. **It cannot make Fast Refresh work if Metro or the watcher stops, or if the phone cannot reach Metro.** For a long-running hosted server, obtain explicit infra/spend/security authorization before provisioning anything.

## Verification gates

1. **APK compiled:** exact GitHub Actions run artifact exists, SHA-256 recorded and Android package ID and blocked permissions checked.
2. **Installed:** real phone recognizes the standalone lab icon/package (requires user/device access; never assume CI compilation means installation).
3. **Connected:** real phone loads original clone Home screen through the dev client's Metro URL.
4. **Interactive:** human-driven touch selects Search/Profile and vertical scroll works (previous emulator ADB-tap test did not validate this; keyboard tab focus did).
5. **Live edit:** change one existing on-screen label/color via branch overlay, observe update in running app without rebuilding/reinstalling. No credentials.
6. **Safe:** no Firebase/production/privileged permission path; current vulnerabilities explicitly acknowledged as a blocker to non-lab adoption.

**Do not assert step 2–6 complete based on step 1.** PR #399 M0 security and Expo SDK58 acceptance remain separate.
