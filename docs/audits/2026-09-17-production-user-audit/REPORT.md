# RenderLab production user audit — 2026-09-17, production closure updated 2026-09-18

## Verdict

**Production acceptance: CORE CREATIVE + QA-003 PASS / WHOLE-PRODUCT AUDIT STILL OPEN.** The live custom domain now serves exact source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`. Guarded rollout `35373771751` completed without rollback. The previously reproduced P3 #284 same-refresh Run Again defect is production-resolved.

Manual live run `35374052822` completed the QA-003 contract: run-owned Cancel reached `cancelled`; a seeded failed job's Retry reached `succeeded`; Run Again became available from that same refreshed terminal state and its new job reached `succeeded` without manual reload. A separate run-owned Admin fixture enrolled TOTP, signed out, signed back in at AAL1, passed the live MFA challenge to AAL2, and entered the read-only Admin surface on desktop and 390px.

Artifact `10559613086` (`sha256:fcba296a446a28c0867654018ec4692c2af5c2779902902a6774f3020f18e92c`) contains 32 screenshots plus the source/cleanup manifest. Human review found the Activity action temporal states, MFA enrollment/challenge, responsive Admin layout and privacy masking coherent. Exact cleanup passed; four owned R2 objects were checked absent and an independent database query returned zero residue across Auth/access/jobs/sources/media/uploads/profiles/admission reservations.

No P0–P3 defect is currently reproduced in completed production-audit coverage. **This is still not exhaustive whole-site acceptance.** QA-004 must exercise isolated account/security/data submissions, and QA-005 must prove bounded reconciliation/error presentation.

## Audit identity and production provenance

| Item | Verified value |
| --- | --- |
| Custom domain | `https://renderlab.faresuniform.uk` |
| Live repository source | `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` |
| Guarded rollout | GitHub Actions run `35373771751`, `Deploy QA-003 Run Again Fix 2026-09-18`, successful |
| READY deployment URL | `https://renderlab-itvgds4bb-faresmohamed260-6733s-projects.vercel.app` (`dpl_3ZmgUDCW7yZ1RJBz2NCfvkNRt2UH`) |
| Rollout proof | Clean checkout of the exact source, READY state, explicit custom-domain alias, smoke on `/`, `/create`, `/library`, `/activity`, `/settings`, `/settings/password`, `/settings/profile`, and `/settings/preferences`; rollback did not run |
| Production audit run | `35258165837`, successful in 8m17s |
| Audit workflow head | `92cd420ffca04bc3fa9a6bf54582196c94bc30fa` (temporary audit-only workflow state; not deployed) |
| Audit artifact | `production-user-audit-35258165837-1`, artifact `10512554453` |
| Artifact digest | `sha256:7a98903c3f476c39830a862783a9a6b55ff6d11662e14482f2668c7a833ff3cc` |
| Audit date | 2026-09-17 UTC / Africa-Cairo |
| Corrective end-to-end run | `35269965598`, failed after reproducing Activity stuck `RUNNING` for 30 minutes |
| Corrective artifact | `production-complete-user-journey-35269965598-1`, artifact `10518743048`, `sha256:608daf18ffc6dd8918736f20f6cf17a68de0545aa425adaac88132f2c07d8561` |
| Fix verification | Head `20a0697b91485fd0c6f5040f6f70c9467e9db62c`; Activity Visual run `35277589256`, successful in 2m28s |
| Fix artifact | `renderlab-activity-screenshots`, artifact `10521626476`, `sha256:c66694a0dd9fd1aeca2a965f80106c07e4cc1cd2344da851c2e6cbf1dd0da8d5` |
| Production re-verification | Run `35292334383`, successful in 6m48s; Image/Edit/Animate/Video all completed through Activity → Viewer |
| Production re-verification artifact | `production-complete-user-journey-35292334383-1`, artifact `10527172224`, `sha256:27bbadc26b65ac63c59bb01284187544401512108a57ed5dc2a1a330e5bd6d8c`, 26 screenshots |

The rollout workflow ref itself was a release-control ref, so its GitHub `headSha` is not used as the application-source assertion. The decisive evidence is the workflow's clean checkout/deploy log, which explicitly selected and verified `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1` before alias cutover.

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

### RLQA-002 — Activity does not refresh a completed generation to its terminal result

- **Severity:** P2
- **Status:** **RESOLVED IN PRODUCTION** by PR #277 / merged main `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`; guarded rollout `35292170973`; live re-verification `35292334383` passed all four generation journeys; issue #279 may close.
- **Scope:** Create/Activity lifecycle, durable-result discovery, and every continuation that depends on reaching Viewer; shared logic affects desktop and mobile
- **Reproduction:** sign in with an admitted account; submit a valid Image generation from `/create`; after acceptance open `/activity`; leave the page on the row displaying `RUNNING` and `refreshing active work`.
- **Expected:** Activity reconciles the job to `Complete`, removes Cancel, exposes View result/Run again when eligible, and lets the user reach the durable Viewer.
- **Actual:** corrective run `35269965598` accepted job `27de0eb4-288b-4eb1-9e51-5911a9bed20a` at 20:19:28 UTC; Activity remained `RUNNING` until the 30-minute bound expired. No View result appeared. The product owner independently confirmed the media completes but the site fails to refresh.
- **Evidence:** [Create accepted/generating](evidence/create-desktop-active-stuck-journey.webp); [Activity stuck running](evidence/activity-desktop-stuck-running.webp); run `35269965598`; artifact `10518743048` / `sha256:608daf18ffc6dd8918736f20f6cf17a68de0545aa425adaac88132f2c07d8561`.
- **Root cause:** `src/features/activity/activity-auto-refresh.tsx` used one `setTimeout`. The first server refresh retained the mounted component with `enabled=true`, so the effect dependencies did not change and no later timer was scheduled. Jobs completing after that single refresh remained visually stale until manual navigation.
- **Implemented fix:** use one cleaned-up five-second interval while active server truth enables observation. The configured regression waits through the first refresh, terminalizes its fixture afterward, and requires the same mounted page to render `Completed` on a later refresh. Activity Visual run `35277589256` passed, including exact fixture cleanup. [Configured fixed state](evidence/activity-auto-refresh-fixed-desktop.webp).
- **Production proof:** run `35292334383` observed real Image, Edit, Animate and standalone Video jobs advance to `succeeded` on the same mounted Activity page, exposed `View result`, opened durable Viewer media, and verified both desktop and 390px Viewer geometry. The artifact contains 26 screenshots; cleanup and independent zero-residue verification passed.
- **Residual hardening:** provider/reconciliation failure surfacing remains a separate QA concern; no such failure was reproduced in the successful post-fix run.

## Coverage matrix

| Area | Desktop | 390px / narrow | Result and evidence |
| --- | --- | --- | --- |
| Landing and navigation | Signed-out live walkthrough | Live 390×844 and reduced-motion fixture coverage | Pass. Correct public/application shell boundary, Closed Beta truth, working navigation and no horizontal overflow. [Mobile landing](evidence/signed-out-mobile-landing.webp) |
| Signed-out access | Settings sign-in, Create gating, Library/Activity states | 390px Settings and Create | Pass. No public sign-up claim, private actions gate truthfully, keyboard focus is visible. [Mobile keyboard focus](evidence/signed-out-mobile-settings-focus.webp) |
| Create — Image | Real production Image through Create → Activity → Viewer | Viewer rechecked at 390px | **Pass after fix.** Run `35292334383` reached `succeeded`, exposed View result and loaded durable image Viewer on both viewports. Artifact `10527172224`: `01-create-image-desktop-*`. |
| Create — Video | Real standalone Video submitted at 390px | Activity + Viewer at 390px | **Pass after fix.** Run `35292334383` traversed Running → Persisting → Completed and loaded a 5-second durable video with native controls on desktop and mobile. Artifact `10527172224`: `04-create-video-mobile-*`. |
| Create references | Real durable upload/drop, aliases, reorder and limits | Narrow source layout | Pass. Two Image references and one Video start-image boundary enforced; aliases remained stable through reorder; cleanup exact. |
| Library browse/search/filter | Real run-owned upload, Creatives/Uploads, type and selection behavior | Narrow list/grid and controls | Pass. Search/filter/sort/selection remained coherent. [Desktop upload](evidence/library-desktop-upload.webp) |
| Viewer and actions | Real Image, Edit, Animate and standalone Video results opened from Activity | All four results rechecked at 390px | **Pass for generated-result viewing/continuation path.** Image and video pixels loaded durably; videos exposed native controls; no horizontal overflow. Destructive/manage mutations remain controlled-fixture scope. Artifact `10527172224`. |
| Activity/history | Real Image/Edit/Animate/Video jobs observed to terminal state without manual reload | Same responsive Activity surface | **Pass for lifecycle observation.** All four jobs terminalized; Animate/Video exposed Persisting before Completed. Retry/Run Again/Cancel mutation acceptance remains outstanding under QA-003. |
| Profile | Real empty-profile read-only state; controlled save/crop/keyboard fixture | 390px reduced-motion crop | Pass. Identity copy and ownership separation are clear. [Mobile profile](evidence/settings-profile-mobile-reduced.webp) |
| Password and email | Real forms inspected; controlled password-field behavior | Narrow fixture coverage | Pass for layout, labels, disabled-until-valid behavior, reveal controls and 15-character policy copy. Real credentials/email were not changed. |
| Sessions | Real privacy-safe inventory inspected; controlled local/other/global sign-out semantics | 390px session register | Pass. Real sessions were not revoked. [Mobile sessions](evidence/settings-sessions-mobile.webp) |
| MFA / step-up | Real run-owned TOTP enrollment, fresh password sign-in and live AAL2 challenge | Desktop + 390px challenge/enrolled states | **Pass in QA-003.** Run `35374052822` verified enrollment, sign-out/sign-in, AAL1 gate, successful TOTP challenge and protected destination access. |
| Data & Privacy | Real export/delete copy and disclosure inspected | Existing account-lifecycle fixture coverage | **Partial.** Presentation and prior controlled lifecycle tests were inspected; this audit did not submit a fresh production export/delete fixture journey. |
| Preferences | Real default state inspected; controlled save, cross-device read, stale fallback, reset, precedence and export/deletion integration | 390px reduced-motion | Pass. [Mobile preferences](evidence/settings-preferences-mobile-reduced.webp) |
| Admin | Dedicated run-owned active Admin; read-only live `/admin` after AAL2 | Desktop + 390px + reduced-motion evidence | **Pass in QA-003.** Health/access/generation sections rendered without horizontal overflow; acting-admin protections remained locked; non-fixture identity lists were privacy-masked in evidence and no global mutation was submitted. |
| Keyboard/focus | Tab/focus on signed-out and authenticated controls | Narrow visible focus | Pass. Focus indicator remained visible and control labels were announced. |
| Reduced motion | Repository-controlled production fixture run | Landing/Create/Viewer/Settings at 390px | Pass. Functional content and geometry remained present without motion dependency. |
| Empty/loading/error | Signed-out empties, MFA loading→ready, failed Activity row, generation start/result | Narrow equivalents | Pass. States were truthful and recoverable; no indefinite loading observed. |
| Production runtime | Guarded smoke plus post-fix real browser journeys | Same origin | **Pass for exercised scope.** Fixed deployment reports no grouped runtime errors and no warning/error/fatal logs in the inspected window; whole-product coverage is still incomplete. |

## Representative evidence

### Signed-out mobile landing

![Signed-out RenderLab landing at a mobile-class viewport](evidence/signed-out-mobile-landing.webp)

### Authenticated Create result

![Desktop Create result from the isolated production fixture](evidence/create-desktop-result.webp)

### Reproduced lifecycle-refresh defect

![Activity still presenting the accepted production Image job as running](evidence/activity-desktop-stuck-running.webp)

### Configured fix verification

![The same mounted Activity page presenting the post-first-refresh fixture as completed](evidence/activity-auto-refresh-fixed-desktop.webp)

### Mobile Library viewer

![Mobile Library viewer from the isolated production fixture](evidence/library-mobile-viewer.webp)

### Mobile account sessions

![Mobile Settings session inventory from the isolated production fixture](evidence/settings-sessions-mobile.webp)

### QA-003 production evidence

Run `35374052822` uploaded 32 screenshots in artifact `10559613086`. Representative artifact files include:
- `activity-cancel-desktop-dialog.png` and `activity-cancel-mobile-submitting.png`;
- `activity-retry-mobile-completed.png` and `activity-run-again-mobile-completed.png`;
- `admin-mfa-enrollment-required-mobile.png`, `admin-mfa-challenge-mobile.png`;
- `admin-readonly-desktop.png`, `admin-readonly-mobile.png`, and reduced-motion Admin evidence.

The Admin screenshots mask invitation/account/override identity lists while preserving the real layout and product-health/operator surfaces.

The committed images contain only public UI or run-owned test-fixture data. Real-account email, private prompts, media and session timestamps are deliberately excluded.

## Cleanup and data-integrity result

The successful controlled audit used run-owned Auth/account/access, jobs, sources, uploaded media, preference/profile/session and R2 objects. Every mutating script completed its own exact cleanup; the workflow's unconditional cleanup leg also passed. The one real generated image and the Library upload were removed with their owned rows/objects. No test residue was reported.

An earlier audit attempt, run `35257837265`, stopped before product actions because the cleanup-only Activity harness lacked `RENDERLAB_GENERATION_BACKEND_URL`. Its unconditional cleanup ran. The corrected run `35258165837` supplied the required test-only value and passed. This was an audit-harness configuration failure, not a production product failure.

Corrective end-to-end run `35269965598` is a product finding, not a harness failure. It submitted through the live Create UI, captured the active Create state, opened live Activity, and waited 30 minutes for the row to advance. It did not. Its unconditional cleanup removed the run-owned account/job/media state and evidence upload passed.

## Prioritized remediation roadmap

### QA-000 / issue #279 — Repair and prove generation completion refresh (P2)

**Outcome:** Activity and Create advance accepted jobs to truthful terminal state without manual recovery, and successful jobs reliably expose durable Viewer results.

**Status:** **COMPLETE / PRODUCTION-LIVE / LIVE USER PATH VERIFIED.** PR #277 merged as `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`; rollout `35292170973` succeeded; production journey `35292334383` passed all four generation paths with exact cleanup.

**Acceptance achieved:** live Image, Edit, Animate and standalone Video all reached durable Viewer results through Activity on the fixed production source; desktop/390px evidence and exact cleanup passed. Provider/reconciliation failure surfacing is carried forward as a separate QA hardening item rather than keeping the resolved timer defect open.

### QA-001 — Close production release-record drift at rollout time (P4)

**Outcome:** every explicit production rollout leaves `PROJECT.md`, UI Migration, Screen Registry and Infrastructure pointing at the exact live source and rollout evidence.

**Acceptance:** a post-cutover check fails or opens a required documentation task when the four current-production pointers disagree with the deployed SHA. Historical phase-local status is preserved, but the current-production block always wins.

### QA-002 — Add a permanent non-destructive production user-journey workflow (P4)

**Outcome:** the useful parts of audit run `35258165837` become a reviewed, manually dispatched workflow rather than temporarily replacing an existing workflow file.

**Acceptance:** isolated fixture identity; exact cleanup; desktop plus 390px evidence; public routes, Create, Library, Viewer, Settings/Profile/Preferences/Sessions; no real-user data; no account deletion; no Admin-global mutation; artifact manifest with source SHA and domain.

### QA-003 — Add fixture-safe Activity action and AAL2 Admin visual coverage (P4)

**Outcome:** Retry/Run Again/Cancel eligibility and the privileged Admin surface are audited on production without touching real history or global settings.

**Status:** **COMPLETE / PRODUCTION-VERIFIED.** Permanent manual audit harness merged through #283/#288. Explicit rollout `35373771751` made exact source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` live. Production run `35374052822` then passed Cancel, Retry, same-refresh Run Again, TOTP enrollment, fresh AAL2 challenge and read-only Admin desktop/390px coverage. Artifact `10559613086` / `sha256:fcba296a446a28c0867654018ec4692c2af5c2779902902a6774f3020f18e92c` contains 32 screenshots plus the manifest.

**Cleanup:** workflow cleanup and the unconditional cleanup-only leg passed; manifest checked four R2 objects absent; independent database verification found zero Auth/access/job/source/media/upload/profile/admission residue for both fixture identities.

**Defects discovered and closed:** P3 #284 same-refresh Run Again eligibility was fixed by PR #285 and proven by this live rerun. P4 #286 historical configured-fixture residue was cleaned and the shared cleanup contract was hardened by PR #287.

### QA-004 — Complete isolated account/security/data production acceptance (P4)

**Outcome:** exercise the production forms and state transitions that were intentionally not submitted on the real owner account: profile save/remove, preferences save/reset, session revocation semantics, password/recovery presentation, MFA enrollment/challenge/recovery boundary, data export, and account deletion.

**Acceptance:** run-owned accounts only; no mutation of the real owner; destructive account deletion occurs only on the fixture created for that exact run; email-change delivery is attempted only when a dedicated test mailbox and hosted rate-limit budget are available; desktop and 390px evidence; zero Auth/database/R2 residue.

### QA-005 — Bound generation reconciliation/error presentation (P4)

**Outcome:** prove that provider/reconciliation failures do not leave Activity claiming indefinite refresh.

**Acceptance:** controlled non-provider failure seams or run-owned failure fixtures exercise server reconciliation error handling and produce a bounded actionable state without exposing provider internals.

These items are the next QA roadmap and are tracked by GitHub issue #278. They do not authorize unrelated product implementation, production deployment, hosted Auth changes, or global Admin configuration changes.

## Final judgement

The core creative journey and QA-003 privileged/action coverage now pass on exact production source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`. The Run Again race reproduced as #284 is fixed and live; Cancel, Retry and Run Again all passed against run-owned production state, and a real TOTP/AAL2 Admin journey passed on desktop and 390px with exact cleanup. No runtime-error cluster is present for the current deployment.

The professional judgement is therefore **core creative + Activity/Admin acceptance PASS, whole-product audit IN PROGRESS**. No P0–P3 defect remains reproduced in the completed coverage. RenderLab should not yet be called exhaustively production-audited because QA-004 isolated account/security/data submissions and QA-005 bounded reconciliation/error presentation remain. Issue #278 governs those remaining slices.
