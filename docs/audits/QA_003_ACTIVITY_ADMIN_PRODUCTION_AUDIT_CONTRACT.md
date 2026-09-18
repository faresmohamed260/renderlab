# QA-003 Production Activity Actions + AAL2 Admin Audit Contract

**Status:** EXECUTION-READY CONTRACT — IMPLEMENTATION/AUDIT NOT YET COMPLETE  
**Tracker:** #278  
**Starting production source:** `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`  
**Purpose:** close the highest-value remaining whole-product production-audit gaps without touching real-user history or global Admin state.

## Goal and user value
Verify, from the live custom domain and with real browser behavior, that Activity action affordances and the privileged Admin surface remain truthful, responsive and safe after the roadmap-complete release. This phase is QA/audit work, not a redesign.

## Verified starting state
- P2 #279 is fixed and production-live; run `35292334383` passed Image, Edit, Animate and standalone Video through Activity → Viewer.
- Existing configured suites already cover Activity cancellation/retry/run-again semantics and Admin authorization/mutations against local exact-head applications.
- The first production audit did not fire Activity mutations against real history and could not enter Admin because the inspected real account lacked AAL2.
- Production automatic Git deployment remains disabled.

## In scope
1. Use only run-owned Activity state. Seed the failed historical row directly, but allow a bounded provider-backed generation budget where the production action intrinsically requires it: one cancellable run-owned generation for Cancel, one generation created by Retry, and one generation created by Run Again.
2. Exercise Cancel, Retry and Run Again from the live production UI only against those run-owned jobs. Cancel must be requested promptly after dispatch; Retry and Run Again must be observed through truthful terminal Activity state.
3. Verify loading/disabled/terminal states, action eligibility, history ordering and cleanup at desktop and 390px.
4. Create a dedicated run-owned active Admin Auth/access fixture.
5. Enroll one TOTP factor on that fixture, obtain AAL2 through the live MFA challenge, and enter live `/admin`.
6. Audit Admin health, invitation/account/generation-setting presentation read-only on desktop and 390px.
7. Mutating Admin controls remain disabled/not submitted unless the target is wholly run-owned and exact rollback is implemented first.
8. Upload screenshots plus a manifest containing production source, domain, fixture IDs (opaque/run-owned only), viewport and cleanup result.

## Out of scope
- Any mutation of the owner's real account, sessions, media, jobs or invitations.
- Global generation-setting changes.
- Real invitation delivery.
- Unbounded or unrelated provider generation. QA-003 may spend only the minimum run-owned jobs explicitly required to prove Cancel, Retry and Run Again; it may not dispatch against real history.
- UI redesign, route changes, schema migrations, hosted Auth policy changes, deployment, or worker/provider changes.
- Passkeys/WebAuthn.

## Architecture and security boundaries
- `auth.users.id` remains the canonical principal.
- Admin admission still requires active Admin access plus fresh AAL2; the audit must prove the gate rather than bypass it.
- TOTP enrollment is permitted only on the dedicated run-owned fixture and must be removed by deleting that fixture during unconditional cleanup.
- Activity fixtures must use server-owned test setup and must never attach to another owner's rows. Any provider-backed jobs must belong to the exact run-owned account and be cleaned with its database/R2/Auth state.
- Browser roles continue to have no direct service-role capability; fixture setup/cleanup may use CI-only service credentials.
- Any singleton Admin setting read is observational. No global write is authorized.

## Validation matrix
| Surface | Desktop | 390px | Required evidence |
| --- | --- | --- | --- |
| Activity running → Cancel | yes | yes | real run-owned dispatch, confirm dialog, submitting/disabled, cancelled |
| Activity failed → Retry | yes | yes | seeded failed history, submitting/disabled, real run-owned retry job to terminal state |
| Activity succeeded → Run Again | yes | yes | eligibility, submitting/disabled, real run-owned new job to terminal state |
| Admin MFA gate | yes | yes | pre-AAL2 redirect/challenge |
| Admin authenticated content | yes | yes | health + account/invitation/settings sections, no sensitive values |
| Cleanup | n/a | n/a | zero run-owned Auth/access/job/media/source/invitation residue |

## Visual/accessibility review
- No horizontal overflow at 390px.
- Visible keyboard focus for Activity/Admin primary controls.
- Action labels/states remain understandable without color alone.
- Reduced-motion geometry remains functional; this phase does not reopen approved motion.
- Artifacts must contain only public UI or run-owned fixture data.

## Documentation outputs
- Update the production audit report with pass/fail evidence and any discovered defects.
- Create dedicated defect issues for any reproduced P0–P3 finding.
- Update #278 checklist/state.
- Do not mark QA-003 complete until screenshot evidence is human-reviewed and cleanup is independently verified.

## Exit criteria
- All contracted Activity actions pass against fixture-safe production state on both viewports, using only the bounded run-owned provider work above, or defects are recorded with reproduction/evidence.
- AAL2 Admin content is reached and visually audited on both viewports without global mutation.
- Exact cleanup succeeds and independent residue checks are zero.
- Audit report and tracker match verified reality.

## Next-phase dependency
After QA-003, expand QA-004 only from the evidence then available. QA-004 owns the remaining isolated account/security/data production submissions; QA-005 owns bounded reconciliation/error presentation.