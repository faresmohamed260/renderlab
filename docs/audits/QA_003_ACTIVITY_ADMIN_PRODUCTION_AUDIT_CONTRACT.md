# QA-003 Production Activity Actions + AAL2 Admin Audit Contract

**Status:** COMPLETE / PRODUCTION-VERIFIED / EVIDENCE REVIEWED / CLEANUP VERIFIED  
**Tracker:** #278  
**Starting production source:** `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`  
**Verified closing production source:** `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`  
**Purpose:** close the highest-value remaining whole-product production-audit gaps without touching real-user history or global Admin state.

## Goal and user value
Verify, from the live custom domain and with real browser behavior, that Activity action affordances and the privileged Admin surface remain truthful, responsive and safe after the roadmap-complete release. This phase is QA/audit work, not a redesign.

## Verified starting state
- P2 #279 is fixed and production-live; run `35292334383` passed Image, Edit, Animate and standalone Video through Activity → Viewer.
- First QA-003 production execution run `35351243298` proved Cancel and Retry through terminal fixture-owned states, then reproduced missing `Run again` after the retried job reached `succeeded`. That failure became issue #284 and was fixed by PR #285, squash-merged as `7bfe76e427b633ab848d0132a28788f7420060e2`; its exact-head and merged-main workflow matrices passed. The fix is not production-live yet, so QA-003 remains open.
- QA-003 also exposed historical configured-fixture residue tracked by #286. PR #287 hardened configured cleanup and squash-merged as `1ac6b2807ab483bc6c87d433d6e8337a950e1371`; 34/34 exact-head PR workflows and 16/16 merged-main push workflows passed, and the two audited historical fixture owners were independently proven absent from Auth and owner-scoped database state.
- Existing configured suites already cover Activity cancellation/retry/run-again semantics and Admin authorization/mutations against local exact-head applications.
- The first production audit did not fire Activity mutations against real history and could not enter Admin because the inspected real account lacked AAL2.
- Guarded rollout `35373771751` deployed exact source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` as READY deployment `dpl_3ZmgUDCW7yZ1RJBz2NCfvkNRt2UH`; custom-domain smoke passed and rollback was not invoked.
- Manual production run `35374052822` completed the full QA-003 matrix. Artifact `10559613086` / `sha256:fcba296a446a28c0867654018ec4692c2af5c2779902902a6774f3020f18e92c` contains 32 screenshots plus the manifest; human review and independent zero-residue verification passed.
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

## Execution control
- The permanent QA-003 workflow is `workflow_dispatch` only. Pull requests must not automatically spend provider work against production.
- Dispatch requires an explicit exact 40-character production Git SHA plus confirmation of the bounded fixture-only provider-work contract.
- Before dispatch, the operator must independently verify that the supplied SHA is production-live. The workflow records that SHA in its manifest; it does not authorize deployment.
- Harness implementation merged before the production rerun. The live source now contains the verified #285 fix and the full contract passed in run `35374052822`; no further QA-003 production execution is required unless a later regression reopens this surface.

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

## Production closure evidence
- Cancel: `cancelling → cancelled`.
- Retry: seeded failed history → new real run-owned job → `running → succeeded`.
- Run Again: became available from the same refreshed succeeded row without manual reload → new real run-owned job → `running → succeeded`.
- Admin: run-owned active Admin enrolled one TOTP factor, signed out, signed back in, hit the AAL1 protected gate, passed the live TOTP challenge to AAL2 and loaded Admin.
- Responsive/visual: desktop and 390px Activity/MFA/Admin screenshots reviewed clean; reduced-motion Admin evidence remained functional; no horizontal overflow assertion failed.
- Privacy: non-fixture Admin invitation/account/override identity lists were masked in screenshot evidence.
- Cleanup: both workflow cleanup legs passed; manifest reports four R2 objects checked absent; independent database query returned zero residue across Auth/access/jobs/sources/media/uploads/profiles/admission reservations.
- Runtime: current Vercel deployment showed no grouped runtime errors and no warning/error/fatal logs in the inspected post-cutover window.

## Next-phase dependency
After QA-003, expand QA-004 only from the evidence then available. QA-004 owns the remaining isolated account/security/data production submissions; QA-005 owns bounded reconciliation/error presentation.