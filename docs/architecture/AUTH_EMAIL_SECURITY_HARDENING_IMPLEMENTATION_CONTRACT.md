# Auth & Email Security Hardening Implementation Contract

**Tracker:** #215  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `adfb9153003a6e1c86015bbd56c40b1e329788ce`  
**Status:** COMPLETE / VERIFIED / MERGED / PRODUCTION-LIVE — #215A CURRENT-PLAN HARDENING + #215B FREE HIBP COMPROMISED-PASSWORD SCREENING / SUPABASE PAID UPGRADE REJECTED
**Scope:** remaining hosted Supabase Auth policy/security hardening plus the minimum application-policy synchronization required to keep RenderLab truthful  
**Out of scope:** Settings redesign, profile/MFA/session-management feature implementation, schema/RLS/storage/provider/worker changes, production deployment

## 1. Purpose

Workstream #215 was originally written before Phase 13 completed RenderLab's production Auth-email delivery hardening. The implementation phase must therefore start from current reality instead of replaying the older checklist.

This contract narrows #215 to the still-open security and configuration gaps that remain after Phase 13 and freezes the existing account/recovery/session guarantees. #215A completed every approved current-plan hosted/application hardening action. On 2026-09-14 the user permanently rejected upgrading Supabase solely for leaked-password protection, so #215B is now a free RenderLab-owned compromised-password-screening slice instead of a billing/plan gate.

No hosted Supabase Auth setting is changed by this contract. Hosted configuration changes remain an explicit operator/configuration operation and require separate authorization after this contract is merged.


### Repository-side execution record — 2026-09-14

- Contract merge: `85cdd59909a3b48bd4a043ed9d984064497215fb`.
- Implementation PR #243 exact head: `3cd08fbb3b6256ae5a087bdb91715a67cb1cb8e8`.
- Exact-head workflows: Engineering `34821671241`, Brand/Launch `34821671275`, UI Shell `34821671336`, Integrated Release `34821671515`, Account Identity `34821671246` — all passed; Account Identity required an unchanged retry after attempt 1 hit a transient Supabase 504 during preflight invitation cleanup.
- Account Identity artifact: `10338159764`, `sha256:9bf0f467dc01f570f2a3b755f40ebd377c6869219eb410ec43473ce8586c6b45`.
- Implementation merge: `8ea859df84f5173267defbf3e278a95bba403014`.
- Merged-main attached workflows: Engineering `34822037091`, UI Shell `34822037092` — both passed.
- Repository policy code is now **production-live** through the separately authorized Stage 3 rollout recorded below.
- Hosted #215A configuration was subsequently executed and verified under the Stage 2 record below.

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

### Hosted configuration preflight — verified 2026-09-14

The connected Supabase plugin still does not expose the hosted Auth configuration document directly, but the repository's established Phase 13 Management API credential path was successfully reused through a read-only GitHub Actions preflight. No hosted Auth setting was mutated.

Authoritative read-only evidence:

- workflow run `34835108876`, job `103947041555`;
- artifact `10343259904`, `sha256:86937aa563ef66104d4c259cbeb58bb6c67cedf14129c4e0ecf03b1542856f03`;
- project `rashyleshocuvpgcooxy` remained healthy and the owning organization remained on the Free plan;
- no secret SMTP credentials, Management API token, service-role key, Auth tokens or password values were written to logs/artifacts.

Observed non-secret hosted Auth state:

- Site URL is exactly `https://renderlab.faresuniform.uk`;
- redirect allowlist is exactly the current Settings invite destination plus the recovery confirmation route required by RenderLab;
- custom SMTP remains `smtp.resend.com:587` with sender `RenderLab <noreply@mail.renderlab.faresuniform.uk>`;
- invite and recovery template fingerprints still match the accepted Phase 13 templates;
- hosted password minimum is `6` and required-character policy is none;
- leaked-password protection remains disabled because the organization is still on Free;
- hosted current-password enforcement and Supabase nonce reauthentication are both disabled, preserving the app-owned current-password verification contract;
- secure email-change mode remains enabled;
- CAPTCHA remains disabled and no CAPTCHA secret is configured;
- Auth rate limits are `anonymous=30`, `email=30`, `otp=30`, `sms=30`, `refresh=150`, `verify=30`, `web3=30`;
- all six scoped security-notification toggles are disabled and their current subjects/templates are generic;
- reauthentication and future email-change subjects/templates are generic.

Execution decisions from this preflight:

- keep Site URL, redirect allowlist, SMTP, rate limits, CAPTCHA state, leaked-password state and hosted password-change reauthentication flags unchanged;
- retain the existing Phase 13 invite/recovery templates unchanged;
- CAPTCHA is evaluated/deferred for #215A because no evidence-backed abuse need was found; Cloudflare Turnstile remains a future code+config change only if justified by later threat evidence;
- the authorized hosted delta remains the 15-character minimum, branded reauthentication/email-change templates and the six scoped security notifications;
- #215B remains plan-gated and no Supabase billing/plan change is authorized by #215A.

### Stage 2 hosted execution — completed and verified 2026-09-14

The first attempt to create a new high-privilege workflow was correctly rejected by the GitHub connector. Execution therefore reused only **existing trusted secret bindings** already established by RenderLab: Account Identity for `SUPABASE_SERVICE_ROLE_KEY`, and the historical Phase 13B Management API workflow for `SUPABASE_ACCESS_TOKEN`. No new repository secret binding was introduced.

Verified execution evidence:

- owned legacy-password fixture preparation: Account Identity run `34844165287`, job `103975951408`; a deterministic owned fixture with a runtime-derived **12-character** password signed in successfully before the hosted policy change, without logging the password;
- hosted password transition: Phase 13B Management API run `34844260270`, job `103976259966`; guarded read/write/readback changed only `password_min_length` from `6` to `15`, retained no required character classes and preserved Site URL, redirect allowlist and Resend SMTP;
- legacy compatibility after strengthening: Account Identity run `34844349294`, job `103976544838`; the same existing 12-character fixture still signed in after the hosted minimum became 15, proving existing credentials were not locked out by the policy increase;
- hosted security-mail mutation: Phase 13B Management API run `34844522493`, job `103977111129`; all six contracted security notifications were enabled, reauthentication and future email-change templates were branded, and readback proved URLs, Resend SMTP, password policy, CAPTCHA state, rate limits, invite/recovery templates, secure-email-change mode and hosted password-change reauthentication flags did not drift;
- rollback artifact: `10347711381`, `sha256:c4d7b56726467df807b20096325ecd47fd511811dd81d527336d0ec50d50935d`, containing only the bounded pre-change non-secret values for the security-mail delta;
- real password-change security-email delivery: Phase 13D run `34844954211`, job `103978532280`; one approved Gmail test fixture changed its password through Auth, the `Your RenderLab password was changed` message reached Resend `delivered`, RenderLab branding/privacy checks passed and the fixture was deleted;
- configured Account Identity after hosted mutation: existing run `34821671246` attempt 4, job `103978254613`, passed the full suite unchanged. Attempt 3 failed only on the known shared-project transient `504 Gateway Timeout` while deleting stale admission reservations before any product/Auth assertion; cleanup succeeded and the unchanged retry passed;
- fresh Account Identity artifact after hosted mutation: `10347217183`, `sha256:69c61dd88fce6154766210d56748b4faaca8d1506ddc9af722de83e6fbfbb1ce`;
- Security Advisor after mutation contained no new findings: the only warning remained `auth_leaked_password_protection`, plus the expected `rls_enabled_no_policy` informational notices for intentionally server-owned tables;
- owned legacy fixture cleanup: run `34845048297`, job `103978842910`, emitted `RENDERLAB_215A_LEGACY_FIXTURE_CLEAN=true`; temporary PR #246 was closed unmerged.

Final current-plan hosted state:

- password minimum `15`;
- required-character policy none;
- six contracted security notifications enabled and RenderLab-branded;
- reauthentication and future email-change templates RenderLab-branded;
- production Site URL and redirect allowlist unchanged;
- Resend SMTP plus Phase 13 invite/recovery templates unchanged;
- Auth rate limits unchanged;
- CAPTCHA remains disabled/evaluated-deferred;
- hosted current-password and nonce-reauthentication toggles remain disabled, preserving RenderLab's app-owned current-password verification contract;
- Supabase-native leaked-password protection remains disabled on Free; the user explicitly rejected a paid-plan upgrade for this feature, and #215B now owns a free RenderLab-layer alternative instead.

#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215 remains open only for #215B free compromised-password screening. No Supabase billing/plan decision remains in this workstream. Hosted policy and production application presentation are synchronized on the canonical 15-character minimum.

### Stage 3 application production rollout — completed and verified 2026-09-14

Explicit user authorization deployed the already-merged #215A application policy through the repository's established guarded Vercel rollout pattern.

- rollout workflow run `34865097038`, job `104046825061`, completed successfully;
- exact pristine source guard checked out `27eda7ed0a619435b9d89531bdeb3fffe772e803`;
- Vercel production deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` / `https://renderlab-apvh9ck6i-faresmohamed260-6733s-projects.vercel.app` reached `READY` with exact Git metadata `27eda7ed0a619435b9d89531bdeb3fffe772e803`;
- the production environment prebuild contract passed before Next.js compilation;
- the workflow explicitly moved `renderlab.faresuniform.uk` to the new deployment;
- custom-domain smoke passed for root, `/create`, `/library`, `/activity` and `/settings`, including the approved Landing identity markers;
- rollback was not invoked; prior deployment `dpl_CB145taZqMd6r7MqAoMweYTJzmvh` remains the immediate known-good alias restoration target;
- post-cutover Vercel audit found no error/fatal logs for the new deployment and no runtime-error clusters in the observed window;
- automatic Git → Vercel deployment remains disabled.

Hosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. #215B now proceeds only as the free RenderLab-owned HIBP compromised-password-screening slice; no Supabase plan upgrade will be pursued for this feature.

## 3. Binding product/security decisions

### 3.1 Password policy

RenderLab will use a **length-first password policy**. Do not add arbitrary `uppercase + lowercase + number + symbol` requirements merely for familiarity.

The target policy for password-only accounts is:

- minimum **15 characters**;
- long passwords/passphrases remain supported;
- no extra required-character classes unless a later explicit security decision changes this contract;
- paste, autofill and password-manager compatibility must remain allowed;
- known-compromised passwords are screened in RenderLab password-establishment/change flows through the free Have I Been Pwned Pwned Passwords range API; no Supabase paid-plan upgrade is permitted solely for this control.

The 15-character target follows the accepted account roadmap's NIST-aligned security direction. The hosted Auth setting is authoritative; application copy/validation must consume one RenderLab-owned canonical policy definition rather than duplicating numeric literals across components.

#215B compromised-password screening is additionally bound to these privacy/availability rules:

- use the official free `https://api.pwnedpasswords.com/range/{prefix}` endpoint; no API key or subscription is introduced;
- hash the complete candidate password locally with SHA-1 **only for the HIBP lookup**; SHA-1 is never used for credential storage or verification;
- send only the first five hexadecimal hash characters to HIBP and compare the returned suffixes locally; never transmit plaintext or the complete hash;
- set `Add-Padding: true` and ignore padded zero-count records;
- perform the lookup only after the user submits a complete candidate password, never incrementally while typing;
- reject a password if its exact full-hash suffix appears with a positive breach count; do not expose prevalence counts as a strength score;
- use a bounded timeout/retry and fail closed for password establishment/change if the safety check cannot complete, because allowing an unchecked password would silently weaken the promised control;
- surface sanitized product copy such as `This password has appeared in known data breaches. Choose a different password.`;
- do not log password values, full hashes, hash suffixes, or range responses.

This application-layer control is intentionally described as **RenderLab compromised-password screening**, not Supabase-native leaked-password enforcement. A technically capable authenticated user can bypass normal product UI and call the hosted Supabase Auth endpoint directly on the Free plan; eliminating that bypass would require paid/native Auth enforcement or a materially different authentication architecture, neither of which is authorized.

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

Supabase-native leaked-password protection remains unavailable on the Free plan and is intentionally not a RenderLab dependency. The required product control is instead the verified free RenderLab-owned HIBP compromised-password screening described in this contract.

This workstream is therefore split into two closure states:

- **#215A — Free-plan hardening:** all hosted/application configuration work in the original contract is completed, verified and production-live.
- **#215B — Free compromised-password screening:** COMPLETE / VERIFIED / PRODUCTION-LIVE. RenderLab screens supported password-establishment/change flows through the HIBP k-anonymity range API. Supabase-native leaked-password protection remains disabled and its Security Advisor warning remains visible by design.

The user explicitly rejected upgrading Supabase solely for leaked-password protection. That paid path is abandoned for this project unless the user later reopens the decision for unrelated reasons.

#215's closure condition is satisfied: #215B is verified and production-live, and the native Supabase warning is documented as an accepted platform limitation rather than a product blocker.

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

### Free #215B — RenderLab compromised-password screening

Implementation must remain dependency-light and preserve the existing password/session/recovery contracts:

- add a small account-layer browser helper that SHA-1 hashes the complete submitted candidate with Web Crypto, queries only the five-character prefix from the official HIBP Pwned Passwords range API using padded responses, and compares suffixes locally;
- call the helper from the shared `AccountPasswordForm` after local length/match validation and before the existing Supabase password mutation, so both ordinary change and verified recovery replacement are covered;
- do not add an incremental/on-change lookup;
- use bounded timeout/retry behavior and fail closed with sanitized copy when HIBP cannot be checked;
- preserve current-password verification, recovery-marker semantics, acting-session preservation, other-session revocation and stale-bearer rejection unchanged;
- extend deterministic verification to prove a known public compromised-password fixture is blocked before Auth mutation, a generated non-compromised fixture can proceed, network/unavailable behavior fails closed, and no plaintext/full hash is placed in logs/artifacts;
- perform at least one bounded live range-API smoke at exact head to prove the external dependency is reachable without making CI depend on secret credentials.

Do **not** enable, purchase or simulate Supabase-native leaked-password protection as part of #215B.

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

### Stage 4 — #215B free-screening closure — completed and verified 2026-09-14

- Contract amendment PR #249 merged as `31824147c7e3716ddf187a260220c74733102fbe` and permanently removed a Supabase paid-plan upgrade as the leaked-password strategy.
- Implementation PR #250 exact head `15edffab3662c28c5169584b8982e5df2831c880` passed Engineering `34868698449`, Account Identity `34868698376`, live Compromised Password Screening `34868698510`, UI Shell `34868699614`, Integrated Release `34868698377`, and Brand/Launch `34868698354`.
- Account Identity artifact `10357573841` (`sha256:bc22e9ed81a4e7ef30b82329236c3580c7b6f61d4ced42c47f988741c6f5fad8`) verifies the configured account flows while deterministic HIBP mocks prove compromised, safe, unavailable/fail-closed and submit-only privacy behavior.
- PR #250 merged as `f3f89d0859154b2ab45b5364ce1acb04a0eb204b`; merged-main Engineering `34869098474` and UI Shell `34869098397` both passed.
- Fresh Security Advisor after the merge showed no new findings. `auth_leaked_password_protection` remains as the accepted Supabase-native Free-plan warning; the expected server-owned-table `rls_enabled_no_policy` notices remain informational.
- Explicit rollout `34873131594` deployed exact source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as READY deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh`, then moved `renderlab.faresuniform.uk` and passed root/Create/Library/Activity/Settings smoke. Post-cutover Vercel audit found no runtime-error clusters and no error/fatal logs. Rollback was not required; `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` remains the immediate known-good rollback target.
- No Supabase plan/billing change, schema/RLS change, hosted Auth mutation, R2/provider/worker change or automatic Git deployment enablement was introduced by #215B.

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
- Security Advisor has no new security findings; `auth_leaked_password_protection` is allowed to remain as a documented Supabase-native limitation after the RenderLab-owned HIBP control is verified;
- exact-head Engineering Quality and Account Identity pass, plus any new dedicated verifier introduced by this slice;
- authoritative docs and #215 reflect observed reality.

### #215B — free compromised-password-screening acceptance

- no Supabase billing/plan upgrade is introduced for this control;
- official HIBP Pwned Passwords range lookup is used with five-character SHA-1 prefix k-anonymity and padded responses;
- plaintext passwords and complete hashes never leave the browser for the HIBP lookup and are never logged/stored by RenderLab;
- known-compromised password fixture is rejected before Supabase password mutation in both ordinary/recovery shared-form coverage;
- deterministic unavailable/network failure path fails closed with sanitized product copy;
- a generated non-compromised password proceeds through existing password replacement/session semantics;
- exact-head Engineering Quality, Account Identity and bounded live HIBP reachability verification pass;
- Security Advisor has no new findings; its native leaked-password warning remains documented/accepted rather than falsely claimed cleared;
- roadmap/issue/infrastructure documentation records the completed free alternative.

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

#215 is complete and does not automatically authorize #216, #217 or #223 implementation. Re-establish repository/live Auth state before the next workstream and merge its own execution contract before implementation. The next default planning slice is #217 privileged MFA/step-up because Admin/high-risk AAL2 enforcement remains the highest-priority security gap.

Default sequencing after #215 remains:

1. #217 privileged MFA/step-up where needed for Admin/high-risk operations;
2. #216 session controls/security activity;
3. #223 profile and credential UX baseline;
4. #218 identity/sign-in methods;
5. #219 data lifecycle;
6. #220 preferences/notifications;
7. #221 passkey research as an independent experimental lane.

Actual sequencing may be revised only from fresh repository/product/security evidence.