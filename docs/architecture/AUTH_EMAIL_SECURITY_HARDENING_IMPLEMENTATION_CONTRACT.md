# Auth & Email Security Hardening Implementation Contract

**Tracker:** #215  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `adfb9153003a6e1c86015bbd56c40b1e329788ce`  
**Status:** EXECUTION CONTRACT / HOSTED CONFIG MUTATION NOT YET AUTHORIZED  
**Scope:** remaining hosted Supabase Auth policy/security hardening plus the minimum application-policy synchronization required to keep RenderLab truthful  
**Out of scope:** Settings redesign, profile/MFA/session-management feature implementation, schema/RLS/storage/provider/worker changes, production deployment

## 1. Purpose

Workstream #215 was originally written before Phase 13 completed RenderLab's production Auth-email delivery hardening. The implementation phase must therefore start from current reality instead of replaying the older checklist.

This contract narrows #215 to the still-open security and configuration gaps that remain after Phase 13, freezes the existing account/recovery/session guarantees, and separates controls that are executable on the current Supabase Free plan from leaked-password protection, which current Supabase documentation makes available only on Pro and above.

No hosted Supabase Auth setting is changed by this contract. Hosted configuration changes remain an explicit operator/configuration operation and require separate authorization after this contract is merged.

## 2. Verified current baseline

### Repository application behavior

The current account implementation:

- uses invitation-gated email/password sign-in;
- keeps RenderLab admission/role authorization separate from authentication;
- uses enumeration-safe recovery copy after `resetPasswordForEmail`;
- sends recovery back through `/auth/confirm?type=recovery`;
- accepts token-hash recovery verification and rejects invalid/consumed recovery tokens;
- constrains auth completion redirects to RenderLab-owned paths rather than trusting an arbitrary `next` URL;
- creates a short-lived, signed, HTTP-only recovery marker before `/settings/password` can skip current-password verification;
- requires current-password verification for an ordinary password change;
- preserves the acting/recovery session after password replacement while revoking other sessions;
- rejects still-unexpired stale bearer sessions at private RenderLab boundaries after revocation;
- exposes global sign-out truthfully as `Sign out everywhere`.

These behaviors are already covered by `scripts/verify-account-identity.mjs` and are binding regression invariants for this workstream.

### Current password presentation

The application currently hard-codes an eight-character client floor in:

- signed-out password input enablement;
- new-password validation;
- new-password `minLength` attributes;
- visible `Use at least 8 characters.` guidance.

The actual hosted Auth password policy remains the authoritative enforcement boundary. #215 owns the real policy; #223 owns visible field ergonomics such as Show/Hide password, Caps Lock feedback and broader credential-field interaction quality.

### Production Auth email state already completed by Phase 13

The following are **not** implementation work for #215 unless a fresh audit proves regression:

- production custom SMTP is already in use through Resend;
- invite and recovery templates are branded RenderLab templates;
- invite/recovery links use the token-hash server-confirmation pattern;
- email click/open tracking is disabled so Auth links are not rewritten;
- external Gmail invite/recovery delivery and acceptance were verified;
- the production Auth mail path is no longer using the built-in Supabase mailer.

#215 must verify these facts remain true before mutation, but it must not replace or re-migrate the mail provider merely because the older roadmap text still mentions that step.

### Fresh hosted/project audit — 2026-09-14

Read-only Supabase connector audit of project `rashyleshocuvpgcooxy` established:

- project status is healthy;
- owning Supabase organization is still on the **Free** plan;
- Security Advisor still reports **Leaked Password Protection Disabled**;
- the other current Security Advisor findings are the known informational `rls_enabled_no_policy` notices for deliberately server-owned RenderLab tables;
- Auth session/MFA backing state exists in the hosted Auth schema, but #215 does not implement session inventory or MFA.

Current Supabase documentation establishes:

- minimum password length and required-character policy are configurable Auth settings;
- leaked-password protection is available on **Pro and above**;
- security-notification email templates/settings exist for password, email, sign-in-method and MFA-factor changes;
- Auth rate limits are configurable;
- CAPTCHA protection can cover sign-in and password-reset flows, but enabling it also requires compatible frontend token handling;
- Site URL and redirect allowlist are part of the hosted Auth security boundary.

### Hosted configuration fields still not independently readable from the connected toolset

The current Supabase connector exposes project health, schema, advisors, logs and documentation but does not expose the hosted Auth configuration document. The repository also does not contain a checked-in Management API token or a workflow that reads `/v1/projects/<ref>/config/auth`.

Therefore the following must be captured during the authorized execution preflight from the Supabase Dashboard or Management API **without recording secrets**:

- Site URL;
- additional redirect URLs;
- email provider/custom SMTP enabled state and non-secret sender/host metadata;
- current password minimum and required-character policy;
- password-change reauthentication/current-password hosted settings, if enabled;
- current Auth email rate limits;
- CAPTCHA/bot-protection state;
- enabled security-notification toggles and template subjects/content fingerprints;
- invite, recovery, reauthentication and email-change template fingerprints.

If those fields cannot be read safely, execution must stop rather than assume defaults.

## 3. Binding product/security decisions

### 3.1 Password policy

RenderLab will use a **length-first password policy**. Do not add arbitrary `uppercase + lowercase + number + symbol` requirements merely for familiarity.

The target policy for password-only accounts is:

- minimum **15 characters**;
- long passwords/passphrases remain supported;
- no extra required-character classes unless a later explicit security decision changes this contract;
- paste, autofill and password-manager compatibility must remain allowed;
- leaked-password blocking is enabled when the Supabase plan permits it.

The 15-character target follows the accepted account roadmap's NIST-aligned security direction. The hosted Auth setting is authoritative; application copy/validation must consume one RenderLab-owned canonical policy definition rather than duplicating numeric literals across components.

Before changing the hosted minimum, the execution must verify the exact current Supabase behavior for existing passwords and exercise an owned existing-user fixture. If strengthening the hosted policy would unexpectedly lock out existing admitted accounts instead of applying only at password creation/change or with a clear weak-password response, stop and revise the rollout plan.

### 3.2 Existing password-change reauthentication

RenderLab's ordinary password change currently verifies the current password by performing an explicit password reauthentication in the app. That behavior stays in place for this workstream.

Do **not** switch to Supabase email-nonce reauthentication in #215 unless live hosted configuration proves it is already required or a separate decision explicitly reopens this flow. MFA/high-risk step-up belongs to #217.

### 3.3 Security notifications

Enable and brand the security notifications that correspond to real/current or already-roadmapped sensitive changes:

- password changed;
- email address changed;
- MFA factor enrolled;
- MFA factor removed;
- sign-in method linked;
- sign-in method removed.

Notification templates must:

- identify RenderLab clearly;
- state the event without exposing secrets or internal identifiers;
- provide a truthful incident-response instruction;
- not claim device, location, risk or unusual-login detection that RenderLab does not implement.

There is no new-device/new-session alert in this workstream unless a trustworthy event source and delivery contract are separately proven. #216 owns session/security-activity product work.

### 3.4 Site URL and redirect allowlist

Production Auth must use the RenderLab production origin as the canonical Site URL and must keep the redirect allowlist narrowly bounded to real RenderLab origins/routes required by current workflows.

Execution must document the before/after non-secret URL set and prove:

- invite links terminate inside RenderLab;
- recovery links terminate inside RenderLab;
- arbitrary external `next` values do not escape RenderLab;
- no obsolete preview/development origin remains allowlisted unless it is still required by an explicit remote verification workflow.

Do not remove a currently required CI/verification origin until the affected workflow is audited.

### 3.5 Rate limits and CAPTCHA

Rate limits must be audited against actual Closed Beta traffic and existing configured verification workflows before adjustment.

Default decision for this slice:

- keep reasonable Auth rate limiting enabled;
- do not loosen recovery/email limits merely to make tests convenient;
- do not enable CAPTCHA blindly.

Cloudflare Turnstile is the preferred CAPTCHA candidate if evidence shows sign-in/recovery abuse protection is needed, because RenderLab already uses Cloudflare operationally. However, CAPTCHA is a **code + hosted-config change**, not a dashboard-only toggle. If selected, its implementation must include:

- a RenderLab-owned frontend component/integration;
- public site key through the normal public environment contract;
- secret key only in hosted Auth/secure configuration;
- captcha token supplied to every protected Supabase Auth call;
- accessibility and failure/retry behavior;
- CI/test bypass strategy that does not disable production protection;
- production verification before closure.

If there is no evidence-backed abuse need during this slice, record CAPTCHA as evaluated/deferred and retain rate limiting. Do not add user friction solely because the feature exists.

### 3.6 Leaked-password protection plan gate

Leaked-password protection is a required broader-beta hardening objective, but it is currently blocked by the Supabase Free plan.

This workstream is therefore split into two closure states:

- **#215A — Free-plan hardening:** all executable configuration/application work in this contract is completed and verified; Security Advisor may still contain only the explicitly documented leaked-password warning plus expected server-owned-table informational notices.
- **#215B — Plan-gated leaked-password closure:** after an explicit plan-upgrade decision, enable leaked-password protection and verify Security Advisor clears that warning.

Do not upgrade the Supabase plan as an incidental implementation detail. Plan/billing change requires explicit user authorization.

#215 may be marked implementation-complete-for-current-plan after #215A, but the broader-beta blocker must remain visibly open until #215B is done.

## 4. Planned implementation delta

### Repository changes expected in #215A

1. Add one canonical password-policy module owned by the account/auth layer, exposing at minimum the current minimum length and user-facing policy guidance.
2. Replace duplicated eight-character literals in account sign-in/password-replacement presentation with the canonical policy.
3. Update configured account verification to exercise:
   - the canonical policy;
   - a below-policy password rejection/update case without leaking raw Auth errors;
   - successful ordinary password replacement;
   - successful recovery password replacement;
   - existing acting-session preservation and other-session revocation;
   - enumeration-safe recovery;
   - same-origin auth completion.
4. Add an Auth hardening verifier/record only where it proves hosted configuration that existing workflows cannot prove. Avoid duplicating the full Account Identity workflow.
5. Update authoritative architecture/project documentation from observed execution evidence.

### Hosted configuration changes expected in #215A, subject to explicit authorization

After capturing the exact current config and producing a rollback snapshot:

- set/verify canonical Site URL and minimal redirect allowlist;
- set the agreed minimum password length to 15 and required-character policy to none;
- verify custom SMTP and existing invite/recovery templates remain unchanged where already correct;
- add/verify reauthentication and future email-change templates so later workstreams do not inherit default/unbranded mail;
- enable/brand the supported security-notification templates listed above;
- review Auth rate limits and change only values justified by Closed Beta usage/testing;
- evaluate CAPTCHA and either implement it end-to-end or record a bounded defer decision.

### Plan-gated #215B

After explicit authorization to move to a qualifying Supabase plan:

- enable leaked-password protection;
- verify an owned known-compromised test password is rejected through the supported Auth error contract without exposing the password in logs/artifacts;
- rerun Security Advisor and confirm `auth_leaked_password_protection` clears;
- rerun Account Identity and the relevant Auth-hardening verification.

## 5. Explicit non-goals

This workstream does **not**:

- redesign UI-078 Settings;
- add Show/Hide password, Caps Lock UI or profile controls (#223);
- add session inventory, local/other-device sign-out or security log UI (#216);
- add MFA enrollment/challenge or AAL2 enforcement (#217);
- add secure email-change UI (#218);
- add account export/deletion (#219);
- add user preferences/notifications (#220);
- add passkeys (#221);
- change RenderLab admission, role or Admin authorization semantics;
- change database schema/RLS;
- change Cloudflare R2, generation workers/providers, routing or lifecycle;
- alter production deployment merely because this contract is merged.

## 6. Rollout sequence

### Stage 0 — exact preflight

1. Re-establish current `main` and production pointer.
2. Read the hosted Auth config through Dashboard or Management API without exposing credentials.
3. Save a redacted before-state record containing only non-secret config values and hashes/fingerprints for templates where full content would be noisy.
4. Confirm current production SMTP/template state still matches Phase 13.
5. Confirm the organization plan and current Security Advisor state.
6. Verify owned test identities can be created/cleaned without touching real member accounts.

If the actual configuration materially differs from this contract, stop and amend the contract before mutation.

### Stage 1 — repository policy synchronization

1. Introduce the canonical RenderLab password policy.
2. Update account surfaces to consume it without redesigning UI-078.
3. Extend verification with policy/security assertions.
4. Run Engineering Quality and Account Identity at exact head.
5. Do not deploy yet if hosted Auth policy and repository policy would be temporarily inconsistent in production.

### Stage 2 — authorized hosted Auth mutation

Only after explicit operator authorization:

1. Apply one cohesive hosted Auth configuration change set from the captured before-state.
2. Verify configuration immediately after write.
3. Exercise owned invite/recovery/password-change fixtures.
4. Verify real email delivery for every changed template category that can be safely triggered.
5. Verify enumeration-safe recovery and sanitized application error behavior.
6. Verify rate limits/CAPTCHA behavior if changed.
7. Run Security Advisor.

### Stage 3 — production application rollout if repository code changed

If Stage 1 changed production application code:

1. require exact-head repository workflows to pass;
2. merge and verify merged-main checks;
3. deploy only with explicit deployment authorization under the normal guarded Vercel process;
4. smoke sign-in, recovery request, ordinary Settings access and private-route authorization;
5. audit runtime errors.

If no application code changed, there is no Vercel deployment solely for hosted Auth configuration.

### Stage 4 — #215B plan-gated closure

When a qualifying Supabase plan is explicitly approved:

1. capture current Auth config/advisor state again;
2. enable leaked-password protection;
3. verify rejection behavior using an owned fixture and non-secret evidence;
4. confirm the Security Advisor warning clears;
5. update #215 and roadmap documentation.

## 7. Rollback

Before any hosted write, capture the exact previous non-secret values needed to restore each changed field.

Rollback triggers include:

- invited users cannot complete authentication;
- recovery delivery or completion breaks;
- existing admitted accounts cannot sign in unexpectedly after password-policy change;
- email links escape or fail because of URL/allowlist changes;
- security-notification configuration breaks Auth delivery;
- CAPTCHA blocks legitimate production use or CI without the planned test strategy;
- raw Supabase/Auth errors become user-visible;
- account/session revocation semantics regress.

Rollback action:

1. restore the captured hosted Auth configuration fields;
2. if repository/app code has been deployed, restore the previous known-good Vercel alias/deployment under the normal production rollback procedure;
3. rerun Account Identity and production smoke;
4. record the failed attempt and evidence before revising the contract.

Do not roll back Phase 13 custom SMTP/template hardening unless the failure is specifically caused by that configuration.

## 8. Acceptance criteria

### #215A — current-plan acceptance

All of the following must be true:

- hosted Site URL and redirect allowlist are read, documented and verified against current RenderLab flows;
- production custom SMTP and existing token-hash invite/recovery templates are reconfirmed, not unnecessarily replaced;
- reauthentication and future email-change templates are branded/verified for later workstreams;
- supported security-notification emails are enabled and use approved RenderLab copy;
- actual hosted password minimum is 15, with no arbitrary required-character classes;
- application password guidance/validation is generated from one canonical RenderLab policy rather than duplicated literals;
- owned below-policy password tests fail safely and successful password change/recovery still work;
- enumeration-safe recovery copy remains intact;
- invalid/consumed recovery tokens remain rejected;
- arbitrary external redirect input remains contained to RenderLab;
- acting/recovery session remains usable after password replacement and other sessions are revoked;
- stale bearer sessions remain rejected by private media/generation boundaries;
- Auth rate limits are recorded and either retained or changed with evidence;
- CAPTCHA is either implemented end-to-end with accessibility/test coverage or explicitly deferred with rationale;
- no secrets, password values, raw tokens or sensitive Auth payloads appear in logs/artifacts/docs;
- Security Advisor has no new security findings; the leaked-password warning may remain only because the current Free plan blocks that feature;
- exact-head Engineering Quality and Account Identity pass, plus any new dedicated verifier introduced by this slice;
- authoritative docs and #215 reflect observed reality.

### #215B — broader-beta leaked-password acceptance

- qualifying Supabase plan explicitly approved and active;
- leaked-password protection enabled;
- owned compromised-password test is rejected without secret leakage;
- `auth_leaked_password_protection` Security Advisor warning clears;
- relevant exact-head account/security verification passes;
- roadmap/issue documentation records the completed blocker.

## 9. Evidence requirements

Closure evidence must identify:

- exact repository SHA;
- exact hosted Auth before/after non-secret config snapshot or hashes;
- project/organization plan observed at execution time;
- Security Advisor before/after findings;
- configured workflow run IDs;
- owned fixture cleanup result;
- real delivery evidence for changed email categories, without message secrets;
- production deployment ID/run only if application code was actually deployed.

## 10. Next workstream boundary

Completing #215A does not automatically authorize #216, #217 or #223 implementation. After #215A is verified, re-establish repository/live Auth state and expand the next immediate roadmap slice into its own contract.

Default sequencing after #215A remains:

1. #217 privileged MFA/step-up where needed for Admin/high-risk operations;
2. #216 session controls/security activity;
3. #223 profile and credential UX baseline;
4. #218 identity/sign-in methods;
5. #219 data lifecycle;
6. #220 preferences/notifications;
7. #221 passkey research as an independent experimental lane.

Actual sequencing may be revised only from fresh repository/product/security evidence.