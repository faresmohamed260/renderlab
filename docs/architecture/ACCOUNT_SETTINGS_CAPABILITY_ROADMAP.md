# Account & Settings Capability Roadmap

**Status:** Accepted planning baseline pending merge  
**Tracker:** #213  
**Baseline audited:** `main` `750a5365ad9786f9216f7acef10d829cae048d60`  
**Related visual R&D:** Phase 27 / #211 / draft PR #212  
**Scope:** account, authentication, security, privacy/data lifecycle, user preferences and notification capability planning  
**Does not authorize:** production implementation, hosted Supabase Auth configuration changes, schema changes, provider changes, or deployment

## 1. Why this roadmap exists

RenderLab's current `/settings` and `/settings/password` flows correctly cover a narrow Closed Beta baseline, but the underlying account-management product is materially shallower than the account/security surfaces users expect from a mature application.

Phase 27 visual R&D can make the existing truth clearer, but visual redesign alone must not create the false impression that the broader account-management problem is solved. Missing capabilities need explicit product, security, data and infrastructure contracts before controls are added to Settings.

This document is therefore the durable gap inventory and sequencing plan. It separates:

1. **Existing capabilities that Phase 27 may present more clearly now.**
2. **Platform/Auth hardening that improves security without necessarily adding visible settings.**
3. **New user-facing account/security capabilities that require product implementation.**
4. **Privacy/data-lifecycle controls that depend on RenderLab's durable media/job ownership model.**
5. **Preferences and notification settings that should exist only after a real product capability needs them.**
6. **Conventional settings categories that are deliberately deferred because RenderLab currently has no product requirement for them.**

The goal is a complete, truthful account system rather than a visually fuller Settings page.

## 2. Source-of-truth audit

### 2.1 Current verified RenderLab account baseline

Current repository behavior already provides:

- Supabase Auth `auth.users.id` as canonical account identity.
- Invitation-gated Closed Beta admission separate from authentication.
- RenderLab-owned `member` / `admin` role and `active` / `suspended` status.
- Email/password sign-in for invited accounts.
- Enumeration-safe forgot-password request.
- Recovery-link password replacement after a server-validated signed recovery marker.
- Ordinary password change with current-password verification.
- Password change/recovery session semantics verified by the configured Account Identity workflow: the acting/recovery session remains usable while other sessions are revoked.
- Settings sign-out currently calls Supabase JavaScript `signOut()` without a scope; current Supabase behavior makes that global sign-out and RenderLab's verifier proves a secondary session is revoked.
- Private server identity resolution uses fresh Supabase `getUser()` state, so still-unexpired revoked bearer sessions fail private RenderLab authorization.
- Server-owned access/admission truth and fresh Admin eligibility.
- Conditional Admin continuation from Settings only for an active fresh-authorized admin identity.
- Existing owner-scoped media, generation, collections, upload and admission records tied to `auth.users.id`.

### 2.2 Current hosted/Auth hardening facts

The repository's Phase 10D audit established that:

- the shared project was using Supabase's built-in Auth mailer at the time of the audit;
- hosted Site URL / redirect allowlist / production template and sender posture were not fully verified from CI;
- password recovery mail hit built-in email rate limiting during audit;
- leaked-password protection remained disabled and was called out as a broader-beta blocker;
- hosted Auth configuration changes require explicit operator authorization and are not ordinary app-code changes.

A fresh Security Advisor read on 2026-09-13 still reports **Leaked Password Protection Disabled**. The other current advisor notices are expected `rls_enabled_no_policy` informational findings for intentionally server-owned RenderLab tables.

### 2.3 Current Supabase capability facts relevant to this roadmap

Current Supabase Auth documentation and the live shared-project schema establish that:

- JavaScript sign-out supports `local`, `others` and `global` scopes; JavaScript defaults to `global`.
- `auth.sessions` exists and records `id`, `user_id`, created/refreshed timestamps, AAL, user agent and IP among other internal fields.
- `auth.audit_log_entries` exists and can support a sanitized security-event surface if filtered server-side.
- TOTP MFA enrollment/challenge/verification and factor management are supported, and JWTs expose `aal1` / `aal2` assurance.
- MFA must be enforced in authorization boundaries; merely rendering an enrollment UI is not enough.
- security-notification email templates are available for password changes, email changes, sign-in-method linking/unlinking and MFA factor changes when enabled/configured.
- secure email change is supported through Auth and has dedicated confirmation/security-notification flows.
- hosted Auth supports session lifetime/inactivity controls, with plan-dependent options.
- CAPTCHA/Turnstile can protect sign-in and password reset flows.
- password minimums, leaked-password protection and reauthentication controls are configurable.
- passkey/WebAuthn support exists in current Supabase and RenderLab's `@supabase/supabase-js` `2.112.4` satisfies the documented minimum version, but Supabase currently marks passkeys **experimental**.

These facts make several roadmap items feasible, but do not make them implemented.

## 3. Security standards used for prioritization

The roadmap follows these current security principles rather than copying another product's Settings menu:

- NIST SP 800-63B-4 requires a minimum **15 characters** when a password is used as a single-factor authenticator; passwords used only as part of MFA may use a minimum of eight. It recommends allowing at least 64 characters and rejects arbitrary composition rules.
- Compromised/common passwords should be blocklisted rather than relying on decorative password-strength meters.
- OWASP recommends reauthentication after risk events and before sensitive account changes such as password/email changes.
- MFA is particularly important for privileged/admin access and for step-up before high-risk account operations.
- MFA factor replacement/recovery is itself a high-risk operation and needs explicit recovery policy plus out-of-band notification.
- Session controls and security activity must not leak session tokens or overstate unverifiable device/location data.

The roadmap uses these as product-security requirements, not as claims of regulatory certification.

## 4. Target Settings information architecture

The mature target is not one giant account page. Settings should evolve toward the following information architecture as capabilities become real.

### Account

Purpose: canonical identity and admission context.

Eventually contains:

- sign-in email;
- change sign-in email;
- Closed Beta / future account-access status;
- account role only as read-only product truth;
- conditional Admin continuation;
- account creation/joined date only if there is a real user-value reason to show it.

Not included by default:

- avatar;
- display name;
- username;
- biography;
- public profile.

RenderLab currently has no collaboration/public-profile feature that makes those fields useful. They should not be invented to make Account look conventional.

### Security

Purpose: authentication factors and sensitive account controls.

Target contents:

- password change;
- password policy/help;
- MFA enrollment and factor management;
- step-up/AAL state where useful to explain a blocked sensitive action;
- future passkey management only after the experimental provider feature is deliberately adopted;
- security-notification status only if users can meaningfully act on it.

### Sessions

Purpose: session scope and account-takeover response.

Target contents:

- current session identity;
- `Sign out this device`;
- `Sign out other devices`;
- `Sign out everywhere`;
- active session inventory when server-side targeting semantics are verified;
- sanitized recent security activity.

Session UI must distinguish **available today** bulk scopes from **future** per-session targeting. A list of sessions must not ship before RenderLab can safely revoke or explain them.

### Data & Privacy

Purpose: user-owned data lifecycle.

Target contents:

- export account data;
- export/download durable media in a bounded bulk flow;
- account deletion request;
- retention/deletion explanation;
- links to privacy/terms when those documents become public product requirements.

### Preferences

Purpose: durable user choices that are not security or authorization truth.

Potential contents only after product contracts exist:

- curated Create defaults;
- notification delivery preferences;
- an application reduced-motion override if user demand justifies an override beyond the OS preference.

This section must **not** become a dumping ground for fake settings.

### Notifications

A separate section is justified only if RenderLab gains real user-notification channels.

Security notifications should normally be mandatory/non-optional. Product notifications such as generation completed/failed may be optional if an email/browser/push delivery system is actually implemented.

## 5. Gap inventory and priority

| Capability | Current state | Target | Priority | Major dependency / risk |
| --- | --- | --- | --- | --- |
| Truthful sign-out scope | Global behavior exists; UI is being corrected in v0.2 R&D | Explicit local / others / global actions | P0 | Browser/server semantics and exact revocation tests |
| Production Auth email | Built-in mailer recorded in Phase 10D | Branded reliable custom SMTP/Auth email hook | P0 broader-beta blocker | Operator config, sender domain, deliverability |
| Auth URL/template posture | Not fully verified from CI | Verified Site URL, redirect allowlist, invite/recovery templates | P0 | Operator config + safe link handling |
| Security email notifications | Not productized | Password/email/MFA/sign-in-method change notices | P0 | Hosted Auth config + custom SMTP |
| Password policy | App UI minimum 8 | Standards-aligned minimum, long-password support, no arbitrary composition | P0 | Hosted Auth config + compatibility tests |
| Leaked-password block | Advisor WARN: disabled | Enable and verify when plan permits | P0 broader-beta blocker | Supabase plan capability |
| CAPTCHA / abuse posture | Not part of Settings flow | Turnstile/hCaptcha where threat model requires | P0/P1 | Auth config, UX, automated testing strategy |
| MFA TOTP | Missing | Enrollment, challenge, factor management, backup/recovery policy | P0 security | Login flow + AAL enforcement + recovery |
| Admin AAL2 | Missing | Mandatory MFA/step-up for privileged Admin | P0 security | MFA foundation, server authorization changes |
| Sensitive-action step-up | Current-password check exists only for ordinary password change | Reauth/AAL2 for password/email/MFA/delete high-risk operations | P0/P1 | Unified reauth contract |
| Session bulk controls | Only implicit global sign-out UI | Current / others / everywhere actions | P1 | Explicit signOut scopes |
| Session inventory | Missing | Owner-only active sessions with truthful metadata | P1 | Trusted server access to `auth.sessions`, privacy |
| Per-session revoke | Missing | Revoke a chosen owned session if safely targetable | P1 research | Supabase API feasibility; do not delete auth internals ad hoc |
| Security activity | Missing | Sanitized recent auth/security event register | P1 | Event filtering from Auth audit logs, retention |
| Change email | Missing | Reauth + secure confirmation + notification | P1 | Closed Beta admission/email audit |
| MFA recovery | Missing | Backup factor + documented recovery path | P1 prerequisite to mandatory MFA | Avoid creating an MFA bypass |
| Passkeys | Missing | Optional phishing-resistant sign-in/management | P2 research | Supabase feature is experimental; RP domain lock-in |
| Linked sign-in methods/OAuth | Missing | Optional account linking only if user need exists | P2 | Invitation-only admission and identity linking |
| Data export | Missing | Async account/media export with expiring delivery | P1/P2 | Data inventory, media volume, privacy/security |
| Account deletion | Missing | Reauthenticated orchestrated deletion lifecycle | P1/P2 | Owner FKs, active jobs, R2 purge, retention |
| Retention policy | Implicit across existing tables/tombstones | Explicit per data class | P1 prerequisite to deletion/export | Product/legal/operational decision |
| User preferences model | Missing | Small typed server-owned preference contract | P2 | Only after real persistent preferences chosen |
| Generation notifications | Missing | Optional completion/failure notifications | P2 | Notification transport + job event delivery |
| Appearance theme setting | Missing | Deferred | Deferred | Light theme would be a cross-product design project, not a toggle |
| Language/region | Missing | Deferred until i18n exists | Deferred | Full localization capability |
| Billing/subscription | Not a product capability | No Settings surface until commercial model exists | Deferred | Billing product decision |
| API keys / connected apps | Not a product capability | No Settings surface until developer API/integrations exist | Deferred | API platform |
| Team/workspace controls | Not a product capability | No Settings surface until collaboration exists | Deferred | Multi-user product model |

## 6. Workstream A — Auth and email-delivery hardening

**Priority:** first prerequisite; much of this is platform hardening rather than Settings UI.

### Goals

1. Verify and document hosted Auth production configuration.
2. Make recovery/invite/security mail reliable enough for broader beta.
3. Align password and abuse controls with modern security guidance.

### Planned scope

- audit Site URL and redirect allowlist;
- audit invite, recovery, reauthentication and future email-change templates;
- replace built-in Supabase mailer with custom SMTP or an approved Send Email Auth Hook;
- configure sender identity and SPF/DKIM/DMARC;
- ensure Auth-link tracking is disabled and templates are resilient to email link prefetch/scanning;
- enable security notifications for password/email/factor/sign-in-method changes where supported;
- review Auth endpoint rate limits;
- evaluate Cloudflare Turnstile as the preferred CAPTCHA because RenderLab already uses Cloudflare infrastructure, but do not adopt it solely for stack symmetry;
- set password policy from standards rather than arbitrary composition rules;
- enable leaked-password protection when hosted plan capability permits and verify the Security Advisor clears.

### Password policy decision gate

Before MFA is required for an account, target the NIST single-factor minimum of 15 characters. Preserve long passwords (at least 64 supported by the Auth service) and do not add forced mixed-case/symbol rules solely for appearance.

If RenderLab later mandates MFA for all users, a shorter minimum may be standards-permitted, but changing policy should remain explicit rather than silently weakening it.

### Exit evidence

- hosted configuration evidence recorded without secrets;
- configured Auth-email delivery test against owned test identities;
- enumeration-safe recovery preserved;
- Security Advisor reviewed;
- rate-limit/CAPTCHA behavior verified without blocking ordinary accessibility;
- no user-facing raw Supabase errors.

## 7. Workstream B — Session controls and security activity

**Priority:** P1 mature-account baseline.

### Immediate capability

Supabase already supports explicit sign-out scopes, so Settings can eventually offer:

- **Sign out this device** → local;
- **Sign out other devices** → others;
- **Sign out everywhere** → global.

These must each have exact tests against multiple real sessions.

### Session inventory

The live shared project's `auth.sessions` table has the fields needed for a truthful first inventory: session ID, owner, created/refreshed times, AAL, user agent and IP.

RenderLab must access that data through a trusted server boundary. The browser must never gain general Auth-schema access.

Recommended first presentation:

- current session marker derived from the authenticated token's `session_id`;
- created/last refreshed time;
- normalized browser/device family only if derived deterministically from the stored user agent;
- IP display only after a deliberate privacy decision; raw IP is not automatically useful UX;
- no city/country label unless a trustworthy geolocation source is explicitly adopted.

### Selective revoke research gate

Do **not** promise a per-row `Revoke` action merely because sessions can be listed. Confirm a supported Auth API for revoking a specific owned session. Directly deleting rows from the Auth schema is not an acceptable product API unless Supabase explicitly documents it as supported.

If exact single-session revocation is not supportable, ship only local/others/global controls and a read-only inventory.

### Security activity

A future security register may be built from sanitized Auth audit events such as:

- sign-in;
- password changed;
- email changed;
- MFA factor enrolled/removed;
- passkey/sign-in method linked/removed;
- global/other-session sign-out where observable;
- recovery completed.

Never expose raw tokens, arbitrary audit payloads or internal provider metadata.

## 8. Workstream C — MFA and privileged step-up

**Priority:** P0 security for Admin; P1 for ordinary members.

### First factor type

Start with **TOTP authenticator-app MFA** because it is stable, does not depend on SMS delivery and is already supported by Supabase Auth.

Do not start with phone MFA unless a concrete user requirement justifies SIM-swap exposure and messaging cost/operations.

### User flow

Settings Security should eventually support:

- view enrolled factors;
- enroll TOTP and display QR + manual secret fallback;
- verify enrollment before treating a factor as active;
- give factors a comprehensible label;
- add a backup factor;
- remove/replace a factor only after step-up verification;
- explain when the current session is `aal1` vs `aal2` only where the distinction is actionable.

### Enforcement

MFA is not complete until the server enforces it.

Minimum target:

- active admins must use `aal2` before entering/operating Admin;
- changing/removing MFA factors requires `aal2` or equivalent fresh step-up;
- account deletion and sign-in-email change require strong reauthentication;
- ordinary member MFA policy is an explicit product decision: optional-with-enforcement-if-enrolled vs mandatory.

### Recovery

Mandatory MFA cannot ship without a recovery policy.

Initial preferred strategy:

- allow more than one TOTP factor and encourage a backup factor stored on a different device;
- define an operator-assisted recovery procedure with strong identity verification if all factors are lost;
- never let ordinary email recovery silently bypass an enrolled MFA policy;
- emit a security notification whenever factors are added/removed.

## 9. Workstream D — Identity and sign-in method management

**Priority:** P1 after step-up foundation.

### Change sign-in email

Target behavior:

1. Require recent credential reauthentication or `aal2` step-up.
2. Collect new email.
3. Use Supabase secure email-change confirmation behavior.
4. Keep the old identity active until the required confirmation succeeds.
5. Notify the old/new address as supported.
6. Refresh server identity after confirmation.

RenderLab ownership must remain attached to the same `auth.users.id`.

### Closed Beta/admission audit

Before implementation, verify:

- `renderlab_account_access` continues to key only on `user_id` and needs no rewrite;
- pending `renderlab_beta_invitations.normalized_email` behavior is correct when the account is already admitted and later changes email;
- Admin account display/search uses the current verified Auth email rather than a stale copied value;
- an email change cannot claim or inherit another person's pending invitation.

### Linked sign-in methods

Social/OAuth linking is not automatically a maturity requirement. Evaluate it only if it solves a real friction point.

If adopted:

- linking happens from an already authenticated RenderLab account;
- provider identity never grants RenderLab admission by itself;
- unlinking the last usable sign-in method must be blocked;
- security notifications are mandatory;
- collision/account-linking behavior receives explicit two-account tests.

## 10. Workstream E — Data export, retention and account deletion

**Priority:** P1 architecture / P2 implementation, but must be designed before public-scale account lifecycle claims.

### Why deletion is non-trivial

RenderLab deliberately uses `owner_id -> auth.users.id ON DELETE RESTRICT` on core account-owned data. This is a security/integrity feature. Self-service account deletion must not weaken it globally.

The account may own:

- generation jobs and their persisted product intent;
- generation sources;
- media assets and R2 objects;
- upload sessions;
- Favorites/Collections and collection membership;
- generation admission reservations;
- RenderLab account-access state;
- security/auth sessions/factors;
- historical operational records that may need bounded retention or de-identification.

### Data export target

Prefer an asynchronous export workflow that creates an expiring export package or manifest.

Potential export contents:

- account/access metadata appropriate for the user;
- generation history, prompts and normalized user-facing settings;
- collections/favorites metadata;
- durable media originals where practical;
- a machine-readable manifest relating media to jobs/collections.

Exclude secrets, provider credentials, worker routing and internal execution metadata.

### Account deletion lifecycle

Proposed contract sequence:

1. Fresh reauthentication / AAL2 step-up.
2. Explain scope, retention exceptions and irreversible consequences.
3. Offer data export before destructive confirmation.
4. Block new generation/admission for the account.
5. Resolve active jobs under an explicit policy; do not orphan backend work.
6. Tombstone/delete owned media and purge R2 objects through existing safe deletion mechanics or a dedicated owner-wide equivalent.
7. Remove collection/upload/admission state in dependency-safe order.
8. Delete or de-identify generation history according to the retention policy.
9. Revoke all sessions/factors.
10. Remove RenderLab account-access state.
11. Delete/de-identify the Supabase Auth user **last**, after `ON DELETE RESTRICT` relationships are intentionally cleared.
12. Verify no owner-scoped database/R2 residue remains beyond documented retention exceptions.

### Retention decisions required first

Explicitly classify:

- active/succeeded/failed/cancelled generation jobs;
- deleted/tombstoned media;
- R2 objects;
- Auth/security audit logs;
- Admin audit evidence if introduced;
- abuse/security records;
- aggregate non-identifying operational metrics.

Account deletion cannot be called complete while these rules are implicit.

## 11. Workstream F — product preferences and notifications

**Priority:** P2; do not let this delay security fundamentals.

### Typed preference model

If multiple durable preferences are approved, introduce one typed RenderLab-owned preference contract rather than scattering browser local-storage flags.

Potential first-class preferences:

- preferred Create output kind;
- preferred supported image aspect ratio;
- preferred supported Video resolution/duration/audio defaults;
- optional generation completion/failure notification choices.

Rules:

- capability definitions remain authoritative; a stale saved value must fall back to the current valid default;
- do not persist worker/model implementation identities as user preferences;
- security/authorization state is never a preference;
- URL/server-owned Library state remains separate unless a product decision deliberately makes a default persistent.

### Notification architecture

Do not create toggles until there is a real delivery channel.

Potential channels:

- in-app notification center;
- email for long-running generation completion/failure;
- browser notification only after explicit permission and a real background delivery design.

Security notifications are not ordinary marketing/product preferences and should not be user-disableable by default.

## 12. Passkeys/WebAuthn research lane

Passkeys are attractive because they are phishing-resistant and Supabase now documents hosted passkey support. However, Supabase currently marks the feature **experimental**.

RenderLab should therefore treat passkeys as a research lane after stable TOTP MFA/step-up exists.

Research requirements:

- confirm hosted-project availability and configuration without mutating production;
- lock the WebAuthn relying-party ID to the final RenderLab domain strategy before enrollment because changing RP ID invalidates registered passkeys;
- verify SSR/client library compatibility with current package versions;
- design registration, rename, last-used display and removal;
- define password + passkey coexistence and recovery;
- never make experimental passkeys the only way an account can recover.

If Supabase promotes the capability and the research is clean, passkeys can become a high-value security enhancement rather than a novelty setting.

## 13. Deliberately deferred conventional categories

The following are common on other products but are **not currently justified RenderLab settings**:

### Profile / avatar / username

Deferred until collaboration, sharing, comments, public galleries or another person-facing identity feature exists.

### Theme / light mode

A theme setting is not a one-control feature. RenderLab's current product system is designed around the near-black visual language. A real light theme requires cross-product design/token/accessibility work and should be planned as such.

### Language / region

Deferred until an i18n/localization program exists.

### Billing / subscription / invoices

Deferred until RenderLab has a commercial/billing model.

### API keys / connected apps

Deferred until RenderLab exposes a developer API or third-party integration contract.

### Team / workspace / organization membership

Deferred until multi-user collaboration/workspaces exist.

### Marketing communication preferences

Deferred until RenderLab actually sends optional marketing communications. Security and transactional account mail are not marketing preferences.

This list is a guard against fake maturity: conventional menu labels are not product capabilities.

## 14. Proposed execution sequence

This roadmap is deliberately progressive. Only the immediate next workstream should be expanded into an execution-ready implementation contract.

### 0 — Phase 27 visual/account IA

Continue the current Settings R&D/visual redesign using only truthful current behavior plus labels/actions that are already supported. Phase 27 may establish the future section geometry, but must not render disabled fake MFA/session/delete controls simply to preview roadmap features.

### 1 — Auth & email hardening

Workstream A. Treat broader-beta blockers first.

### 2 — Session controls & security activity

Workstream B. Establish mature incident-response/account visibility.

### 3 — MFA & privileged step-up

Workstream C. Admin AAL2 is the minimum security target; ordinary-user policy is decided in the phase contract.

### 4 — Identity management

Workstream D. Add email changes and only then consider optional linked sign-in methods.

### 5 — Data/privacy lifecycle

Workstream E. Implement export, retention and account deletion from a verified ownership/data map.

### 6 — Preferences & product notifications

Workstream F. Add only product-backed durable preferences and channels.

### 7 — Passkeys

Promote from research only when provider maturity, domain strategy and recovery story are acceptable.

Phase 28 Admin redesign and Phase 29 cohesion remain the current UI-redesign roadmap; this account-capability roadmap is a parallel product/security program. Reordering either program requires an explicit repository decision rather than silently renumbering existing phases.

## 15. Cross-cutting implementation invariants

Every future account-capability phase must preserve:

- `auth.users.id` as canonical identity unless explicitly redesigned;
- RenderLab admission/role state separate from Auth provider metadata;
- no authorization from user-editable metadata;
- server verification of current identity for private/sensitive actions;
- owner-scoped data access;
- fail-closed behavior on auth/recovery ambiguity;
- enumeration-safe recovery;
- sanitized user-facing failures;
- no browser service-role/secret access;
- no direct browser access to Auth schema/session/audit tables;
- no raw session/access/refresh tokens in logs or UI;
- exact fixture isolation/cleanup for Auth-backed CI;
- keyboard/touch/focus/accessibility parity;
- no deployment/config mutation without explicit authorization.

Sensitive operations—email change, MFA factor mutation, account deletion, sign-in-method mutation and similarly high-impact actions—must define their own reauthentication/step-up guarantee rather than assuming an existing session is enough.

## 16. Validation expectations by workstream

### Auth/email hardening

- real owned test identities;
- custom-mail delivery evidence without exposing message secrets;
- safe redirect/link behavior;
- recovery enumeration protection;
- security advisor evidence;
- CAPTCHA/rate-limit tests if enabled.

### Sessions

- at least two simultaneous sessions;
- local/others/global exact revocation matrix;
- current-session identification;
- owner isolation for any inventory endpoint;
- stale bearer rejection after revocation;
- sanitized metadata review.

### MFA

- enroll/challenge/verify;
- AAL1 → AAL2 transition;
- protected Admin/sensitive-action denial at AAL1;
- factor removal/backup factor;
- lost-factor recovery test;
- other-session behavior after enrollment/removal;
- exact cleanup of MFA fixtures.

### Email change

- old/new address confirmations as configured;
- same `auth.users.id` preserved;
- RenderLab access/media ownership preserved;
- invitation/admin-email edge cases;
- security notification;
- two-account collision tests.

### Export/deletion

- owned account with media/jobs/collections/upload/admission state;
- active-job policy;
- R2 exact cleanup;
- database owner-row cleanup/de-identification;
- session revocation;
- final Auth deletion;
- explicit retention-exception audit;
- cross-account non-interference.

### Preferences/notifications

- server-owned typed preference validation;
- stale capability fallback;
- cross-device persistence;
- channel delivery/opt-out behavior;
- security notifications kept distinct from optional product notifications.

## 17. Documentation contract

When this roadmap is merged:

- `PROJECT.md` should reference it as the account-management product roadmap;
- `docs/architecture/PRODUCT_CAPABILITIES.md` should distinguish existing Phase 10 account capability from this future expansion;
- `docs/ui/UI_MIGRATION.md` should make clear that Phase 27 visual completion does not close the account/settings capability program;
- `docs/ui/SCREEN_REGISTRY.md` should only be updated when actual Settings capabilities are implemented and verified, not merely because they appear on this roadmap.

For each future workstream, update the existing authoritative documents rather than creating competing status files.

## 18. Roadmap completion definition

The broader Account & Settings program is not complete when the Phase 27 page looks polished. It is complete only when the product has deliberately addressed or explicitly rejected the following maturity areas:

- reliable account email/recovery infrastructure;
- modern password/abuse posture;
- session control and security visibility;
- MFA/step-up for privileged and sensitive operations;
- identity/email management;
- safe recovery for stronger authentication;
- user data export and account deletion/retention;
- product-backed preferences/notifications;
- an explicit decision on passkeys and linked identities;
- clear documentation of intentionally deferred categories.

Until then, Phase 27 should be described as the **Settings visual/account-IA redesign**, not the completion of RenderLab account management.
