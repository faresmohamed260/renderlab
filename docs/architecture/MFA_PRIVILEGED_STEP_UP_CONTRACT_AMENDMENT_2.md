# MFA & Privileged Step-Up Contract — Amendment 2

**Tracker:** #217  
**Amends:** `docs/architecture/MFA_PRIVILEGED_STEP_UP_IMPLEMENTATION_CONTRACT.md` and `docs/architecture/MFA_PRIVILEGED_STEP_UP_CONTRACT_AMENDMENT_1.md`  
**Audit date:** 2026-09-14  
**Status:** BINDING CONTRACT AMENDMENT — supersedes conflicting operator-recovery text in the original #217 contract and Amendment 1  
**Reason:** Hosted Supabase operator-reset/session behavior discovered and verified during #217 implementation

## 1. Why this amendment exists

Amendment 1 correctly changed #217 to one TOTP factor per user and retained operator-assisted recovery for a user who loses that sole factor. It also assumed the supported Supabase Admin MFA factor-deletion operation would itself revoke/log out every active session strongly enough that a previously issued AAL2 bearer could no longer mutate Auth state.

The hosted project disproved that assumption.

A run-owned #217 fixture established the following provider behavior:

- `auth.admin.mfa.deleteFactor({ userId, id })` successfully removes the verified factor;
- immediately after that deletion, RenderLab's live-factor authorization correctly denies the old AAL2 bearer because the user no longer has a verified factor;
- however, the same still-unexpired pre-reset AAL2 bearer remained accepted by the direct Supabase Auth user-update endpoint and could replace the password after the factor had been deleted;
- Admin MFA factor deletion also did **not** emit the configured hosted MFA-removal security notification.

Therefore Admin factor deletion by itself is not a sufficient lost-factor recovery boundary for RenderLab. #217 must not rely on UI behavior, stale JWT claims or the provider's factor-deletion wording to claim the old session is harmless.

Current Supabase Auth behavior provides a supported safe recovery sequence instead:

- a banned user is rejected live by authenticated Supabase Auth requests, including a bearer issued before the ban;
- an Admin password update performed without an acting user session removes the user's Auth sessions;
- after those sessions are removed, the old bearer remains rejected after the temporary ban is lifted;
- the Admin MFA API can then remove the lost sole factor while the account is frozen;
- because Admin factor deletion does not emit the hosted removal notification, RenderLab must send the equivalent notification explicitly.

Hosted acceptance run `34891079100` verified this complete sequence on 2026-09-14. The run proved a 403 from the stale AAL2 bearer while frozen and again after unfreeze, rejection of the original password, successful Admin factor deletion, delivery of the explicit RenderLab operator-reset security notification, AAL1/no-factor post-reset state and fixture cleanup. Earlier real-mail run `34888064275` separately proved ordinary MFA enrollment/removal notification delivery through the configured hosted path.

## 2. Binding operator-assisted recovery sequence

All-factor-loss recovery remains exceptional and still requires the independent ownership proof defined by the original contract and Amendment 1. Email/password recovery evidence alone is not sufficient to authorize an MFA reset.

After independent ownership proof succeeds, the operator must perform the following sequence against the exact intended Supabase user ID:

1. re-resolve the exact Supabase user and RenderLab account/access record immediately before mutation;
2. generate a high-entropy temporary password inside the trusted operator runtime;
3. in one supported Supabase Admin user update, set that temporary password and a temporary account ban;
4. verify a pre-reset bearer can no longer perform an authenticated Supabase Auth mutation while the ban is active;
5. list the user's MFA factors through the supported Supabase Admin MFA API and verify the exact expected sole verified TOTP factor before deleting anything;
6. delete that factor through `auth.admin.mfa.deleteFactor` — never through direct SQL or mutation of provider-owned Auth tables;
7. send the equivalent mandatory RenderLab security notification through the already-approved security-mail delivery path, because the Admin factor-deletion API does not emit the configured removal notification;
8. only after the factor deletion and security-notification step succeed, remove the temporary ban;
9. verify the pre-reset bearer is still rejected after unfreeze and verify the user's original password no longer authenticates;
10. require the user to establish a new password through RenderLab's normal supported recovery flow and then enroll a new TOTP authenticator;
11. active Admin authorization remains unavailable until the replacement factor is verified and the new session reaches AAL2.

The operator must fail closed at any step. A partial reset must never be treated as a completed recovery.

## 3. Temporary credential handling

The temporary operator-generated password exists only to invalidate the old credential and cause the provider to remove the user's prior Auth sessions before the lost factor is deleted.

It is **not** a recovery credential to give to the user.

The temporary password must:

- be generated with cryptographically secure randomness;
- satisfy the current hosted password policy;
- never be logged, committed, persisted in RenderLab tables, stored in CI artifacts or copied into issue/PR text;
- never be sent to the user by email, chat or another support channel;
- be discarded by the operator runtime after the reset operation.

The user regains a user-known credential only through the existing RenderLab password-recovery flow after the operator reset is complete.

## 4. Temporary ban handling

The recovery ban is a short-lived security freeze, not a suspension/account-access product state.

It must be applied through the supported Supabase Admin Auth API and must not modify RenderLab's `renderlab_account_access.status` merely to simulate the freeze.

The ban exists to make the already-issued bearer fail immediately while the operator rotates the password and removes the factor. The operator must not remove the ban until:

- the password rotation succeeded;
- the old bearer was observed rejected while frozen;
- the exact intended factor was deleted; and
- the explicit operator-reset security notification was accepted by the approved delivery path.

If the procedure fails after the ban is applied, recovery remains fail-closed and the operator must resolve the failed step before unfreezing the account.

## 5. RenderLab authorization remains live-factor aware

The safe operator workflow does not replace RenderLab's application-side authorization hardening.

For privileged authorization, RenderLab must continue to combine fresh Auth identity/AAL state with authoritative live verified-factor state instead of trusting a stale `aal2` JWT claim by itself.

This is defense in depth and is also required for the replacement gap: after the sole factor disappears, a stale token that still contains `aal2` must not retain Admin authorization.

The live-factor lookup must fail closed if the supported provider query fails or exposes an impossible state under the one-factor contract.

## 6. Security notification contract

Ordinary user-driven TOTP enrollment/removal continues to rely on the already-configured hosted RenderLab security notifications and remains covered by the prior real-mail acceptance evidence.

Operator-assisted factor deletion is different: the hosted provider was verified not to emit the configured MFA-removal message for `auth.admin.mfa.deleteFactor`.

Accordingly, the operator-assisted recovery procedure must explicitly send an equivalent RenderLab security notification before the account is unfrozen. The notification must:

- use the existing verified RenderLab security-mail sender/delivery posture rather than introduce a new SMTP provider;
- tell the user that an operator reset their authenticator after an account-recovery request;
- state that previous sessions and the old password were invalidated;
- instruct the user to use RenderLab password recovery and then enroll a new authenticator;
- tell the user what to do if they did not request the recovery;
- contain no Supabase internal URL, Auth user ID, token, password, TOTP secret/code or other internal credential material;
- retain the existing no-open-tracking/no-click-tracking posture.

Real-delivery verification must cover this explicit fallback notification before #217 can close.

## 7. Password-recovery boundary after operator reset

This amendment does not turn email recovery into MFA proof.

Before operator authorization, mailbox access remains insufficient to remove or replace an enrolled factor. The independent operator ownership proof is what authorizes the exceptional factor reset.

Only after the safe operator reset has:

- invalidated the old password and sessions;
- removed the lost factor through the Admin MFA API;
- emitted the explicit security notification; and
- removed the temporary ban,

may the user use the existing password-recovery flow to establish a new password.

For an active Admin, password recovery alone does not restore Admin access. A new TOTP factor must be enrolled and verified and the new session must reach AAL2 before Admin authorization returns.

## 8. Revised verification requirements

Amendment 1 verification item 12 is superseded. Configured #217 verification must prove the actual safe behavior rather than assume factor deletion alone revokes an already-issued JWT.

The combined #217 acceptance evidence must prove at minimum:

1. the one-factor hosted ceiling and direct second-enrollment rejection required by Amendment 1;
2. Admin AAL1 denial and AAL2 authorization;
3. stale AAL2 Admin authorization is denied immediately when authoritative live factor state shows no verified factor;
4. Admin factor deletion alone is **not** treated as sufficient session invalidation;
5. the operator recovery freeze rejects the pre-reset bearer before factor deletion;
6. the Admin password rotation invalidates the previous password and removes the old Auth-session authority;
7. only the exact listed sole verified TOTP factor is deleted through the supported Admin MFA API;
8. the explicit equivalent operator-reset security message reaches the approved real delivery path with RenderLab branding/privacy/tracking checks intact;
9. after unfreeze, the same pre-reset bearer remains rejected;
10. the previous password remains rejected;
11. the account is at AAL1 with zero factors after reset, before user recovery/re-enrollment;
12. an active Admin remains denied until a replacement TOTP factor is verified and the new session reaches AAL2;
13. all fixture users, factors, sessions and RenderLab access rows are cleaned up;
14. no password, token, TOTP secret/code, service-role key or recovery token appears in logs or artifacts.

Hosted acceptance run `34891079100` is the provider-level evidence for items 5–11 and the explicit notification fallback. The implementation branch must still run its owned exact-head fixture against the reconciled contract before merge.

## 9. Operational boundary

#217 does not authorize a public or ordinary-user endpoint that performs operator recovery.

The exceptional reset remains a trusted operator procedure. Any automation used to execute it must keep user identifiers and credentials out of public workflow inputs/logs and must run only inside an already-approved privileged environment with the required Supabase/Resend secrets.

A future productized support/admin recovery tool would require its own authorization, audit, privacy and abuse-prevention contract.

## 10. Superseded text

Where this amendment conflicts with earlier #217 documents, this amendment wins.

It specifically supersedes:

- Amendment 1 section 4 step 5, which required verifying that Admin factor deletion itself revoked/logged out active sessions;
- Amendment 1 verification item 12, which assumed Admin factor deletion alone provided sufficient session invalidation;
- any original-contract wording that treats `auth.admin.mfa.deleteFactor` as enough to make an already-issued bearer unusable;
- any interpretation that provider Admin factor deletion automatically emits the configured MFA-removal notification.

All independent ownership-proof requirements, the one-factor ceiling, AAL2 Admin enforcement, recent TOTP requirements for ordinary sensitive operations and all other non-conflicting #217 requirements remain binding.
