# Account & Settings Capability Roadmap

**Status:** ACCEPTED ACTIVE ROADMAP / #215 PRODUCTION-LIVE / #216 + #217 IMPLEMENTED, VERIFIED, MERGED, NOT DEPLOYED / NEXT DEFAULT CONTRACT PLANNING: #218  
**Current execution:** #215 Auth/email hardening is complete, verified and production-live. #217 MFA/privileged step-up and #216 Session Controls v0.1 are complete, verified and merged to `main`; neither was deployed as part of its implementation/closure work. Security Activity remains deliberately deferred because the approved hosted project does not currently provide a verified populated database-backed event source. The next default contract-planning slice is #218 secure sign-in identity management unless the user explicitly reprioritizes another open roadmap lane.  
**Tracker:** #213  
**Roadmap merge:** PR #214 / `74829e0cdad8edf423863efbbc1af98ad0f9ce79`  
**Original baseline audited:** `main` `bbb0624a8b1fa98b24824294a495cdb8500c9c9c` plus 2026-09-13 Supabase/security/convention audit  
**Latest capability baseline:** `main` `590c15f6fc9db9c107b3bc67fae80083fe0d55c4` after #216 implementation  
**Scope:** account profile, authentication, credential UX, security, recovery, sessions, privacy/data lifecycle, preferences and notifications  
**Does not authorize:** a new implementation slice, hosted configuration mutation, provider/plan changes or deployment without the applicable execution contract and explicit scope

## 1. Purpose

RenderLab's Account & Settings program is a product/security roadmap, not a visual checklist. The approved Settings design may expose only capabilities backed by real application/provider behavior and verified authorization boundaries.

This document is the durable gap inventory, sequencing plan and current capability record. It intentionally separates:

- canonical authentication identity from user-facing display identity;
- provider authentication from RenderLab admission/roles;
- credential/security controls from profile/preferences;
- implemented session controls from deferred Security Activity;
- repository implementation/verification from production deployment.

The goal is a complete, truthful account system—not a visually fuller page.

## 2. Workstreams and current state

| Workstream | Tracker | Current state | Default priority / note |
| --- | --- | --- | --- |
| Auth and email delivery hardening | #215 | **COMPLETE / VERIFIED / PRODUCTION-LIVE** | P0 prerequisite |
| Session controls and security activity | #216 | **Session Controls v0.1 COMPLETE / VERIFIED / MERGED / NOT DEPLOYED**; Security Activity deferred | P1 |
| MFA and privileged step-up | #217 | **COMPLETE / VERIFIED / MERGED / NOT DEPLOYED** | P0 Admin / P1 members |
| Identity and sign-in methods | #218 | Roadmap-level / next default contract planning | P1 |
| Data export, retention and account deletion | #219 | Roadmap-level | P1 architecture / P2 implementation |
| Product preferences and notifications | #220 | Roadmap-level | P2 |
| Passkeys / WebAuthn research | #221 | Research only | Research / P2 |
| Profile and credential UX baseline | #223 | Roadmap-level | P1 basic maturity |

The open roadmap issues do not authorize implementation by themselves. Each substantial slice requires a fresh provider/repository audit and an execution-ready contract before implementation.

## 3. Current verified RenderLab account baseline

### 3.1 Canonical identity and admission

RenderLab currently provides:

- Supabase Auth `auth.users.id` as canonical immutable account identity;
- authentication separated from RenderLab admission and role authorization;
- invitation-gated Closed Beta admission;
- RenderLab-owned `member` / `admin` role and `active` / `suspended` access status;
- owner-scoped media, generation, collection, upload and admission records keyed to `auth.users.id`;
- fresh server-owned access/admission/Admin authorization rather than user-editable metadata.

Display name, avatar and any future username must remain presentation/profile data and must never become an admission, ownership, role or security key.

### 3.2 Password, email and recovery baseline — #215

#215 is complete, verified and production-live.

Current baseline includes:

- email/password sign-in for invited accounts;
- enumeration-safe forgot-password request;
- server-validated recovery marker before password replacement;
- ordinary password change with current-password verification;
- canonical 15-character password-creation/replacement minimum with no arbitrary character-class composition requirement;
- long-password/passphrase compatibility;
- RenderLab-owned Have I Been Pwned Pwned Passwords k-anonymity screening for password establishment/change flows;
- branded production Auth/security mail and verified sender/delivery posture from the #215 release;
- security notifications supported for the configured password/email/factor/sign-in-method changes;
- native Supabase leaked-password protection remains disabled because the organization is on Free and a paid upgrade solely for that feature was explicitly rejected. This is an accepted platform limitation, not an open RenderLab blocker.

Production release authority for #215 remains the recorded source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` / READY Vercel deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh` unless a later explicitly authorized deployment supersedes it.

### 3.3 MFA and privileged step-up baseline — #217

#217 is complete, verified and merged, but was **not deployed** as part of its implementation/closure work.

Binding initial policy:

- TOTP authenticator-app MFA only;
- exactly **one enrolled TOTP factor** per user for the initial implementation;
- hosted `mfa_max_enrolled_factors = 1` is part of the provider security boundary;
- ordinary-member MFA is optional to enroll, but once enrolled private RenderLab access is binding on AAL2 verification;
- active Admin access/operations require a verified factor and AAL2;
- sensitive RenderLab account/security mutations require the contracted recent TOTP step-up where applicable;
- the recovery-email marker is never equivalent to MFA;
- replacing the sole factor is remove-after-step-up → refresh to AAL1/no factor → immediately enroll/verify replacement;
- active Admin authorization disappears during that replacement gap and remains denied until AAL2 is restored;
- lost sole factor uses the documented operator-assisted recovery policy with strong identity correlation, supported Supabase Admin MFA APIs and session revocation;
- no home-grown recovery codes, security questions, SMS-first factor or email-only MFA bypass;
- direct provider second-factor enrollment is rejected by the hosted one-factor cap.

Do not reintroduce “backup authenticator” UI or multi-factor assumptions without a new provider-enforceable contract.

### 3.4 Session-controls baseline — #216

#216 Session Controls v0.1 is complete, verified and merged at application merge `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`, but was **not deployed** as part of implementation/closure.

Current repository behavior includes:

- a privacy-safe active-session inventory in Settings;
- current-session identity derived from a freshly verified JWT `session_id` and owner-scoped live provider session state;
- created and conservative last-active timestamps;
- deterministic coarse browser/platform labels only;
- no raw user-agent display;
- no IP/geolocation display;
- explicit `Sign out this device` → `local`;
- explicit `Sign out other devices` → `others`;
- explicit `Sign out everywhere` → `global`;
- private RenderLab authorization requires the verified session ID to still exist in live `auth.sessions`, so a revoked session loses RenderLab authorization immediately even if its JWT has not expired;
- service-role-only `renderlab_auth_session_projection` from migration `0019_renderlab_auth_session_projection.sql`;
- fail-closed behavior when required session/provider truth is unavailable.

The projection is verified `SECURITY DEFINER`, empty-search-path, owner-scoped and executable only by `service_role` (plus function owner), with no execute for `PUBLIC`, `anon` or `authenticated`.

Exact arbitrary row-level session revoke is **not implemented** because current supported user Auth APIs expose only local/others/global revocation. The UI must not imply exact per-row revoke until the provider offers a supported owned-session API.

### 3.5 Security Activity remains deferred

Security Activity was intentionally not faked as part of #216.

At the implementation audit, the approved hosted project's `auth.audit_log_entries` database table existed but contained zero rows despite active Auth usage. RenderLab therefore has no verified complete user-facing event source for recent security history.

A future Security Activity slice must separately define and verify:

- the event source actually available to RenderLab;
- whether database audit writing/retention must change;
- retention duration and storage impact;
- privacy treatment of IP/user agent/provider metadata;
- a sanitized event taxonomy;
- completeness expectations and configured acceptance;
- whether any new-device/unusual-access label is actually supportable.

Do not label events “suspicious” or invent city/device certainty without real risk/location evidence.

## 4. Current open capability gaps

The verified repository still does **not** provide:

- durable display name/profile identity;
- user-managed avatar/profile picture;
- a decided/implemented RenderLab username/handle namespace;
- one consistent credential-field interaction standard across every sign-in/recovery/password surface;
- secure self-service sign-in-email change;
- deliberately adopted linked OAuth identities;
- an independent ordinary-user recovery method beyond the current sign-in-email flow and the #217 operator MFA-recovery policy;
- trustworthy user-facing recent Security Activity;
- exact arbitrary single-session revoke;
- account data export;
- owner-wide account deletion/retention lifecycle;
- durable product preferences/notification settings;
- production-ready passkeys.

Phase/UI visual maturity must not imply these capabilities already exist.

## 5. Security and credential principles

These principles remain binding across future account work:

- prefer long passwords/passphrases and compromised-password screening over arbitrary uppercase/number/symbol composition rules;
- allow paste and password managers;
- password fields should offer an accessible show/hide control;
- visible credential requirements must reflect real configured policy rather than duplicated literals;
- reauthenticate or step up before high-risk identity/security changes;
- MFA recovery must not silently weaken the enrolled factor policy;
- security/transactional notifications are distinct from optional product notifications;
- session/security UI must not leak tokens, raw provider payloads or unverifiable location/risk claims;
- canonical ownership remains `auth.users.id`;
- user-editable profile/Auth metadata never grants admission, role or ownership;
- browser code never receives service-role credentials or raw Auth-schema access.

These are product-security requirements, not claims of certification or compliance.

## 6. Target Settings information architecture

### Account

#### Profile — #223

Planned when explicitly selected:

- display name;
- profile picture/avatar;
- deterministic fallback identity;
- username/handle only after namespace/abuse/rename decisions are made.

Profile fields are non-authoritative presentation data.

#### Sign-in identity — #218

Target:

- primary/sign-in email;
- actionable verification state;
- secure change-email action;
- linked sign-in methods only if deliberately adopted.

#### Access

Retain read-only product truth for:

- Closed Beta/future admission status;
- role;
- conditional Admin continuation.

### Security

#### Password

Retain existing password-change/recovery flows and progressively standardize:

- Current / New / Confirm semantics;
- accessible show/hide;
- real policy guidance;
- match/error feedback;
- password-manager/paste/autocomplete compatibility.

#### Multi-factor

Current repository authority is #217: one TOTP factor, AAL2 enforcement, recent step-up and operator lost-factor recovery.

Passkeys remain separate #221 research.

#### Recovery

Do not invent security questions/custom codes. Any new independent recovery channel requires its own threat/provider contract and must not bypass enrolled MFA.

### Sessions & Security Activity

Current implemented contents:

- active session inventory;
- verified current-session marker;
- local/others/global sign-out;
- coarse client labels and timestamps;
- immediate live-session-aware private authorization.

Deferred:

- per-row exact revoke until a supported provider API exists;
- Security Activity until a trustworthy populated source and privacy/retention contract exist;
- suspicious/new-device claims without real detection.

### Data & Privacy — #219

Planned:

- account data export;
- bounded durable media export where appropriate;
- account deletion request and orchestrated owner-wide deletion;
- explicit retention/de-identification policy;
- privacy/data-use disclosure that matches infrastructure reality.

Do not expose a meaningless AI-training opt-out if RenderLab does not actually perform optional training/data reuse.

### Preferences & Accessibility — #220

Only add durable preferences backed by real product behavior. Potential areas include curated Create defaults, optional product notifications and deliberate application-level accessibility overrides.

Accessibility itself is mandatory regardless of any preference surface.

### Connected apps / billing / teams

Remain deferred until those product systems actually exist. Do not create empty Settings categories for appearance.

## 7. Workstream D — Identity and sign-in method management (#218)

**Status:** ROADMAP-LEVEL / NEXT DEFAULT CONTRACT PLANNING  
**Dependency state:** #215 and #217 prerequisites are satisfied in the repository; #216 session controls are also available as an incident-response foundation.

### 7.1 Change sign-in email target

A future contract should define a sequence that:

1. requires recent credential reauthentication or AAL2/recent step-up appropriate to the action;
2. collects and validates the new email;
3. uses supported Supabase secure email-change confirmation behavior;
4. preserves the old identity until required confirmation succeeds;
5. emits supported security notifications;
6. refreshes server identity after confirmation;
7. preserves the same `auth.users.id` and all RenderLab ownership/admission data.

### 7.2 Admission and Admin edge cases to audit

Before implementation verify:

- `renderlab_account_access` remains keyed only on `user_id` and needs no rewrite;
- pending `renderlab_beta_invitations.normalized_email` cannot be incorrectly claimed/inherited after an admitted user changes address;
- Admin display/search uses current verified Auth email rather than stale copied identity;
- email change cannot claim another person's pending invitation;
- session behavior after email change matches the intended incident-response contract.

### 7.3 Linked identities

OAuth/social linking is optional, not automatic maturity. If adopted later:

- linking starts from an already authenticated account;
- provider identity never grants admission by itself;
- unlinking the last usable sign-in method is blocked;
- notifications are mandatory;
- duplicate/collision behavior receives explicit two-account tests;
- account merge is not implied and would require its own ownership/data contract.

## 8. Workstream H — Profile and credential UX baseline (#223)

**Status:** ROADMAP-LEVEL / P1 BASIC MATURITY

Before implementation decide whether durable profile data belongs in a RenderLab-owned 1:1 record keyed by `auth.users.id` rather than relying on user-editable Auth metadata.

### Profile scope

- editable display name;
- avatar upload/replace/remove/reset with validated dedicated profile-media storage if adopted;
- deterministic fallback identity;
- username only after a real namespace contract.

### Username decision gate

Define before shipping:

- current product value of the handle;
- public/private/future-facing use;
- case folding and Unicode/ASCII policy;
- allowed length/characters;
- reserved names;
- uniqueness race handling;
- rename frequency/confirmation;
- old-handle reuse/impersonation protection;
- future sharing/public URL implications.

Username never becomes the ownership key.

### Credential-field standard

Across sign-in, invite/account activation where applicable, recovery, password change and future reauthentication:

- concealed by default;
- accessible show/hide control;
- clear Current/New/Confirm labels;
- live requirements sourced from real policy;
- accessible match/error feedback;
- Caps Lock indication where browser support is reliable;
- paste allowed;
- correct `autocomplete` semantics;
- password-manager/browser-generated-password compatibility;
- no secret values in logs/screenshots/artifacts;
- mobile-safe layout and touch targets;
- sanitized enumeration-safe errors.

## 9. Workstream E — Data export, privacy, retention and account deletion (#219)

**Status:** ROADMAP-LEVEL

RenderLab deliberately uses `owner_id -> auth.users.id ON DELETE RESTRICT` on core account-owned data. Self-service deletion must not weaken that integrity boundary globally.

A future deletion contract must classify and safely handle:

- future profile/avatar data;
- generation jobs and persisted intent;
- generation sources;
- durable media and R2 objects;
- upload sessions;
- Favorites/Collections;
- admission reservations and access state;
- Auth sessions/factors;
- retained/de-identified security/operational evidence.

Target lifecycle:

1. recent strong reauthentication/AAL2;
2. explain irreversible scope and retention exceptions;
3. offer export where appropriate;
4. block new generation/admission;
5. resolve active jobs under an explicit policy;
6. purge/tombstone owned media and R2 safely;
7. clear profile/collection/upload/admission state in dependency-safe order;
8. delete/de-identify history according to retention rules;
9. revoke sessions/factors;
10. remove account-access state;
11. delete/de-identify the Auth user **last**;
12. verify no unauthorized owner-scoped residue remains.

## 10. Workstream F — Product preferences, accessibility and notifications (#220)

**Status:** ROADMAP-LEVEL / P2

If approved, use one typed RenderLab-owned preference contract rather than scattered local-storage flags.

Potential preferences only where product-backed:

- curated Create defaults;
- optional generation-completion/failure notifications after a delivery channel exists;
- application reduced-motion override if it adds real value beyond OS preference;
- future contrast/density settings only if supported end-to-end.

Security notifications are not marketing/product preferences and should not be user-disableable by default.

## 11. Passkeys / WebAuthn research (#221)

**Status:** RESEARCH ONLY

Passkeys are attractive because they are phishing-resistant, but provider maturity, hosted availability, relying-party-domain stability and recovery must be proven before promotion.

Research requirements:

- confirm provider status/API stability and current-plan availability;
- lock the WebAuthn relying-party ID to the final domain strategy;
- verify SSR/client compatibility;
- define registration/list/rename/removal UX;
- define password/TOTP/passkey coexistence and recovery;
- never make an experimental provider capability the sole recovery path.

## 12. Deliberately deferred conventional categories

Do not collect or expose conventional account fields without a real product requirement.

Deferred until justified:

- bio, pronouns, location, social links/public-profile controls;
- birthday/gender/demographic fields;
- full light/theme program;
- language/region/time-zone controls before i18n/time-aware product behavior;
- billing/subscriptions/invoices before a commercial model;
- API keys/connected apps before a developer/integration platform;
- teams/workspaces before multi-user collaboration;
- marketing preferences before optional marketing communications exist.

Fake maturity is worse than a smaller truthful Settings surface.

## 13. Execution sequence from the current repository state

Progressive planning remains binding: only the selected next workstream receives an execution-ready contract.

Completed foundation:

1. #215 — Auth/email hardening — complete, verified, production-live.
2. #217 — MFA/privileged step-up — complete, verified, merged, not deployed by that workstream.
3. #216 — Session Controls v0.1 — complete, verified, merged, not deployed by that workstream; Security Activity deferred.

Default next sequence unless explicitly reprioritized:

4. **#218 — Identity/sign-in management.** Secure email change and current identity edge cases now that step-up/session foundations exist.
5. **#219 — Data/privacy lifecycle.** Export, retention and owner-wide deletion from a verified data map.
6. **#223 — Profile/credential UX** may be selected earlier as an independent P1 maturity slice if the user prioritizes visible account basics; it must not change canonical Auth/authorization semantics.
7. **#220 — Preferences/notifications** only after real product-backed options/channels exist.
8. **#221 — Passkeys** only after research promotion gates are satisfied.

Security Activity can be reopened as a focused follow-on only when a trustworthy populated event source and privacy/retention policy exist; it is not an implied unfinished implementation task inside closed #216 v0.1.

## 14. Cross-cutting implementation invariants

Every future Account & Settings phase must preserve:

- `auth.users.id` as canonical identity unless explicitly redesigned;
- display name/avatar/username as non-authoritative profile metadata;
- RenderLab admission/role state separate from provider Auth metadata;
- no authorization from user-editable metadata;
- server verification of current identity for private/sensitive actions;
- live-session-aware private authorization introduced by #216;
- AAL/factor enforcement introduced by #217 where applicable;
- owner-scoped data access;
- fail-closed behavior on auth/recovery/session ambiguity;
- enumeration-safe recovery;
- sanitized user-facing failures;
- no browser service-role/secret access;
- no direct browser access to Auth schema/session/audit tables;
- no raw access/refresh tokens, passwords, TOTP secrets, raw user agents or IPs in user-facing artifacts/logs;
- exact fixture isolation and cleanup for Auth-backed CI;
- keyboard/touch/focus/accessibility parity;
- no hosted configuration/plan mutation without the applicable authorization;
- no deployment merely because implementation merges.

Sensitive operations—email change, MFA/recovery-factor mutation, account deletion, sign-in-method mutation and similarly high-impact actions—must define a concrete recent reauthentication/step-up guarantee rather than assuming an existing session is enough.

## 15. Validation expectations by workstream

### Identity/email change

- old/new confirmation behavior exactly as configured;
- same `auth.users.id` preserved;
- admission/media/job ownership preserved;
- pending-invitation and Admin-email edge cases;
- security notification;
- two-account collision/non-interference;
- intended session behavior after identity mutation.

### Profile / credential UX

- two-account profile isolation;
- canonical ID and ownership unchanged after profile edits;
- avatar validation/storage cleanup if adopted;
- username uniqueness/reserved/rename races if adopted;
- desktop + 390px states;
- show/hide accessibility;
- password-manager/autofill/paste behavior;
- visible-policy/server-policy parity;
- no secrets in artifacts.

### Export/deletion

- owned account with representative profile/media/jobs/collections/upload/admission state;
- active-job policy;
- exact database/profile/avatar/R2 cleanup;
- session/factor revocation;
- Auth identity removed last;
- explicit retention-exception audit;
- cross-account non-interference.

### Preferences/notifications

- server-owned typed validation;
- stale capability fallback;
- cross-device persistence where intended;
- accessibility override behavior where implemented;
- channel delivery/opt-out behavior;
- security notifications kept distinct from optional product notifications.

## 16. Completed #216 verification record

The binding detailed closure record is `docs/architecture/SESSION_CONTROLS_SECURITY_ACTIVITY_IMPLEMENTATION_CONTRACT.md`.

Repository facts:

- implementation PR #259;
- exact candidate `061b4bf49637b4fb09f0f1486b6a85f251ea6650`;
- implementation merge `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`;
- migration `0019_renderlab_auth_session_projection.sql` applied and privilege-audited;
- exact-head Session Controls, Account Identity, MFA, Admin, Integrated Release and Engineering Quality gates passed;
- merged-main push runs all passed, including live Video and Upscale product matrices;
- stale dedicated session-control fixtures were cleaned from 10 to 0 through supported Supabase Admin Auth APIs and the successful verifier left 0 tagged users;
- no production deployment was performed.

## 17. Documentation contract

This roadmap is authoritative for the broader Account & Settings capability program.

Future durable documentation must keep:

- `PROJECT.md` synchronized with the selected current workstream and deployment state;
- `docs/architecture/PRODUCT_CAPABILITIES.md` truthful about implemented versus planned account capabilities;
- `docs/ui/UI_MIGRATION.md` clear that visual Settings completion is not equivalent to completing this account-capability program;
- screen/component registries updated only when actual implemented product state changes.

The umbrella #213 remains open until the broader program is deliberately completed or its remaining lanes are explicitly rejected/deferred.

## 18. Program completion definition

The Account & Settings program is not complete merely because the page looks polished. It is complete only when RenderLab has deliberately implemented or explicitly rejected/deferred:

- basic profile identity: display name, avatar and username/handle decision;
- consistent credential/password-field UX;
- reliable account email/recovery infrastructure;
- modern password/abuse posture;
- session control and security visibility;
- MFA/step-up and recovery for privileged/sensitive operations;
- identity/email management;
- security notifications/access-change awareness;
- data export, privacy/data-use transparency and account deletion/retention;
- product-backed preferences/notifications/accessibility overrides;
- an explicit passkey and linked-identity decision;
- clear documentation of intentionally deferred categories.

Until those decisions are complete, the current Settings UI is a truthful implemented surface within a still-active Account & Settings capability program.