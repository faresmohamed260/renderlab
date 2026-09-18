# QA-003 Production Activity Actions + AAL2 Admin Audit Contract

**Status:** COMPLETE / VERIFIED IN PRODUCTION — 2026-09-18  
**Tracker:** #278  
**Starting production source:** `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`  
**Purpose:** close the highest-value remaining whole-product production-audit gaps without touching real-user history or global Admin state.

## Goal and user value
Verify, from the live custom domain and with real browser behavior, that Activity action affordances and the privileged Admin surface remain truthful, responsive and safe after the roadmap-complete release. This phase is QA/audit work, not a redesign.

## Verified execution and closure
- First QA-003 production execution run `35351243298` proved Cancel and Retry through terminal run-owned states, then reproduced missing `Run again` after the retried job reached `succeeded`. That failure became #284 and was fixed by PR #285 / merge `7bfe76e427b633ab848d0132a28788f7420060e2`.
- Historical configured-fixture residue exposed by QA-003 became #286. PR #287 / merge `1ac6b2807ab483bc6c87d433d6e8337a950e1371` hardened configured cleanup, and the audited historical fixture owners were independently proven absent from Auth and owner-scoped database state.
- Workflow-definition correction #288 produced application source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`, which was current `main` at rollout time. Guarded production rollout `35373771751` deployed that pristine exact source as READY `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`, explicitly moved `renderlab.faresuniform.uk`, passed the accepted smoke routes, and did not invoke rollback.
- Final manual audit run `35374052822` supplied the exact production SHA and confirmed the bounded fixture-only provider-work contract. Activity Cancel reached `cancelled`, Retry and Run Again reached `succeeded`, and the run-owned Admin fixture completed TOTP enrollment plus fresh AAL2 challenge before read-only Admin inspection.
- Artifact `10559613086` (`sha256:fcba296a446a28c0867654018ec4692c2af5c2779902902a6774f3020f18e92c`) contains 32 screenshots plus `manifest.json`. Human review accepted desktop, 390px, focus and reduced-motion evidence without a horizontal-overflow blocker or sensitive-value exposure.
- Exact pre/post DB/Auth fixture absence passed; the manifest records verified cleanup with four R2 objects checked. No P0–P3 defect was reproduced by the completed QA-003 contract. QA-004 is now unblocked but remains a separate operation.

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
- The former completion gate is now fulfilled: the live source contains the verified #285 fix and final run `35374052822` passed the full contract. Future reruns remain manual and must preserve the same exact-SHA and bounded-provider confirmation.

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