# Phase 27 Settings / Account Security R&D v0.2

**Status:** Revised design candidate — convention/security audit incorporated; awaiting user review  
**Tracker:** #211  
**Baseline:** `750a5365ad9786f9216f7acef10d829cae048d60`  
**R&D branch:** `rd/settings-account-security-v01`  
**Supersedes:** Phase 27 R&D v0.1 on this branch  
**Production implementation:** not authorized by this artifact

## 1. Why v0.2 exists

The first Trust Register direction was visually coherent but too narrow as an account-settings product. An impartial convention audit found that it represented identity, access and password change, but underrepresented the ordinary account/security logic users expect to understand:

- what email is actually used to sign in;
- what the password action does to other sessions;
- whether sign-out affects this browser or every device;
- how password recovery relates to the normal password-change path;
- whether security-sensitive fields support ordinary usability such as password visibility toggles;
- which familiar capabilities are genuinely absent rather than merely omitted from the mock.

The audit also found one concrete wording/logic mismatch in the current implementation: `supabase.auth.signOut()` is called without a scope, while the current Settings copy describes ending “this signed-in session.” Current Supabase JavaScript behavior uses global sign-out by default, and RenderLab's configured Account Identity verifier explicitly proves that a secondary session is revoked after the Settings Sign out action. Phase 27 must therefore present that action truthfully as an all-session/global sign-out unless a future product decision deliberately changes the underlying scope.

v0.2 keeps the same calm 1/4-expressiveness direction, but makes the product model feel conventionally complete **without inventing unsupported controls**.

## 2. Audit result: what belongs in Phase 27 now

These improvements fit the existing product/backend contract and should be part of the Phase 27 implementation candidate if v0.2 is approved.

| Gap | v0.2 decision | Why |
| --- | --- | --- |
| Sign-in identity is present but not framed as an account field | Add a clear **Sign-in email** row | Users should understand which identity is authoritative even though email editing is not currently supported |
| Forgot password competes visually with Sign in | Place **Forgot password?** beside the Password field as a secondary recovery action | Matches conventional auth hierarchy while preserving the same recovery method |
| Password entry lacks a visibility affordance | Add accessible **Show / Hide** controls to password inputs | Familiar usability improvement; no auth semantic change |
| Password rules are easy to miss | Keep an explicit **8+ characters** requirement and confirmation-match feedback | Mirrors the real current minimum without inventing a strength score |
| Sign-out scope is ambiguous/misstated | Rename to **Sign out everywhere** and explain that it ends RenderLab sessions on all devices | Matches actual verified global-revocation behavior |
| Password-update security consequence is hidden | Explain that password replacement keeps the acting session usable and revokes other sessions | This behavior is already verified by configured CI |
| Recovery mode looks like a special form but not a security state | Add a compact **Verified recovery link** context and the same session-revocation explanation | Makes the reason for omitting Current password understandable without weakening fail-closed recovery |
| Settings reads like one undifferentiated account card | Use explicit **Account / Access / Security / Sessions** register groups | Gives conventional information architecture without adding routes or fake preferences |

## 3. Conventional capabilities that are genuinely missing — defer, do not fake

Several features commonly present in mature account-security settings are real RenderLab product/security gaps, not merely visual omissions. They should **not** appear as interactive controls in Phase 27 until separately specified and implemented.

### Priority security follow-up

1. **MFA / two-step verification / passkeys**
   - This is the most important missing security capability, especially for privileged Admin identities.
   - OWASP recommends MFA wherever practical and specifically calls out high-privilege accounts.
   - Phase 27 should leave visual/IA room for a future authentication-method row, but must not render “Enable 2FA” or “Add passkey” before a real auth/recovery contract exists.

2. **Session/device management**
   - Mature products commonly show active sessions/devices and let users revoke a specific session or all other sessions.
   - RenderLab currently has secure global revocation but no user-facing session inventory or selective revocation.
   - Do not fabricate device names, locations, timestamps or a “current session” list.

### Account lifecycle follow-up

3. **Change sign-in email**
   - Conventionally expected, but it changes canonical login identity and requires verification/recovery/ownership implications.
   - Until a contract exists, v0.2 labels the current address as **Sign-in email** and states that email changes are not currently available rather than showing a dead Edit control.

4. **Self-service account deletion / data export**
   - Common in mature services and important before a broader public launch.
   - RenderLab owns durable media, generation history, collections and storage objects, so deletion/export requires explicit data-retention/storage/reference semantics.
   - Do not add a decorative “Danger zone” until that lifecycle is specified.

### Intentionally not missing yet

The following are common on some sites but are not currently justified RenderLab settings:
- profile photo / display-name editing;
- notification preferences where no notification product exists;
- billing/subscription controls;
- connected apps/API keys;
- language/theme settings merely to make the page feel fuller.

The repository rule remains requirement-driven Settings, not a generic preference warehouse.

## 4. Proposed product structure — Trust Register v0.2

### Signed in

The page uses one registered field with four ordinary groups:

1. **Account**
   - `Sign-in email`
   - canonical account email
   - concise read-only note: `Used to sign in. Email changes are not currently available.`

2. **Access**
   - Closed Beta status (`Active`, `Suspended`, `Invitation required`, or `Transition access`)
   - one sentence of real server-derived meaning
   - color supports, but never replaces, the textual state

3. **Security**
   - Password row
   - `Change password`
   - concise security consequence: replacing the password signs out other sessions while preserving the acting session, matching the current verified flow

4. **Sessions**
   - clearly labels the current all-session behavior
   - `Sign out everywhere`
   - helper text: `Ends RenderLab sessions on every device and browser.`
   - visually serious but not alarmist; use restrained destructive/warm treatment because the action is broader than a local logout

Conditional **Admin** continuation remains a fifth subordinate group only for a fresh active-admin identity match. It is not part of ordinary security controls.

### Signed out

The same registered surface becomes one focused sign-in task:
- Email
- Password with Show / Hide
- `Forgot password?` as a secondary recovery action adjacent to the Password label rather than a competing button
- primary `Sign in`
- quiet `Invitation-only Closed Beta` context
- no Remember me checkbox, public Create account, social login, or unsupported auth method

Recovery-request success/error remains inline with the form and must keep the current account-enumeration-safe copy.

### Change password

Normal password change contains:
- Current password + Show / Hide
- New password + Show / Hide
- Confirm new password + Show / Hide
- explicit `8+ characters` requirement
- match feedback without a fabricated strength meter
- security note: `This browser stays signed in. Other RenderLab sessions are revoked after the password is changed.`
- primary `Update password`

### Verified recovery

Verified recovery keeps the same visual grammar but:
- displays `Verified recovery link`
- omits Current password only because the server validated the signed, short-lived recovery marker
- keeps New password / Confirm + Show / Hide
- explains that the recovery session remains usable while older sessions are revoked
- never offers the old-password-free form if the recovery marker is invalid or expired

## 5. State-specific page copy

The page intro should no longer read as if every visitor is signed out.

- Signed out: `Sign in to your invited RenderLab account.`
- Signed in: `Manage your account, access and security.`
- Runtime unavailable: `Account access is unavailable in this runtime.`
- Password route: use the existing state-specific `Change password` / `Set a new password` titles.

This is presentation logic only; server-owned identity/access truth remains authoritative.

## 6. Visual direction

The v0.1 visual language remains strong and is preserved:
- UI-074 compact horizontal application header;
- near-black registered field;
- compressed editorial hierarchy;
- technical microtype and precise 1px rules;
- restrained cool/warm atmosphere;
- canonical quarter-arc accent as a small system signature;
- no giant glass card, left rail, fixed mobile bottom dock or decorative security spectacle.

The v0.2 change is mostly **information architecture and control hierarchy**, not a new theme.

### Desktop

Use a two-column registered composition:
- narrow section label/index column;
- wide value/action column.

Rows should read like account settings, not dashboard cards. Keep actions aligned predictably at the end of each row where practical.

### 390px

Collapse each row to:
`section label → value/title → helper/status → action`.

Password forms remain one column. Show/Hide stays inside or at the trailing edge of the field without shrinking the editable area below a practical touch target.

## 7. Interaction/accessibility details

- Show/Hide controls must be real keyboard-focusable buttons with explicit accessible names such as `Show password` / `Hide password`.
- Do not move focus when toggling visibility.
- Preserve password autocomplete semantics.
- `Forgot password?` remains a button or link-like button backed by the existing recovery action; it must not imply navigation to an unsupported route.
- Busy state belongs to the action that initiated it.
- Status feedback uses text plus tone and remains announced by the existing alert/status semantics.
- `Sign out everywhere` must not be visually confused with Change password.
- Narrow layouts must maintain 44px practical targets and no horizontal overflow.
- Reduced motion is a complete static equivalent.

## 8. Reference matrix

| RenderLab concern | Reference insight | Borrow | Do not copy |
| --- | --- | --- | --- |
| Session clarity | Supabase Auth sign-out scope | Truthfully distinguish global vs local session effect | Provider terminology or raw token/session IDs |
| Session management maturity | GitHub / Linear session settings | Clear session language and future selective-revocation direction | Their sidebar IA, device telemetry or product branding |
| Account-security grouping | Notion / Linear account security | Familiar Account / Security grouping, password visibility, explicit auth methods | Profile/billing/preferences unrelated to RenderLab |
| Strong-account security | OWASP Authentication/MFA guidance | Treat MFA as a real high-priority future capability, especially for admins | Claim MFA exists before it does |
| Sensitive credential changes | OWASP reauthentication guidance | Keep current-password reauthentication for ordinary password changes | New recovery bypasses or weaker auth semantics |

## 9. Preserved security/product boundaries

Nothing in v0.2 changes:
- Supabase Auth `auth.users.id` canonical identity;
- server-owned identity/admission/Admin truth;
- client ownership limited to credential interaction and sanitized feedback;
- invitation-only Closed Beta;
- no public account creation;
- current recovery marker validation;
- owner/security boundaries;
- schema, API, RLS, provider, worker, storage or deployment behavior.

The R&D artifact is not authorization to implement MFA, passkeys, session inventory, email changes, account deletion/export or any other deferred capability.

## 10. Review target

v0.2 should be judged on these questions:

1. Does Settings now feel conventionally complete **for the capabilities RenderLab actually has**?
2. Is it obvious which email is the sign-in identity?
3. Is global sign-out scope unambiguous?
4. Are normal password change and recovery both familiar and security-legible?
5. Does the page leave a clean future path for MFA/session management without presenting fake controls today?
6. Does it still feel like RenderLab rather than a generic settings template?

If approved, Phase 27 implementation planning should include the v0.2 presentation improvements and a separate documented follow-up recommendation for MFA/session management. No production implementation or deployment begins from this artifact alone.
