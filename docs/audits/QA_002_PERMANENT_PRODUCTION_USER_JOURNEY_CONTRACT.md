# QA-002 Permanent Production User Journey Contract

**Status:** IMPLEMENTATION READY / PRODUCTION RUN NOT YET PERFORMED  
**Tracker:** #278  
**Planning baseline:** repository `main` `023d21637fd59e4da8f664ea047c7d04a5102fc8`  
**Current production application source:** `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`  
**Existing permanent workflow:** `.github/workflows/production-complete-user-journey.yml`  
**Purpose:** finish the existing permanent production journey so it satisfies #278 with exact source/domain evidence, read-only account-surface coverage, and independently verified fixture cleanup.

## Goal and user value

Keep one durable, reviewed production acceptance path that behaves like a real isolated member without touching real-user data: public access states, real Create work, Activity terminalization, durable Library/Viewer results, and the ordinary read-only Settings/Profile/Preferences/Sessions surfaces.

QA-002 institutionalizes the already-proven production journey. It is not a new product feature, redesign, provider-routing change, or account-security mutation suite.

## Verified starting state

- The permanent workflow and verifier already exist:
  - `.github/workflows/production-complete-user-journey.yml`
  - `scripts/verify-production-complete-user-journey.mjs`
- The current verifier creates one configured member fixture and already performs four bounded real production creative paths:
  1. desktop Image;
  2. mobile Edit continuation;
  3. desktop Animate continuation;
  4. mobile standalone Video.
- Each path observes Activity to `succeeded`, opens the durable Viewer result, checks desktop and 390px Viewer geometry, and deletes the configured fixture in `finally`.
- Historical production proof run `35292334383` established those four creative paths on the then-current fixed source, but QA-002 requires the permanent workflow to carry the exact production-source/domain manifest and the additional read-only account-surface scope.
- `deleteConfiguredTestAccount` deletes run-owned media upload sessions, media assets, generation jobs/sources, admission reservations, account access, profile row, Auth identity and discovered owner R2 objects, then verifies the contracted DB/Auth residue boundary.
- QA-001 is complete, so the exact current production SHA can be independently confirmed against the four current-production repository authorities before QA-002 dispatch.

## In scope

1. **Permanent workflow hardening**
   - Evolve the existing permanent workflow in place; do not create a competing production-journey workflow.
   - Remain `workflow_dispatch` only with `cancel-in-progress: false`.
   - Require exact `expected_production_sha`.
   - Require explicit acknowledgement that the run will dispatch only the four contracted run-owned provider-backed generations.
   - Fail closed for malformed SHA or missing acknowledgement.

2. **Public / signed-out coverage**
   - Root Landing at desktop and 390px/reduced motion.
   - Signed-out Create, Library, Activity and Settings access/gating states.
   - No horizontal overflow at 390px and visible keyboard focus on at least one primary public/auth entry control.

3. **Authenticated creative journey**
   - Preserve the existing four real production operations: Image, Edit, Animate and standalone Video.
   - All work belongs to the exact run-owned configured account.
   - Observe each accepted job through Activity to a truthful terminal `succeeded` state.
   - Open durable Viewer media and verify image/video rendering, native video controls where applicable, desktop and 390px geometry.
   - Verify Library exposes the run-owned durable results.
   - Do not add Retry/Run Again/Cancel; QA-003 owns those actions.

4. **Read-only account surfaces**
   - Visit ordinary authenticated `/settings`, `/settings/profile`, and `/settings/preferences` on the same run-owned account.
   - Capture the privacy-safe session inventory/register as presented inside Settings.
   - Verify desktop and 390px containment/readability across the account surfaces.
   - Do not save profile data, upload avatar, save/reset preferences, revoke sessions, change password/email, enroll MFA, export data, or delete the account. Those state transitions belong to QA-004.

5. **Manifest / provenance**
   - Artifact root contains `manifest.json` with:
     - audit `QA-002`;
     - GitHub run ID/attempt;
     - `https://renderlab.faresuniform.uk`;
     - exact expected production source;
     - explicit provider-work acknowledgement;
     - run-owned fixture identifier;
     - accepted generation job IDs and durable result asset IDs;
     - covered read-only routes;
     - cleanup result;
     - screenshot file list;
     - completion timestamp.
   - No password, access/refresh token, service credential, provider identifier, private signed URL, or real-user content may enter the manifest or screenshots.

6. **Independent cleanup proof**
   - Before execution, remove any deterministic stale fixture for the namespace.
   - Track every run-owned R2 object key discoverable from the configured fixture before cleanup.
   - After ordinary configured-account cleanup, independently prove:
     - Auth fixture absence;
     - zero owner rows in admission reservations, jobs, sources, upload sessions, assets, profile, preferences, lifecycle/export state where applicable;
     - zero account-access row;
     - every tracked R2 object is absent.
   - Cleanup runs unconditionally after success or assertion failure. Cleanup failure fails the audit.

7. **Evidence review**
   - Evidence must cover public/signed-out, four creative paths, Library/Viewer, Settings/Profile/Preferences/Sessions, desktop, 390px, visible focus and reduced-motion state.
   - Human screenshot review is required before QA-002 is marked complete.

## Explicitly out of scope

- Real-user accounts, media, history, credentials or sessions.
- Account deletion or deletion-finalizer acceleration.
- Profile/avatar mutation.
- Preferences save/reset.
- Session revocation or global sign-out.
- Password/recovery submission.
- MFA enrollment/challenge.
- Sign-in email change.
- Data export.
- Admin/AAL2 coverage or global Admin mutation.
- Retry, Run Again or Cancel.
- Failure/reconciliation injection; QA-005 owns that scope.
- Worker/provider reset, redeploy, token rotation or routing changes.
- Supabase schema/Auth-policy changes, R2 resource changes, Vercel deployment/alias/environment changes.
- UI redesign.

## Provider-work budget

Exactly four ordinary run-owned generations are authorized by a successful QA-002 dispatch: Image, Edit, Animate and standalone Video. The workflow must not retry provider-backed generations automatically after a product-level terminal failure. A rerun requires a separate explicit dispatch/acknowledgement after cleanup state is known.

## Workflow and execution contract

The permanent workflow remains:

`.github/workflows/production-complete-user-journey.yml`

Required dispatch inputs:

- `expected_production_sha`
- `confirm_bounded_fixture_provider_work`

The workflow must:

- be `workflow_dispatch` only;
- use `contents: read`;
- target only `https://renderlab.faresuniform.uk`;
- keep `cancel-in-progress: false`;
- validate shared Supabase/R2 secrets before fixture work;
- syntax/unit-check the verifier before production fixture setup;
- pre-clean the deterministic fixture;
- run the journey;
- run cleanup again with `if: always()`;
- upload the single evidence root with `if: always()`.

The expected production SHA is an operator-supplied release fact. The workflow records it and fails malformed input; it does not infer production source from repository `main`.

## Validation matrix

| Surface | Desktop | 390px | Functional proof |
| --- | --- | --- | --- |
| Landing/public entry | yes | yes + reduced motion | route renders, focus visible, no overflow |
| Signed-out Create/Library/Activity/Settings | representative | yes | truthful auth gating |
| Image Create | yes | Viewer both | accepted → Activity succeeded → durable Viewer |
| Edit continuation | submit 390px | Viewer both | source continuation → succeeded |
| Animate continuation | yes | Viewer both | source continuation → durable video |
| Standalone Video | submit 390px | Viewer both | accepted → durable video/native controls |
| Library | yes | yes | run-owned durable results visible |
| Settings | yes | yes | ordinary account state + session register, read-only |
| Profile | yes | yes | fresh fixture state, read-only |
| Preferences | yes | yes | fresh fixture/default state, read-only |
| Cleanup | n/a | n/a | zero contracted DB/Auth residue + tracked R2 absence |
| Manifest | n/a | n/a | exact SHA/domain/provider acknowledgement/job+asset IDs/routes/cleanup |

## Defect handling

- A reproduced P0–P3 product defect receives its own issue with exact production SHA, run/artifact evidence, expected/actual behavior and bounded reproduction.
- A provider terminal failure is recorded as observed production behavior and does not trigger an automatic provider-backed retry.
- Harness defects are fixed without product redesign; rerun only after exact fixture cleanup is confirmed.
- Cleanup failure is an audit failure even if UI assertions passed.

## Documentation outputs

When implementation is ready:

- update this contract status;
- update `PROJECT.md` and the production-audit report;
- update Infrastructure only for durable audit execution/cleanup conventions;
- update #278 with implementation evidence.

When the production run passes and screenshots are human-reviewed:

- record the exact run/artifact/digest and cleanup result;
- mark QA-002 complete in #278;
- leave production application source unchanged unless a separate deployment was explicitly authorized.

## Exit criteria

QA-002 is complete when:

- this contract is merged before implementation;
- the existing permanent workflow/verifier are hardened in place;
- exact implementation-head and merged-main Engineering Quality pass;
- a manual production run passes against independently verified source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`;
- the manifest proves source/domain/provider-work boundary and exact cleanup;
- screenshots are human-reviewed; and
- #278 plus repository audit docs match verified reality.

## Next-phase dependency

QA-002 completion does not unblock QA-005. QA-005 remains dependent on QA-004 production evidence under the current #278 ordering. QA-004 itself remains execution-ready but awaiting its explicit manual production dispatch.
