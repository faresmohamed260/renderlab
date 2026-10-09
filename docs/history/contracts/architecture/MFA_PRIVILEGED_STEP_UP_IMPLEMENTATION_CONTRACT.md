# MFA & Privileged Step-Up Implementation Contract

**Tracker:** #217  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `f9e1ff2ad2083c1dfa4e986a48663d6fdf7675f8`  
**Audit date:** 2026-09-14  
**Status:** CONTRACT — IMPLEMENTATION NOT YET COMPLETE  
**Scope:** TOTP MFA enrollment/challenge/management, assurance-aware authorization, privileged Admin AAL2 enforcement, sensitive-operation step-up, lost-factor recovery policy, security-notification verification, and configured verification fixtures  
**Out of scope:** SMS MFA, passkeys/WebAuthn, recovery codes, session-management/security-activity product work owned by #216, email-change/account-deletion feature implementation, unrelated Settings redesign, paid-plan changes, production deployment

## 1. Purpose

Workstream #217 adds real multi-factor assurance to RenderLab. The feature is not complete merely because Settings can display a QR code: the server authorization layer must enforce the stronger assurance level where RenderLab relies on it.

This contract freezes the MFA policy before implementation. In particular, it defines how password recovery interacts with enrolled factors and how a user who has lost every factor may recover. Implementation must not invent a weaker recovery path later to solve a lockout.

The repository remains authoritative. If hosted Supabase behavior observed during implementation conflicts with this contract's verified provider assumptions, implementation must stop at that boundary, re-audit current provider behavior, and amend this contract before changing the security model.

## 2. Verified current baseline

### 2.1 Repository application behavior

At the planning baseline:

- `getFreshCurrentRenderLabIdentity()` uses fresh Supabase `auth.getUser()` verification for privileged server authorization.
- `getCurrentRenderLabAdmin()` then checks the RenderLab-owned access record and currently requires only `status = active` plus `role = admin`; it does **not** require AAL2.
- `/admin` and the current Admin APIs use that shared Admin boundary, so the missing AAL requirement is centralized and fixable without trusting browser role metadata.
- the signed-out Settings flow signs in with email/password and refreshes the page; there is no MFA challenge step.
- ordinary password change re-verifies the current password in the browser before `auth.updateUser({ password })`.
- recovery confirmation establishes a verified Supabase recovery session and a short-lived signed RenderLab recovery marker; that marker allows password replacement without current-password proof.
- the recovery marker proves only the approved recovery flow. It is **not** MFA evidence and must never be treated as AAL2.
- Settings is intentionally available to a signed-in suspended user for security/recovery/sign-out operations.

### 2.2 Hosted Supabase state

Read-only audit of the approved shared Supabase project `rashyleshocuvpgcooxy` established:

- `auth.mfa_factors` exists with factor type, status, friendly-name and challenge metadata;
- `auth.sessions` records `aal` and factor/session state;
- there are currently **zero enrolled MFA factors** in the shared project;
- the nine currently recorded sessions are all `aal1`;
- therefore no existing user has to be migrated from an already-enrolled RenderLab MFA policy, but current Admin use is also not second-factor protected.

Current Supabase documentation establishes:

- TOTP authenticator-app MFA is supported on the current platform and does not require a paid RenderLab plan change;
- enrollment uses `auth.mfa.enroll({ factorType: "totp" })`, followed by challenge and verification;
- the enrollment response provides both a QR representation and manual secret;
- verified sessions expose `aal1` / `aal2` plus authentication-method timestamps;
- `auth.mfa.getAuthenticatorAssuranceLevel()` and `auth.mfa.listFactors()` are supported for assurance/factor discovery;
- multiple factors are supported (provider upper limit currently 10);
- **recovery codes are not supported** by Supabase Auth;
- a verified factor can be removed only after reaching AAL2 through the ordinary user API;
- provider Admin MFA APIs can list and delete a user's factor; deleting a verified factor logs the user out of active sessions;
- the recommended recovery mechanism when possible is another enrolled factor.

These provider facts are implementation dependencies and must be exercised by an owned configured fixture before #217 is considered complete.

## 3. Binding product and security decisions

### 3.1 Supported factor type

RenderLab will support **TOTP authenticator-app MFA only** in #217.

SMS is not a fallback factor. Passkeys/WebAuthn are not introduced by this workstream. RenderLab will not fabricate application-owned recovery codes because the current provider does not provide a recovery-code lifecycle.

### 3.2 Ordinary-member policy

MFA is **optional for ordinary members**.

Once an ordinary member has at least one verified TOTP factor, opting in becomes security-significant: private RenderLab product access requires an AAL2 session until the member deliberately removes their last factor through the authenticated factor-management flow.

A user with a verified factor must not be allowed to keep using Create, Library, Activity or equivalent authenticated product APIs indefinitely at AAL1 merely because MFA is described as optional. Optional means the member chooses whether to enroll; it does not mean enrolled MFA can be silently ignored.

Public pages and the minimum Settings/challenge/recovery surfaces required to complete authentication remain reachable at AAL1.

### 3.3 Admin policy

Active RenderLab Admin access is **mandatory MFA**.

A user is authorized for Admin only when all of the following are freshly established server-side:

1. the Supabase identity is valid;
2. the RenderLab-owned access record is `active` and `admin`;
3. at least one verified MFA factor is enrolled; and
4. the current session is `aal2`.

An active Admin at AAL1 may be directed to enroll or challenge MFA, but `/admin` content and every Admin API operation must remain unavailable until AAL2 is reached. Browser UI state, `user_metadata`, friendly factor labels and client-provided role claims are never authorization evidence.

A second independent TOTP factor is strongly recommended for Admins because recovery codes are unavailable, but #217 does not pretend it can verify that two factors live on physically independent devices. One verified factor plus AAL2 is therefore the enforceable Admin minimum.

### 3.4 Assurance versus recent step-up

Two related authorization concepts are required:

- **AAL2 session assurance** — sufficient for ordinary opted-in private product access and for continuing Admin access/operations.
- **recent MFA step-up** — required for security-sensitive identity mutations.

For #217, a recent step-up means a verified `totp` authentication method in the current session within the previous **10 minutes**. The implementation must derive this from provider-authenticated session/JWT assurance data; it must not trust a browser timestamp.

If the session is already AAL2 but its most recent TOTP method is older than 10 minutes, a sensitive operation must challenge a verified factor again before mutation.

### 3.5 Sensitive operations

The following #217 operations require recent MFA step-up whenever the account already has a verified factor:

- enrolling an additional/replacement factor;
- removing a verified factor;
- ordinary password replacement;
- password replacement reached through email recovery.

The first-ever factor enrollment is the bootstrap exception: no existing second factor is available to prove, so it may begin at AAL1 and becomes trusted only after challenge + verification promotes the session to AAL2.

Future email change and account deletion must use the same recent-step-up primitive when those product capabilities are implemented. #217 establishes the reusable authorization contract but does not add those unrelated product features.

### 3.6 Factor labels

Factor friendly names are presentation metadata only. RenderLab may let the user choose a concise label such as `Phone authenticator` or `Backup authenticator`, but labels do not alter authorization and are never treated as device identity.

QR payloads and TOTP secrets are shown only during enrollment. They must not be logged, persisted in RenderLab tables, analytics, error reporting, screenshots/artifacts or repository fixtures.

## 4. Authentication and factor-management flows

### 4.1 Password sign-in

After successful password sign-in, the client checks the current and next authenticator assurance levels.

- If `currentLevel = aal2`, ordinary navigation may continue.
- If `currentLevel = aal1` and `nextLevel = aal2`, the user is routed to the MFA challenge flow before private product access.
- If an active Admin has no verified factor, Settings must clearly require enrollment before Admin can open.

A safe internal `next` destination may be carried through challenge. Arbitrary external redirects are forbidden.

### 4.2 First-factor enrollment

Settings exposes a dedicated MFA management surface.

First enrollment:

1. starts a TOTP enrollment request in the authenticated browser session;
2. displays the provider-returned QR representation plus manual secret;
3. asks the user for a current authenticator code;
4. creates/verifies the challenge;
5. treats the factor as enrolled only after provider verification succeeds;
6. refreshes server-rendered Settings state from authoritative factor/AAL data.

An abandoned or failed unverified enrollment must be cleaned up when practical and must never count as an enrolled security factor.

### 4.3 Challenge

The challenge surface lists only the user's **verified TOTP** factors. The user selects a factor and submits its current code. Successful provider verification must produce/refresh an AAL2 session.

Unverified factors are not accepted for sign-in challenge. Phone factors, should one appear in provider state unexpectedly, are not accepted by the #217 RenderLab UI or authorization policy.

### 4.4 Additional/backup factor enrollment

If at least one verified factor already exists, adding another factor is a sensitive MFA mutation and requires a recent TOTP step-up first.

The new factor must itself be challenge-verified before it becomes usable. The existing factor remains active unless the user later removes it.

### 4.5 Factor removal

Factor removal requires recent TOTP step-up and the provider's AAL2 requirement.

For an ordinary member, removing the last verified factor is allowed as an intentional opt-out after the explicit protected removal flow. The session is refreshed afterward so stale AAL2 state is not presented as current MFA protection.

For an active Admin, RenderLab must reject removal of the **last** verified TOTP factor while the account remains an active Admin. The user must either enroll a replacement/backup first or have Admin access deliberately changed outside the factor-removal action.

Successful enrollment/removal must surface a clear success state and rely on the configured security-notification channel described below.

## 5. Password recovery and lost-factor policy

### 5.1 Recovery email does not satisfy MFA

The existing recovery email can continue to establish a valid password-recovery session and the short-lived RenderLab recovery marker. That proves control of the recovery flow only.

If the account has a verified factor, password replacement reached through recovery must additionally reach recent TOTP step-up before `auth.updateUser({ password })` is allowed. The signed recovery marker must never bypass this requirement.

Therefore mailbox compromise alone cannot replace the password of an MFA-enrolled account and silently downgrade or remove its MFA protection.

### 5.2 Backup factor first

When a user loses their primary authenticator but still has another verified TOTP factor, the backup factor is the recovery path:

1. sign in or use password recovery as needed;
2. challenge the surviving verified factor;
3. reach recent AAL2;
4. enroll a replacement if desired;
5. remove the lost factor.

No operator intervention is needed in this case.

### 5.3 All factors lost — operator-assisted recovery

If every verified factor is inaccessible, RenderLab does **not** offer an automated bypass, security questions, email-only MFA disable button or home-grown recovery code.

Operator-assisted recovery is an exceptional manual policy:

1. the request must be correlated to the exact Supabase user ID and RenderLab account/access record;
2. mailbox control or a password-recovery link alone is insufficient proof for an MFA reset;
3. the operator must establish account ownership through a pre-existing trusted channel or direct known-owner verification independent of the compromised RenderLab session; if that stronger verification is not available, the reset is denied;
4. after approval, the operator uses the supported Supabase Admin MFA API to list and delete only the affected verified factors — never direct SQL deletion from `auth.mfa_factors`;
5. verified-factor deletion must revoke/log out active sessions as the provider contract specifies;
6. the user signs in again and re-enrolls TOTP from Settings;
7. an active Admin remains denied from `/admin` until a new verified factor exists and the new session reaches AAL2.

For an ordinary optional-MFA member, an approved operator reset is an explicit MFA reset, not a silent email-recovery bypass. The member may re-enroll immediately and should be instructed to do so. The operator reset itself must remain rare and auditable; #216 may later give this product-visible security-activity presentation.

## 6. Server authorization contract

### 6.1 Shared assurance helper

Implementation will add a server-owned assurance helper that derives, for the current freshly verified request/session:

- current AAL;
- next attainable AAL;
- verified TOTP factor presence/count as needed;
- authenticated methods sufficient to determine the last TOTP verification time;
- whether recent step-up is satisfied.

Bearer-token API requests and cookie-backed SSR requests must be evaluated against the token/session actually authorizing that request. The helper must fail closed when assurance cannot be verified.

### 6.2 Ordinary private account boundary

`getCurrentRenderLabAccount()` or its replacement authorization primitive must enforce the opted-in rule:

- no verified TOTP factor: existing AAL1/AAL2 authenticated admission behavior remains available;
- verified TOTP factor + AAL2: private product access allowed subject to existing RenderLab admission/status rules;
- verified TOTP factor + AAL1: private product access denied and the user is directed to MFA challenge rather than treated as signed out where the UI can express that distinction.

Settings, challenge and recovery routes are deliberate exceptions required to complete authentication or account recovery.

### 6.3 Admin boundary

`getCurrentRenderLabAdmin()` becomes AAL2-aware and remains the single shared gate for Admin page/API authorization. It must never return an authorized Admin at AAL1.

Server-rendered Admin navigation may distinguish an already-authenticated active Admin who needs MFA from a non-Admin so it can route the former to enrollment/challenge. Admin APIs must return a stable structured denial code for an MFA-required state while preserving the generic active-Admin denial for callers that are not eligible Admins.

Every existing Admin endpoint must continue to use the shared gate; no route may implement a weaker parallel role check.

### 6.4 Sensitive-operation guard

A reusable server/client contract must expose whether recent TOTP step-up is required/satisfied before a sensitive identity mutation. Browser code may control presentation, but mutation authority must still be derived from provider-authenticated assurance at the mutation boundary where RenderLab owns that boundary.

Where the mutation is necessarily performed through the browser Supabase client, the flow must immediately obtain authoritative AAL/method state before mutation and configured end-to-end verification must prove that stale/AAL1 paths cannot perform the protected mutation.

## 7. Data, schema, RLS and provider configuration

#217 does **not** require a new RenderLab application table solely to mirror Supabase MFA factor state. Supabase Auth remains authoritative for factors and session assurance.

No direct database writes to `auth.mfa_factors` are allowed.

No product RLS rewrite is planned as part of the contract because the current RenderLab private/admin architecture authorizes through server boundaries and server-owned data access. If implementation audit finds a browser-direct protected data path whose authorization would bypass the server assurance gate, that path must either gain an AAL2-restrictive RLS policy or be routed behind the approved server boundary before #217 can close; such a change must be documented rather than silently added.

No paid Supabase feature or billing change is authorized.

## 8. Settings and challenge UI contract

This is a capability addition, not a Settings redesign.

The existing Settings visual system remains the presentation base. The signed-in Security area gains an MFA entry that communicates one of these truthful states:

- not enabled;
- enabled and this session is AAL2;
- enabled but this session needs MFA verification;
- active Admin requires MFA enrollment before Admin access.

A dedicated MFA management route may be used for enrollment, QR/manual setup, factor listing and removal. A dedicated challenge route may be used for login/step-up. Both must remain usable on mobile/narrow layouts and use the existing component system.

Secrets must never be exposed in server-rendered HTML before enrollment requests are made by the authenticated user, and challenge/error copy must not reveal information about another account.

## 9. Security notifications

#215 already enabled and branded the scoped Auth security notifications for MFA-factor changes. #217 must verify with an owned fixture that successful factor enrollment and successful factor removal/reset produce the expected security-notification behavior.

If the hosted provider does not emit the configured notification for an Admin API factor reset, implementation must not silently assume the user was notified; the operator-assisted recovery procedure must explicitly send/record an equivalent user notification before #217 is considered production-ready.

No new SMTP provider migration is part of #217.

## 10. Verification contract

### 10.1 Repository checks

Implementation must keep ordinary repository quality gates green and add targeted assurance verification sufficient to prove the new security boundary. At minimum the exact implementation head must pass:

- Engineering Quality;
- UI Shell;
- Account Identity or its successor account-security workflow;
- an MFA-specific configured workflow covering hosted Auth behavior;
- Integrated Release / other current required repository gates triggered by the affected paths.

### 10.2 Owned configured fixture

The MFA verification fixture must use an explicitly owned temporary Auth user and must clean it up even after partial failure. It must not reuse a real user factor.

The configured test must prove at least:

1. fixture starts without verified factors and at AAL1;
2. first TOTP enrollment returns QR/manual setup data without leaking the secret to logs/artifacts;
3. challenge + locally generated current TOTP verifies the factor and produces AAL2;
4. AAL1 is denied by the Admin guard for an active-admin fixture;
5. AAL2 is accepted by the same Admin guard;
6. an opted-in ordinary-member fixture is denied private product authorization at AAL1 and accepted at AAL2;
7. adding a second factor is blocked without the required recent step-up and succeeds after step-up;
8. verified factor removal is blocked without protected assurance;
9. an active Admin cannot remove their last verified factor through RenderLab;
10. ordinary-member deliberate last-factor removal works after protected step-up and no longer requires AAL2 after session refresh;
11. password recovery for an MFA-enrolled user cannot replace the password at AAL1/recovery-marker-only state;
12. the same recovery path can replace the password after successful TOTP step-up;
13. Admin API factor deletion used for the operator-recovery fixture logs out/revokes existing sessions as documented;
14. factor enrollment/removal security-notification behavior is verified;
15. fixture Auth user, factors, sessions and RenderLab access rows are cleaned up.

TOTP secrets, one-time codes, passwords, recovery tokens, service-role credentials and bearer tokens must be redacted from CI output and artifacts.

### 10.3 Failure behavior

MFA/factor-state lookup and assurance verification fail closed for protected access. Temporary provider failure must not silently fall back to AAL1 Admin or sensitive mutation.

An MFA challenge failure must leave the user signed in at the assurance they actually has; it must not fabricate success or destroy the password session merely because a code was mistyped.

## 11. Rollback and deployment

Merging this contract does not deploy anything.

Implementation is a separate PR after this contract is merged. Production deployment remains an explicit operation after merged-main verification and user authorization.

If the production implementation must be rolled back, rollback restores the previous application source/alias. Enrolled Supabase factors are durable Auth state and must **not** be bulk-deleted merely to roll back application code. Before any production rollout, the implementation must therefore prove that the rollback version can at least remain operable for Settings/recovery or the rollout must include a documented forward-fix/compatibility plan for users who enrolled during the new release.

Because the shared project currently has zero factors, initial rollout can avoid a mixed legacy-factor population if verification and rollout are performed before enabling user enrollment. Once real users can enroll, rollback planning must treat those factors as persistent security state.

## 12. Implementation sequence

1. merge this contract;
2. add assurance/factor primitives and focused tests;
3. add challenge/enrollment/factor-management Settings flows;
4. enforce opted-in AAL2 at the ordinary private boundary;
5. enforce mandatory AAL2 at the Admin boundary and preserve it across every Admin API;
6. protect password change/recovery and MFA mutation with recent step-up;
7. add configured owned MFA fixtures, notification verification and cleanup;
8. reconcile architecture/roadmap/project documentation against verified implementation state;
9. merge implementation only after exact-head checks pass;
10. run merged-main checks;
11. stop before production deployment unless deployment is explicitly authorized.

## 13. Exit criteria

#217 implementation is complete only when repository and configured evidence prove all of the following:

- TOTP enrollment, QR/manual setup, challenge, listing, labelling and removal work;
- ordinary-member MFA is optional before enrollment and enforced after enrollment;
- active Admin is impossible at AAL1;
- every Admin API shares the AAL2-aware guard;
- recent TOTP step-up protects MFA mutation and password replacement for enrolled accounts;
- email recovery cannot silently bypass enrolled MFA;
- backup-factor and all-factors-lost recovery behavior matches this contract;
- no unsupported recovery-code UX exists;
- security notifications are verified for factor changes/reset behavior;
- owned test fixtures clean up completely;
- no secrets appear in repository/CI artifacts;
- current architecture and roadmap documents describe the verified state truthfully;
- production remains unchanged until a separate authorized deployment.
