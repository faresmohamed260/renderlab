# RenderLab Android — Phase M0 development scaffold

**Status:** nonproduction scaffold under review; **not** a verified mobile app release. Governing contract: `docs/architecture/MOBILE_APP_PHASE_M0_CONTRACT.md` and repository `AGENTS.md`.

## Architecture

Independent Expo SDK 58 / React Native / TypeScript / Expo Router app in `apps/mobile`. Four native tabs — Create, Library, Activity and Settings — are **placeholder scaffolds**, not product-complete features. Local gluestack-ui v5 (UniWind) Button and provider are generated from the maintained CLI. Colors mirror `docs/ui/UI_SYSTEM.md`. TanStack Query is wired for future server-owned data; Zustand is strictly local UI state. The typed API boundary currently performs URL validation only; it **does not make requests**, authenticate or read private data.

## Local development

Use Node 24 and the committed lockfile: `cd apps/mobile && npm ci`. Start Metro with `npm start` and work in an Expo-compatible development environment. Expo Fast Refresh updates JS/UI during development without rebuilding native binaries. Initial app installation is still required; native modules/permissions or runtime upgrades require another native build. A real device, Android development client, Expo/EAS account, OTA Update service, and credentials **have not been configured or validated**.

Run `npm run typecheck`, `npm test`, `npm run lint`, `npm run export:android`, and `npx expo-doctor` before requesting review. `npm audit --omit=dev` must remain fail-closed for high/critical issues; Expo's current `node-forge` advisory is an unresolved **security blocker for release/credentials**. Passing metro export is not device-rendering proof.

## Security and provisioning limits

No live Supabase/R2/Modal access, shared infrastructure changes, Android package identifier, auth callback, real secrets, signing key, EAS owner/project/runtime ID, APK distribution or OTA publish is authorized. An `eas.json` development/preview **template** exists but is not a provisioned channel/project. Do not add a production profile or imply release readiness. `.env.example` is illustrative only; `EXPO_PUBLIC_*` values are public.

Native session storage, invitation and MFA flows, per-route bearer/Origin checks, signed-media header stripping, device rendering, OTA compatibility fingerprint and production signing require separate evidence and permissions. Follow the M0 acceptance checklist in the contract and stop after M0 for further direction.
