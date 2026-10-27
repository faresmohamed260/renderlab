# Android M1 — existing production backend read-only contract (review candidate)

**Status:** Draft implementation-boundary proposal only. **Not M1 accepted, not merged, not authenticated, not installed, not released.**

## Owner-corrected goal (2026-10-27)

The installed native Instagram-style RenderLab client must read/write **RenderLab's existing production backend**, with live Metro/Fast Refresh iteration for user-directed text/icon/tab changes. The Expo SDK 53 third-party clone debug APK from PR #401 uses **only synthetic offline fixtures**. Its development-server chooser means Metro is not connected. It is not a production client and must not be given real RenderLab credentials. No second backend or Firebase integration.

The current verified production origin is `https://renderlab.faresuniform.uk`, from `docs/production/current.json`; deployment state is separate from this proposal. All application data remains server-owned through Next.js product APIs and Supabase Auth; no direct database, R2 or worker calls from Android.

## Actual server contracts inspected

| First M1 read | Existing route | Behavior |
| --- | --- | --- |
| Library items | `GET /api/media/assets?origin=generated\|uploaded&kind=image\|video&limit=24&offset=0` | `getCurrentRenderLabAccount()`, 401 without valid identity/MFA/admission, returns `{ok:true,items,page}` for owner |
| Collections | `GET /api/media/collections` | Same account gate and owner scoping, returns `{ok:true,collections}` |
| Profile | `GET /api/account/profile` | Profile owner gate, returns `{ok:true,profile,policy}` |
| Job status | `GET /api/generation/jobs/[jobId]` | Same owner gate plus opaque UUID and server-owned generation lifecycle (not in initial API wrapper) |

Server authentication already reads `Authorization: Bearer <Supabase user session token>` in `src/lib/supabase/server.ts`, then verifies the user, live claims/session, TOTP/MFA assurance and active invitation/admission. Do **not** bypass MFA or store a production token in a repository, APK constant, Metro bundle, logs, screenshot, test fixture, or chat.

## Implemented in this draft branch (no live credentials)

- `apps/mobile/src/services/api/production-read.ts` has an exact first-party production origin, typed source/media-kind/pagination options, strict fixed API endpoints and an **injected** native transport contract. No default React Native `fetch`, Auth client, file persistence or real HTTP requests exist. It requires a nonblank token **supplied by a separately approved session layer** and rejects redirect/foreign result metadata without fallback to fake fixtures.
- `apps/mobile/tests/production-read.test.mjs` covers endpoint selection, source filters, token requirement, unexpected CDN redirects, 401 and invalid responses using synthetic opaque tokens only.
- This M1 draft is **based on PR #399's SDK 58 M0 source**, not the vulnerable SDK 53 clone. That preserves the existing safe foundation and lets clone visuals be adapted selectively, not a blanket old-dependency adoption.

## Checkpoint 30 — production guest contract and SDK 58 Library transport boundary (2026-10-27)

**Source branch:** `feature/android-m1-production-api-contract-20261027`, draft PR #402, stacked on unmerged M0 PR #399. **No real native Auth, no authenticated API call, no custom media renderer, no production mutation and no new APK yet.**

**Current concrete implementation:**
- `apps/mobile/src/services/api/production-read.ts` validates existing backend-owned Library items/page and Collections response shapes against the inspected `src/lib/api/media-assets-contract.ts` and `src/server/media/media-collections.ts`. Media `contentUrl` and `thumbnailUrl` must match the exact relative `/api/media/assets/{id}/content|thumbnail` route. Unexpected external/signed URLs in protected API JSON are rejected. These paths **cannot yet be passed to native Image with a bearer**, because the protected endpoint 302-redirects to R2. No production token-bearing transport is implemented.
- Native result states distinguish plain 401, explicit 403 `mfa_required`, 403 `renderlab_access_required`, other forbidden and service outage. Server Library may return generic 401 when MFA is incomplete; the future Auth/MFA session layer must still distinguish its own state. These are **contract tests with synthetic tokens**, not live Auth verification.
- `apps/mobile/src/services/api/production-guest.ts` and the native `src/app/(tabs)/library.tsx` now do a **true no-credential, read-only** guest GET to the production Library API. The UI reports whether the real backend rejected anonymous access; it explicitly says that native login/private media loading are unimplemented. There is no fake/generated content, no backend switch, and no misleading signed-in status.
- `apps/mobile/tools/verify-guest-production-api.mjs` runs automatically as a non-secret read-only GitHub workflow `.github/workflows/android-m1-production-guest-read.yml`. On [exact head's successful production guest run 40484282154](https://github.com/faresmohamed260/renderlab/actions/runs/40484282154), the real production site returned **401 JSON `authentication_required`** for Library, Collections and Profile and **200 JSON** for GET generation availability. Requests had **no Authorization, cookies, service keys, body or mutation**. This verifies public reachability and access denial, not authenticated mobile compatibility.
- Synthetic tests `apps/mobile/tests/production-read.test.mjs` and `production-guest.test.mjs` cover route bounds, payload constraints, no credential headers, 401/403, redirects, malformed media, pagination and network errors. Expo/RN bundling and TS/lint checks run in the existing mobile CI, while the inherited `node-forge` high-severity audit stays intentionally failing.


**Exact-head validation, after guest-screen implementation:** At source `e8de60dd11a0c8d8920aecdbf386a028fe3bed64`, [Android Mobile Foundation run 40484669877](https://github.com/faresmohamed260/renderlab/actions/runs/40484669877) passed clean npm install, Expo Doctor 20/20, TypeScript, Node contract tests (including the guest-native UI's pure probe), lint and Hermes Android JS export. Its **separate high-severity production dependency audit still failed as designed**; this is not a security approval. [Production Guest API run 40484668843](https://github.com/faresmohamed260/renderlab/actions/runs/40484668843), Documentation Governance, Engineering Quality, CodeQL, Unit Coverage and Developer Portability passed. **Native APK install/Metro/real login remain unverified.**

**No WANDA:** WANDA is explicitly ruled out by the owner. As of this checkpoint the connected Vercel project's named Sandbox inventory is empty. Vercel Sandbox can expose Metro via public ports, but it is a metered resource with bounded individual sessions and snapshots; **creating it requires explicit infrastructure/provider-spend authorization** before cost-incurring provisioning. It is not a permanent always-on Metro service. Do not claim a cloud developer server exists, that the debug APK can reach Metro, or that Fast Refresh works on the owner's phone. Alternative approved cloud hosting remains to be selected.

**Remaining first usable app milestone:** approve native package identity and safe account/Auth+TOTP flow on the supported Expo SDK58 app; prove the signed-media resolution contract and bearer non-forwarding with a real Android build; deliver/install the new APK and connect a reachable Metro server; verify real owner-scoped Library and physical UI interaction. Neither the current SDK53 clone APK nor the pre-existing SDK58 placeholder build meets that milestone.

## Blocking security and acceptance gates

1. **Product/Security/Architecture authority:** review M1 production-account access, actual native package ID and callback/deep-link identity, invitation/recovery and MFA, OS-encrypted `expo-secure-store` token lifecycle, logout/revocation, session refresh and login failure behavior. PR #399 M0 itself is still unmerged and has an unresolved Expo `node-forge` high-severity advisory.
2. **Transport behavior:** prove on a real installed Android build that `Authorization` cannot be sent on 3xx redirects to Cloudflare R2 or another origin; injected contract asserts response URL but **cannot prevent React Native fetch from following a redirect beforehand**. No real bearer may be used through an unverified transport.
3. **Server route compatibility:** verify existing private GET routes accept real native bearer requests without weakening browser same-origin/CSRF validation. Validate 401/MFA/admission/inactive/revoked/foreign-owner results, error shapes and 503.
4. **UI/code migration:** port the chosen existing clone tab/feed/grid composition into the approved SDK 58 app after the design direction is accepted; preserve RenderLab wordmark/product action semantics. Do not connect the old clone's 41-vulnerability dependency tree or Firebase.
5. **Device workflow:** install the new safe development client once; connect a trusted device to an actual reachable Metro server (currently WANDA offline). Verify physical touch, scroll, signed-in Library/Collections, and Fast Refresh after editing a label. An installed debug client alone cannot serve its own Metro bundle.
6. **Later writes:** production POST/PATCH/DELETE, generation, signed media downloads/uploads, provider spend and EAS/OTA release each need separate authorization/security/device proofs. They are outside this initial read-only draft.

**Approval status:** Owner requirement established; no claim that production login, backend connectivity, actual mobile UI, real media, or secure native token handling has been implemented. No production resource or policy was changed.
