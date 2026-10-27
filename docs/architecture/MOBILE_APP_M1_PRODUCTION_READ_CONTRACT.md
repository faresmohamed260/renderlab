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

## Blocking security and acceptance gates

1. **Product/Security/Architecture authority:** review M1 production-account access, actual native package ID and callback/deep-link identity, invitation/recovery and MFA, OS-encrypted `expo-secure-store` token lifecycle, logout/revocation, session refresh and login failure behavior. PR #399 M0 itself is still unmerged and has an unresolved Expo `node-forge` high-severity advisory.
2. **Transport behavior:** prove on a real installed Android build that `Authorization` cannot be sent on 3xx redirects to Cloudflare R2 or another origin; injected contract asserts response URL but **cannot prevent React Native fetch from following a redirect beforehand**. No real bearer may be used through an unverified transport.
3. **Server route compatibility:** verify existing private GET routes accept real native bearer requests without weakening browser same-origin/CSRF validation. Validate 401/MFA/admission/inactive/revoked/foreign-owner results, error shapes and 503.
4. **UI/code migration:** port the chosen existing clone tab/feed/grid composition into the approved SDK 58 app after the design direction is accepted; preserve RenderLab wordmark/product action semantics. Do not connect the old clone's 41-vulnerability dependency tree or Firebase.
5. **Device workflow:** install the new safe development client once; connect a trusted device to an actual reachable Metro server (currently WANDA offline). Verify physical touch, scroll, signed-in Library/Collections, and Fast Refresh after editing a label. An installed debug client alone cannot serve its own Metro bundle.
6. **Later writes:** production POST/PATCH/DELETE, generation, signed media downloads/uploads, provider spend and EAS/OTA release each need separate authorization/security/device proofs. They are outside this initial read-only draft.

**Approval status:** Owner requirement established; no claim that production login, backend connectivity, actual mobile UI, real media, or secure native token handling has been implemented. No production resource or policy was changed.
