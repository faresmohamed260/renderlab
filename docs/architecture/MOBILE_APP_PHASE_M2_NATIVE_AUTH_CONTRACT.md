# Android M2 — native authentication, TOTP and authorized-session boundary

**Execution:** `PLANNED` (proposed, **not accepted**). **Repository:** `UNMERGED`. **Deployment:** `NOT DEPLOYED`.
**Owner direction:** Continue toward an installed, production-backend-connected RenderLab Android app without WANDA, a second backend, a permanent Metro server or repeated APK reinstalls for approved presentation-only changes.
**Decision gate:** Under `AGENTS.md` Progressive Phase Planning, this phase contract **must be reviewed and merged before any M2 implementation**. This proposal does not authorize real-account testing, secrets, Supabase/Auth configuration changes, production deploy, signing, APK distribution, OTA or parent PR merges.

## Goal and user value

Allow an **existing admitted RenderLab account** to sign in with email/password to the independent Expo SDK 58 app, complete its **existing verified TOTP second factor** when required and obtain server-confirmed admission for read-only RenderLab API access. Prevent private account presentation or use of bearer tokens until the actual RenderLab server confirms authorization. Leave Create/Library functionality, signed media and OTA as later separately qualified work.

This first native auth slice is deliberately smaller than the complete Instagram-style client. No enrollment, invitation claim, registration, password reset/change, email change, privileged admin, generation or media transfer is introduced in M2.

## Verified starting point (2026-10-28)

- Draft PR [#399](https://github.com/faresmohamed260/renderlab/pull/399) contains the independent M0 Expo/RN scaffold and remains unmerged. Draft [#402](https://github.com/faresmohamed260/renderlab/pull/402) adds an **anonymous guest GET** and bounded private response contracts, but no real bearer transport. Draft [#403](https://github.com/faresmohamed260/renderlab/pull/403) adds an optional public UI-config endpoint and SDK 58 patch alignment. These are stacked and **not production-live**.
- #403 exact code head `bfb67f84e94c5fef009254ea9b2003f986676d24` passed its ten GitHub CI workflows, including mobile Expo Doctor 20/20, typecheck, tests, lint, Hermes JS export and a separate unchanged `npm audit --omit=dev --audit-level=high` job. That candidate resolves `node-forge 1.4.2`, outside the prior <=1.4.0 advisory range, with seven low-severity `deepmerge` chain findings. **This is not a blanket security or release approval.** The parent PRs' lockfiles/checks remain independent.
- Prior draft emulator runs [40622272456](https://github.com/faresmohamed260/renderlab/actions/runs/40622272456) and [40623561684](https://github.com/faresmohamed260/renderlab/actions/runs/40623561684) passed disposable x86_64 standalone APK installation, four-tab touches, Create→Library navigation and no-Metro cold start. They do **not** prove device storage, Auth, credentials, real phone, production polling or media.
- `src/lib/supabase/server.ts` already accepts a supplied `Authorization: Bearer` access token for server-side `getUser`, `getClaims`, session-ID/live-session projection, MFA assurance, verified-TOTP factor count and admitted-account checks. `getCurrentRenderLabAccount()` remains the authority for protected routes. `src/server/account/account-access.ts` enforces active-account admission when configured, and the existing first-party `GET /api/account/profile` is protected. Native code **must not** create a parallel account/admission policy.
- The browser uses `@supabase/supabase-js` for email/password and `auth.mfa.listFactors()`, `challengeAndVerify()` and assurance checks; browser MFA implementation restricts verified TOTP factor count to at most one. `apps/mobile` currently contains `expo-secure-store` but has **no** Supabase Auth client, native session, real package ID or sign-in UI.
- Canonical production identity remains `docs/production/current.json`; protected production API origin in the mobile draft is `https://renderlab.faresuniform.uk`. All app data remains served through existing first-party Next.js APIs, not native raw database/R2/worker calls.

## In scope — bounded M2 candidate

1. **Dependency/transport review:** independently validate an SDK-58-compatible `@supabase/supabase-js` version and only the Expo/RN polyfills strictly needed for native Auth (including URL handling where needed), with deterministic mobile lockfile, Expo Doctor, npm audit and Android bundle proof. Use the existing Supabase Auth service **only** for authentication, MFA and refresh; keep application data under RenderLab Next.js. No new Supabase project or database/client-side RLS access.
2. **Public client configuration boundary:** use the existing shared Supabase Auth **project URL and publishable/anon key**, only after owner/security approval to provide **public** Android build configuration. These are public app identifiers, **not secrets**; never put service-role keys, refresh/access tokens, signing credentials or personal user values in `EXPO_PUBLIC_*`, Git history, logs, QA artifacts, chat or shipped code. Pin the expected Supabase Auth hostname from reviewed infrastructure configuration. On absent, malformed or mismatched configuration, stay signed out.
3. **Encrypted native session lifecycle:** implement the smallest reviewed `expo-secure-store` adapter for Supabase Auth with explicit storage failures, payload-size handling, reinstall/restore behavior, platform backup exclusion and no insecure AsyncStorage/plaintext fallback. Use `persistSession` only when encrypted storage behavior is proven. Bind auto-refresh to foreground `AppState`; stop in background; guard against parallel refresh/login races, stale session restoration, revoked sessions, logout and password/session invalidation. Do not trust local JWT claims as sufficient RenderLab authorization.
4. **Sign-in and factor state machine:** existing-user email/password only, then `getAuthenticatorAssuranceLevel()` and `mfa.listFactors()`; 0 verified TOTP factors may continue at AAL1 only if the existing server admits that user, exactly 1 verified TOTP factor requires AAL2 challenge, >1 verified or unexpected factor/assurance state **fails closed**. Use `mfa.challengeAndVerify()` with current six-digit code; keep codes ephemeral in memory, never write or log them, clear on success/cancel/failure. Do not enable enrollment, disable factors or bypass MFA.
5. **Server-owned admission proof:** after local Auth/MFA checks, perform a read-only `GET /api/account/profile` at the fixed RenderLab production origin with a current bearer and a transport that **provably refuses redirects before following them**. Treat 200 validated profile and policy as an admitted account; 401, 403/MFA, suspended/uninvited/revoked, 5xx, malformed JSON, unexpected route/origin and offline state remain locked. Use server revalidation on resume, token refresh and before private content; never treat a UI state or client-only factor list as admission.
6. **Minimal native presentation:** a Sign in panel and TOTP challenge in the existing Settings/account experience, with explicit signed-out, verifying, MFA required, access denied, unavailable, and signed-in labels. Keep four current tab routes and backend-driven presentation config stable. Use maintained gluestack/approved native controls, keyboard types, password visibility policy, focus, accessibility labels, touch targets, text scaling, loading/disable and error feedback. No Instagram-style feed replacement here.
7. **Logout and privacy:** clear in-memory bearer references, refresh state, persisted session, private TanStack Query cache and protected media URLs immediately. Request appropriate remote Supabase sign-out/revocation; if unavailable, truthfully report local sign-out with remote revocation unconfirmed, and do not permit reuse of the cached session. Sensitive screens must not remain visible on account switch, background return, expired token or failure.

## Explicitly out of scope

- Real account login or production user session tests **before security review and device approval**; no owner password/TOTP entered into CI.
- Public sign-up, invitation claim or new account admission; account recovery; enrollment/un-enrollment; admin access; email/password change; session management mutation; MFA policy changes.
- Direct native Supabase Data API queries, service-role use, R2/Modal/worker access, protected asset thumbnails/full media and uploaded bytes.
- Generation submission, jobs, Collections editing, Settings mutations, live UI admin editor or expanding the public UI-config schema.
- New backend service, schema/migrations, Auth policy/redirect allowlist changes, production Vercel environment updates, WANDA or metered development service.
- Stable package ID/Android signing, EAS provisioning, OTA, APK publishing/installation on the owner's phone or a production backend deployment. Those require separate owner/authority gates.

## Architecture, security and ownership gates

- **Authority:** [ADR-005](./ARCHITECTURE_DECISIONS.md) and the [M1 production-read contract](./MOBILE_APP_M1_PRODUCTION_READ_CONTRACT.md) own native/backend isolation and protected media boundaries. `src/lib/supabase/server.ts`, `src/server/account/account-access.ts`, `src/server/account/account-sessions.ts` and `src/lib/auth/mfa-assurance.ts` are the current server/web implementation contracts; independently maintained mobile types may mirror the accepted shapes but may not import `server-only` code.
- **Bearer transport:** React Native `fetch` honoring `redirect: 'error'` is **not assumed**; it must be verified at the native HTTP layer before any bearer-bearing request on a physical/emulated device. If redirect refusal cannot be proven, do **not** send bearer-bearing private API requests through that transport; use an explicitly reviewed alternative with native redirect interception or a separately approved server contract. A final response-URL check is not a substitute for preventing initial bearer forwarding to R2.
- **Server gate remains final:** no new token bridge, client-signed proof, cloned admission rules, public privilege flags or UI-config fields can relax Supabase identity/MFA/invitation/access/session checks. Profile error discrimination must not disclose a protected identity beyond the already authenticated account.
- **Secrets and storage:** all production tokens and TOTP values stay out of source control, build metadata and diagnostics. Reject logging of request headers, tokens and auth responses. Clear and invalidate on logout; fail closed if SecureStore cannot safely persist or delete. No silent downgrade to insecure persistence.
- **Auth/infra approvals:** Security/Operations and Engineering/Architecture must approve the native session/transport threat model. Project Owner must separately authorize real build config, on-device credential usage, package signing, any production release and shared-provider mutation. Passing CI does not grant these rights.
- **No data/schema implication:** M2 must not create tables, migrations, RLS policies or new Supabase/R2 resources. Public auth configuration uses the **existing** reviewed project only. No signup/invitation/admin policy changes.
- **No UI redesign implied:** integration-first app Settings/auth presentation; exact native styling/a11y review required when screens exist. Web's accepted compact shell stays untouched.

## Validation matrix (none of these tests are claimed as done by this proposal)

| Area | Required evidence |
| --- | --- |
| Dependency | Clean `npm ci` with Node 24; `expo install --check`; Expo Doctor; mobile strict TypeScript, unit tests, lint, Hermes Android export; unchanged high/critical npm audit |
| Config/secret hygiene | missing/invalid/foreign Supabase origin, missing public key, simulated service-role key misuse, accidental token/TOTP/log output rejected; source/package scanning |
| Auth state | missing credentials, invalid password, expired/revoked session, concurrent sign-in/refresh, foreground/background, stale restored session, auth-user switch |
| MFA | verified factor counts 0/1/>1, AAL1→AAL2, unsupported factor type, invalid/expired six-digit TOTP, challenge failure, interrupted MFA, clock/refresh, enrollment blocked |
| Server admission | synthetic exact first-party 200/401/403/503, suspended/uninvited/revoked, malformed/oversized body, foreign response URL, 302 and redirect chain (never followed), caching disabled |
| Security transport | isolated emulator traffic interception proves no Authorization reaches redirects/foreign hosts; tests must fail if transport follows a 302, not merely after it does |
| Device | new disposable standalone Android QA APK: launch/auth presentation navigation, screen-rotation/font scale/keyboard accessibility, process restart, encrypted storage failure/recovery, no Metro and no secret-bearing artifacts |
| Final operational gate | owner-approved stable binary/install and safe real-account MFA/admission test on a physical phone; server-side session and media authorization reviewed separately before any private Library enablement |

Acceptance needs human review of **actual native screenshots/interaction evidence**, not only compilation. All configured exact-head CI checks must pass on the draft, and unmerged parent diffs/security checks must be reconciled. Any real-account/provider test needs explicit approval and nonsecret artifact policy; no credentials or private media captured.

## Execution sequence after contract acceptance

1. Reconcile parent PR #399/#402/#403 dependency/security and stacked diffs against protected main. Merge order/approval remains independent.
2. Implement and test only a **synthetic/mock-backed native auth state machine** and secure-storage/redirect transport seams with no production public key or user credentials; verify patched dependency graph.
3. Device-test strict redirect refusal and secure session persistence in a disposable isolated Android build **before** enabling bearer requests to production.
4. After explicit Security/Architecture/Owner authorization, provision public Auth config and perform bounded owner-approved real-device authentication/TOTP/admission evidence with no secrets in logs.
5. Close M2 only on accepted evidence; the later read-only private Library, signed-media resolution, richer Instagram-style UI and OTA/release milestone remain independently planned.

## Documentation and exit criteria

When the candidate is implemented and evidence exists, update `apps/mobile/README.md`, the M1 contract's actual integration status, any affected `ARCHITECTURE_DECISIONS.md` / `FRONTEND_ARCHITECTURE.md` boundary, and native screen/component registries only for **verified** changes. Keep rejected/unsupported paths explicit. Do not update current production state absent an owner-authorized verified release.

**M2 exit:** reviewed, exact-head-tested source and emulator proof for native sign-in/TOTP/session+server admission, security-audited redirect/secure-storage contract, and explicit human acceptance of applicable security/architecture/UI boundaries. Real-production account and physical APK are separate gated evidence and may keep deployment `NOT DEPLOYED`. No unreviewed production/public app is implied by a successfully compiled candidate.

**References (verify again before implementation):** [Supabase React Native Auth guide](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Supabase TOTP MFA guide](https://supabase.com/docs/guides/auth/auth-mfa/totp), [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).
