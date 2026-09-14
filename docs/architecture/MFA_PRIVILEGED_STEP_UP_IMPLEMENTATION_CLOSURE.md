# MFA & Privileged Step-Up — Implementation Closure

**Tracker:** #217  
**Implementation PR:** #254  
**Merged implementation:** `4e738695c54549894c00ecf44e9a8a4dc6147331`  
**Closure date:** 2026-09-14  
**Status:** IMPLEMENTED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED

This document records verified closure of the implementation governed by:

- `MFA_PRIVILEGED_STEP_UP_IMPLEMENTATION_CONTRACT.md`;
- `MFA_PRIVILEGED_STEP_UP_CONTRACT_AMENDMENT_1.md`; and
- `MFA_PRIVILEGED_STEP_UP_CONTRACT_AMENDMENT_2.md`.

Where older roadmap/planning text describes #217 as future work, the merged implementation plus those binding amendments and this verified closure record define the current #217 state.

## 1. Shipped repository behavior

RenderLab now implements TOTP MFA and AAL-aware authorization using the current Supabase Auth boundary.

- `/settings/mfa` supports the sole allowed TOTP factor, including QR/manual setup, verification, replacement and ordinary-member disable flows.
- `/settings/mfa/challenge` performs TOTP step-up and returns only to safe same-origin product paths.
- A user who has enrolled MFA is denied ordinary private RenderLab product access while the current session remains AAL1.
- Active Admin access and every `/api/admin/**` operation require a verified live TOTP factor plus current AAL2.
- Admin APIs return the stable `admin_mfa_required` denial for an otherwise eligible Admin who has not satisfied the MFA boundary.
- Sensitive password replacement requires the configured MFA step-up when MFA is enrolled. Direct hosted Auth password mutation at AAL1 was verified rejected by Supabase itself.
- The server authorization boundary does not trust a stale `aal2` JWT claim alone. It combines current Auth assurance with authoritative live verified-factor state so removal of the sole factor immediately removes RenderLab privileged authorization.

## 2. One-factor hosted policy

The initial #217 policy is exactly one TOTP factor per user.

The approved shared Supabase project `rashyleshocuvpgcooxy` was audited with TOTP enrollment and verification enabled and an existing maximum-enrolled-factor value of `10`. Guarded hosted configuration run `34887726477` changed only the maximum enrolled MFA factor setting from `10` to `1`, verified readback, checked the audited out-of-scope Auth settings for drift and produced rollback evidence.

Configured exact-head verification proves direct second-factor enrollment is rejected at both AAL1 and AAL2. RenderLab therefore does not offer a backup-factor UI in this initial implementation.

The one-factor ceiling is a security prerequisite for the implemented bootstrap model. #217 must not be represented as safely deployed if the hosted project is later changed to permit more than one factor without a new threat-model/implementation contract.

## 3. Ordinary-member policy

MFA is optional for an ordinary member, but becomes binding for private RenderLab access once the member enrolls the factor.

A password-only AAL1 sign-in for an enrolled member may reach the MFA challenge/settings recovery surfaces, but cannot use ordinary private product APIs until TOTP verification raises the session to AAL2.

An ordinary member may disable the sole factor only through the protected factor-management flow. The product makes the loss of MFA protection explicit.

## 4. Active Admin policy

MFA is mandatory for active Admin authorization.

An active Admin with no verified factor is directed to enrollment. An active Admin with a verified factor but AAL1 session is directed to challenge. Only a live verified factor plus AAL2 grants `/admin` and Admin API authorization.

Because the one-factor ceiling prevents enrolling a second backup factor, Admin factor replacement intentionally passes through a short authorization gap:

1. perform recent TOTP step-up with the current factor;
2. remove the sole factor;
3. refresh to AAL1/no-factor state;
4. immediately enroll and verify the replacement factor;
5. regain Admin authorization only after the new session reaches AAL2.

Abandoning the flow during that gap leaves Admin access denied; it does not preserve privilege through a stale token.

## 5. Operator-assisted lost-factor recovery

Lost-sole-factor recovery remains an exceptional trusted-operator procedure. Mailbox/password recovery alone is not sufficient ownership proof for factor removal.

The hosted provider was verified to have two important behaviors that the recovery design must account for:

- Admin MFA factor deletion does not make an already-issued access JWT cryptographically expire immediately; and
- Admin MFA factor deletion does not emit the configured user-driven MFA-removal security notification.

Amendment 2 therefore governs the safe recovery sequence:

1. independently prove account ownership through the pre-existing trusted operator channel;
2. re-resolve the exact Supabase user and RenderLab access record;
3. generate an in-runtime high-entropy temporary password;
4. perform an Admin user update that rotates the password and temporarily bans the Auth user;
5. prove the pre-reset bearer is rejected while frozen;
6. list and verify the exact expected sole TOTP factor through the supported Supabase Admin MFA API;
7. delete only that factor through `auth.admin.mfa.deleteFactor`;
8. send the explicit RenderLab operator-reset security notification through the approved security-mail delivery path;
9. remove the temporary ban only after the preceding steps succeed;
10. prove the old bearer remains rejected and the old password no longer authenticates;
11. require ordinary RenderLab password recovery, then TOTP re-enrollment;
12. keep active Admin authorization unavailable until the replacement factor reaches AAL2.

Hosted acceptance run `34891079100` verified the freeze/password-rotation/factor-delete/unfreeze sequence, stale-bearer rejection, old-password rejection, explicit fallback notification and post-reset AAL1/no-factor state. Earlier real-mail run `34888064275` separately verified normal user-driven MFA enrollment/removal notifications through the configured delivery path.

No security questions, home-grown recovery codes or email-only factor bypass are part of #217.

## 6. Verification evidence

The final PR-head candidate was `e51fcaacd67f16576ab9478966507a415a35179a`.

All workflows attached to that exact candidate completed successfully, including:

- MFA Privileged Step-Up `34893772933` — configured TOTP/AAL/one-factor/operator-recovery verification;
- Account/Admin Operations `34893773318` — Admin fixture operates at AAL2 and preserves Admin contract coverage;
- Engineering Quality `34893772627`;
- Release Candidate Matrix `34893772979`;
- Integrated Release `34893772825`;
- Account Identity `34893772842`;
- Account Ownership `34893773263`;
- Generation Admission `34893772857`;
- Video Generation Integration `34893772949`;
- Library History Visual `34893772622` after the signed-media test transport was corrected to avoid a browser-teardown request-context race.

The configured MFA job itself passed build, exact-head application startup and the complete `Verify configured MFA and privileged step-up` step.

PR #254 merged to `main` as `4e738695c54549894c00ecf44e9a8a4dc6147331`.

Post-merge verification found 39 workflow runs attached to that merge SHA:

- 38 completed `success`;
- 0 `failure`;
- 0 queued;
- 0 in progress;
- one initial push-triggered UI Shell run was marked `cancelled` only by workflow concurrency after every substantive job step, including shell visual checks, had already succeeded; the same exact merge SHA also has a separate completed-success UI Shell validation.

The merged implementation is therefore repository-verified.

## 7. Infrastructure and schema boundary

#217 added no RenderLab database migration, no RLS weakening, no R2 contract change, no generation-provider/worker change and no Supabase plan/billing change.

The durable hosted change is limited to the approved Supabase Auth MFA factor ceiling described above. Existing TOTP enrollment/verification and security-notification configuration remain in use.

Service-role access remains server-only. Live factor verification used by server authorization is performed only inside the existing trusted server boundary.

## 8. Production state

The #217 application implementation is **not deployed** by this closure.

Automatic Git → Vercel deployment remains disabled. The production application remains on the previously recorded #215B release until a separate explicit production-rollout operation is authorized and verified.

The hosted `mfa_max_enrolled_factors = 1` prerequisite is already active in the shared Supabase project; that hosted security configuration was independently guarded and verified before application merge.

## 9. Next roadmap position

#217 is complete at repository implementation level and may be closed once this closure record is merged.

The default next account/settings roadmap slice returns to **#216 Session controls and security activity**, unless the owner explicitly reprioritizes another account workstream.

Future work that changes the one-factor ceiling, introduces backup factors/recovery codes/passkeys, productizes operator recovery, changes the recovery ownership-proof model, or weakens the AAL/live-factor boundary requires its own contract rather than silently extending #217.