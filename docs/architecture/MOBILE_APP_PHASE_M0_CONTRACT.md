# Android / Mobile Foundation — Phase M0 Contract and Dependency Plan

**Status:** PROPOSED — review/merge gate; **implementation:** NOT STARTED; **deployment:** NOT AUTHORIZED  
**Prepared:** 2026-10-25  
**Authorities:** [AGENTS.md](../../AGENTS.md), [GOVERNANCE.md](../../GOVERNANCE.md), [PROJECT.md](../../PROJECT.md), [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md), [INFRASTRUCTURE.md](./INFRASTRUCTURE.md), [PRODUCT_CAPABILITIES.md](./PRODUCT_CAPABILITIES.md), [UI_SYSTEM.md](../ui/UI_SYSTEM.md), [UI_DECISIONS.md](../ui/UI_DECISIONS.md), [SCREEN_REGISTRY.md](../ui/SCREEN_REGISTRY.md), [DESIGN_WORKFLOW.md](../ui/DESIGN_WORKFLOW.md).

> This is an execution-gate proposal, not an implemented feature, an accepted architecture decision, a UI approval, a new active product status, or permission to change production. Per AGENTS.md, merge the accepted immediate-phase contract before implementation begins. Keep later phases at roadmap granularity and expand only the next phase after evidence from its predecessor.

## Product goal and user value

Deliver a separately installable, genuinely native Android RenderLab client with rapid Fast Refresh development and compatible OTA JavaScript/asset updates through EAS Update, while preserving the current RenderLab service, accounts, invitation-only admission, MFA/security and owner-scoped job/media contracts. Optimize for maintained native primitives and AI-assisted composition, not duplicated web screens or a second backend.

The existing web app remains Next.js 16 / React 19.2 with its approved shadcn/Radix/Motion ecosystem. gluestack-ui v5 is native-focused and **not** a drop-in replacement for that web UI layer.

## Verified starting state (repository audit, 2026-10-25)

- Main app uses Next.js App Router, React, TypeScript, Radix/shadcn wrappers, Tailwind; root `package.json` pins Node 24/npm 11. The website is already production-live; deployment remains separately authorized.
- Product IA is Create, Library, Media Viewer, Activity, Settings, and authorized Admin, with public Landing. Native navigation should preserve these conceptual destinations without assuming web route geometry is appropriate to Android.
- Existing Next.js product API routes implement generation jobs, account-scoped media and collections, signed upload tickets/completions and account operations. `src/lib/supabase/server.ts` accepts an Authorization bearer token and verifies current user, claims/session, TOTP assurance and active invitation/account admission. Raw product tables, privileged credentials, R2 and workers remain server-owned.
- State-changing routes use `src/server/security/same-origin-mutation.ts`; its validator rejects foreign `Origin` and cross-site `Sec-Fetch-Site`, while no-Origin requests are allowed. Native compatibility **must be proven per route**; do not weaken browser CSRF defenses or spoof trusted browser headers as a workaround.
- Existing media routes redirect to time-limited signed R2 URLs. Native image/video download and inline rendering must prove that user bearer tokens are never forwarded to R2.
- No Android Expo project, EAS project, native package identifier, signed test build, mobile QA workflow, or mobile API compatibility proof was established in this audit. Treat these as **unverified/not built**, not as already complete.

## Proposed repository architecture (requires Engineering/Architecture Authority acceptance)

- Place an independent Expo-managed TypeScript package under `apps/mobile/` with its own `package.json`, deterministic `package-lock.json`, `app/` (Expo Router), `src/components/ui/` (CLI-sourced gluestack components), `src/features/`, `src/services/`, `src/state/`, `src/theme/`, `assets/`, `app.config.ts`, and `eas.json`. Use an isolated package boundary initially; do not turn the existing Next.js root into a workspace or alter root React/Next dependencies without separate validation.
- Keep the application modular: **native presentation** (Expo Router + gluestack wrappers and RenderLab tokens) → **feature/application logic** → **typed API client** → **existing RenderLab server-owned APIs**. No direct device access to RenderLab internal tables or service-role endpoints.
- Auth: Supabase publishable URL/key only, native Supabase Auth client, OS-encrypted storage through `expo-secure-store`, fresh session revalidation, supported invitation/recovery redirects, MFA challenge and active-account gating. Confirm mobile callback URLs and hosted Supabase redirect allowlist with the authorized operator; do not mutate shared Auth settings during scaffold work.
- Frontend state: Zustand for transient drafts/local UI only; TanStack Query for request/cache/invalidation and generation job polling. Neither is an authorization source; jobs and outputs remain server-owned. Prefer capability-derived forms over hard-coded ComfyUI parameters.
- UI: use `gluestack-ui` v5 CLI-installed, accessible primitives and approved mobile wrappers. Maintain existing RenderLab semantic tokens (dark canvas, surfaces, accent, status color, density, typography, spacing) with platform-aware touch targets, keyboard/focus and reduced-motion equivalents. Do not assume existing web shadcn components are React Native compatible.
- Media: signed-R2 upload via server-issued tickets, native picker/file APIs only when authorized and installed in native build; preserve size/MIME/server-side decode controls, opaque media IDs and server-owned job lifecycle. Authorization header must stay on the RenderLab host and not follow signed redirects to Cloudflare.
- Explicitly out of scope for Phase M0: new backend, Supabase schema/RLS changes, R2 replacement, ComfyUI worker changes, visual redesign of web routes, admin mobile flows, production EAS publishing, public launch, push notifications, camera capture, billing, or unwarranted native modules.

## Setup-only discovery checkpoint — 2026-10-25 (BLOCKED, not implementation)

This section records diagnostic evidence on proposed PR #397 before any `apps/mobile` application, production integration, native APK or EAS project has been created. It does **not** mark Phase M0 complete or approve either styling engine.

**Exact tested source:** `5498791610ccfb690fd315d0ec0ae4ebdb5696e0`. **Android probe:** GitHub Actions [Android Stack Preflight run 40151411396](https://github.com/faresmohamed260/renderlab/actions/runs/40151411396), **FAILED**. The same exact head passed Documentation Governance `40151411392`, Engineering Quality `40151411452`, Unit Coverage `40151411405`, CodeQL `40151411388`, and Developer Portability `40151411455`.

- **C0 repository review: VERIFIED.** `AGENTS.md`, `GOVERNANCE.md`, `PROJECT.md`, UI migration, product/frontend/infrastructure boundaries and initial mobile contract were reviewed. The earlier documentation-only proposed head `3756e13ab1cb055dcea4eed8d2da5fab17dd9e12` passed its standard CI checks.
- **C1 SDK/toolchain: PARTIALLY VERIFIED.** Credential-free Node 24 GitHub Actions provisioned disposable `default@sdk-58` Expo Router starter with pinned `create-expo@5.1.5`, verified declared Expo 58 / React Native 0.88 / React 19.3 dependencies, completed a clean `npm ci`, passed `expo install --check`, and successfully ran **base Android Metro JavaScript export**.
- **C1 blocking TypeScript finding:** a completely unmodified generated default SDK 58 starter fails `tsc --noEmit` in `src/components/animated-icon.web.tsx` (missing CSS module), `src/components/app-tabs.web.tsx` (React Native ref type incompatibility) and `src/constants/theme.ts` (missing CSS import types). Strict type checks remain a non-waivable acceptance gate. Do not disguise this by declaring a Metro export equivalent to clean TypeScript.
- **C2 UI library: INCOMPATIBILITY FOUND.** The pinned `gluestack-ui@5.0.3 init --uniwind --use-npm --yes` and `add button` completed, and the subsequent combined `expo install --check` and `expo-doctor@latest` (20/20 checks) passed. The **combined Android Metro export then failed** resolving `@/components/animated-icon` from `src/app/_layout.tsx`, mapped to non-existent `../../components/animated-icon` after CLI-generated Metro/Babel/UniWind changes. This is a reproducible setup failure, not a validated dependency combination. The CLI logs describe their v5 setup as alpha and emitted deprecated-package warnings; maintenance/stability and resolved transitive dependency posture require separate review.
- **C3 real native build/device/EAS readiness: NOT STARTED.** No Gradle APK/aab build, development binary installation, interactive Android screenshot, runtimeVersion fingerprint, EAS channel, signing key, Expo project or OTA delivery is verified. Android JS export alone cannot close C3.

**Safe next checkpoint investigation (still setup-only):** inspect the generated default template's `tsconfig.json`, `babel.config.js`, `metro.config.js`, CSS type declarations and the gluestack CLI's diffs within a disposable CI workspace. Determine whether the missing import is a UniWind alias-resolution regression or a template/CLI interaction, and test a **clean, typed, minimal Expo Router starter** against gluestack v5/UniWind. Only if necessary, test gluestack's NativeWind v5 option in a separate isolated runner; do not silently change preferred styling engines, suppress TypeScript diagnostics, add `--legacy-peer-deps`, or bypass the Android export gate. Pin and commit the eventually selected app's dependency lockfile *after* compatibility is proven. If neither combination passes, keep M0 blocked and revisit the library/version choice through architecture review.

**Boundary:** Proposed planning/setup probe only. No RenderLab product code, web app, hosted Supabase/R2, Modal, Auth configuration, deployment, EAS resources, Android package ID or production credentials were changed. The PR remains a draft pending review and verified resolution of the identified setup blockers.

## Dependency compatibility matrix — current research, to be proven by lockfile + Android smoke

| Layer | Proposed selection | Evidence / risk / installation rule |
| --- | --- | --- |
| SDK / runtime | **Expo SDK 58**, React Native **0.88**, React **19.3.0** | Stable Oct 15, 2026; Expo SDK 58 requires Node >=22.13, satisfied by repository Node 24. Use explicit `create-expo-app --template default@sdk-58`, not unqualified latest (which may still scaffold SDK 57 during transition). |
| TypeScript / navigation | TypeScript and **Expo Router** SDK-matched (published documentation lists ~58.0.20) | Expo Router is SDK-integrated. Use `expo install` for SDK-owned dependencies and `expo-doctor`; do not use web-only Next router or direct `@react-navigation/*` imports when Expo Router now provides the API. |
| UI | **gluestack-ui v5** CLI-managed components | Stable native-first v5; documented Expo >=50 and RN >=0.72.5. This is **range-level support, not yet a tested SDK 58 lockfile combination**. Use `npx gluestack-ui@latest init` then `add`; capture actual resolved CLI/package versions and audit accessibility, licensing and native render. |
| Styling | **UniWind Free** initially, contingent on SDK 58 Android validation | v5 CLI supports `--uniwind` (Expo-only, Tailwind CSS v4, no PostCSS step). Free version supplies Tailwind bindings/theme. Do **not** presume UniWind Pro is free or SDK 58-certified; its listed Pro support currently reaches Expo 57 despite RN 0.88 claims. If UniWind Free smoke fails, evaluate gluestack's NativeWind v5 engine explicitly, documenting preview maturity and `lightningcss` pin requirements before switching. No simultaneous styling engines. |
| Motion | **react-native-reanimated 4** + **react-native-worklets** | Expo SDK-matched via `npx expo install react-native-reanimated react-native-worklets`; verify new architecture, Babel/Metro plugin configuration and Android/reduced-motion behavior. Adds native runtime; do not install arbitrary versions. |
| State | **Zustand** for local state; **@tanstack/react-query** for server state | JavaScript packages; confirm current peer dependencies under React 19.3. Keep network contracts and query keys in dedicated modules; no duplicating server ownership. |
| Auth/security | **@supabase/supabase-js**, **expo-secure-store**, supported deep-link helper only if needed | Expo SecureStore uses Android Keystore. Verify Expo SDK-matched native packages, refresh-token persistence, sign-out, invitation/deep-link handoff, MFA and session-revocation behavior. Never ship `SUPABASE_SERVICE_ROLE_KEY` or R2 secrets. |
| Media | **expo-image**, SDK-matched picker/file API when feature requires | Do not add unnecessary native modules in M0; selecting/uploading/downloading media requires separate permission, redirect/header and OS behavior tests. |
| Development/release | **expo-dev-client**, EAS Build and **expo-updates** / EAS Update | One first install of a development/preview native binary is unavoidable. Preview and production are separate channels and explicit release permissions. Final EAS IDs, build profiles and runtime policy need a linked owner-controlled Expo project and actual build proof. |

Primary dated verification sources: [Expo SDK 58 release](https://expo.dev/changelog/sdk-58), [SDK 58 version table](https://docs.expo.dev/versions/v58.0.0/), [Expo Router SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [gluestack v5 setup](https://v5.gluestack.io/ui/docs/home/getting-started/installation), [gluestack CLI](https://gluestack.io/ui/docs/home/getting-started/cli), [UniWind](https://uniwind.dev/), [Expo Reanimated](https://docs.expo.dev/versions/latest/sdk/reanimated/), [Expo SecureStore](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/). These mutable package/provider facts must be rechecked at actual installation/build time; this plan does not declare the combined matrix validated.

## Native rebuild vs Fast Refresh vs EAS Update

| Change category | Development Fast Refresh | OTA to already installed compatible binary | New Android binary required |
| --- | --- | --- | --- |
| TypeScript feature logic, UI composition, copy, API/query state, JavaScript-only component changes | Yes | Yes, after tested EAS Update | No |
| JS style tokens, layouts, transitions/recipes using modules already embedded in runtime, bundled media/assets | Yes | Normally yes | No if native fingerprint unchanged |
| Backend-only API implementation | No mobile rebuild required | No OTA needed if contract-compatible | No |
| Adding/upgrading native Expo/RN module (camera, secure store, native picker, worklets, etc.), Expo SDK/RN upgrades, new config plugins | Refresh not sufficient | **No** | **Yes**, new runtime |
| Android package ID, manifest permissions, deep-link schemes, icons/splash when baked into native resources, signing, native build configuration | No | **No** | **Yes** |
| Incompatible JS↔native API change | Might appear to run against dev bundle only | **Never publish to old runtime** | **Yes** |

EAS Update policy proposal: separate `preview` and `production` channels; require matching platform + runtime version before any OTA. Prefer SDK 58 `fingerprint` runtimeVersion policy with its now-balanced fingerprint preset after verifying EAS resolved config; inspect fingerprint changes and compare with release before OTA promotion. If fingerprint behavior cannot be verified in the project, explicitly manage `appVersion`/manual native version bumps rather than assuming safety. No automatic production channel publish, no channel switch to bypass compatibility, and no Expo account linkage/credential creation without authorization. Updates generally apply when the app next launches/reloads, not as guaranteed instantaneous hot replacement in the installed release.

## Immediate Phase M0 — contract for accepted implementation after this proposal merges

**Goal:** establish the reproducible native foundation and verify the chosen UI/runtime matrix without touching live product infrastructure.

**In scope after approval:** isolated `apps/mobile` project; SDK 58/TypeScript/Expo Router scaffold; token foundation and gluestack v5 UniWind component installation; small static native shell with Create/Library/Activity/Settings placeholders using maintained components; reduced-motion-safe navigation; `expo-dev-client` and Expo update/build config templates without invented project IDs; typed API client layer plus secret-free test fixtures; Android-native dependency proof and secure account/media request architecture review. Treat UI placeholders as **scaffold**, never product-complete implementations.

**Decision/gates before exposing authenticated screens:** approve Android package identifier; confirm mobile auth callback/deep-link/OTP/MFA route; verify whether `getUser(token)` and all required API endpoints accept true native bearer requests; evaluate `Origin`/CSRF contract without weakening existing browser rules; prove signed-media redirect handling; confirm target screen hierarchy with Product Design Authority.

**Security boundaries:** retain fresh Supabase user/session verification and MFA/admission policy; no direct private database access, worker endpoints, or R2 credentials; protect token storage and logs; verify owner scoping and invitation revocation; never send bearer to R2; no production mutation or developer bypass of hosted Auth controls.

**No data/schema or infrastructure changes in M0:** if verification reveals a server-side mobile API/redirect/auth change is necessary, submit a separately reviewed, security-sensitive contract before implementation.

**Validation matrix and exit criteria:**
1. Commit a deterministic Expo package lock, run `npm ci` for the mobile package, `npx expo-doctor`, SDK-specific version checks, TypeScript, lint and unit tests in a credential-free GitHub workflow.
2. Verify Metro Android bundle/export and an actual Android development/preview build with fixed versions; inspect on-device screenshots or equivalent rendered evidence at phone and larger layouts, keyboard/large text and reduced-motion. A TypeScript build alone is not sufficient.
3. Verify at least one gluestack control in the chosen styling engine, correct dark tokens, navigation, offline/loading/error affordances, and no raw custom replacement of equivalent maintained primitives.
4. Prove native runtime fingerprint and EAS channel/runtime mapping from a real EAS project/build **only after separately authorized provisioning**. Until then label OTA **configured only/unverified**, not deployed.
5. Run existing affected web/engineering/security validation if shared repository code or CI contracts change. Run `npm run verify:docs-governance` after documentation changes; exact-head CI must pass before merge.
6. Document exact locked versions, Android device/build evidence, remaining incompatibilities, screen maturity and approved constraints in repository authorities. Do not mark M0 complete until actual proof and human review.

**Dependencies / blockers:** Expo account/project credentials, signing and chosen application ID for real EAS builds; mobile auth callback/provider config authorization; real test account with appropriate admission/MFA; repository CI runner capacity; measured gluestack v5 + UniWind Free SDK 58 integration. None is presumed granted.

## Subsequent roadmap (not execution-ready contracts)

- **M1 — Secure identity + private read:** sign-in/invitation/MFA/session lifecycle and owner-scoped read-only Library, Activity and media previews. Prove auth revocation, foreign-owner isolation and signed-media safety.
- **M2 — Native creation:** capability-aware Image/Video composer, curated settings, job submission/polling/cancel/retry and persisted result UI; preserve current generation/backend admission. No direct ComfyUI graph exposure.
- **M3 — Media workflows:** upload tickets, signed PUT, completion verification, Viewer, download, Edit/Animate continuation, favorites, collections and durable mutations with secure native share/file behavior.
- **M4 — Hardening + controlled release:** Settings/profile/session controls where product parity is approved, accessibility/resilience/performance, EAS preview→production qualification, rollback, and Play/Android distribution. Admin scope requires its own explicit decision rather than accidentally elevating mobile privileges.

After **each** phase, verify current implementation, record authoritative documentation from evidence, accept the next bounded phase contract and merge it **before** that phase's implementation. Production/EAS release permissions remain separately governed.

## Decision requests before implementation

1. **Engineering / Architecture Authority:** accept independent `apps/mobile` Expo package, current product API reuse, native session and token/storage model, plus explicit mobile API security gate.
2. **Product / Product Design Authorities:** accept initial route/screen sequence and native navigation design work preserving the current RenderLab identity; no automatic reuse of web navigation geometry.
3. **Repository Maintainer:** review and merge this contract after required checks. **Project Owner/Infrastructure/Security authorities:** separately authorize EAS project creation, signing, callback allowlist/provider changes, production releases or paid resources if/when proposed.

**Current status:** planning only; no APK, no Android CI/build proof, no EAS project/update, no auth/backend mutation, no claim of mobile production readiness.
