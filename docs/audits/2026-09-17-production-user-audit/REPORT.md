# RenderLab production user audit — 2026-09-17

## Verdict

**Release confidence: PASS WITH FOLLOW-UP.** The live custom domain is serving the explicitly deployed, roadmap-complete repository source `c2b7c022cd91167822f75874ef7caf70b0ec264c`. No P0, P1, P2 or P3 product defect was reproduced in the audited signed-out, controlled authenticated-fixture or real-account read-only journeys. The one confirmed defect was repository release-record drift: four current-state documents still identified the superseded 2026-09-15 deployment. This audit corrects those pointers.

The remaining work is test-depth work, not evidence of a broken feature: production Activity mutation controls were not fired against real history, account-destructive/security-changing submissions were not made, and the real administrator could not enter `/admin` because the account has no verified TOTP factor. The AAL2 redirect to `/settings/mfa` is the designed security result.

No application fix, Supabase/R2/provider mutation, account mutation, or deployment was performed.

## Audit identity and production provenance

| Item | Verified value |
| --- | --- |
| Custom domain | `https://renderlab.faresuniform.uk` |
| Live repository source | `c2b7c022cd91167822f75874ef7caf70b0ec264c` |
| Guarded rollout | GitHub Actions run `35253785761`, `Deploy Roadmap Complete 2026-09-17`, successful |
| READY deployment URL | `https://renderlab-bq106211v-faresmohamed260-6733s-projects.vercel.app` |
| Rollout proof | Clean checkout of the exact source, READY state, explicit custom-domain alias, smoke on `/`, `/create`, `/library`, `/activity`, `/settings`, `/settings/password`, `/settings/profile`, and `/settings/preferences`; rollback did not run |
| Production audit run | `35258165837`, successful in 8m17s |
| Audit workflow head | `92cd420ffca04bc3fa9a6bf54582196c94bc30fa` (temporary audit-only workflow state; not deployed) |
| Audit artifact | `production-user-audit-35258165837-1`, artifact `10512554453` |
| Artifact digest | `sha256:7a98903c3f476c39830a862783a9a6b55ff6d11662e14482f2668c7a833ff3cc` |
| Audit date | 2026-09-17 UTC / Africa-Cairo |

The rollout workflow ref itself was a release-control ref, so its GitHub `headSha` is not used as the application-source assertion. The decisive evidence is the workflow's clean checkout/deploy log, which explicitly selected and verified `c2b7c022cd91167822f75874ef7caf70b0ec264c` before alias cutover.

## Method and safety boundary

Testing combined three perspectives:

1. A signed-out, headed-browser walkthrough of the real custom domain at desktop and 390×844 mobile-class geometry.
2. An isolated authenticated fixture run against the real custom domain using repository-owned test credentials and exact run-scoped cleanup. This exercised real persistence and one real image generation while avoiding real-user records.
3. A real administrator-account read-only walkthrough after the owner signed in manually. This verified actual account admission, history, Library, Settings, session inventory and the privileged Admin gate without changing the account or spending provider work.

The audit did not submit password/email changes, enroll or remove MFA, export or delete the real account, sign out existing real sessions, delete/rename/favorite real media, retry/run-again real jobs, alter Admin access/invitations/generation configuration, or cancel live work. These are intentionally excluded because their side effects are disproportionate to observational QA. Equivalent controlled fixture coverage is cited where available.

## Severity scale

| Severity | Meaning |
| --- | --- |
| P0 | Production unavailable, broad data loss, or critical security compromise |
| P1 | Core journey blocked or severe integrity/security failure |
| P2 | Major feature degradation with a workaround |
| P3 | Localized functional, accessibility or responsive defect |
| P4 | Documentation, polish, or test-depth issue without current user harm |

## Findings

### RLQA-001 — Current production pointer was stale in repository documentation

- **Severity:** P4
- **Status:** corrected by this audit documentation change
- **Scope:** release governance / repository handoff; no runtime impact
- **Reproduction:** inspect the current-production sections in `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/SCREEN_REGISTRY.md`, and `docs/architecture/INFRASTRUCTURE.md` after rollout `35253785761`.
- **Expected:** the authoritative repository identifies live source `c2b7c022cd91167822f75874ef7caf70b0ec264c` and the 2026-09-17 rollout.
- **Actual before this audit:** the documents still identified 2026-09-15 source `d18ef8833d46c812dac6b43572b3f4f7069990f8`; Screen Registry also described Profile/Preferences as not deployed although both were live.
- **Evidence:** rollout `35253785761`; direct production HTTP 200; authenticated live routes `/settings/profile` and `/settings/preferences`; this report's coverage and screenshots.
- **Suspected owner/component:** release governance and post-deployment documentation closure.
- **Remediation:** completed in this branch by updating the four authoritative current-state records. Future guarded rollouts should include a required post-cutover documentation-sync PR or checklist item.

No product-runtime defect met the reporting threshold.

## Coverage matrix

| Area | Desktop | 390px / narrow | Result and evidence |
| --- | --- | --- | --- |
| Landing and navigation | Signed-out live walkthrough | Live 390×844 and reduced-motion fixture coverage | Pass. Correct public/application shell boundary, Closed Beta truth, working navigation and no horizontal overflow. [Mobile landing](evidence/signed-out-mobile-landing.webp) |
| Signed-out access | Settings sign-in, Create gating, Library/Activity states | 390px Settings and Create | Pass. No public sign-up claim, private actions gate truthfully, keyboard focus is visible. [Mobile keyboard focus](evidence/signed-out-mobile-settings-focus.webp) |
| Create — Image | Real isolated image submission, lifecycle and durable result | Result and controls at 390px | Pass. Accepted job remained truthful, result persisted, Edit/Animate handoffs appeared, and cleanup returned owned fixtures to zero. [Desktop result](evidence/create-desktop-result.webp) |
| Create — Video | Mode/settings serialization without provider spend | 390px reduced-motion | Pass. Resolution/duration/audio and continuation grammar remained usable; no fake completion. [Mobile video](evidence/create-mobile-video-reduced.webp) |
| Create references | Real durable upload/drop, aliases, reorder and limits | Narrow source layout | Pass. Two Image references and one Video start-image boundary enforced; aliases remained stable through reorder; cleanup exact. |
| Library browse/search/filter | Real run-owned upload, Creatives/Uploads, type and selection behavior | Narrow list/grid and controls | Pass. Search/filter/sort/selection remained coherent. [Desktop upload](evidence/library-desktop-upload.webp) |
| Viewer and actions | Image/video viewer, quick/manage, prompt/details, collections/rename/delete affordances, continuation and compare | 390px manage/source-fold/native video | Pass. Destructive action was inspected but not executed against real data. [Mobile viewer](evidence/library-mobile-viewer.webp), [mobile manage](evidence/viewer-mobile-manage.webp) |
| Activity/history | Real account history and controlled fixture lifecycle | Existing visual/reduced-motion coverage | Pass for read-only history, completed-result link, failed-job explanation and action eligibility. Real `Run again`/`Retry` were not clicked because they can dispatch provider work. |
| Profile | Real empty-profile read-only state; controlled save/crop/keyboard fixture | 390px reduced-motion crop | Pass. Identity copy and ownership separation are clear. [Mobile profile](evidence/settings-profile-mobile-reduced.webp) |
| Password and email | Real forms inspected; controlled password-field behavior | Narrow fixture coverage | Pass for layout, labels, disabled-until-valid behavior, reveal controls and 15-character policy copy. Real credentials/email were not changed. |
| Sessions | Real privacy-safe inventory inspected; controlled local/other/global sign-out semantics | 390px session register | Pass. Real sessions were not revoked. [Mobile sessions](evidence/settings-sessions-mobile.webp) |
| MFA / step-up | Real unenrolled state and `/admin` redirect | Controlled MFA coverage exists in repository suites | Pass for fail-closed behavior. The real account was not enrolled solely for QA. |
| Data & Privacy | Real export/delete copy and disclosure inspected | Existing account-lifecycle fixture coverage | Pass for presentation and controlled lifecycle tests. Real export/delete was not submitted. |
| Preferences | Real default state inspected; controlled save, cross-device read, stale fallback, reset, precedence and export/deletion integration | 390px reduced-motion | Pass. [Mobile preferences](evidence/settings-preferences-mobile-reduced.webp) |
| Admin | Role-aware Settings entry and direct `/admin` request | Existing 390px Admin acceptance from repository verification | Security pass: real admin was redirected to MFA because the session lacked verified AAL2. Admin contents were not reachable without changing account security state. |
| Keyboard/focus | Tab/focus on signed-out and authenticated controls | Narrow visible focus | Pass. Focus indicator remained visible and control labels were announced. |
| Reduced motion | Repository-controlled production fixture run | Landing/Create/Viewer/Settings at 390px | Pass. Functional content and geometry remained present without motion dependency. |
| Empty/loading/error | Signed-out empties, MFA loading→ready, failed Activity row, generation start/result | Narrow equivalents | Pass. States were truthful and recoverable; no indefinite loading observed. |
| Production runtime | Direct HTTP/custom-domain smoke plus complete browser journeys | Same origin | Pass. No audit-visible fatal page or navigation error; controlled workflow completed successfully. |

## Representative evidence

### Signed-out mobile landing

![Signed-out RenderLab landing at a mobile-class viewport](evidence/signed-out-mobile-landing.webp)

### Authenticated Create result

![Desktop Create result from the isolated production fixture](evidence/create-desktop-result.webp)

### Mobile Library viewer

![Mobile Library viewer from the isolated production fixture](evidence/library-mobile-viewer.webp)

### Mobile account sessions

![Mobile Settings session inventory from the isolated production fixture](evidence/settings-sessions-mobile.webp)

The committed images contain only public UI or run-owned test-fixture data. Real-account email, private prompts, media and session timestamps are deliberately excluded.

## Cleanup and data-integrity result

The successful controlled audit used run-owned Auth/account/access, jobs, sources, uploaded media, preference/profile/session and R2 objects. Every mutating script completed its own exact cleanup; the workflow's unconditional cleanup leg also passed. The one real generated image and the Library upload were removed with their owned rows/objects. No test residue was reported.

An earlier audit attempt, run `35257837265`, stopped before product actions because the cleanup-only Activity harness lacked `RENDERLAB_GENERATION_BACKEND_URL`. Its unconditional cleanup ran. The corrected run `35258165837` supplied the required test-only value and passed. This was an audit-harness configuration failure, not a production product failure.

## Prioritized remediation roadmap

### QA-001 — Close production release-record drift at rollout time (P4)

**Outcome:** every explicit production rollout leaves `PROJECT.md`, UI Migration, Screen Registry and Infrastructure pointing at the exact live source and rollout evidence.

**Acceptance:** a post-cutover check fails or opens a required documentation task when the four current-production pointers disagree with the deployed SHA. Historical phase-local status is preserved, but the current-production block always wins.

### QA-002 — Add a permanent non-destructive production user-journey workflow (P4)

**Outcome:** the useful parts of audit run `35258165837` become a reviewed, manually dispatched workflow rather than temporarily replacing an existing workflow file.

**Acceptance:** isolated fixture identity; exact cleanup; desktop plus 390px evidence; public routes, Create, Library, Viewer, Settings/Profile/Preferences/Sessions; no real-user data; no account deletion; no Admin-global mutation; artifact manifest with source SHA and domain.

### QA-003 — Add fixture-safe Activity action and AAL2 Admin visual coverage (P4)

**Outcome:** Retry/Run Again/Cancel eligibility and the complete Admin surface can be audited on production without touching real history or global settings.

**Acceptance:** run-owned failed/running jobs with a non-provider dispatch seam; action temporal states and cleanup; dedicated MFA-enrolled test administrator; Admin reads and responsive screenshots; all invitation/account/generation controls remain non-mutating unless the fixture owns the target and rollback is exact.

These items are the next QA roadmap. They do not authorize implementation, production deployment, hosted Auth changes, or Admin configuration changes.

## Final judgement

RenderLab's roadmap-complete production release is coherent, responsive and operational across the exercised user journeys. The product communicates access, lifecycle, ownership and destructive consequences unusually well for a closed-beta creative tool. The strict residual risk is concentrated in intentionally unexecuted high-side-effect operations, not in a reproduced defect. Production should remain on `c2b7c022cd91167822f75874ef7caf70b0ec264c`; the next work should institutionalize this audit depth and provide safe fixtures for Activity mutations and AAL2 Admin review.
