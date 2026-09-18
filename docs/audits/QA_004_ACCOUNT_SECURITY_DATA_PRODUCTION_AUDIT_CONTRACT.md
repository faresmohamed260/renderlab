# QA-004 Production Account / Security / Data Audit Contract

**Status:** EXECUTION CONTRACT + PERMANENT HARNESS MERGED / PRODUCTION RUN NOT YET PERFORMED  
**Tracker:** #278  
**Planning baseline:** repository `main` `310f345d6c80002ef274f1c86d4ddec61914e8da`  
**Production application source:** `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` at READY deployment `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`  
**Purpose:** close the isolated account/security/data production-acceptance gap using only run-owned identities and storage, without touching the real owner account or spending provider-backed generation work.

## Goal and user value

Verify on the live custom domain that the production account system behaves coherently across profile, durable preferences, session controls, password/recovery presentation, MFA assurance, data export and fixture-only account deletion. The audit must prove real production routing and authorization while keeping destructive work bounded to identities created for the exact run.

QA-004 is acceptance/audit work. It does not redesign Settings, expand account capability, change hosted Auth policy, deploy application code, or authorize unrelated account/provider infrastructure changes.

## Verified starting state

- QA-003 is complete and production-verified. Final run `35374052822` passed fixture-safe Activity Cancel/Retry/Run Again plus AAL2 Admin and exact cleanup.
- Production serves application source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` through `renderlab.faresuniform.uk`; rollout `35373771751` created READY deployment `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`, moved the custom-domain alias, passed the accepted smoke routes and did not roll back.
- #216 session controls, #217 TOTP/AAL2 step-up, #218 secure email identity management and #219 data export/deletion are production-live. Profile/credential UX and durable Create preferences are also included in the current production application source.
- Existing configured workflows already prove the component contracts locally/exact-head: Account Profile Credential, Session Controls, MFA Privileged Step-Up, Account Data Lifecycle and Account Identity. QA-004 must reuse their proven fixture/data semantics where appropriate rather than creating competing account models.
- Existing configured account-data acceptance includes active-generation cancellation and injected retry faults. QA-004 does not need to spend provider work or repeat fault injection to prove the live account surface; those remain covered by the dedicated configured #219 suite.
- Permanent harness PR #292 merged as `4254f07ab044d2d1d815498844513bf57e451ba6`. Exact PR head `559def62a8336c95f8aa7fdbf7adba41fb100ef1` passed Engineering Quality after correcting an invalid one-line/literal-`\\n` workflow serialization, and merged-main Engineering Quality run `35397924862` passed. The merged harness is `.github/workflows/production-qa004-account-security-data.yml` plus `scripts/verify-production-qa004-account-security-data.mjs` and its unit contract guard. No production audit run has executed yet.

## In scope

1. **Run-owned identity and cleanup**
   - Create only dedicated QA-004 Auth users/access rows with run-scoped fixture identity.
   - Use a primary account for profile/preferences/session/MFA/export work, a destructive deletion account for full owner-wide cleanup, and a sentinel account for non-interference proof.
   - Pre-clean the exact QA-004 fixture namespaces before execution and independently prove post-run absence across Auth, account/access/lifecycle/profile/preferences/export and other owner-scoped product rows plus owned R2 objects.

2. **Profile acceptance**
   - Save a run-owned display name through the live production account route/UI.
   - Upload one generated run-owned avatar, verify the private profile state, then remove it and prove the deterministic avatar object is absent.
   - Preserve canonical `auth.users.id`; prove the sentinel profile remains unchanged.
   - Capture desktop and 390px evidence with no secret values.

3. **Preferences acceptance**
   - Save supported durable Create defaults through the live production UI/API.
   - Read the saved values from a second live session for the same user.
   - Reset preferences and prove the owner preference row returns to product-default semantics rather than persisting a redundant default snapshot.
   - Prove the sentinel account is unchanged.

4. **Session semantics**
   - Establish at least two simultaneous sessions for one run-owned user.
   - Verify the live Settings session inventory has exactly one current-session marker for the acting browser and privacy-safe presentation.
   - Exercise the supported “sign out other sessions” boundary against the fixture only; prove the acting session remains authorized and the revoked other session can no longer access a private RenderLab route.
   - Do not fabricate arbitrary per-row revoke because the approved provider contract does not support it.

5. **Password and recovery presentation**
   - Verify signed-out password entry, Forgot password/recovery entry points, ordinary password-change presentation, accessible Show/Hide behavior, current/new password autocomplete semantics, paste/password-manager compatibility and the truthful 15-character guidance.
   - Do not send a real recovery email, replace the run-owned password, or expose any password value in screenshots/artifacts unless a later defect reproduction strictly requires it.

6. **MFA / assurance boundary**
   - Enroll exactly one TOTP factor on a run-owned member fixture using the supported production path/contract.
   - Prove an AAL1 session is denied at a sensitive account boundary once the factor is enrolled.
   - Complete a fresh TOTP challenge and prove the AAL2 session can perform the contracted sensitive operation.
   - Cleanup must delete the fixture identity and therefore remove the factor.

7. **Data export**
   - Seed representative fixture-owned product state only: profile/avatar and preferences plus bounded owner-scoped database/R2 rows needed to make export content meaningful.
   - Request a live production account export, follow the private download path and verify the exported package contains expected sanitized product/account data while excluding access tokens, refresh tokens, service credentials, provider identifiers and raw storage keys.
   - Verify an unrelated sentinel account cannot read the export.

8. **Fixture-only account deletion**
   - Use a dedicated deletion fixture; never delete the primary audit account until its earlier checks are complete.
   - Verify typed `DELETE` confirmation plus current-password proof and, for an MFA-enrolled deletion fixture, recent TOTP/AAL2 step-up.
   - After the production endpoint has accepted deletion and frozen the fixture account, the harness may move **only that run-owned lifecycle row's** quiescence deadline into the past with the service role so the live finalizer can be exercised without waiting the full six-minute presigned-upload window.
   - Seed representative owner state directly with server-only fixture setup; do **not** dispatch provider-backed generation for QA-004.
   - Run the live production finalizer to completion; prove Auth identity, sessions/factors, access/lifecycle/profile/preferences/export/product rows and every run-owned R2 object are absent.
   - Prove sentinel Auth/product/R2 state is unchanged.

9. **Responsive / accessibility evidence**
   - Desktop and 390px Settings/Profile/Preferences/Data & Privacy states.
   - Visible keyboard focus on key account controls.
   - Reduced-motion geometry for at least one narrow authenticated Settings state.
   - No horizontal overflow at 390px.

## Conditional email-change gate

Secure sign-in-email change is **not automatically executed by QA-004**. It may run only if, before dispatch:

- a dedicated pair of owned test mailboxes is explicitly available for this audit;
- the operator confirms a bounded hosted-email/rate-limit budget;
- the workflow can guarantee both confirmations are fixture-owned and cleanup is exact; and
- no real-user mailbox or invitation state is involved.

If that gate is not satisfied, the QA-004 manifest must record email change as `skipped_gate_not_met`; this is not a QA-004 failure because #278 explicitly makes production email-change acceptance conditional on mailbox/rate-limit availability.

## Explicitly out of scope

- Any mutation of the owner's real RenderLab/Auth account, sessions, profile, media, invitations, email or credentials.
- Real-user account deletion.
- Provider-backed image/video generation, worker dispatch, worker reset/redeploy or provider cancellation.
- Global Admin writes, invitation delivery, generation-setting changes or role/status mutation outside the run-owned fixtures.
- Hosted Auth policy/Site URL/template/SMTP mutation.
- Changing password policy, session lifetime policy or MFA factor limits.
- Passkeys/WebAuthn, arbitrary per-session UUID revoke, security-activity productization or new recovery methods.
- UI redesign, route changes, schema migrations or production deployment.
- Fault-injection coverage already owned by the configured #219 lifecycle workflow.

## Implementation shape

QA-004 implementation should add one permanent manual production workflow and one production-specific verifier rather than modifying unrelated configured suites:

- `.github/workflows/production-qa004-account-security-data.yml`
- `scripts/verify-production-qa004-account-security-data.mjs`

The production verifier may reuse small utilities from `scripts/lib/configured-test-account.mjs` and logic patterns from the existing account verifiers, but it must own its QA-004 fixture namespaces and a single explicit cleanup ledger. Existing configured workflows remain unchanged unless a concrete shared-helper defect is discovered.

## Execution control

- Workflow trigger is `workflow_dispatch` only.
- Required dispatch input: exact 40-character `expected_production_sha`.
- Required confirmation input: explicit acknowledgement that the run will create/delete only QA-004 fixture accounts and R2/database state.
- The workflow must fail closed unless the expected SHA matches the independently verified production application source before dispatch.
- The workflow records source SHA, production domain, run ID, fixture identities as opaque/run-owned identifiers, covered checks, conditional email-change status and cleanup result in `manifest.json`.
- Pull requests and pushes must never automatically run the production QA-004 workflow.
- The harness must run an unconditional cleanup leg even after assertion failure. Cleanup failures are test failures.
- `cancel-in-progress` must be false because destructive fixture cleanup is not safely reconstructible from a partially cancelled run.

## Architecture and security boundaries

- `auth.users.id` remains the canonical account principal.
- Profile/display data and preferences are product metadata only and never authorize access.
- Raw core product/Auth tables remain server-owned; browser code receives no service-role capability.
- Browser/private API operations use the run-owned user's real Supabase session/access token and live production authorization path.
- Fixture setup/cleanup may use the server-only service role only for deterministic seed/cleanup and the explicitly allowed deletion-quiescence time advance.
- Artifacts must contain no password values, access/refresh tokens, TOTP secret/QR contents, raw service credentials, provider identifiers, private real-user data or signed R2 URLs.
- MFA-sensitive operations must fail closed at AAL1 after enrollment and succeed only after the supported fresh AAL2 boundary.
- Account deletion must preserve the existing last-active-Admin protection; QA-004 should use ordinary member fixtures unless an Admin-specific assertion is separately necessary.

## Validation matrix

| Surface / contract | Desktop | 390px | Functional proof |
| --- | --- | --- | --- |
| Profile save / avatar add-remove | yes | yes | live product state + private object lifecycle + sentinel isolation |
| Preferences save / cross-session read / reset | yes | yes | owner row semantics + second-session read + sentinel isolation |
| Session inventory / sign out others | yes | yes where useful | current marker + revoked-other denial + acting-session continuity |
| Password / recovery presentation | yes | yes | reveal, autocomplete, paste, guidance, recovery entry point |
| MFA enrollment / challenge boundary | yes | yes | AAL1 denied, fresh AAL2 accepted |
| Data export | yes for Settings state | yes for Settings state | export ready/download/sanitization/non-interference |
| Delete confirmation | yes | yes | typed confirmation + password + MFA step-up where applicable |
| Deletion finalization | n/a | n/a | zero Auth/DB/R2 fixture residue + sentinel unchanged |
| Reduced motion | n/a | yes | authenticated Settings geometry remains functional |
| Cleanup | n/a | n/a | exact pre/post absence proof |

## Evidence requirements

At minimum the final artifact should include:

- Settings overview desktop;
- Profile desktop and 390px;
- Preferences desktop and 390px/reduced-motion;
- Session inventory with privacy-safe fixture labels only;
- Password/recovery presentation without entered secrets;
- MFA setup/challenge states without QR/TOTP secret material;
- Data & Privacy desktop and 390px delete-confirmation state before secret entry;
- `manifest.json` with exact production SHA/domain, checks performed, conditional email-change status and cleanup proof.

Screenshots must be human-reviewed before QA-004 is marked complete.

## Defect handling

- Reproduced P0–P3 product defects receive dedicated GitHub issues with reproduction, expected/actual behavior, source SHA, run/artifact evidence and affected surface.
- A product defect does not justify broadening QA-004 into an unrelated redesign/refactor.
- Harness-only failures are corrected in the harness and rerun only after cleanup is independently confirmed.
- Provider/mailbox/rate-limit unavailability at the conditional email-change gate is recorded as a skipped gate, not misclassified as a product defect.

## Documentation outputs

When QA-004 execution completes:

- update `docs/audits/2026-09-17-production-user-audit/REPORT.md`;
- update `PROJECT.md` current audit state;
- update issue #278 QA-004 checkbox/evidence;
- update infrastructure documentation only if a durable execution/resource contract changed;
- do not mark QA-004 complete until exact cleanup and human screenshot review both pass.

## Exit criteria

QA-004 is complete when:

- every non-conditional matrix item passes on the live production custom domain against the independently verified production SHA, or any product failures are captured as dedicated defect issues;
- conditional email change either passes under its explicit mailbox/rate-limit gate or is truthfully recorded as skipped because the gate was not met;
- the destructive deletion fixture ends with zero Auth/database/R2 residue;
- the sentinel account proves non-interference;
- evidence is human-reviewed and secret-safe; and
- the repository/report/#278 tracker match verified reality.

## Next-phase dependency

After QA-004 closes, QA-005 may expand into an execution-ready contract using the then-current production evidence. QA-005 owns bounded provider/reconciliation failure presentation and must not be implemented merely because this contract exists.
