# Account & Settings Capability Roadmap

**Status:** ACCEPTED PLANNING BASELINE / MERGED / IMPLEMENTATION PENDING  
**Tracker:** #213  
**Roadmap merge:** PR #214 / `74829e0cdad8edf423863efbbc1af98ad0f9ce79`  
**Baseline audited:** `main` `750a5365ad9786f9216f7acef10d829cae048d60` plus fresh 2026-09-13 Supabase/security audit  
**Related visual R&D:** Phase 27 / #211 / draft PR #212  
**Scope:** account, authentication, security, privacy/data lifecycle, user preferences and notification capability planning  
**Does not authorize:** production implementation, hosted Supabase Auth configuration changes, schema changes, provider changes, or deployment

## 1. Purpose

RenderLab's existing `/settings` and `/settings/password` flows correctly implement a narrow Closed Beta account baseline, but the underlying account-management product is materially shallower than the account/security surfaces expected from a mature application.

Phase 27 can improve the visual hierarchy and account information architecture, but a visual redesign must not create the false impression that the broader account-management program is complete. Missing capabilities require explicit product, security, data and infrastructure contracts before controls are added to Settings.

This roadmap is the durable gap inventory, target Settings information architecture and sequencing plan. It separates:

1. existing behavior Phase 27 may present more clearly now;
2. platform/Auth hardening that may have little visible Settings UI;
3. new user-facing security/account capabilities;
4. privacy/data-lifecycle capabilities tied to RenderLab ownership/storage;
5. product preferences and notification settings that should exist only after the underlying capability exists;
6. conventional settings categories deliberately deferred because RenderLab has no current product requirement for them.

The goal is a complete, truthful account system—not a visually fuller page.

## 2. Roadmap workstreams

The umbrella tracker is #213. Future work is split into roadmap-level issues so only the immediate next slice needs to be expanded into an execution-ready implementation contract.

| Workstream | Tracker | Purpose | Default priority |
| --- | --- | --- | --- |
| Auth and email delivery hardening | #215 | Production-ready Auth email, URL/template posture, password/abuse hardening | P0 prerequisite |
| Session controls and security activity | #216 | Local/other/global sign-out, session visibility, security events | P1 |
| MFA and privileged step-up | #217 | TOTP, AAL2 and sensitive-operation step-up | P0 security / P1 members |
| Identity and sign-in methods | #218 | Secure email change and justified linked identities | P1 |
| Data export, retention and account deletion | #219 | Export, retention and safe owner-wide deletion | P1 architecture / P2 implementation |
| Product preferences and notifications | #220 | Only durable settings backed by real product capability | P2 |
| Passkeys / WebAuthn research | #221 | Evaluate experimental passkeys without making them a required recovery path | Research / P2 |

These issues are roadmap-level. Their existence does not authorize implementation or hosted configuration mutation.

## 3. Current verified RenderLab baseline

Current repository behavior already provides:

- Supabase Auth `auth.users.id` as the canonical account identity.
- Authentication separated from RenderLab admission and role authorization.
- Invitation-gated Closed Beta admission.
- RenderLab-owned `member` / `admin` role and `active` / `suspended` access status.
- Email/password sign-in for invited accounts.
- Enumeration-safe forgot-password request.
- Recovery-link password replacement only after a server-validated signed recovery marker.
- Ordinary password change with current-password verification.
- Password change/recovery session semantics verified by the configured Account Identity workflow: the acting/recovery session remains usable while other sessions are revoked.
- Settings sign-out currently calls Supabase JavaScript `signOut()` without a scope; current Supabase behavior makes that global sign-out and RenderLab's verifier proves a secondary session is revoked.
- Private server identity resolution uses fresh Supabase `getUser()` state, so still-unexpired revoked bearer sessions fail private RenderLab authorization.
- Server-owned access/admission truth and fresh Admin eligibility.
- Conditional Admin continuation from Settings only for an active fresh-authorized admin identity.
- Existing owner-scoped media, generation, collection, upload and admission records tied to `auth.users.id`.

Phase 27 v0.2 may make these truths clearer, but it must not imply later roadmap capabilities already exist.

## 4. Current hosted/Auth hardening facts

The repository's Phase 10D audit established that:

- the shared project was using Supabase's built-in Auth mailer at the time of the audit;
- hosted Site URL / redirect allowlist / production template and sender posture were not fully verified from CI;
- password recovery mail hit built-in email rate limiting during audit;
- leaked-password protection remained disabled and was recorded as a broader-beta blocker;
- hosted Auth configuration changes require explicit operator authorization and are not ordinary application-code changes.

A fresh Security Advisor read on 2026-09-13 still reports **Leaked Password Protection Disabled**. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables.

## 5. Current Supabase capability facts

Current Supabase Auth documentation plus a fresh read-only shared-project schema audit establish that:

- JavaScript sign-out supports `local`, `others` and `global` scopes; JavaScript defaults to `global`.
- `auth.sessions` exists and records owner/session identity, created/refreshed timestamps, AAL, user agent and IP among other internal fields.
- `auth.audit_log_entries` exists and can support a sanitized security-event surface if filtered through a trusted server boundary.
- `auth.mfa_factors` exists.
- TOTP MFA enrollment/challenge/verification and factor management are supported, and sessions/JWTs expose `aal1` / `aal2` assurance.
- MFA must be enforced at authorization boundaries; rendering enrollment UI alone is not enough.
- security-notification email templates are available for password changes, email changes, sign-in-method linking/unlinking and MFA factor changes when enabled/configured.
- secure email change is supported through Auth and has confirmation/security-notification flows.
- hosted Auth supports session lifetime/inactivity controls, with plan-dependent options.
- CAPTCHA/Turnstile can protect sign-in and password-reset flows.
- password minimums, leaked-password protection and reauthentication controls are configurable.
- passkey/WebAuthn support exists and RenderLab's `@supabase/supabase-js` `2.112.4` satisfies the documented minimum library version, but Supabase currently marks passkeys **experimental**.

These facts make roadmap capabilities feasible; they do not make them implemented.

## 6. Security principles used for prioritization

The roadmap follows current security guidance rather than copying another product's Settings menu.

- For password-only authentication, target a long minimum password rather than arbitrary composition rules. NIST SP 800-63B-4 uses 15 characters as the minimum when a password is the single factor, permits shorter minimums when the password is only one factor in MFA, recommends support for long passwords and rejects arbitrary composition requirements.
- Block known compromised/common passwords when the hosted plan supports it rather than relying on decorative password-strength meters.
- Reauthenticate or step up before high-risk identity/security changes.
- MFA is especially important for privileged Admin operations.
- MFA factor replacement/recovery is itself a high-risk operation and requires an explicit recovery policy plus notification.
- Session controls and security activity must not leak tokens or overstate unverifiable device/location information.
- Recovery mechanisms must not silently become bypasses for stronger authentication.

These are product-security requirements, not claims of certification or compliance.

## 7. Target Settings information architecture

The mature target is not one giant account page. Settings should evolve into a small set of truthful sections as capabilities become real.

### Account

Purpose: canonical identity and access context.

Eventually contains:

- sign-in email;
- change sign-in email;
- Closed Beta / future account-access status;
- role only as read-only product truth;
- conditional Admin continuation;
- account creation/joined date only if there is real user value in displaying it.

Not included by default:

- avatar;
- display name;
- username;
- biography;
- public profile.

RenderLab currently has no collaboration/public-profile capability that makes those fields useful.

### Security

Purpose: authentication factors and sensitive account controls.

Target contents:

- password change and password-policy help;
- MFA enrollment and factor management;
- step-up/AAL context only where it explains an actionable security requirement;
- future passkey management only after deliberate adoption of the experimental provider capability;
- security-notification information only where users can meaningfully act on it.

### Sessions

Purpose: session scope and account-takeover response.

Target contents:

- current-session identity;
- `Sign out this device`;
- `Sign out other devices`;
- `Sign out everywhere`;
- active-session inventory when a trusted server contract is verified;
- sanitized recent security activity.

A session list must not imply per-row revoke if exact owned-session revocation is not supportable.

### Data & Privacy

Purpose: user-owned data lifecycle.

Target contents:

- export account data;
- export/download durable media in a bounded flow;
- account deletion request;
- retention/deletion explanation;
- privacy/terms links when those documents become real public product requirements.

### Preferences

Purpose: durable user choices that are not security or authorization truth.

Potential contents only after product contracts exist:

- curated Create defaults;
- notification-delivery preferences;
- an application reduced-motion override only if there is demonstrated need beyond the OS preference.

Preferences must not become a dumping ground for fake settings.

### Notifications

A separate Notifications section is justified only if RenderLab gains real user-notification channels.

Security/transactional notifications should generally be mandatory. Product notifications such as generation-completed/failed may be optional if an email/browser/push delivery system actually exists.

## 8. Gap inventory and priority

| Capability | Current state | Target | Priority | Dependency / risk |
| --- | --- | --- | --- | --- |
| Truthful sign-out scope | Global behavior exists; Phase 27 copy is being corrected | Explicit current / others / everywhere controls | P0 | Multi-session semantics and tests |
| Production Auth email | Built-in mailer recorded | Branded reliable custom SMTP/Auth email hook | P0 broader-beta blocker | Operator config and deliverability |
| Auth URL/template posture | Not fully verified | Verified Site URL, redirect allowlist, invite/recovery/reauth templates | P0 | Hosted config and link safety |
| Security email notifications | Not productized | Password/email/MFA/sign-in-method change notices | P0 | Hosted config + reliable mail |
| Password policy | App UI minimum 8 | Standards-aligned long-password policy | P0 | Hosted Auth config + compatibility |
| Leaked-password block | Advisor WARN: disabled | Enable/verify when plan permits | P0 broader-beta blocker | Plan capability |
| CAPTCHA / abuse posture | Not part of current flow | Turnstile/hCaptcha when threat model warrants | P0/P1 | Auth config, UX, test strategy |
| MFA TOTP | Missing | Enrollment, factors, recovery policy | P0 security | Login/AAL enforcement/recovery |
| Admin AAL2 | Missing | Mandatory step-up for privileged Admin | P0 security | MFA foundation |
| Sensitive-action step-up | Current-password check only on ordinary password change | Strong reauth for email/MFA/delete/sign-in methods | P0/P1 | Unified reauth contract |
| Session bulk controls | Only implicit global sign-out | Current / others / everywhere | P1 | Explicit sign-out scopes |
| Session inventory | Missing | Owner-only trusted active-session list | P1 | Server access, privacy |
| Per-session revoke | Missing | Revoke chosen owned session if supported | P1 research | Provider API feasibility |
| Security activity | Missing | Sanitized auth/security event register | P1 | Audit filtering and retention |
| Change email | Missing | Reauth + confirmation + notification | P1 | Admission/email audit |
| MFA recovery | Missing | Backup factor + documented recovery | P1 prerequisite to mandatory MFA | Avoid MFA bypass |
| Passkeys | Missing | Optional phishing-resistant sign-in/management | P2 research | Experimental feature + RP lock-in |
| Linked sign-in methods/OAuth | Missing | Optional linking only if useful | P2 | Invitation-only admission and identity collision |
| Data export | Missing | Async account/media export | P1/P2 | Data inventory, media volume, privacy |
| Account deletion | Missing | Reauthenticated orchestrated lifecycle | P1/P2 | Owner FKs, active jobs, R2, retention |
| Retention policy | Implicit | Explicit policy by data class | P1 prerequisite | Product/legal/operations decision |
| User preferences model | Missing | Small typed server-owned contract | P2 | Only real persistent settings |
| Generation notifications | Missing | Optional completion/failure notifications | P2 | Delivery transport + job events |
| Appearance/light theme | Missing | Deferred | Deferred | Cross-product theme project, not one toggle |
| Language/region | Missing | Deferred until i18n exists | Deferred | Localization program |
| Billing/subscription | No product capability | No surface until commercial model exists | Deferred | Billing product decision |
| API keys / connected apps | No product capability | No surface until developer/integration platform exists | Deferred | API platform |
| Team/workspace controls | No product capability | No surface until collaboration exists | Deferred | Multi-user product model |

## 9. Workstream A — Auth and email delivery hardening (#215)

**Priority:** first prerequisite; much of this is platform hardening rather than Settings UI.

### Planned scope

- audit hosted Site URL and redirect allowlist;
- audit invite, recovery, reauthentication and future email-change templates;
- replace the built-in mailer with custom SMTP or an approved Send Email Auth Hook;
- configure sender identity and SPF/DKIM/DMARC;
- ensure Auth-link tracking is disabled and templates are resilient to email-link prefetch/scanning;
- enable supported security notifications for password/email/factor/sign-in-method changes;
- review Auth endpoint rate limits;
- evaluate Cloudflare Turnstile as a CAPTCHA candidate because RenderLab already uses Cloudflare infrastructure, without adopting it solely for stack symmetry;
- set password policy from standards rather than arbitrary composition rules;
- enable leaked-password protection when hosted plan capability permits and verify the Security Advisor clears.

### Password policy decision gate

Before MFA is mandatory for an account, target the NIST password-only minimum of 15 characters, preserve long-password support and avoid forced mixed-case/symbol rules solely for appearance.

If RenderLab later mandates MFA for all users, a shorter minimum may be standards-permitted, but any change remains explicit rather than silently weakening policy.

### Exit evidence

- hosted configuration evidence recorded without secrets;
- configured Auth-email delivery against owned test identities;
- enumeration-safe recovery preserved;
- Security Advisor reviewed;
- rate-limit/CAPTCHA behavior verified when enabled;
- no raw Supabase errors exposed to users.

## 10. Workstream B — Session controls and security activity (#216)

### Supported bulk scopes

Supabase already supports:

- **Sign out this device** → local;
- **Sign out other devices** → others;
- **Sign out everywhere** → global.

Each must have exact real multi-session tests.

### Session inventory

The shared project's `auth.sessions` fields are sufficient for a truthful first inventory through a trusted server boundary.

Recommended presentation:

- current-session marker derived from verified session identity;
- created/last-refreshed time;
- normalized browser/device family only if derived deterministically from stored user agent;
- IP only after a deliberate privacy decision;
- no city/country label unless a trustworthy geolocation source is explicitly adopted.

### Selective-revoke research gate

Do not promise per-row `Revoke` simply because sessions can be listed. Confirm a supported Auth API for revoking a specific owned session. Directly deleting rows from Auth schema is not an acceptable product API unless Supabase explicitly documents that path as supported.

If exact single-session revocation is not supportable, ship local/others/global controls plus a read-only inventory.

### Security activity

Potential sanitized events include:

- sign-in;
- password changed;
- email changed;
- MFA factor enrolled/removed;
- passkey/sign-in method linked/removed;
- global/other-session sign-out where observable;
- recovery completed.

Never expose raw tokens, arbitrary audit payloads or internal provider metadata.

## 11. Workstream C — MFA and privileged step-up (#217)

**Priority:** P0 for Admin; P1 for ordinary members.

### First factor

Start with **TOTP authenticator-app MFA** because it is stable, does not depend on SMS delivery and is supported by Supabase Auth.

Do not start with phone MFA unless a concrete user requirement justifies SIM-swap exposure and messaging operations/cost.

### Target user flow

Security should eventually support:

- view enrolled factors;
- enroll TOTP with QR plus manual-secret fallback;
- verify enrollment before treating a factor as active;
- give factors a comprehensible label where supported;
- add a backup factor;
- remove/replace a factor only after step-up verification;
- explain `aal1` vs `aal2` only where the distinction is actionable.

### Enforcement

MFA is not complete until server authorization enforces it.

Minimum target:

- active admins require `aal2` before entering/operating Admin;
- modifying MFA factors requires `aal2` or equivalent strong fresh step-up;
- account deletion and sign-in-email change require strong reauthentication;
- ordinary-member MFA policy is an explicit decision: optional-with-enforcement-if-enrolled vs mandatory.

### Recovery

Mandatory MFA cannot ship without a recovery policy.

Preferred initial strategy:

- allow more than one TOTP factor and encourage a backup factor on a separate device;
- define operator-assisted recovery with strong identity verification if all factors are lost;
- never let ordinary email recovery silently bypass enrolled MFA;
- emit security notifications whenever factors are added/removed.

## 12. Workstream D — Identity and sign-in method management (#218)

### Change sign-in email

Target sequence:

1. Require recent credential reauthentication or `aal2`.
2. Collect the new email.
3. Use Supabase secure email-change confirmation behavior.
4. Preserve the old identity until required confirmation succeeds.
5. Notify old/new addresses as supported.
6. Refresh server identity after confirmation.

RenderLab ownership stays attached to the same `auth.users.id`.

### Admission edge cases

Before implementation, verify:

- `renderlab_account_access` remains keyed only on `user_id` and needs no rewrite;
- pending `renderlab_beta_invitations.normalized_email` behavior is correct after an already-admitted account changes address;
- Admin display/search uses current verified Auth email rather than stale copied data;
- email change cannot claim or inherit another person's pending invitation.

### Linked identities

OAuth/social linking is not automatically a maturity requirement. Adopt only if it solves real user friction.

If adopted:

- linking starts from an already authenticated account;
- provider identity never grants admission by itself;
- unlinking the last usable sign-in method is blocked;
- security notifications are mandatory;
- account-collision behavior receives explicit two-account tests.

## 13. Workstream E — Data export, retention and account deletion (#219)

### Why deletion is non-trivial

RenderLab deliberately uses `owner_id -> auth.users.id ON DELETE RESTRICT` on core account-owned data. This is an integrity feature. Self-service deletion must not weaken it globally.

An account may own:

- generation jobs and persisted product intent;
- generation sources;
- media assets and R2 objects;
- upload sessions;
- Favorites/Collections and memberships;
- admission reservations;
- RenderLab account-access state;
- security/Auth sessions/factors;
- historical operational/security records subject to bounded retention/de-identification.

### Data export target

Prefer an asynchronous export workflow producing an expiring export package or manifest.

Potential contents:

- account/access metadata appropriate for the user;
- generation history, prompts and normalized user-facing settings;
- collections/favorites metadata;
- durable media originals where practical;
- a machine-readable manifest relating media to jobs/collections.

Exclude secrets, provider credentials, worker routing and internal execution metadata.

### Account deletion lifecycle

Proposed sequence:

1. Fresh reauthentication / AAL2 step-up.
2. Explain scope, retention exceptions and irreversible consequences.
3. Offer data export before destructive confirmation.
4. Block new generation/admission for the account.
5. Resolve active jobs under an explicit policy; do not orphan accepted backend work.
6. Tombstone/delete owned media and purge R2 through safe deletion mechanics or a dedicated owner-wide equivalent.
7. Remove collection/upload/admission state in dependency-safe order.
8. Delete or de-identify generation history according to retention policy.
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
- future Admin/security audit evidence;
- abuse/security records;
- aggregate non-identifying operational metrics.

Account deletion cannot be called complete while these rules remain implicit.

## 14. Workstream F — Product preferences and notifications (#220)

**Priority:** P2; do not let this delay security fundamentals.

### Typed preference model

If multiple durable preferences are approved, use one typed RenderLab-owned server contract rather than scattering browser local-storage flags.

Potential first-class preferences:

- preferred Create output kind;
- preferred supported image aspect ratio;
- preferred supported Video resolution/duration/audio defaults;
- optional generation-completion/failure notification choices.

Rules:

- capability definitions remain authoritative; stale saved values fall back to current valid defaults;
- do not persist worker/model implementation identities as preferences;
- security/authorization state is never a preference;
- existing URL/server-owned Library state stays separate unless a product decision deliberately makes a default persistent.

### Notification architecture

Do not create toggles until a real delivery channel exists.

Potential channels:

- in-app notification center;
- email for long-running generation completion/failure;
- browser notification only after explicit permission and a real background-delivery design.

Security notifications are not marketing/product preferences and should not be user-disableable by default.

## 15. Passkeys / WebAuthn research (#221)

Passkeys are attractive because they are phishing-resistant and Supabase now documents hosted passkey support. Supabase currently marks the capability **experimental**.

RenderLab should therefore treat passkeys as research after stable TOTP MFA/step-up exists.

Research requirements:

- confirm hosted-project availability/configuration without mutating production;
- lock the WebAuthn relying-party ID to the final RenderLab domain strategy before enrollment, because changing RP ID invalidates registered passkeys;
- verify SSR/client compatibility with current package versions;
- design registration, rename, last-used display and removal;
- define password + passkey coexistence and recovery;
- never make experimental passkeys the only way an account can recover.

Promotion requires acceptable provider maturity/API stability, hosted configuration, RP-domain strategy, recovery story and browser evidence.

## 16. Deliberately deferred conventional categories

Common Settings sections are not automatically RenderLab requirements.

### Profile / avatar / username

Deferred until collaboration, sharing, comments, public galleries or another person-facing identity feature exists.

### Theme / light mode

A theme setting is not a one-control feature. RenderLab's current design is built around the near-black system. A real light theme requires cross-product token/design/accessibility work.

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

This list prevents fake maturity: conventional menu labels are not product capabilities.

## 17. Proposed execution sequence

RenderLab's progressive-planning rule remains in force. Only the immediate next workstream should receive an execution-ready phase contract.

### 0 — Phase 27 visual/account IA

Continue the Settings visual redesign using truthful current behavior. Phase 27 may establish future section geometry, but must not render fake/disabled MFA/session/delete/passkey controls simply to preview this roadmap.

### 1 — Auth & email hardening

#215. Resolve broader-beta account infrastructure blockers first.

### 2 — Session controls & security activity

#216. Establish mature incident-response/account visibility.

### 3 — MFA & privileged step-up

#217. Admin AAL2 is the minimum security target; ordinary-member policy is decided in that contract.

### 4 — Identity management

#218. Add secure email change; consider linked identities only if justified.

### 5 — Data/privacy lifecycle

#219. Implement export, retention and deletion from a verified ownership/data map.

### 6 — Preferences & product notifications

#220. Add only product-backed durable preferences/channels.

### 7 — Passkeys

#221. Promote from research only after stability/domain/recovery gates are satisfied.

Phase 28 Admin redesign and Phase 29 cohesion remain the current UI-redesign roadmap. This account-capability roadmap is a parallel product/security program; it does not silently renumber those phases.

## 18. Cross-cutting implementation invariants

Every future account-capability phase must preserve:

- `auth.users.id` as canonical identity unless explicitly redesigned;
- RenderLab admission/role state separate from provider Auth metadata;
- no authorization from user-editable metadata;
- server verification of current identity for private/sensitive actions;
- owner-scoped data access;
- fail-closed behavior on auth/recovery ambiguity;
- enumeration-safe recovery;
- sanitized user-facing failures;
- no browser service-role/secret access;
- no direct browser access to Auth schema/session/audit tables;
- no raw session/access/refresh tokens in logs or UI;
- exact fixture isolation and cleanup for Auth-backed CI;
- keyboard/touch/focus/accessibility parity;
- no deployment/config mutation without explicit authorization.

Sensitive operations—email change, MFA-factor mutation, account deletion, sign-in-method mutation and similarly high-impact actions—must define a concrete reauthentication/step-up guarantee rather than assuming an existing session is enough.

## 19. Validation expectations by workstream

### Auth/email hardening

- owned test identities;
- custom-mail delivery evidence without exposing secrets;
- safe redirect/link behavior;
- recovery enumeration protection;
- Security Advisor evidence;
- CAPTCHA/rate-limit tests when enabled.

### Sessions

- at least two simultaneous sessions;
- local/others/global exact revocation matrix;
- current-session identification;
- owner isolation for inventory endpoints;
- stale bearer rejection after revocation;
- sanitized metadata review.

### MFA

- enroll/challenge/verify;
- AAL1 → AAL2 transition;
- protected Admin/sensitive-action denial at AAL1;
- factor removal/backup factor;
- lost-factor recovery;
- other-session behavior after factor changes;
- exact MFA fixture cleanup.

### Email change

- old/new address confirmations as configured;
- same `auth.users.id` preserved;
- RenderLab access/media ownership preserved;
- invitation/Admin-email edge cases;
- security notification;
- two-account collision tests.

### Export/deletion

- owned account with media/jobs/collections/upload/admission state;
- active-job policy;
- exact R2 cleanup;
- database owner-row cleanup/de-identification;
- session revocation;
- Auth identity removed last;
- explicit retention-exception audit;
- cross-account non-interference.

### Preferences/notifications

- server-owned typed preference validation;
- stale capability fallback;
- cross-device persistence;
- channel delivery/opt-out behavior;
- security notifications kept distinct from optional product notifications.

## 20. Documentation contract

The roadmap is now merged and authoritative for the broader Account & Settings capability program.

Future durable documentation work should also ensure:

- `PROJECT.md` references this roadmap as the account-management product roadmap;
- `docs/architecture/PRODUCT_CAPABILITIES.md` distinguishes the existing Phase 10 account baseline from this future expansion;
- `docs/ui/UI_MIGRATION.md` makes clear that Phase 27 visual completion does not close the account/settings capability program;
- `docs/ui/SCREEN_REGISTRY.md` changes only when actual Settings capabilities are implemented and verified, not merely because they appear here.

The umbrella #213 remains open until those source-of-truth cross-references are recorded. Child workstreams remain open until independently planned, implemented and verified.

## 21. Program completion definition

The broader Account & Settings program is not complete when the Phase 27 page looks polished. It is complete only when RenderLab has deliberately addressed or explicitly rejected:

- reliable account email/recovery infrastructure;
- modern password/abuse posture;
- session control and security visibility;
- MFA/step-up for privileged and sensitive operations;
- identity/email management;
- safe recovery for stronger authentication;
- data export and account deletion/retention;
- product-backed preferences/notifications;
- an explicit decision on passkeys and linked identities;
- clear documentation of intentionally deferred categories.

Until then, Phase 27 must be described as the **Settings visual/account-IA redesign**, not completion of RenderLab account management.
