# Instagram clone live Android device handoff — PR #401

> **Owner requirement correction — 2026-10-27:** The desired installed Android app must run the Instagram-style UI **against RenderLab's existing production backend and actual account/Library/job data**, while supporting Fast Refresh edits. The offline fake-account Expo SDK 53 clone APK built in this lab **does not satisfy that requirement**. Do not describe this APK as the final RenderLab client, a backend-integrated build, a production login client, or an acceptable app for real credentials. The screenshot of the Expo development-server picker indicates Metro is not connected, independently of the missing backend integration.

### Production contract and safe route to the user goal
- **Actual production origin:** `https://renderlab.faresuniform.uk` (canonical source: `docs/production/current.json`). No second backend, no Firebase, and no direct R2/Supabase table or ComfyUI worker calls from the app.
- Existing server routes include read-only `GET /api/media/assets` (owner-scoped Library; optional `origin=generated|uploaded`), `GET /api/media/collections`, `GET /api/account/profile`, and `GET /api/generation/jobs/[jobId]`. Generation writes use `POST /api/generation/jobs` and remain **out of the first read-only milestone**.
- The backend reads a Supabase bearer access token via `src/lib/supabase/server.ts`, revalidates Auth user, claims/session ID and live session, checks MFA/TOTP, then requires active account admission before returning private Library data. The current fake offline fixture provides **no** such authenticated session.
- Production credentials must **not** be supplied to the old SDK 53 third-party clone (known 4 critical/18 high dependency findings). Do not add a static bearer token, service-role key or bypass to that APK. Native authentication must use the approved M0/M1 native project direction in `docs/architecture/MOBILE_APP_PHASE_M0_CONTRACT.md` with secure token storage, accepted MFA flow, protected Auth redirects and fresh owner validation.
- **Recommended implementation:** keep the original clone as a UI/interaction reference; bring its reusable Instagram-style composition into the supported RenderLab mobile codebase (`apps/mobile` on draft PR #399, Expo SDK 58), then implement production Auth + read-only Library as the separately reviewed **M1 security-sensitive slice**. Do **not** merge the old vulnerable clone or touch production Auth config based only on this lab.
- The newly built secure native APK must be installed **once** to replace the test client. Thereafter JSX text/icons/tab layout changes can update through a reachable Metro Fast Refresh server; native dependency/manifest changes still require another build. Neither an already-installed APK nor Fast Refresh automatically starts a Metro server. WANDA is currently offline and cannot host it until reconnected.

**Acceptance remains open:** authorized production-compatible native Auth and MFA/invitation; real-device sign-in; owner-scoped generated/uploaded Library and collections via production API; token never forwarded to R2 redirects; actual touch and feed scrolling; live CSS/JS change reflected on-device without reinstall. Do not label any as passed until tested.


**Status (2026-10-27): DEBUG APK BUILT, DOWNLOADED AND HASH-VERIFIED; REAL PHONE INSTALLATION / METRO CONNECTIVITY NOT YET VERIFIED.** This is an isolated, synthetic-data development lab, **not** a RenderLab production client, approved UI migration, or release-ready app.

## Verified exact APK
- [Successful build run](https://github.com/faresmohamed260/renderlab/actions/runs/40448615214), `renderlab-instagram-lab-debug-apk` artifact ID `12710191458`, seven-day retention through 2026-11-03.
- Actual extracted artifact: `apk/renderlab-instagram-lab-debug.apk`, package `dev.renderlab.instagramclonelab`, min Android API 24, target 35.
- SHA-256: `ce910a9e0a8eb6f2d1505ac8d33d8eb90b32cd3f42ae803d2fd35ba981833027`. The downloaded APK bytes were independently hashed and matched the build's SHA256SUMS.txt.
- The APK includes an Expo **development client**; it **will not render the clone offline** without a running, reachable Metro server providing the matching JavaScript bundle.
- The pinned MIT upstream clone source remains `hernanhawryluk/instagram-clone-app@24777fc335530a9c4285c7ef5974053ba7b39104`. Fixture setup removes real Firebase/EAS integration, uses fake media and identity, blocks sensitive Android permissions, and leaves Expo OTA updates disabled.

## Local Metro server and Fast Refresh
On any trusted workstation with Git, Python 3, Node 24/npm and the RenderLab repository checked out on this draft branch:

```sh
python3 .github/reference-tests/instagram-clone-live-server.py prepare
python3 .github/reference-tests/instagram-clone-live-server.py start --host lan
```

The first command creates an **isolated clone checkout** in `~/.renderlab-instagram-clone-lab`, checks out the exact upstream SHA, applies the same synthetic-data device-lab fixture used by the APK build, installs the same Expo SDK 53 development-client package, and leaves the original UI components editable. Re-running `prepare` preserves local UI edits. The second starts Metro on port 8081 and must **stay running**. The phone and server need reachable local network connectivity. Open the installed development client and enter/scan the Metro development-server URL printed in the terminal. React Native Fast Refresh can apply most JS/TS/JSX text, layout and icon changes without rebuilding the APK.

For USB-only connectivity with Android platform-tools/ADB and USB debugging authorized on the device:

```sh
adb reverse tcp:8081 tcp:8081
python3 .github/reference-tests/instagram-clone-live-server.py start --host localhost
```

Use the development client URL shown by Expo; ADB port reversal is a connection technique, not a device installation step. Native dependencies, app manifest permissions, native resource changes and development-client upgrades still require an APK rebuild.

## Actual acceptance sequence
1. User installs the APK on their Android device (explicit action; no remote installation without device authorization).
2. Trusted computer starts the pinned local Metro server and exposes it to the phone over LAN or USB/ADB.
3. Device opens the clone, shows synthetic Home feed, switches Search/Profile tabs with **physical touch**, and scrolls the feed. Record these as passed only after a real-device check; previous GitHub CI ADB taps failed while keyboard navigation passed.
4. Change a visible JSX label/color in the isolated clone source; verify **Fast Refresh on the running device** without APK reinstall. Then proceed with user-directed individual UI modifications.
5. Never enter real passwords or use actual personal media, Firebase credentials, shared RenderLab backend, OTA production updates, or production Android identity in this lab.

## Security and authority
The third-party clone's production dependency audit remains **41 findings: 4 critical, 18 high, 18 moderate, 1 low**. This test APK is **not approved for public distribution, production, real account access, or privileged data**. It is acceptable only as an isolated personal-device visual experiment with explicit understanding of the risk. No PR #399/#400 merge, RenderLab production app source, shared provider or native Phase M0 gate is altered. PR #401 remains draft/unmerged.

## Checkpoint — standalone original-clone UI build attempt (2026-10-29)

**Owner-restated expectation:** The first visual review on their physical phone must show the *actual pinned prebuilt Instagram clone UI*, not the RenderLab SDK58 placeholder scaffold. Once delivered, the UI must launch independently of Metro, even when the temporary cloud development server is off. A distinct secure SDK58 migration and persistent versioned OTA are still required for a real backend-integrated RenderLab product.

The isolated `.github/workflows/instagram-clone-standalone-preview.yml` workflow compiles **the original pinned MIT clone sources** `hernanhawryluk/instagram-clone-app@24777fc335530a9c4285c7ef5974053ba7b39104` with PR #401's existing offline synthetic-fixture and Firebase-disabled hooks. It uses the old Expo SDK53 runtime **only in a separate offline, internet-permission-blocked UI preview app** (`dev.renderlab.instagramclonelab`), retaining the original Home, Search, Reels, Profile and bottom-tab components. A release-mode ARM64 build embeds `assets/index.android.bundle` and is designed to work without Metro; CI verifies the bundle, missing Internet/camera/media permissions, package name, and a disposable test signing certificate before uploading a seven-day artifact. **The CI workflow source is not evidence of an actual APK**; require successful build/run and artifact verification before offering installation. This is not the secure RenderLab native product or an OTA-capable binary. Do not use real credentials, native Auth, actual account/media data or production backend in this isolated preview.

After the original UI baseline is device-approved, the **production-target implementation** remains an explicit follow-up: reuse the clone UI structure and licensed components in RenderLab's SDK58 app without shipping the vulnerable SDK53 dependency tree, then qualify an embedded JS bundle and authenticated/verified persistent OTA update mechanism that retains UI changes after cloud services stop. No production deployment, signing key release, OTA provisioning or merge was authorized by this preview.

## Checkpoint 62 — verified standalone offline-clone artifact (2026-10-29)

**Verified cloud build:** [GitHub Actions run 40844055039](https://github.com/faresmohamed260/renderlab/actions/runs/40844055039) **PASSED** on PR #401 candidate `eebb61732885cf6f84fced2499b97dc2e4a0b04a`. The source was the original MIT-licensed `hernanhawryluk/instagram-clone-app` pinned at `24777fc335530a9c4285c7ef5974053ba7b39104`. Existing offline fixture adaptation preserved the upstream native Home, Search, Reels, Profile and bottom-tab composition with synthetic media. It disabled Firebase and update provisioning, and blocked Android Internet, camera, and media permissions for this isolated app. No connection to the RenderLab production backend or real user accounts was attempted.

The Expo SDK53 **release-mode** ARM64 build completed. CI verified **`assets/index.android.bundle` embedded inside the APK**, ARM64 JNI binaries, distinct `dev.renderlab.instagramclonelab` package identity, absence of Android Internet/sensitive permissions, Android `apksigner verify`, and exact matching SHA-256 certificate for its throwaway CI-only signer. Signed APK uploaded as [GitHub artifact 12883979109](https://github.com/faresmohamed260/renderlab/actions/runs/40844055039/artifacts/12883979109) (`renderlab-instagram-clone-offline-preview`, seven-day retention until **2026-11-05 08:50 UTC**). The extracted `renderlab-instagram-clone-offline-preview.apk` is **49,641,407 bytes** with SHA-256 `0ffb3dc0f94decda5a11c183a43de581e7e38832f3e1d30b47c344f9580bb995`; the extracted ZIP and Android bundle inventory were separately checked and passed.

**What this proves:** a genuine clone-source, non-Metro **offline Android APK artifact exists and is downloadable**. **Not verified:** physical phone installation, actual startup without Metro/internet, touchscreen feed/swipe/navigation, owner-approved RenderLab visual acceptance, dynamic code-update persistence, secure Expo SDK58 source port, authenticated production backend, MFA/owner-scoped media, or live OTA. It remains an **isolated older SDK53 reference build with vulnerable dependency history**, explicitly not a production RenderLab app. The test certificate is disposable, so another native APK signed separately cannot upgrade this preview in place.

**Next gate:** owner physically installs this **separate package** and confirms actual Home/Search/Profile/Feed layout after airplane-mode launch and cold restart, without entering real credentials. Then migrate the accepted upstream clone source into the supported SDK58 RenderLab package with secure backend boundaries, and implement and validate offline-retained versioned OTA. Keep draft PRs unmerged, existing production unmodified, and do not equate offline bundling with persistent OTA functionality.
