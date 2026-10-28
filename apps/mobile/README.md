# RenderLab Android — Phase M0 development scaffold

**Status:** implemented M0 nonproduction scaffold on a review branch; **not** an installed-device-verified or release-qualified app. Governing contract: `docs/architecture/MOBILE_APP_PHASE_M0_CONTRACT.md` and repository `AGENTS.md`.

## Architecture

Independent Expo SDK 58 / React Native / TypeScript / Expo Router app in `apps/mobile`. Four native tabs — Create, Library, Activity and Settings — are **placeholder scaffolds**, not product-complete features. Local gluestack-ui v5 (UniWind) Button and provider are generated from the maintained CLI. Colors mirror `docs/ui/UI_SYSTEM.md`. TanStack Query is wired for future server-owned data; Zustand is strictly local UI state. The typed API boundary currently performs URL validation only; it **does not make requests**, authenticate or read private data.

## Local development

Use Node 24 and the committed lockfile: `cd apps/mobile && npm ci`. Start Metro with `npm start` and work in an Expo-compatible development environment. Expo Fast Refresh updates JS/UI during development without rebuilding native binaries. Initial app installation is still required; native modules/permissions or runtime upgrades require another native build. A real device, Android development client, Expo/EAS account, OTA Update service, and credentials **have not been configured or validated**.

Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run export:android`, and `npx expo-doctor` before requesting review. `npm audit --omit=dev` must remain fail-closed for high/critical issues; Expo's current `node-forge` advisory is an unresolved **security blocker for release/credentials**. Passing metro export is not device-rendering proof.

## Security and provisioning limits

No live Supabase/R2/Modal access, shared infrastructure changes, Android package identifier, auth callback, real secrets, signing key, EAS owner/project/runtime ID, APK distribution or OTA publish is authorized. An `eas.json` development/preview **template** exists but is not a provisioned channel/project. Do not add a production profile or imply release readiness. `.env.example` is illustrative only; `EXPO_PUBLIC_*` values are public.

Native session storage, invitation and MFA flows, per-route bearer/Origin checks, signed-media header stripping, device rendering, OTA compatibility fingerprint and production signing require separate evidence and permissions. Follow the M0 acceptance checklist in the contract and stop after M0 for further direction.

## Verified initial toolchain and remaining gates (2026-10-25)

The feature-branch scaffold generated with `create-expo@5.1.5` and `gluestack-ui@5.0.3` passed independent clean `npm ci`, Expo Doctor 20/20, TypeScript, Node unit tests, ESLint and Android Metro export in [run 40187262544](https://github.com/faresmohamed260/renderlab/actions/runs/40187262544). The follow-up `expo-system-ui@~58.0.6` lockfile/dark Android OS configuration passed those checks in [run 40187567299](https://github.com/faresmohamed260/renderlab/actions/runs/40187567299). Standard read-only CI repeats this evidence per proposed change and has an independent, **failing** high/critical dependency-security gate. The static Expo starter icon assets are placeholders, not approved branding.

The **persistent M0 scaffold's full native dependency set** (including font, dev-client, secure-store and system UI) compiled successfully as an isolated arm64 Android debug APK in [run 40188507173](https://github.com/faresmohamed260/renderlab/actions/runs/40188507173), using the committed npm lockfile; Gradle reported BUILD SUCCESSFUL in 8m 35s. A disposable CI package ID was used; the APK was verified and deleted without distribution or installation. The earlier temporary candidate native pass (run 40168164549) is superseded by this stronger persistent-project proof, **not** by device or release qualification. Screen rendering, large text, TalkBack, keyboard, performance, native deep-link/auth flows, EAS runtime fingerprint/OTA and release signing remain NOT VERIFIED. The `node-forge` GHSA-86w9-cpqp-85rv high-severity issue remains open and blocks release/security qualification, not isolated scaffold development.

## Tooling isolation

The web root's TypeScript configuration excludes `apps/mobile`: running `npm run typecheck` at the repository root validates the Next.js app only, while `npm run typecheck` inside `apps/mobile` validates the mobile SDK/React Native dependency graph. The Android Mobile Foundation workflow runs both independent quality and fail-closed production dependency audit jobs; do not bypass one by relying on the other.

## Stacked M1 draft — production API connectivity without credentials (2026-10-27)

This README's original M0 foundation status still applies to PR #399. The separate, **unmerged and unapproved** PR #402 is stacked on top and adds the production guest probe and a native Library status screen; see [M1 contract](../../docs/architecture/MOBILE_APP_M1_PRODUCTION_READ_CONTRACT.md). It now makes an anonymous, first-party **GET** request to `https://renderlab.faresuniform.uk/api/media/assets?limit=1` and correctly displays that production Library requires sign-in. This is the first real backend connection, **not a private media connection**; no native Supabase credentials or tokens are read, generated, or stored.

Exact [GitHub Actions guest probe](https://github.com/faresmohamed260/renderlab/actions/runs/40484282154) verified HTTP 401 JSON on private Library/Collections/Profile and HTTP 200 on public generation availability with no credentials or mutations. Contract validation now covers Library media/page metadata, Collections, MFA and access-denied errors, and reject-only signed media route checking. Protected media 302 redirects to R2, so native image rendering still requires a separately secured token-free signed-media resolver; do not pass bearer headers into React Native media components.

**Not done:** SDK 58 replacement APK installation, native Auth/MFA and account admission, secure token persistence, private Library or media UI, real-phone navigation and scroll, release signing, EAS, cloud Metro host or Fast Refresh on-device. Owner forbids WANDA. Vercel Sandbox was examined only as a possible **metered** cloud Metro host; none has been created or started without provider-spend authorization. High-severity Expo node-forge dependency gate remains failed by design. Never claim production account connectivity is complete based on the guest status alone.


## Draft live UI configuration on the existing RenderLab backend — PR #403

PR #403 is stacked on draft production-read PR #402; **this is not released and requires an installed compatible Android build**. It adds a strict public first-party `GET /api/mobile/ui-config` endpoint to the same Next.js RenderLab backend. The mobile app reads it anonymously via HTTPS and applies bounded changes to its brand text, existing-tab titles/icons and tab order every 45 seconds in the foreground and on app resume. Invalid/missing responses preserve the last accepted config or embedded default. No new server, database, Metro process, EAS account, service credentials or production resource is involved in developing this code.

To prepare an authorized configuration change, edit the versioned `DEFAULT_ANDROID_UI_CONFIG` in `src/lib/api/android-ui-config-contract.ts`, or set `RENDERLAB_ANDROID_UI_CONFIG_JSON` as a **server-only** environment value with the exact same schema, and increment `revision`. Never put arbitrary code, navigation routes, backend URLs, account/entitlement state or secrets in config. The optional environment value is not a mutable live store; **a separately authorized new backend deployment** is required for changed production values. A mobile APK rebuild is not needed for schema-v1 text/tab layout changes **once the compatible APK has been installed**. Changing React Native logic needs a separately signed OTA update or APK release.

Tests are in `tests/unit/android-ui-config.test.mjs` (server) and `apps/mobile/tests/runtime-ui-config.test.mjs` (mobile). See `docs/architecture/MOBILE_APP_M1_PRODUCTION_READ_CONTRACT.md` Checkpoint 31 for the exact limits. **Do not tell the owner the current SDK53 offline APK or any other existing APK can load this remote configuration.** Real RenderLab login, signed media, native signing, update distribution, security qualification and actual phone testing remain separately blocked. WANDA is not used.


## Checkpoint 32 — Standalone JS bundle compiled, not installed (2026-10-27)

[Isolated GitHub Actions native proof 40508267121](https://github.com/faresmohamed260/renderlab/actions/runs/40508267121) on draft PR #403 compiled `apps/mobile` as a **release-mode arm64 Android APK with the embedded `assets/index.android.bundle`**. The nonempty approximately 33 MB APK was verified and immediately deleted; only a disposable, runner-local package name was used. This specifically validates that a future standalone build can open its embedded JavaScript **without a Metro process**. It does **not** establish phone/emulator installation, native startup, actual production Auth/Library data, working public UI-config updates on a device, signing/OTA credentials or release readiness. The old SDK53 clone APK still needs its development server and is not compatible with this code.

**Blockers:** Repo-native package ID and signing authorization, all-ABI and real-device runtime/UX tests, accepted Expo Updates runtime/server/channel/security contract for JavaScript OTA (not installed/configured), Supabase Auth/MFA, signed media and the current red Expo/node-forge security audit. No WANDA, new hosted backend, paid Metro or provider resources were used. See [M1 Checkpoint 32](../../docs/architecture/MOBILE_APP_M1_PRODUCTION_READ_CONTRACT.md) for exact evidence and gates.

## Checkpoint 33 — Android emulator install vs system launcher ANR (2026-10-28)

On isolated CI runs [40621393582](https://github.com/faresmohamed260/renderlab/actions/runs/40621393582) and [40621445198](https://github.com/faresmohamed260/renderlab/actions/runs/40621445198), an x86_64 SDK58 release-mode Android APK with embedded JS was compiled, signed with a throwaway test key, installed and launched. A screenshot proves the RenderLab native Create screen and bottom tab bar **rendered**, with an `Application Not Responding: com.google.android.apps.nexuslauncher` **Pixel Launcher** dialog blocking UIAutomator. The app PID was still running; navigation/touch acceptance was **NOT** established. [First failure diagnostics](https://github.com/faresmohamed260/renderlab/actions/runs/40621393582/artifacts/12788167223) are available in GitHub Actions (short retention). A scoped harness retry uses an AOSP Android image and keeps the system launcher enabled, with screenshot evidence. No feature behavior, tokens, production resources or signing identity changed.

Separate current CI blockers: Expo expects updated, SDK-compatible patches for `expo`, `expo-dev-client` and `expo-router` (and a regenerated verified lockfile); the inherited `node-forge` advisory remains high-severity and unwaived. See the [M1 contract Checkpoint 33](../../docs/architecture/MOBILE_APP_M1_PRODUCTION_READ_CONTRACT.md) for exact status.
