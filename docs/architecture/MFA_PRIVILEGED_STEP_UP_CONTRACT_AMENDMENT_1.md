# MFA & Privileged Step-Up Contract — Amendment 1

**Tracker:** #217  
**Amends:** `docs/architecture/MFA_PRIVILEGED_STEP_UP_IMPLEMENTATION_CONTRACT.md`  
**Audit date:** 2026-09-14  
**Status:** BINDING CONTRACT AMENDMENT — supersedes conflicting text in the original #217 contract  
**Reason:** Hosted Supabase factor-enrollment behavior discovered during implementation audit

## 1. Why this amendment exists

The original #217 contract assumed RenderLab could allow multiple TOTP factors while requiring an already-enrolled user to complete a recent TOTP step-up before adding another factor.

A fresh provider audit found that this assumption is not enforceable on RenderLab's current Supabase Free architecture:

- Supabase's public MFA enrollment endpoint accepts an ordinary authenticated user session; the endpoint itself does not require AAL2 when a verified factor already exists.
- therefore an attacker who already has a valid password-backed AAL1 session could call Supabase Auth directly, enroll an attacker-controlled second TOTP factor, verify that new factor and obtain AAL2 even if RenderLab's Settings UI correctly refused the operation;
- the Supabase **MFA Verification Attempt** Auth Hook could add a provider-side policy check, but current Supabase documentation makes that hook available only on Team/Enterprise plans;
- no paid-plan or billing change is authorized for #217.

RenderLab must not claim Admin-grade MFA protection while leaving that direct provider path open.

Supabase Auth does, however, enforce its configured maximum number of enrolled MFA factors before creating another factor, and the hosted Management API exposes `mfa_max_enrolled_factors`. Supabase also already requires AAL2 to unenroll a verified factor through the ordinary user MFA API.

Accordingly, #217 changes from a multi-factor-per-user model to an **exactly-one-enrolled-factor ceiling** for the initial TOTP implementation.

## 2. Binding provider configuration

Before #217 can be production-live, the approved hosted Supabase project must be configured and verified with:

- TOTP enrollment enabled;
- TOTP verification enabled;
- `mfa_max_enrolled_factors = 1`.

The factor-cap value is a security control, not a presentation preference. The production rollout must fail closed if configured verification cannot prove the hosted project actually rejects a second enrollment with the provider's `too_many_enrolled_mfa_factors` behavior.

The cap must be applied through a supported hosted Supabase configuration surface or Management API. RenderLab must not patch `auth.mfa_factors` directly and must not add database triggers against the provider-owned Auth schema as a substitute.

No paid Supabase feature or billing change is authorized by this amendment.

## 3. Revised factor policy

### 3.1 One TOTP factor per user

#217 supports **one verified TOTP factor per RenderLab user**.

The previous contract language recommending or supporting a second/backup TOTP factor is superseded. Settings must not offer `Add authenticator` while a verified factor exists, and documentation/copy must not tell users that a backup factor can be enrolled under the #217 policy.

The one-factor ceiling is deliberate security hardening: with one verified factor already occupying the provider enrollment slot, an AAL1 session cannot add an attacker-controlled factor. Because ordinary verified-factor removal already requires AAL2, the enrolled factor remains the proof needed to alter the factor state.

### 3.2 First enrollment

First enrollment remains the bootstrap exception and may start from AAL1 because no second factor exists yet.

After successful TOTP verification:

- the factor becomes the user's sole verified MFA factor;
- the session reaches AAL2;
- ordinary opted-in private access and active Admin access follow the original AAL2 authorization rules.

For an active Admin who has not yet enrolled MFA, `/admin` and every Admin API remain denied until enrollment is completed and the session is AAL2.

### 3.3 Factor replacement

Because a second factor cannot coexist with the first, replacement is a protected two-stage operation:

1. establish a recent TOTP step-up with the currently enrolled factor;
2. explicitly remove that factor through the provider's AAL2-protected unenroll API;
3. immediately refresh the session so the account truthfully returns to AAL1/no-factor state;
4. enroll and verify the replacement TOTP factor;
5. refresh authoritative factor/AAL state.

For an ordinary member this is permitted as an intentional replacement/opt-out path.

For an **active Admin**, RenderLab must not expose a simple remove-and-leave-empty action. Replacement must be presented as a security transition: Admin authorization disappears immediately after the old factor is removed and remains unavailable until the replacement is verified at AAL2. If replacement is abandoned, Admin stays locked out rather than falling back to AAL1 Admin access.

### 3.4 Ordinary-member opt-out

Ordinary-member MFA remains optional. A member may deliberately remove their sole factor after recent TOTP step-up. Once refreshed to no-factor state, the member is again an AAL1-capable optional-MFA account under the original policy.

The UI must make the loss of MFA protection explicit before the final-factor removal.

## 4. Revised lost-factor recovery policy

The original contract's **backup-factor-first** recovery section is superseded because #217 no longer permits a second factor.

If the sole factor is lost, the user cannot self-recover MFA through another TOTP factor or a RenderLab recovery code. RenderLab still does not invent recovery codes and does not treat mailbox access as second-factor proof.

All-factor-loss therefore uses the original **operator-assisted recovery** policy:

1. correlate the request to the exact Supabase user ID and RenderLab account/access record;
2. email/password recovery evidence alone is insufficient to authorize an MFA reset;
3. establish ownership through a pre-existing trusted channel or direct known-owner verification independent of the compromised RenderLab session; otherwise deny the reset;
4. use the supported Supabase Admin MFA API to remove the lost verified factor — never direct SQL deletion;
5. verify the provider revokes/logs out active sessions as documented;
6. require the user to sign in again and enroll a new TOTP factor;
7. active Admin remains denied until the replacement factor is verified and the new session reaches AAL2.

This operator path is exceptional and must be auditable. #216 may later add product-visible security-activity presentation; that does not weaken this recovery proof requirement.

## 5. Sensitive-operation consequences

The original recent-step-up requirement remains binding for:

- sole-factor removal/replacement initiation;
- ordinary password replacement when MFA is enrolled;
- recovery password replacement when MFA is enrolled;
- future email change and account deletion when those capabilities exist.

There is no longer an `additional factor enrollment` operation while a verified factor exists. A second enrollment must fail at the hosted provider boundary because of the factor cap, even if a caller bypasses RenderLab UI.

First-ever enrollment after the account has zero factors remains the bootstrap exception.

## 6. Recovery/password boundary remains unchanged

This amendment does **not** weaken the original recovery rule:

- a RenderLab/Supabase recovery email establishes password-recovery authority only;
- it never counts as MFA evidence;
- if the account still has its verified TOTP factor, password replacement must require recent TOTP step-up;
- recovery must not remove or replace the MFA factor automatically.

Configured verification must continue to prove that the supported RenderLab recovery flow cannot replace the password at recovery-marker-only/AAL1 state when a factor remains enrolled.

If provider-direct password mutation from a recovery session is discovered to bypass this requirement, #217 must stop again at that boundary, document the provider behavior and either add a provider-enforceable control or remain incomplete. UI-only protection is not sufficient for a claim that MFA survives mailbox compromise.

## 7. Revised UI requirements

Settings MFA management must truthfully represent the one-factor policy:

- no factor: `Set up authenticator`;
- verified factor + AAL1: challenge/verify before protected access or mutation;
- verified factor + AAL2: show the single factor and protected `Replace` / ordinary-member `Disable MFA` actions as applicable;
- active Admin: MFA required, and a replacement transition must never restore Admin until the new factor is verified.

Remove copy and controls that advertise a second or backup authenticator.

The QR/manual secret remains transient enrollment material and must never be logged, stored in RenderLab tables, committed, or included in CI artifacts.

## 8. Revised configured verification requirements

The owned #217 hosted MFA fixture must now prove at minimum:

1. fixture starts at AAL1 with zero factors;
2. first TOTP enrollment and verification succeeds and produces AAL2;
3. hosted project configuration reports/behaves as a one-factor enrollment ceiling;
4. from a fresh AAL1 session **with the verified factor still present**, direct Supabase enrollment of a second TOTP factor fails with the provider's factor-limit behavior;
5. the same second-enrollment attempt is also unavailable through RenderLab UI;
6. direct ordinary user unenroll of the verified factor fails at AAL1 and succeeds only at AAL2;
7. opted-in ordinary private product authorization denies AAL1 and accepts AAL2;
8. active Admin authorization denies AAL1 and accepts AAL2;
9. every Admin API returns the stable MFA-required denial at AAL1;
10. active Admin loses Admin authorization immediately during a factor-replacement gap and regains it only after replacement verification reaches AAL2;
11. recovery password replacement with the factor still enrolled is denied at recovery-marker-only/AAL1 state and allowed after recent TOTP step-up;
12. Admin API factor deletion used for operator recovery revokes/logs out active sessions as documented;
13. factor enrollment/removal security-notification behavior is verified or, for an Admin API reset where the provider does not emit one, the approved equivalent notification path is verified;
14. all fixture Auth users, factors, sessions and RenderLab access rows are cleaned up;
15. no TOTP secret, code, password, token, service-role key or recovery token appears in logs/artifacts.

A test that only verifies the RenderLab UI restriction does **not** satisfy item 4.

## 9. Rollout gate

#217 must not be merged as complete or deployed while the shared hosted project still permits more than one enrolled MFA factor.

The required order is:

1. merge this amendment;
2. reconcile implementation to the one-factor policy;
3. add configured verification that probes the direct provider enrollment path;
4. apply the hosted one-factor cap through an approved supported configuration surface;
5. verify the cap with the owned fixture;
6. complete remaining exact-head and merged-main checks;
7. update roadmap/project documentation to the verified state;
8. stop before production deployment unless deployment is separately authorized.

Application code rollback must never bulk-delete enrolled provider factors. Once users can enroll, factor state is durable security state exactly as described by the original contract.

## 10. Superseded original-contract text

Where this amendment conflicts with the original #217 contract, this amendment wins. In particular it supersedes:

- section 2.2 language that treats multiple-factor support as a RenderLab capability rather than only a provider capability;
- section 3.3's recommendation for a second independent Admin factor;
- section 3.5's `additional factor enrollment` operation;
- section 4.4 `Additional/backup factor enrollment`;
- section 4.5 instructions to enroll a replacement/backup before an active Admin removes the last factor;
- section 5.2 `Backup factor first`;
- verification requirements that assume two RenderLab-enrolled factors can coexist.

All other original-contract requirements remain binding unless explicitly superseded here.
