# Account & Settings Capability Roadmap

**Status:** ACCEPTED ACTIVE ROADMAP / #215 PRODUCTION-LIVE / #216 + #217 + #218 + #219 IMPLEMENTED + VERIFIED / #216 + #217 + #218 + #219 NOT DEPLOYED BY THEIR IMPLEMENTATION WORKSTREAMS
**Current execution:** #219 Data export, retention and account deletion is implemented and verified in PR #265. Exact head `886a4722826b268ad156eda22e817002471cd04c` passed all 38 attached pull-request workflows, including the configured Account Data Lifecycle and Session Controls gates. The #219 Supabase migrations are live; the Settings Data & Privacy export/delete surface and real account-deletion security email were verified. No production application deployment was performed by #219. Remaining roadmap workstreams require explicit prioritization rather than being inferred from this closure.
**Tracker:** #213
**Roadmap merge:** PR #214 / `74829e0cdad8edf423863efbbc1af98ad0f9ce79`  
**Baseline audited:** `main` `bbb0624a8b1fa98b24824294a495cdb8500c9c9c` plus 2026-09-13 Supabase/security/convention audit  
**Related visual R&D:** Phase 27 / #211 / draft PR #212  
**Scope:** account profile, authentication, credential UX, security, recovery, sessions, privacy/data lifecycle, preferences and notifications  
**Does not authorize:** production implementation, hosted Supabase Auth configuration changes, schema changes, provider changes, or deployment

## 1. Purpose

RenderLab's existing `/settings` and `/settings/password` flows correctly implement a narrow Closed Beta account baseline, but the underlying account-management product is materially shallower than the account/settings systems users expect from a mature application.

Phase 27 can improve the visual hierarchy and account information architecture, but a visual redesign must not create the false impression that the broader account-management program is complete. Missing capabilities require explicit product, security, data and infrastructure contracts before controls are added to Settings.

This roadmap is the durable gap inventory, target Settings information architecture and sequencing plan. It now covers both the advanced security gaps already identified and the ordinary account basics that were previously under-scoped: display identity, avatar, username/handle policy, password-field interaction quality, recovery affordances, accessibility/preferences and other conventionally expected account controls.

The goal is a complete, truthful account system—not a visually fuller page.

## 2. Roadmap workstreams

The umbrella tracker is #213. Future work is split into roadmap-level issues so only the immediate next slice needs to be expanded into an execution-ready implementation contract.

| Workstream | Tracker | Purpose | Default priority |
| --- | --- | --- | --- |
| Auth and email delivery hardening | #215 | Production-ready Auth email, URL/template posture, password/abuse hardening | P0 prerequisite |
| Session controls and security activity | #216 | Current/other/global sign-out, session visibility, security events and device-alert groundwork | P1 |
| MFA and privileged step-up | #217 | TOTP, AAL2, recovery and sensitive-operation step-up | P0 security / P1 members |
| Identity and sign-in methods | #218 | Secure email change and justified linked identities | P1 |
| Data export, retention and account deletion | #219 | Export, retention and safe owner-wide deletion | P1 architecture / P2 implementation |
| Product preferences and notifications | #220 | Product-backed preferences, accessibility overrides and optional notification channels | P2 |
| Passkeys / WebAuthn research | #221 | Evaluate experimental passkeys without making them a required recovery path | Research / P2 |
| Profile and credential UX baseline | #223 | Display name, avatar, username policy and consistent password/credential form behavior | P1 basic maturity |

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
- Settings now exposes explicit Supabase `local`, `others` and `global` sign-out controls plus a privacy-safe active-session inventory with one verified current-session marker.
- Private server authorization freshly verifies the user and JWT claims, then requires the verified `session_id` to remain present in the owner's live `auth.sessions`; revoked still-unexpired bearers therefore fail private RenderLab authorization immediately.
- Session presentation exposes coarse browser/platform labels and timestamps only; raw user agent, IP/geolocation, tokens and provider Auth internals remain server-owned.
- Secure sign-in-email change now uses Supabase Secure Email Change with scanner-safe RenderLab token-hash confirmation links and requires both current/new owned mailbox confirmations before the canonical Auth email changes.
- #218 configured acceptance proved both confirmation orders, immutable `auth.users.id`, unchanged RenderLab access/ownership/invitation state, live Admin email resolution, delivered `email_changed` notification, both observed pre-existing sessions remaining live and refreshable, and preserved verified TOTP with post-confirm `aal2` assurance.
- Server-owned access/admission truth and fresh Admin eligibility.
- Conditional Admin continuation from Settings only for an active fresh-authorized admin identity.
- Existing owner-scoped media, generation, collection, upload and admission records tied to `auth.users.id`.

Currently missing from the verified product baseline:

- durable display name/profile identity;
- user-managed avatar/profile picture;
- RenderLab username/handle semantics;
- one documented credential-field interaction standard across sign-in/recovery/password surfaces;
- passkeys;
- independent recovery methods beyond the existing sign-in-email recovery flow;
- trustworthy user-facing Security Activity and exact arbitrary row-level session revoke;
- durable user preferences/notification settings.

Phase 27 may make existing truths clearer and establish section geometry, but it must not imply later roadmap capabilities already exist.

## 4. Current hosted/Auth hardening facts

The repository's Phase 10D audit established that:

- the shared project was using Supabase's built-in Auth mailer at the time of the audit;
- hosted Site URL / redirect allowlist / production template and sender posture were not fully verified from CI;
- password recovery mail hit built-in email rate limiting during audit;
- leaked-password protection remained disabled and was recorded as a broader-beta blocker;
- hosted Auth configuration changes require explicit operator authorization and are not ordinary application-code changes.

A fresh Security Advisor read after #215B verification and production rollout on 2026-09-14 still reports **Leaked Password Protection Disabled** as the only warning. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables. The organization remains on Free and the user explicitly rejected a Supabase upgrade solely for this feature. #215B free application-layer HIBP screening is verified and production-live, so the native warning is an accepted platform limitation and must not be misrepresented as cleared. #215 is closed and production-live. #217 MFA/privileged step-up and #216 Session Controls v0.1 are closed at the implementation level, verified and merged but not deployed by those workstreams. The next default contract-planning slice is #218 Identity and sign-in method management.

## 5. Current Supabase capability facts

Current Supabase Auth documentation plus a fresh read-only shared-project schema audit establish that:

- JavaScript sign-out supports `local`, `others` and `global` scopes; JavaScript defaults to `global`.
- `auth.sessions` exists and records owner/session identity, created/refreshed timestamps, AAL, user agent and IP among other internal fields.
- `auth.audit_log_entries` exists, but the approved hosted project's database-backed table was empty during the #216 audit; it is not yet a verified complete source for a user-facing Security Activity feed.
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

## 6. Security and credential UX principles

The roadmap follows current security guidance rather than copying another product's Settings menu.

- For password-only authentication, target a long minimum password rather than arbitrary composition rules. NIST SP 800-63B-4 uses 15 characters as the minimum when a password is the single factor, permits a shorter minimum when the password is only one factor in MFA, recommends support for long passwords and rejects arbitrary composition requirements.
- A conventional `uppercase + lowercase + number + symbol` rule must **not** be added merely because users have seen it elsewhere. If the configured Auth policy ever requires character classes, the UI must communicate that truthfully; otherwise prefer length, compromised-password blocking and rate limiting.
- Password entry should allow paste and password managers. Do not disable browser password-manager behavior.
- Password fields should offer an accessible option to reveal/hide the entered secret. NIST explicitly recommends offering a display option to help users verify entry.
- Credential guidance must come from the real configured policy. Do not hard-code a checklist that can drift from server/Auth enforcement.
- Block known compromised passwords in RenderLab password-establishment/change flows through the free Have I Been Pwned Pwned Passwords k-anonymity API; do not require a Supabase paid-plan upgrade for this control and do not rely on decorative strength meters.
- Reauthenticate or step up before high-risk identity/security changes.
- MFA is especially important for privileged Admin operations.
- MFA factor replacement/recovery is itself a high-risk operation and requires an explicit recovery policy plus notification.
- Session controls and security activity must not leak tokens or overstate unverifiable device/location information.
- Recovery mechanisms must not silently become bypasses for stronger authentication.

These are product-security requirements, not claims of certification or compliance.

## 7. Conventional account-system benchmark audit — 2026-09-13

This audit used current official account/help documentation from GitHub, Figma, Canva, Google and Microsoft together with NIST/OWASP security guidance. The purpose is not to clone any one product. It is to identify the recurring account layers users reasonably expect and then decide whether each layer belongs in RenderLab.

### Recurring patterns across mature products

Commonly recurring account capabilities include:

- display name and profile picture/avatar;
- a stable account identifier plus, where the product has person-facing identity, a username/handle;
- primary/sign-in email and email verification/change flows;
- password change and clear password-entry ergonomics;
- MFA or stronger authentication options;
- recovery methods/backups;
- active-session/device visibility and revocation;
- recent security activity and alerts for important account changes;
- notification controls;
- data export/account deletion in products with durable user content;
- connected applications/tokens only when an integration/developer ecosystem exists;
- accessibility, appearance and language settings where the application actually supports those systems.

### Benchmark-specific lessons relevant to RenderLab

- GitHub treats profile name, avatar and username as separate concepts; changing a username has namespace/redirect consequences, while display name is ordinary profile metadata.
- GitHub separates profile/account controls from Password and Authentication, Sessions and Security Log surfaces. This supports RenderLab's decision to keep profile, credential/security and session logic distinct.
- Figma's account settings combine account name/avatar, account email/password, 2FA, notifications and connected third-party apps. The connected-app/API-token pieces are relevant only if RenderLab later gains integrations/developer APIs.
- Canva separates profile management, email/password, linked accounts, account security, accessibility and deletion. This reinforces treating accessibility and account lifecycle as first-class planning categories rather than burying them under generic Preferences.
- Google treats name/profile image separately from recovery methods and security activity, and supports recovery methods that are not the primary sign-in credential. RenderLab should evaluate recovery-method strategy rather than assuming password-reset email alone is the final recovery architecture.
- Microsoft exposes recent account activity and distinguishes unusual activity from normal activity. RenderLab should plan security-event visibility and incident-response actions, but must not claim risk detection or geolocation it does not actually implement.

### What RenderLab should adopt versus defer

**Plan as genuine account maturity:**

- display name;
- profile image/avatar;
- username/handle contract;
- sign-in email/verification state and secure email change;
- consistent password/credential UX including show/hide;
- real password-policy guidance;
- MFA/recovery;
- session management and security activity;
- security alerts for significant account changes/new access when a reliable event/delivery system exists;
- export/deletion/retention;
- accessibility/preferences only where product-backed.

**Keep conditional/deferred:**

- bio, pronouns, location, social links and public-profile visibility until RenderLab has person-facing sharing/collaboration;
- birthday/gender unless a real age, legal or personalization requirement emerges;
- billing, teams/workspaces, API keys and connected apps until those product systems exist;
- theme/light mode until a full cross-product theme program exists;
- language/region until an i18n/localization program exists.

## 8. Target Settings information architecture

The mature target is not one giant account page. Settings should evolve into a small set of truthful sections as capabilities become real.

### Account

Purpose: profile identity, canonical sign-in identity and account/access context.

Target sub-sections:

#### Profile

- display name;
- profile picture/avatar;
- username/handle once its namespace contract is implemented;
- deterministic fallback identity when no avatar exists;
- no authorization/security decisions from any user-editable profile field.

#### Sign-in identity

- primary/sign-in email;
- verified/unverified state when meaningful;
- secure change-email action under Workstream D;
- linked sign-in methods only when deliberately adopted.

#### Access

- Closed Beta / future account-access status;
- role as read-only product truth;
- conditional Admin continuation;
- joined/account-created date only if it provides real user value.

Profile name/avatar/username are no longer categorically deferred. Display name and avatar are planned ordinary-account features under #223. Username is also planned, but must satisfy its namespace/rename decision gate before implementation.

### Security

Purpose: credentials, authentication factors, recovery and sensitive account controls.

Target sub-sections:

#### Password

- current password change;
- accessible Show/Hide password control;
- real password-policy guidance;
- Current / New / Confirm semantics;
- password-match feedback;
- password-manager/paste/autocomplete compatibility;
- RenderLab-owned compromised-password screening through the free HIBP Pwned Passwords range API.

#### Multi-factor and passkeys

- TOTP enrollment/factor management;
- backup/recovery strategy;
- AAL2/step-up behavior where actionable;
- passkeys only after #221 promotion criteria are met.

#### Account recovery

Current RenderLab recovery is based on the sign-in email. A mature recovery strategy must explicitly decide whether to add any independent recovery mechanism, such as:

- backup MFA factor;
- recovery codes if a secure supported contract exists;
- separate recovery email;
- operator-assisted recovery for lost MFA;
- another approved recovery channel.

Do not invent custom recovery codes or a recovery contact system without a security contract. Recovery methods require delay/notification protections against hostile replacement.

#### Security notifications

Plan mandatory/non-optional notifications for important security changes once reliable Auth mail exists:

- password changed/reset;
- sign-in email changed;
- MFA factor added/removed;
- sign-in method linked/unlinked;
- recovery method changed;
- new or suspicious access if RenderLab later has trustworthy event/risk detection.

### Sessions & Security Activity

Purpose: session scope, active access and account-takeover response.

Target contents:

- current-session identity;
- `Sign out this device`;
- `Sign out other devices`;
- `Sign out everywhere`;
- active-session inventory when a trusted server contract is verified;
- per-session revoke only if a supported exact owned-session API exists;
- sanitized recent security activity;
- clear incident-response actions such as change password / sign out everywhere when an event is unrecognized.

A session list must not imply per-row revoke if exact owned-session revocation is not supportable. RenderLab must not fabricate city, device or risk certainty from weak data.

### Data & Privacy

Purpose: user-owned data lifecycle and transparent data-use choices.

Target contents:

- export account data;
- export/download durable media in a bounded flow;
- account deletion request;
- retention/deletion explanation;
- privacy/terms links when those documents become real public product requirements;
- clear disclosure of how prompts/uploads/results are processed and retained;
- any AI-training/data-use control only if RenderLab or an execution provider actually performs optional training/data reuse that can truthfully be controlled.

Do not add a meaningless “Do not train on my data” toggle if RenderLab does not train on user data in the first place. The policy/disclosure must match infrastructure reality.

### Preferences & Accessibility

Purpose: durable user choices that are not identity, security or authorization truth.

Potential contents only after product contracts exist:

- curated Create defaults;
- optional product notification preferences;
- application reduced-motion override if there is demonstrated need beyond OS `prefers-reduced-motion`;
- future accessibility preferences only when they alter real supported behavior;
- appearance/theme only after a real cross-product theme system exists;
- language/time zone only after localization/time-zone-aware product behavior exists.

Accessibility itself is not deferred: the product must remain keyboard, screen-reader, touch and reduced-motion accessible regardless of whether any user preference is exposed.

### Notifications

A separate Notifications section is justified only if RenderLab gains enough real user-notification channels/settings to warrant one.

Security/transactional notifications should generally be mandatory. Product notifications such as generation-completed/failed may be optional if an email/browser/push delivery system actually exists.

### Connected Apps / Developer Access

This is a conventional account category but remains deferred until RenderLab has a real integration/developer ecosystem. When it exists, it should include only truthful connected identities/apps/tokens with revoke semantics. Do not show an empty Connected Apps page for appearance.

## 9. Convention coverage matrix

| Capability | Category | Decision | Priority / owner |
| --- | --- | --- | --- |
| Display name | Account → Profile | Plan | P1 / #223 |
| Profile picture/avatar | Account → Profile | Plan | P1 / #223 |
| Avatar crop/replace/remove/reset | Account → Profile | Plan | P1 / #223 |
| Username/handle | Account → Profile | Plan with namespace gate | P1 / #223 |
| Bio/pronouns/location/social links | Account → Profile | Defer until person-facing sharing exists | Deferred |
| Birthday/gender | Account → Profile | Do not collect without real need | Deferred |
| Sign-in email | Account → Sign-in identity | Existing display truth; improve presentation | Phase 27/#223 |
| Email verification state | Account → Sign-in identity | Show only when actionable/truthful | P1 / #218 |
| Change sign-in email | Account → Sign-in identity | Plan | P1 / #218 |
| Linked OAuth identities | Account → Sign-in identity | Conditional | P2 / #218 |
| Password change | Security → Password | Existing; retain | Current baseline |
| Show/Hide password eye | Security/Credential UX | Plan across every secret field | P1 / #223 |
| Current/New/Confirm fields | Security/Credential UX | Plan standardized semantics | P1 / #223 |
| Live password requirements | Security/Credential UX | Plan; must derive from real policy | P1 / #223 + #215 |
| Number/symbol/uppercase requirement | Security policy | Do **not** add unless real configured policy requires it | #215 decision |
| Long password/passphrase support | Security policy | Plan | P0 / #215 |
| Compromised-password blocking | Security policy | Implemented through free RenderLab-owned HIBP k-anonymity screening; native Supabase paid enforcement intentionally not required | COMPLETE / #215 |
| Password strength meter | Credential UX | Optional only if meaningful; never substitute for policy | #223 |
| Caps Lock warning | Credential UX | Plan where technically reliable | P1 / #223 |
| Password-manager/autofill support | Credential UX | Required | P1 / #223 |
| Paste into password fields | Credential UX | Required | P1 / #223 |
| MFA/TOTP | Security | Implemented: one TOTP factor; Admin AAL2; member enforcement once enrolled | COMPLETE / #217 |
| MFA backup factor | Security/Recovery | Rejected for initial #217; hosted factor cap is exactly one | #217 decision |
| Recovery codes | Security/Recovery | Not adopted; operator-assisted lost-factor recovery is the current policy | #217 decision |
| Independent recovery email/phone/contact | Security/Recovery | Research need/provider fit | P2 research / #217/#218 |
| Passkeys | Security | Research | #221 |
| Sensitive-action reauth / sudo mode | Security | Implemented recent TOTP step-up where contracted | COMPLETE / #217 |
| Security-change emails | Security notifications | Plan | P0 / #215 |
| New-device/unusual-access alerts | Security notifications | Plan only after trustworthy event detection | P1 research / #216 |
| Recent security activity | Sessions & Security Activity | Deferred until a trustworthy populated event source + privacy/retention contract exists | #216 follow-on |
| Active session list | Sessions & Security Activity | Implemented, privacy-safe owner-scoped projection | COMPLETE / #216 |
| Current-session marker | Sessions & Security Activity | Implemented from verified JWT `session_id` + live owner session | COMPLETE / #216 |
| Revoke one session | Sessions & Security Activity | Deferred: supported user Auth API currently exposes local/others/global, not arbitrary session UUID revoke | Provider-gated follow-on |
| Sign out current/others/everywhere | Sessions & Security Activity | Implemented with supported local/others/global scopes | COMPLETE / #216 |
| Data export | Data & Privacy | Plan | P1/P2 / #219 |
| Media export | Data & Privacy | Plan bounded async flow | P1/P2 / #219 |
| Account deletion | Data & Privacy | Plan orchestrated lifecycle | P1/P2 / #219 |
| Retention policy | Data & Privacy | Required before deletion | P1 / #219 |
| Privacy/data-use disclosure | Data & Privacy | Plan policy-level truth | P1 architecture / #219 |
| AI training/data-use opt-out | Data & Privacy | Only if optional training/data reuse actually exists | Conditional |
| Create defaults | Preferences | Plan only approved durable defaults | P2 / #220 |
| Product notification preferences | Preferences/Notifications | Plan after delivery channel exists | P2 / #220 |
| Reduced-motion override | Preferences/Accessibility | Evaluate; OS preference remains baseline | P2 / #220 |
| High-contrast/accessibility preferences | Preferences/Accessibility | Evaluate only if product-backed | P2 research / #220 |
| Theme/light mode | Preferences/Appearance | Separate cross-product project | Deferred |
| Language/region | Preferences | Defer until i18n | Deferred |
| Time zone | Preferences | Defer until time-zone-aware product need | Deferred |
| Connected apps/API tokens | Connected Apps | Defer until integration/API platform exists | Deferred |
| Billing/subscription/invoices | Billing | Defer until commercial model exists | Deferred |
| Teams/workspaces | Collaboration | Defer until multi-user collaboration exists | Deferred |

## 10. Workstream H — Profile and credential UX baseline (#223)

**Priority:** P1 basic account maturity. This workstream is intentionally separated from #218 because display identity is not authentication identity, and from #215 because credential-field UX is not the hosted Auth policy itself.

### 10.1 Profile identity

Plan:

- editable display name;
- avatar/profile picture upload;
- crop/position if the chosen implementation supports it accessibly;
- replace/remove/reset avatar;
- deterministic fallback initials/placeholder when no avatar exists;
- username/handle contract after its namespace gate is decided.

Profile fields are user-editable presentation metadata. They cannot control admission, role, ownership, billing, authorization, Admin access or any security decision.

### 10.2 Preferred profile data architecture

Before implementation, audit whether a RenderLab-owned one-to-one profile record keyed by `auth.users.id` is preferable to relying on Auth `user_metadata`.

Preferred direction unless implementation evidence argues otherwise:

- `auth.users.id` remains immutable canonical identity;
- RenderLab-owned profile fields are server-validated product data;
- display name is bounded Unicode text with normalization/sanitization appropriate to its display context;
- avatar storage uses dedicated profile-media identity/prefix rather than silently turning avatars into ordinary creative Library assets;
- deletion/export lifecycle explicitly includes profile/avatar data.

No schema decision is authorized by this roadmap alone.

### 10.3 Username/handle contract gate

A username is conventional but creates a namespace. Before implementation define:

- the current user value of the handle;
- whether it is public, private/account-only, or future-facing;
- case folding and Unicode/ASCII policy;
- minimum/maximum length and allowed characters;
- reserved system/Admin/brand words;
- uniqueness enforcement and race handling;
- rename frequency/confirmation;
- old-handle reuse delay or reservation to reduce impersonation;
- whether future public/share URLs redirect after rename;
- moderation/abuse policy if handles become visible to other users.

Do not use username as the ownership key. All ownership remains `auth.users.id`-based.

### 10.4 Credential-field standard

Use one consistent interaction standard across:

- Sign in;
- invite/account activation if a password is set there;
- Forgot password request where a secret is not yet entered;
- recovery password replacement;
- ordinary Change password;
- future reauthentication/step-up prompts.

Required behavior for password fields:

- concealed by default;
- accessible Show/Hide password control with an eye/eye-off visual plus a programmatic accessible name/state;
- reveal toggling changes presentation only, never the underlying value;
- touch target meets the product's control-size requirement;
- clear Current / New / Confirm labels where applicable;
- live requirements derived from the real Auth policy;
- new/confirm match state shown accessibly, not by color alone;
- Caps Lock warning where `KeyboardEvent.getModifierState('CapsLock')` is available/reliable;
- allow paste;
- correct `autocomplete` tokens (`current-password`, `new-password`, username/email context as applicable);
- compatible with password managers and browser-generated passwords;
- no JavaScript that blocks autofill or paste;
- no secret values in analytics, logs, screenshots or error reports;
- mobile-safe layout/keyboard and no accidental horizontal overflow;
- pending state prevents duplicate submission without erasing the form unnecessarily;
- sanitized error messages with enumeration-safe behavior preserved.

### 10.5 Password requirements presentation

The UI should present requirements as factual constraints, not a gamified checklist disconnected from enforcement.

Default planned guidance if #215 adopts the standards-aligned policy:

- minimum length;
- long passphrases allowed;
- spaces/symbols permitted;
- common/compromised passwords rejected when protection is enabled;
- no forced uppercase/number/symbol checklist unless the actual configured policy requires those classes.

A strength meter is optional. If used, it should be supplemental and evidence-based, never the source of truth for acceptance.

### 10.6 Validation

- two-account profile isolation;
- same `auth.users.id` before/after profile edits;
- no change to admission/role/media/job ownership after display name/avatar/username edits;
- duplicate/reserved username races fail safely if handles ship;
- avatar MIME/size/image validation, crop/replace/remove and exact storage cleanup;
- desktop + 390px profile and credential states;
- keyboard/screen-reader/touch behavior;
- password reveal state is accessible and leaves the secret unchanged;
- password manager/autofill/paste behavior;
- policy text exactly matches configured Auth behavior;
- no secrets in logs/artifacts.

## 11. Workstream A — Auth and email delivery hardening (#215)

**Status:** COMPLETE / VERIFIED / PRODUCTION-LIVE — #215A hosted/application hardening plus #215B free HIBP compromised-password screening.
**Priority:** P0 prerequisite; much of this is platform hardening rather than Settings UI.

### Completed scope

- audit hosted Site URL and redirect allowlist;
- audit invite, recovery, reauthentication and future email-change templates;
- replace the built-in mailer with custom SMTP or an approved Send Email Auth Hook;
- configure sender identity and SPF/DKIM/DMARC;
- ensure Auth-link tracking is disabled and templates are resilient to email-link prefetch/scanning;
- enable supported security notifications for password/email/factor/sign-in-method changes;
- define whether RenderLab can truthfully notify on new-device/new-session events and, if not, do not claim that protection;
- review Auth endpoint rate limits;
- evaluate Cloudflare Turnstile as a CAPTCHA candidate without adopting it solely for stack symmetry;
- set password policy from standards rather than arbitrary composition rules;
- block known-compromised passwords in supported RenderLab password-establishment/change flows through the free HIBP Pwned Passwords k-anonymity API; retain the Supabase-native leaked-password warning as an accepted Free-plan platform limitation rather than buying a plan upgrade for this feature.

### Password policy decision gate

Before MFA is mandatory for an account, target the NIST password-only minimum of 15 characters, preserve long-password support and avoid forced mixed-case/number/symbol rules solely for appearance.

If RenderLab later mandates MFA for all users, a shorter minimum may be standards-permitted, but any change remains explicit rather than silently weakening policy.

The configured policy must be programmatically available or shared through one canonical application contract so #223's visible requirement text cannot drift.

### Exit evidence

- hosted configuration evidence recorded without secrets;
- configured Auth-email delivery against owned test identities;
- enumeration-safe recovery preserved;
- password policy verified at both UI and Auth boundary;
- Security Advisor reviewed;
- rate-limit/CAPTCHA behavior verified when enabled;
- no raw Supabase errors exposed to users.

## 12. Workstream B — Session controls and security activity (#216)

**Status:** SESSION CONTROLS v0.1 COMPLETE / VERIFIED / MERGED / NOT DEPLOYED. Security Activity remains deliberately deferred.

Implementation authority: `docs/architecture/SESSION_CONTROLS_SECURITY_ACTIVITY_IMPLEMENTATION_CONTRACT.md`. PR #259 exact candidate `061b4bf49637b4fb09f0f1486b6a85f251ea6650` merged as `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`.

Implemented:

- privacy-safe owner-scoped active-session inventory in Settings;
- exactly one `This device` marker from freshly verified JWT `session_id` plus live provider session equality;
- created/last-active timestamps and coarse browser/platform labels;
- no IP/geolocation or raw user-agent display;
- **Sign out this device** → `local`;
- **Sign out other devices** → `others`;
- **Sign out everywhere** → `global`;
- private product/Admin authorization requires the verified session ID to remain in live owner-scoped `auth.sessions`, so revoked still-unexpired JWTs fail immediately;
- migration `0019_renderlab_auth_session_projection.sql` provides the read-only service-role-only provider projection;
- configured multi-session acceptance and fixture cleanup.

The hosted projection is verified `SECURITY DEFINER` with empty `search_path`, owner-scoped reads, no IP/token/factor projection, and execute unavailable to `PUBLIC`, `anon` and `authenticated`; only `service_role` (plus owner) can execute.

### Explicitly deferred from #216 v0.1

- arbitrary per-row `Revoke`: current supported user Auth APIs expose local/others/global but no supported exact owned-session UUID revoke; do not build a decorative or SQL-backed substitute;
- Security Activity: the approved hosted project's `auth.audit_log_entries` database table was empty despite active Auth usage, so RenderLab did not imply a complete history or change audit retention/PII policy;
- IP/geolocation, device fingerprint/trust and suspicious/new-device labels;
- paid hosted session lifetime/inactivity/single-session policy changes.

A future Security Activity slice must first establish a populated supported event source, retention/storage policy, privacy treatment, sanitized taxonomy and configured completeness evidence.

## 13. Workstream C — MFA, recovery and privileged step-up (#217)

**Status:** COMPLETE / VERIFIED / MERGED / NOT DEPLOYED.
**Priority delivered:** P0 Admin / P1 optional members.

Binding current policy:

- TOTP authenticator-app MFA only for the initial implementation;
- exactly one enrolled TOTP factor per user, enforced by hosted `mfa_max_enrolled_factors = 1`;
- ordinary-member MFA is optional to enroll, but private product access requires AAL2 once enrolled;
- active Admin access and Admin operations require a verified factor and AAL2;
- sensitive account/security operations use the contracted recent TOTP step-up where applicable;
- recovery-email state never counts as MFA;
- sole-factor replacement is recent step-up → remove factor → refresh to AAL1/no factor → immediately enroll/verify replacement;
- active Admin authorization disappears during that replacement gap;
- lost sole factor uses operator-assisted recovery with strong identity correlation, supported Supabase Admin MFA APIs and session revocation;
- no backup-factor UI, home-grown recovery codes, security questions, SMS-first factor or email-only bypass under the current contract.

Detailed authority: `docs/architecture/MFA_PRIVILEGED_STEP_UP_IMPLEMENTATION_CONTRACT.md` plus `docs/architecture/MFA_PRIVILEGED_STEP_UP_CONTRACT_AMENDMENT_1.md`. Do not reintroduce the superseded multi-factor/backup-factor assumption without a new provider-enforceable contract.

## 14. Workstream D — Identity and sign-in method management (#218)

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

### Linked identities and account collision

OAuth/social linking is not automatically a maturity requirement. Adopt only if it solves real user friction.

If adopted:

- linking starts from an already authenticated account;
- provider identity never grants admission by itself;
- unlinking the last usable sign-in method is blocked;
- security notifications are mandatory;
- account-collision/duplicate-account handling receives explicit two-account tests;
- an account-merge feature is not implied; merge requires its own ownership/data contract if ever needed.

## 15. Workstream E — Data export, privacy, retention and account deletion (#219)

### Why deletion is non-trivial

RenderLab deliberately uses `owner_id -> auth.users.id ON DELETE RESTRICT` on core account-owned data. This is an integrity feature. Self-service deletion must not weaken it globally.

An account may own:

- profile/display metadata and avatar objects once #223 is implemented;
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

- profile/account/access metadata appropriate for the user;
- generation history, prompts and normalized user-facing settings;
- collections/favorites metadata;
- durable media originals where practical;
- a machine-readable manifest relating media to jobs/collections.

Exclude secrets, provider credentials, worker routing and internal execution metadata.

### Data-use transparency

Because RenderLab processes creative prompts/uploads/results, users should be able to understand:

- what is stored;
- what is temporary versus durable;
- which systems/providers process the content;
- the broad retention/deletion behavior;
- whether content is used for model training or product improvement.

Do not expose a training/data-use opt-out unless there is actual optional reuse behavior that can be controlled. If infrastructure never trains on user content, document that truth rather than presenting a fake toggle.

### Account deletion lifecycle

Proposed sequence:

1. Fresh reauthentication / AAL2 step-up.
2. Explain scope, retention exceptions and irreversible consequences.
3. Offer data export before destructive confirmation.
4. Block new generation/admission for the account.
5. Resolve active jobs under an explicit policy; do not orphan accepted backend work.
6. Tombstone/delete owned media and purge R2 through safe deletion mechanics or a dedicated owner-wide equivalent.
7. Remove profile/avatar, collection/upload/admission state in dependency-safe order.
8. Delete or de-identify generation history according to retention policy.
9. Revoke all sessions/factors.
10. Remove RenderLab account-access state.
11. Delete/de-identify the Supabase Auth user **last**, after `ON DELETE RESTRICT` relationships are intentionally cleared.
12. Verify no owner-scoped database/R2 residue remains beyond documented retention exceptions.

### Retention decisions required first

Explicitly classify:

- profile/avatar data;
- active/succeeded/failed/cancelled generation jobs;
- deleted/tombstoned media;
- R2 objects;
- Auth/security audit logs;
- future Admin/security audit evidence;
- abuse/security records;
- aggregate non-identifying operational metrics.

Account deletion cannot be called complete while these rules remain implicit.

## 16. Workstream F — Product preferences, accessibility and notifications (#220)

**Priority:** P2; do not let this delay security fundamentals.

### Typed preference model

If multiple durable preferences are approved, use one typed RenderLab-owned server contract rather than scattering browser local-storage flags.

Potential first-class preferences:

- preferred Create output kind;
- preferred supported image aspect ratio;
- preferred supported Video resolution/duration/audio defaults;
- optional generation-completion/failure notification choices;
- app-level reduced-motion override only if there is demonstrated need beyond the OS preference.

Rules:

- capability definitions remain authoritative; stale saved values fall back to current valid defaults;
- do not persist worker/model implementation identities as preferences;
- security/authorization state is never a preference;
- existing URL/server-owned Library state stays separate unless a product decision deliberately makes a default persistent.

### Accessibility preferences

Accessibility is mandatory independent of preferences. RenderLab must always provide keyboard/screen-reader/touch/reduced-motion support.

Optional user settings may be considered only where they add real capability beyond platform/OS settings, for example:

- reduced-motion override;
- future contrast/density controls if the design system supports them end-to-end;
- animation/media autoplay controls if such behavior exists.

Do not create non-functional accessibility toggles.

### Notification architecture

Do not create toggles until a real delivery channel exists.

Potential channels:

- in-app notification center;
- email for long-running generation completion/failure;
- browser notification only after explicit permission and a real background-delivery design.

Security notifications are not marketing/product preferences and should not be user-disableable by default.

## 17. Passkeys / WebAuthn research (#221)

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

## 18. Deliberately deferred conventional categories

Common Settings sections are not automatically RenderLab requirements.

### Public profile extras

Bio, pronouns, location, social links, profile visibility and public-profile customization remain deferred until sharing/collaboration/public identity creates a real use.

### Birthday / gender / demographic fields

Do not collect without a concrete age, legal, safety or personalization requirement. Unnecessary personal data is not account maturity.

### Theme / light mode

A theme setting is not a one-control feature. RenderLab's current design is built around the near-black system. A real light theme requires cross-product token/design/accessibility work.

### Language / region / time zone

Deferred until localization or time-zone-aware behavior exists.

### Billing / subscription / invoices

Deferred until RenderLab has a commercial/billing model.

### API keys / connected apps

Deferred until RenderLab exposes a developer API or third-party integration contract.

### Team / workspace / organization membership

Deferred until multi-user collaboration/workspaces exist.

### Marketing communication preferences

Deferred until RenderLab actually sends optional marketing communications. Security and transactional account mail are not marketing preferences.

This list prevents fake maturity: conventional menu labels are not product capabilities.

## 19. Proposed execution sequence

RenderLab's progressive-planning rule remains in force. Only the immediate selected workstream should receive an execution-ready phase contract.

Completed account-security foundation:

1. **#215 — Auth & email hardening:** complete, verified and production-live.
2. **#217 — MFA & privileged step-up:** complete, verified, merged; not deployed by that workstream.
3. **#216 — Session Controls v0.1:** complete, verified, merged; not deployed by that workstream. Security Activity remains a separately gated follow-on.

Default next planning sequence unless explicitly reprioritized:

4. **#218 — Identity management:** secure email change and current identity/admission edge cases now that step-up/session foundations exist.
5. **#219 — Data/privacy lifecycle:** export, retention and owner-wide deletion from a verified ownership/data map.
6. **#223 — Profile & credential UX baseline:** independent P1 basic-maturity work that may be selected earlier if the user prioritizes visible account basics; it must not alter canonical Auth/authorization semantics.
7. **#220 — Preferences & product notifications:** only product-backed durable preferences/channels/accessibility overrides.
8. **#221 — Passkeys:** promote from research only after stability/domain/recovery gates are satisfied.

The Phase 23–29 UI redesign program is already complete and production-live. This account-capability roadmap is a separate product/security program.

## 20. Cross-cutting implementation invariants

Every future account-capability phase must preserve:

- `auth.users.id` as canonical identity unless explicitly redesigned;
- display name/avatar/username as non-authoritative profile metadata;
- RenderLab admission/role state separate from provider Auth metadata;
- no authorization from user-editable metadata;
- server verification of current identity for private/sensitive actions;
- owner-scoped data access;
- fail-closed behavior on auth/recovery ambiguity;
- enumeration-safe recovery;
- sanitized user-facing failures;
- no browser service-role/secret access;
- no direct browser access to Auth schema/session/audit tables;
- no raw session/access/refresh tokens or password values in logs or UI artifacts;
- exact fixture isolation and cleanup for Auth-backed CI;
- keyboard/touch/focus/accessibility parity;
- no deployment/config mutation without explicit authorization.

Sensitive operations—email change, MFA/recovery-factor mutation, account deletion, sign-in-method mutation and similarly high-impact actions—must define a concrete reauthentication/step-up guarantee rather than assuming an existing session is enough.

## 21. Validation expectations by workstream

### Profile / credential UX

- two-account profile isolation;
- same `auth.users.id` and existing ownership before/after edits;
- avatar validation/storage cleanup;
- username uniqueness/reserved-name/rename cases if implemented;
- desktop/390px profile and password-form states;
- show/hide accessibility;
- password-manager/autofill/paste behavior;
- server-policy/visible-requirement parity;
- no secrets in logs/artifacts.

### Auth/email hardening

- owned test identities;
- custom-mail delivery evidence without exposing secrets;
- safe redirect/link behavior;
- recovery enumeration protection;
- exact password-policy behavior;
- Security Advisor evidence;
- CAPTCHA/rate-limit tests when enabled.

### Sessions

- at least two simultaneous sessions;
- local/others/global exact revocation matrix;
- current-session identification;
- owner isolation for inventory endpoints;
- stale bearer rejection after revocation;
- sanitized metadata review.

### MFA / recovery

- one-factor enroll/challenge/verify;
- AAL1 → AAL2 transition;
- protected Admin/sensitive-action denial at AAL1;
- direct second-factor enrollment rejected by the hosted one-factor cap;
- protected sole-factor remove/replace flow;
- operator-assisted lost-factor recovery;
- other-session behavior after factor changes;
- exact MFA/recovery fixture cleanup.

### Email change

- old/new address confirmations as configured;
- same `auth.users.id` preserved;
- RenderLab access/media ownership preserved;
- invitation/Admin-email edge cases;
- security notification;
- two-account collision tests.

### Export/deletion

- owned account with profile/media/jobs/collections/upload/admission state;
- active-job policy;
- exact profile/avatar/R2 cleanup;
- database owner-row cleanup/de-identification;
- session revocation;
- Auth identity removed last;
- explicit retention-exception audit;
- cross-account non-interference.

### Preferences/notifications

- server-owned typed preference validation;
- stale capability fallback;
- cross-device persistence;
- accessibility override behavior where implemented;
- channel delivery/opt-out behavior;
- security notifications kept distinct from optional product notifications.

## 22. Documentation contract

This roadmap is authoritative for the broader Account & Settings capability program.

Future durable documentation work must ensure:

- `PROJECT.md` references this roadmap as the account-management product roadmap;
- `docs/architecture/PRODUCT_CAPABILITIES.md` distinguishes the existing Phase 10 account baseline from this future expansion;
- `docs/ui/UI_MIGRATION.md` makes clear that Phase 27 visual completion does not close the account/settings capability program;
- `docs/ui/SCREEN_REGISTRY.md` changes only when actual Settings capabilities are implemented and verified, not merely because they appear here.

The umbrella #213 remains open until those source-of-truth cross-references are recorded. Child workstreams remain open until independently planned, implemented and verified.

## 23. Program completion definition

The broader Account & Settings program is not complete when the Phase 27 page looks polished. It is complete only when RenderLab has deliberately addressed or explicitly rejected:

- basic profile identity: display name, avatar and username/handle decision;
- consistent credential/password-field UX;
- reliable account email/recovery infrastructure;
- modern password/abuse posture;
- session control and security visibility;
- MFA/step-up and recovery for privileged and sensitive operations;
- identity/email management;
- security notifications and access-change awareness;
- data export, privacy/data-use transparency and account deletion/retention;
- product-backed preferences/notifications/accessibility overrides;
- an explicit decision on passkeys and linked identities;
- clear documentation of intentionally deferred categories.

Until then, Phase 27 must be described as the **Settings visual/account-IA redesign**, not completion of RenderLab account management.