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
