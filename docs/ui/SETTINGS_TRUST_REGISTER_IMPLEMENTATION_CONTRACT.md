# Phase 27 — Settings Trust Register Implementation Contract

**Status:** EXECUTION CONTRACT — implementation authorized after merge; deployment and hosted Auth mutation are not authorized  
**Tracker:** issue #211  
**Planning baseline:** `main` `30ee51383f2c2fddf8675b25a6a2921c64bc1b31`  
**R&D checkpoint:** draft PR #212 exact head `9f315be09a6de3db51de39e215990ca86901f1a4`  
**Decision:** UI-078  
**Broader account roadmap:** `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`; umbrella #213 closed after source-of-truth cleanup; child workstreams #215–#221 and #223 remain independently governed

## Goal

Implement the bounded Phase 27 **Trust Register** redesign for `/settings` and `/settings/password` so the account surface becomes a calm, legible member of the RenderLab visual system while presenting only capabilities that already exist and only security consequences that are already verified.

This phase deliberately chooses **boundary A: visual/account-information-architecture restructuring of current behavior**. It does not pull the Profile/Credential baseline (#223), hosted Auth hardening (#215), session-management expansion (#216), MFA (#217), identity-method management (#218), data lifecycle (#219), preferences/notifications (#220), or passkeys (#221) into Phase 27.

Phase 27 changes presentation, grouping, copy and local interaction hierarchy. It is not a schema, account-profile, authentication-policy, session-platform, provider, storage, authorization, admission, ownership, email-delivery or deployment phase.

## User value

The current Settings implementation is secure and functional but shallow in presentation:

- signed-in identity, Closed Beta access and security actions are compressed into one rounded panel;
- the page intro reads primarily like signed-out guidance even when an account is already signed in;
- the sign-in email is visible but not clearly framed as the authoritative sign-in identity;
- the current `Sign out` label understates the verified behavior because the action globally revokes RenderLab sessions;
- password-change and verified-recovery flows do not visually explain why their credential requirements differ;
- the surface does not yet read like the quieter account/security member of the finished RenderLab system.

Phase 27 makes those existing truths easier to understand without suggesting that missing mature-account capabilities already exist.

## Verified starting state

At planning start:

- `main` is `30ee51383f2c2fddf8675b25a6a2921c64bc1b31`;
- Phase 26 Activity is complete, merged and not deployed;
- UI-074 is the current application-shell authority: compact horizontal application header, no persistent desktop rail and no fixed mobile dock;
- Settings is a Visual North Star **1/4-expressiveness** surface;
- `/settings` server-loads the fresh Supabase identity, resolves server-owned RenderLab access truth and exposes the Admin continuation only when current active-admin identity is confirmed;
- `src/features/account/account-settings.tsx` owns the current signed-out email/password sign-in, enumeration-safe recovery request, signed-in account/access presentation and global Supabase sign-out action;
- `/settings/password` requires a current identity and uses the signed short-lived recovery marker to distinguish ordinary password change from verified recovery replacement;
- ordinary password change re-verifies the current password before `updateUser({ password })`;
- verified recovery omits Current password only when the server-validated recovery marker is valid;
- current password forms use Current / New / Confirm semantics where applicable, browser autocomplete metadata and the existing 8-character product floor;
- the configured Account Identity verifier proves that password replacement preserves the acting/recovery session while revoking other sessions, and that the current Settings sign-out action revokes a separately created secondary session;
- current Settings has no durable display-name/avatar/username product profile, no MFA controls, no active-session inventory, no selective session revoke, no sign-in-email editing, no export/deletion controls, no account-level notification system and no passkey productization;
- live Supabase Security Advisor evidence remains unresolved for `Leaked Password Protection Disabled` and Phase 27 must not imply otherwise;
- production remains the separately recorded Landing-era deployment; automatic Git → Vercel deployment remains disabled.

## Design and planning authority

Phase 27 uses the low-expressiveness **Trust Register v0.2** direction from draft PR #212 as a visual/account-IA checkpoint, not as unconditional production authority.

Binding planning interpretation:

- preserve its registered, row-based Account / Access / Security / Sessions grammar;
- preserve its near-black field, compressed editorial hierarchy, technical microtype, precise rules, restrained cool/warm atmosphere and small quarter-arc system signature;
- preserve its state-specific Settings intro direction, read-only **Sign-in email** framing, truthful password-session consequence copy and **Sign out everywhere** wording;
- preserve its desktop registered rows and 390px stacked row rhythm;
- preserve the UI-074 shell rather than reintroducing the historical rail/dock.

The later merged Account & Settings roadmap supersedes the older R&D wherever scope differs. In particular, R&D v0.2's proposed password Show/Hide controls and expanded credential-field interaction are **not** part of Phase 27 implementation. #223 now owns one consistent credential interaction standard across all credential surfaces. Phase 27 should leave enough field geometry for that later control, but must not implement a partial Settings-only version.

Likewise, display name, avatar and username are now planned capabilities rather than categorically rejected concepts, but they remain #223 work and are not Phase 27 controls.

## In scope

### 1. Settings route composition

Recompose `/settings` as one quiet registered account object rather than one rounded account card plus disconnected sections.

For a signed-in account, the primary registered groups are:

1. **Account**
   - label the current canonical account email as **Sign-in email**;
   - display the current fresh identity email read-only;
   - explain concisely that it is used to sign in and cannot currently be changed in RenderLab;
   - do not add an Edit action or imply email-change capability.

2. **Access**
   - preserve exactly the current server-derived RenderLab access states: `Active`, `Suspended`, `Invitation required`, and `Transition access`;
   - preserve the existing meaning of each state and the distinction between Supabase authentication and RenderLab admission;
   - textual state remains authoritative; color/tone may support it but may never replace it.

3. **Security**
   - retain the existing **Change password** continuation to `/settings/password`;
   - explain the already verified consequence of successful password replacement: the acting/recovery session remains usable and other RenderLab sessions are revoked;
   - do not add MFA, passkey, linked-provider or other authentication-method controls.

4. **Sessions**
   - rename the existing Settings action from **Sign out** to **Sign out everywhere**;
   - helper copy must state that it ends RenderLab sessions on every device/browser;
   - underlying sign-out behavior remains the existing Supabase global sign-out path; do not introduce local/others/selective scopes in this phase;
   - presentation may use restrained warning/destructive emphasis appropriate to the broader action, but it must not become alarmist or appear to delete account data.

Conditional **Admin** continuation remains subordinate and visible only when the existing fresh active-admin identity check succeeds. Do not fold Admin operations into ordinary Settings.

### 2. Signed-out Settings

Keep the same invitation-only authentication capability and recovery behavior while adopting the Trust Register hierarchy:

- state-specific intro: `Sign in to your invited RenderLab account.` or equivalent concise copy;
- Email and Password remain the only sign-in credential fields;
- the existing Forgot-password action remains available but becomes a secondary recovery action associated with the Password field/form rather than a competing primary button;
- primary action remains **Sign in**;
- invitation-only Closed Beta context remains explicit;
- recovery request feedback remains enumeration-safe;
- no public Create-account affordance, social login, Remember-me control or unsupported authentication method.

Phase 27 may change placement and visual hierarchy of the existing recovery button, but not its request semantics, redirect target, error sanitization or account-enumeration posture.

### 3. Password route — ordinary change

Restyle `/settings/password` into the same Trust Register family while preserving behavior:

- title remains **Change password**;
- Current password remains required and is re-verified using the current account email before password replacement;
- New password and Confirm new password remain required;
- current autocomplete semantics remain intact;
- existing match validation and sanitized error handling remain intact;
- the current 8-character floor is preserved as existing behavior during this phase; Phase 27 must not invent a new policy, composition rules, strength score or compromised-password claim;
- add truthful explanatory copy that this browser/acting session remains usable while other RenderLab sessions are revoked after a successful change;
- primary action remains **Update password**.

The visual field composition should reserve practical trailing space so #223 can later introduce a consistent Show/Hide control without redesigning the page again, but no reveal control is implemented under this contract.

### 4. Password route — verified recovery

When the existing server-validated recovery marker is valid:

- title remains **Set a new password**;
- present compact **Verified recovery link** context so the omission of Current password is understandable;
- keep only New password and Confirm new password;
- preserve the same existing policy/match validation and sanitized errors as the ordinary path;
- explain truthfully that the recovery session remains usable while older/other sessions are revoked after replacement;
- never expose the old-password-free form when the recovery marker is absent, invalid, expired or bound to a different user.

No recovery bypass, custom recovery code, MFA bypass or alternate identity proof is added.

### 5. State-specific page copy

The top-of-page message must reflect the real state rather than assuming every visitor is signed out:

- signed out: focused sign-in guidance;
- signed in: `Manage your account, access and security.` or equivalent;
- runtime unavailable: preserve truthful account-access-unavailable messaging;
- suspended/invitation-required/transition states remain server-derived and legible inside Access;
- password route keeps normal vs verified-recovery titles and explanation.

### 6. Visual language

Settings stays at 1/4 expressiveness:

- near-black registered field rather than large glass dashboard cards;
- narrow section label/index column plus wide value/action column on desktop where practical;
- precise 1px registration rules and restrained spacing;
- technical microtype for labels/state context;
- one small canonical quarter-arc/system-signature accent only where it does not compete with account/security truth;
- cool/warm atmosphere remains subtle and subordinate to readability;
- ordinary controls remain conventional and visually stable;
- avoid security spectacle, fake terminal/device visuals, oversized hero typography or decorative telemetry.

### 7. Responsive behavior

Desktop target: 1440×1000 or current repository visual-fixture equivalent.

- registered rows align predictably;
- values/actions do not drift into dashboard-card layouts;
- long account email remains readable without breaking geometry;
- Admin continuation remains visibly subordinate.

Narrow target: 390×844.

Each row collapses in document order:

`section label → value/title → helper/status → action`.

Requirements:

- one-column password forms;
- no body/document horizontal overflow;
- essential action targets remain at least 44px effective height where practical;
- sign-in recovery action remains clear without crowding Password;
- no hover dependency;
- keyboard focus remains visible;
- long email values wrap safely.

### 8. Reduced motion

Phase 27 does not require new ambient motion.

If any existing/shared transition is present:

- `prefers-reduced-motion` must present the complete state immediately;
- controls and content cannot depend on animation for meaning;
- no security/status pulse or motion may imply unverified activity/risk.

## Explicitly out of scope

The following roadmap items are **not Phase 27 implementation authorization**:

### #223 — Profile and credential UX baseline

Out of scope for this phase:

- editable display name;
- avatar/profile-picture upload, crop, replace, remove, reset or fallback system;
- username/handle namespace, uniqueness, rename or public-identity behavior;
- reusable password Show/Hide controls;
- eye-icon/reveal-state component work;
- Caps Lock detection;
- a new shared credential-field component/contract;
- policy-driven live password-requirement UI beyond preserving today's verified current behavior;
- cross-flow password-manager/paste UX expansion beyond current semantics.

Existing Current / New / Confirm labels, autocomplete attributes and match validation remain because they are already implemented.

### #215 — Auth and email delivery hardening

Out of scope:

- hosted Supabase Site URL/redirect/template changes;
- SMTP/Auth email hook work;
- sender-domain SPF/DKIM/DMARC work;
- rate-limit/CAPTCHA changes;
- security-notification email configuration;
- changing the actual password minimum/policy;
- enabling leaked-password protection;
- claiming the Security Advisor blocker is resolved.

### #216 — Sessions and security activity

Out of scope:

- active-session inventory;
- current-session detection UI;
- per-session or sign-out-other-sessions controls;
- device/browser/location naming beyond the existing truthful all-session consequence;
- security-event history or unusual-access/risk labels.

### #217 — MFA and privileged step-up

Out of scope: TOTP, factors, backup/recovery methods, AAL2 management, member MFA and new privileged step-up flows.

### #218 — Identity and sign-in methods

Out of scope: sign-in-email editing/verification change flow, linked identities, social/provider sign-in controls.

### #219 — Data export, retention and deletion

Out of scope: export, retention controls/disclosure expansion, account deletion, media/R2 lifecycle changes or bypassing the current `owner_id -> auth.users.id ON DELETE RESTRICT` design.

### #220 — Preferences and notifications

Out of scope: product defaults, theme/language controls, notification preferences or accessibility toggles not backed by a real product system.

### #221 — Passkeys / WebAuthn

Out of scope: passkey enrollment, authentication, recovery or making experimental passkeys part of a required account path.

### Other exclusions

- route additions or Settings navigation expansion;
- schema/database migrations;
- API/RLS changes;
- admission/role/ownership semantics;
- user-metadata authorization;
- provider, worker or R2 changes;
- new runtime dependency, global state store or animation runtime;
- Admin product redesign;
- Phase 28/29 work;
- production deployment.

## Architecture and state ownership

Preserve current ownership boundaries:

- `getCurrentRenderLabIdentity()` remains the source of fresh canonical Supabase identity for Settings;
- `resolveRenderLabAccountAccess()` remains the source of RenderLab admission/status/role truth;
- `getCurrentRenderLabAdmin()` remains the fresh Admin continuation gate;
- `auth.users.id` remains the canonical immutable owner identity;
- user-editable Auth/profile metadata grants no admission, role, ownership or Admin privilege;
- browser state owns only local form values, busy state, sanitized feedback and presentation;
- ordinary password change continues to verify Current password before replacement;
- verified recovery continues to depend on the signed server-validated recovery marker;
- Settings sign-out continues to use the existing global Supabase sign-out behavior;
- all auth/recovery feedback remains sanitized and enumeration-safe;
- no raw access/refresh token, password, service credential, provider identifier or secret is rendered, logged or stored in artifacts.

If implementation reveals a need to change one of these contracts, stop Phase 27 and record a separate explicit decision rather than expanding scope silently.

## Component and dependency policy

Use, in order:

1. current account components and server/auth contracts;
2. existing RenderLab maintained primitives under `src/components/ui`;
3. feature-local composition/styling;
4. existing shared motion utilities only if already required by the shell/system.

No dependency addition is expected or authorized.

Do not introduce a Settings-specific generic component system for future roadmap features. `COMPONENT_CATALOG.md` changes only if implementation actually creates a reusable cross-feature component, which is not expected in this phase.

## Expected implementation files

Likely production changes are bounded to:

- `src/app/(app)/settings/page.tsx`;
- `src/app/(app)/settings/password/page.tsx`;
- `src/features/account/account-settings.tsx`;
- `src/features/account/account-password-form.tsx`;
- Settings/account-specific styling in `src/app/globals.css` or an equivalent feature-local stylesheet consistent with repository convention;
- `scripts/verify-account-identity.mjs` only where locators/copy/evidence must migrate while preserving substantive auth/security assertions;
- `.github/workflows/account-identity-visual.yml` only if additional bounded screenshot evidence is needed;
- closure documentation after verified implementation.

Do not touch Supabase migrations, account-access/auth server semantics, recovery cryptography, APIs, RLS, storage, generation systems or unrelated screen source merely for visual convenience.

## Validation matrix

### Exact-head engineering gates

At the final candidate head:

- `npm run build`;
- `npm run verify:ui-purity`;
- all lint/TypeScript/static gates required by Engineering Quality;
- every workflow GitHub actually attaches because of the final changed files must pass at that exact SHA.

Expected attached coverage for the likely file set includes at minimum:

- **Engineering Quality**;
- **Account Identity Visual** for configured signed-out/signed-in/suspended/recovery/password/global-sign-out behavior;
- **UI Shell Validation** when shared shell/global-style path filters attach;
- **Release Candidate Matrix / Integrated Release** only if their current path filters attach to the final diff.

Do not claim Account Ownership or unrelated product suites ran unless GitHub actually attaches them or they are deliberately dispatched at the exact head.

### Substantive account/security regression assertions

The configured Account Identity verifier must continue to prove, without weakening assertions:

- signed-out Settings exposes Sign in and recovery but no public Create account or Admin continuation;
- active signed-in Settings exposes the current identity and Active access truth;
- suspended accounts retain password and sign-out controls while private product access remains denied;
- Admin continuation appears only for a fresh active-admin identity match;
- ordinary password change requires Current password and rejects an incorrect current credential;
- verified recovery only reaches the old-password-free form through the valid recovery marker path;
- successful password change/recovery revokes other sessions while preserving the acting/recovery session according to the current verified contract;
- **Sign out everywhere** globally revokes the independently created secondary session;
- private access rejects stale/revoked sessions;
- no horizontal overflow at desktop/narrow fixtures.

Presentation locators may migrate only to UI-078 wording/hierarchy. Do not relax security assertions merely to get green.

### Dedicated Phase 27 visual/fidelity evidence

Implementation evidence must cover real production code at the exact candidate head.

**Desktop**

- signed out;
- signed in / Active;
- Suspended;
- Invitation required or deterministic equivalent if current fixture supports it;
- conditional Admin continuation;
- normal Change password;
- verified recovery;
- feedback/error state where deterministic;
- runtime-unavailable state if deterministic fixture coverage already exists or can be added without weakening real configuration tests.

**390×844**

- signed out;
- signed in actions including Change password and Sign out everywhere;
- Suspended actions;
- normal password change;
- verified recovery;
- no horizontal overflow and all essential actions reachable without occlusion.

**Keyboard/touch/reduced motion**

- Sign in, Forgot password, Change password, Update password, Sign out everywhere and Admin continuation remain keyboard reachable with visible focus;
- recovery placement does not make touch targeting ambiguous;
- no action depends on hover;
- reduced motion renders a complete equivalent state.

No screenshot/artifact may contain actual secret values. Test passwords must remain masked by default under this phase because password reveal UI is explicitly out of scope.

### Fidelity comparison

Human review should compare implementation against the **Trust Register v0.2** R&D checkpoint only for the scope adopted by UI-078:

- quiet 1/4-expressiveness account/security character;
- UI-074 shell continuity;
- registered rather than card-stack composition;
- Account / Access / Security / Sessions hierarchy;
- clear Sign-in email framing;
- truthful global-sign-out hierarchy;
- ordinary vs verified-recovery legibility;
- technical microtype, precise rules and restrained atmosphere;
- desktop-to-390px row collapse.

The following elements from v0.2 are intentionally **not fidelity requirements** because later roadmap decisions moved them to #223: password Show/Hide controls and any broader reusable credential-field interaction standard.

A technically green implementation fails Phase 27 if it reverts to isolated rounded SaaS cards, invents unsupported account/security controls, obscures global sign-out scope, fabricates device/session/risk information, or visually implies the broader account roadmap is complete.

## Documentation outputs after verified implementation

Update only from verified implementation reality:

- `PROJECT.md` — Phase 27 closure, Phase 28 handoff, account-roadmap status remains separate, production pointer unchanged unless independently deployed;
- `docs/ui/UI_MIGRATION.md` — exact-head, merged-main and fidelity evidence; explicitly keep broader Account & Settings work open;
- `docs/ui/UI_DECISIONS.md` — UI-078 from accepted/planned to implemented/verified/merged;
- `docs/ui/SCREEN_REGISTRY.md` — only the Settings composition/behavior actually shipped;
- `docs/ui/UI_SYSTEM.md` only if Phase 27 establishes a genuinely reusable cross-surface system rule;
- `docs/ui/COMPONENT_CATALOG.md` only if a genuinely reusable component is added;
- `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` only if implementation changes verified capability status; Phase 27 visual completion alone must not mark #215–#221/#223 complete.

## Exit criteria

Phase 27 implementation is complete only when:

1. this implementation contract and UI-078 are merged before production Settings source changes;
2. implementation stays on boundary A and does not absorb #215–#221/#223 capability work;
3. `/settings` presents one truthful Trust Register using current server-owned identity/access/Admin truth;
4. Sign-in email is clearly framed read-only without inventing email editing;
5. Access states remain exact current server-derived truth;
6. Security retains Change password and truthfully explains existing session consequences;
7. the current global action is labeled **Sign out everywhere** and the configured verifier still proves secondary-session revocation;
8. ordinary password change and verified recovery preserve all current fail-closed authentication/recovery behavior;
9. no Show/Hide/profile/session-inventory/MFA/email-change/export/delete/preferences/passkey capability is smuggled into the phase;
10. desktop and 390px visual evidence is reviewed against the adopted v0.2 account-IA/visual direction;
11. keyboard, touch, focus and reduced-motion behavior remain complete;
12. every workflow attached to the exact candidate head passes without weakened assertions;
13. merged-main workflows required by repository practice pass after merge;
14. durable repository documentation is updated from verified reality;
15. no production deployment or hosted Supabase/Auth mutation occurs unless separately and explicitly authorized.

After Phase 27 closes, the Account & Settings roadmap remains active through its child workstreams. Per the merged roadmap sequence, #223 is the next user-facing maturity lane to expand into an implementation-ready contract when appropriate, while #215 may proceed in parallel as separately authorized hosted-Auth planning.