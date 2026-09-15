# Profile & Credential UX Baseline — Implementation Contract

**Tracker:** #223  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `af72a40bd0b62b85fbcf4dcd373bade977082449`  
**Audit date:** 2026-09-16  
**Status:** EXECUTION CONTRACT — implementation authorized after this contract merges; hosted Auth mutation and production deployment are not authorized  
**UI decision:** UI-081  
**Scope:** ordinary account profile identity (display name + avatar), profile editing inside the approved Settings system, and one reusable password-field interaction standard across every current RenderLab password-entry surface  
**Out of scope:** public profiles, username/handle namespace implementation, bio/pronouns/location/social fields, linked identities, passkeys, independent recovery methods, notification/preferences work, hosted password-policy mutation, public sharing routes, production deployment

## 1. Goal

#223 closes two basic account-maturity gaps without changing RenderLab's identity/security model:

1. give an admitted RenderLab account an ordinary **display profile** that is explicitly separate from sign-in identity, admission, authorization and ownership; and
2. make password entry consistent, accessible and password-manager friendly across the product instead of keeping separate one-off `type="password"` fields.

This is **Integration Mode**, not a Settings redesign. UI-078 Trust Register remains the visual/account-information-architecture authority. #223 adds truthful capability inside that system; it does not reopen UI-074 shell geometry, UI-078 composition, UI-079 Admin, or the Phase 23–29 visual program.

Implementation may start only after this contract is merged. Production deployment remains a separate explicit operation.

## 2. Audited current state

### 2.1 Canonical identity and account boundaries

- Supabase `auth.users.id` is the immutable RenderLab owner identity.
- `renderlab_account_access` owns RenderLab admission, role and suspension state. Profile data must never influence it.
- Sign-in email lives in Supabase Auth and #218 changes it without changing `auth.users.id`.
- #216 live-session verification, #217 MFA/AAL2 rules, #218 sign-in-email change and #219 export/deletion are production-live and binding.
- The shared Supabase Auth directory is not a RenderLab member directory. A profile must not be auto-created for an arbitrary Auth user that lacks a RenderLab account-access record.
- No durable RenderLab profile/avatar/username table exists on the planning baseline.
- `RenderLabIdentity` currently contains only immutable `id` plus current Auth `email`. User-editable display data must not be added to that type in a way that turns it into authorization truth.

### 2.2 Current Settings authority

UI-078 uses the low-expressiveness Trust Register:

1. Account — current Sign-in email / change-email continuation;
2. Access;
3. Security — MFA + password;
4. Sessions;
5. Data & Privacy;
6. conditional Admin continuation.

The signed-out surface owns Email/Password sign-in plus enumeration-safe password recovery. `/settings/password` owns ordinary password change and verified recovery replacement. `/settings/email` may require Current password. Account deletion requires Current password inside its destructive confirmation.

#223 must preserve this hierarchy. Profile belongs inside **Account**, ahead of Sign-in identity; it does not become a new top-level application destination.

### 2.3 Existing password-entry inventory

Current product password entry is:

| Surface | Purpose | Current autocomplete |
| --- | --- | --- |
| `/settings` signed-out | account sign-in | `current-password` |
| `/settings/password` ordinary | Current password | `current-password` |
| `/settings/password` ordinary/recovery | New + Confirm new password | `new-password` |
| `/settings/email` non-MFA initiation | Current password reauthentication | `current-password` |
| `/settings` Data & Privacy deletion dialog | Current password reauthentication | `current-password` |

The current invite-confirmation route is token based and does **not** render a password-entry form. #223 must not invent one merely to satisfy a generic checklist. Any future invite/password-creation or password-based step-up surface must compose the same #223 credential field rather than creating another one-off implementation.

Current fields already permit paste and preserve browser autocomplete metadata, but they have no shared reveal/hide mechanic or Caps Lock feedback. New-password policy guidance currently comes from `src/features/account/password-policy.ts`; the configured application/Auth minimum is 15 characters and RenderLab does not impose uppercase/number/symbol composition rules. Free RenderLab-owned HIBP k-anonymity compromised-password screening already applies to password creation/replacement.

### 2.4 Current data lifecycle

#219 exports and deletes every registered RenderLab-owned user-data class and purges registered R2 objects before deleting the Auth identity last. The current export schema is version 1 and the deletion finalizer does not know about profile state because no profile exists yet.

**#223 may not merge implementation unless profile rows and avatar bytes are added to the #219 export, storage-purge, transactional-finalization, residue-verification and two-account acceptance registries.**

## 3. Binding product decisions

### 3.1 A RenderLab-owned 1:1 profile record ships

Durable display profile data belongs in a RenderLab-owned server-side table keyed by the immutable Auth UUID. Do **not** use `auth.users.user_metadata` as the product profile store.

Reasons:

- RenderLab needs an explicit owner/data-lifecycle registry that can be exported and deleted with product state;
- profile metadata must remain separate from provider Auth/sign-in concerns;
- the shared Auth directory must not become an implicit RenderLab profile directory;
- user-editable Auth metadata must never become an authorization/admission source;
- a first-class table supports server-owned normalization, isolation and future migration without rewriting Auth identity.

The initial profile is private account metadata. It is not a public identity directory.

### 3.2 Display name ships

`display_name` is optional ordinary profile metadata.

Server normalization:

- normalize to Unicode NFC;
- trim leading/trailing whitespace;
- collapse internal whitespace runs to one ordinary space;
- reject C0/C1 control characters;
- maximum **80 Unicode code points** after normalization;
- an empty normalized value clears the display name to `NULL`.

Display name is **not unique** and has no effect on sign-in, invitation matching, access, role, ownership, Admin eligibility, MFA, session authorization or generation/media ownership.

The application must escape/render it as ordinary text. No rich text, links or HTML are supported.

### 3.3 Username/handle is explicitly deferred

#223 does **not** add a username/handle column or disabled username field.

The current RenderLab product has no public profile route, attribution/feed surface, sharing namespace, username-based lookup, person-to-person collaboration or handle-based URL. Shipping a globally unique handle now would create normalization, reserved-name, collision, rename-rate, old-handle reuse and impersonation obligations without a current product consumer.

A future handle implementation requires a new contract that establishes an actual user-facing use case and then freezes:

- ASCII/Unicode and case-folding rules;
- length/character policy;
- reserved/system names;
- transaction-safe uniqueness;
- rename confirmation/rate;
- old-handle reuse/impersonation protection;
- public URL/share migration semantics.

Until then, `auth.users.id` remains the owner identity, sign-in email remains the sign-in identity, and display name/avatar remain the private display profile.

### 3.4 Avatar ships, separate from creative Library media

An avatar is account-profile media, not a `media_asset` and not reusable creative content.

Consequences:

- avatar bytes use a dedicated account-profile R2 namespace;
- avatar does not appear in Library, Viewer, generation inputs, Favorites, Collections, generation history or media search;
- avatar has no creative provenance model;
- avatar download/read is authorized through an account-profile route, never a durable public R2 URL;
- profile/avatar state joins #219 export/deletion explicitly.

Initial avatar visibility is private to the owner’s account Settings surface. #223 does not add public profiles or Admin display-name/avatar presentation and does not change the application-shell account trigger. Those surfaces may consume profile identity only under a later explicit product decision.

### 3.5 Truthful fallback identity

When no active avatar exists:

- if a display name exists, Settings may show up to two initials derived from that display name;
- without a display name, use the existing neutral account/user icon treatment;
- do not derive visible fallback initials from the sign-in email;
- do not call a remote identicon/avatar service;
- fallback identity has no persisted security meaning.

## 4. Profile persistence contract

### 4.1 Additive migration

Implementation adds an additive migration after `0021`, expected to be named `0022_renderlab_account_profiles.sql` unless repository state advances first.

Create `public.renderlab_account_profiles` with at least:

- `owner_id uuid primary key references auth.users(id) on delete restrict`;
- `display_name text null`;
- `avatar_state text not null default 'none'` with `none | active | purge_pending`;
- active-avatar metadata sufficient to verify the normalized stored object (content type, size, dimensions and update timestamp);
- `created_at` / `updated_at`.

The exact SQL may add narrowly justified lifecycle metadata, but it must not add username fields or duplicate Auth email/role/access state.

Required database posture:

- RLS enabled;
- no `PUBLIC`, `anon` or `authenticated` table DML grants;
- service-role/server ownership consistent with existing account tables;
- `owner_id` immutable using the existing ownership invariant or an equivalent empty-search-path implementation;
- inserts fail when the owner has entered #219 deletion lifecycle;
- no profile backfill over the shared `auth.users` directory;
- profile creation is allowed only through server product logic for an already-known RenderLab account-access owner.

### 4.2 Admitted-account boundary

Profile read/mutation logic must require:

1. fresh verified non-anonymous Auth identity;
2. an existing `renderlab_account_access` row for the same UUID;
3. supported MFA factor state; if a factor is enrolled, AAL2 is required, but **recent** TOTP step-up is not required for ordinary profile edits;
4. no active account-deletion lifecycle for mutations.

Active and suspended admitted accounts may manage ordinary profile metadata from Settings. An Auth identity with no RenderLab access row may not create a profile merely because it can reach the shared Auth project.

Profile mutations never change access status or role.

## 5. Avatar storage and image contract

### 5.1 Deterministic private R2 object

Use one server-derived current-avatar object key per owner, under a dedicated namespace such as:

`renderlab/account-profiles/<owner-id>/avatar.webp`

The exact helper name/path becomes repository authority during implementation, but requirements are binding:

- owner UUID comes only from authenticated server context;
- browser never supplies or receives the raw R2 key as product identity;
- replacement overwrites the owner’s same current-avatar key so replacement cannot accumulate orphaned historical avatar versions;
- account deletion can derive and purge the owner-specific avatar key even if profile metadata is partially stale;
- no bucket-wide scan is required.

### 5.2 Bounded direct upload

Vercel's current Function request-body documentation caps payloads at 4.5 MB. #223 therefore keeps the avatar request safely below that boundary instead of introducing another five-minute presigned upload ticket:

- maximum accepted source file: **3 MiB**;
- accepted source MIME/decoded formats: JPEG, PNG, WebP;
- reject SVG, GIF and animated/multi-page images;
- minimum decoded geometry: 64×64;
- maximum decoded dimension: 8192px on either axis;
- enforce a bounded decoded-pixel limit to resist decompression bombs;
- use the already-installed server `sharp` boundary to decode, auto-orient, validate and normalize;
- strip source metadata/EXIF from the stored result;
- persist one **512×512 WebP** avatar.

Because the upload is bounded and server-mediated, #223 adds no avatar R2 CORS rule and no presigned avatar URL/quiescence window.

### 5.3 Crop / replace / remove / reset

The profile editor provides one square crop workflow:

- default crop is a centered square cover crop;
- pointer/touch pan is allowed, but crop adjustment may not be pointer-only;
- keyboard-operable crop positioning and zoom controls must exist; adopting the maintained shadcn/Radix Slider primitive is allowed if needed after the ordinary component review;
- `Reset crop` returns to the centered default;
- `Save avatar` sends the original bounded image plus normalized crop geometry to the server;
- the server recomputes/validates crop geometry against the decoded, auto-oriented image and never trusts client dimensions alone;
- `Replace` uses the same flow and deterministic key;
- `Remove avatar` immediately makes fallback identity authoritative, purges the deterministic object, proves absence and settles the profile state to `none`.

If R2 deletion fails after removal is accepted, the profile remains non-readable as an avatar and records `purge_pending`; existing maintenance is extended to retry and prove the deterministic object deletion. A new upload must settle any pending purge before activating replacement bytes.

No animated avatar behavior ships.

## 6. Profile server/API contract

Preferred same-origin surfaces:

- `GET /api/account/profile` — safe owner projection;
- `PATCH /api/account/profile` — display-name update/clear;
- `POST /api/account/profile/avatar` — bounded multipart image + crop metadata;
- `DELETE /api/account/profile/avatar` — remove/purge current avatar;
- `GET /api/account/profile/avatar` — owner-authorized read/redirect to a short-lived signed R2 read URL only when avatar state is active.

Equivalent route grouping is acceptable if it preserves the same boundaries.

Rules:

- owner ID is never accepted from the browser as authority;
- raw R2 keys are never returned;
- all errors exposed to the browser are stable/sanitized product errors;
- do not log image bytes, passwords or security tokens;
- profile GET returns only owner-safe profile fields, never access internals or Auth secrets;
- profile APIs do not browse/search arbitrary accounts.

## 7. #219 lifecycle integration is mandatory

Profile/avatar implementation is incomplete until all of these are updated and configured acceptance proves them:

### Export

- bump account export `schemaVersion` from 1 to **2** for newly generated artifacts;
- add `profile` with normalized display-name and avatar metadata;
- active avatar exposes only a stable authenticated RenderLab download path such as `/api/account/profile/avatar`, not an R2 key/signed URL;
- no removed/purged avatar claims downloadable bytes.

### Deletion/storage

- add the deterministic owner avatar key to the owner storage purge/proof set;
- transactional product finalization deletes `renderlab_account_profiles` before Auth deletion;
- database residue verification includes the profile table;
- R2 residue verification includes the deterministic avatar candidate even if the profile row is missing/stale;
- deletion remains Auth-user-last;
- profile insert/mutation cannot resurrect state after deletion begins.

### Maintenance

- existing daily account-lifecycle maintenance retries `purge_pending` avatar removal in a bounded owner-safe pass;
- no second scheduler/queue service is introduced.

### Data-use disclosure

Settings/export disclosure adds profile metadata in Supabase and avatar bytes in Cloudflare R2. Avatar bytes are not model-training input and are not sent to generation workers merely because they exist as a profile image.

## 8. Settings product/UI contract

### 8.1 UI-078 remains authoritative

#223 extends **Account**; it does not redesign Settings.

Signed-in `/settings` keeps the existing numbered Register rows. Within `01 Account`:

1. **Profile** — compact current avatar/fallback + display name (or `No display name`) + `Edit profile`;
2. **Sign-in identity** — current Sign-in email + existing `Change email` action and current ownership explanation.

Access, Security, Sessions, Data & Privacy and conditional Admin remain in their current order and hierarchy.

### 8.2 Dedicated profile editor

Add `/settings/profile` as a subordinate Settings route under the existing AppShell/Trust Register family.

It owns:

- Display name field;
- current avatar/fallback;
- `Upload` / `Replace` avatar action;
- square crop editor after a valid local file is selected;
- `Reset crop` while editing;
- `Remove avatar` only when an active avatar exists;
- Save/Cancel behavior with sanitized feedback.

There is no username field, public-profile preview, bio, social link, public visibility toggle or avatar-from-URL field.

### 8.3 Visual scope

This is ordinary Integration Mode. No new Penpot/visual R&D phase is required because UI-078 already fixes the Settings hierarchy and #223 adds conventional account controls inside it.

Implementation still requires real browser review at desktop and 390px for:

- Settings Profile + Sign-in identity composition;
- profile editor default/avatar/crop/error states;
- password reveal/Caps Lock/match states;
- no horizontal overflow;
- focus/touch reachability;
- reduced-motion equivalence.

Settings remains 1/4 expressiveness. Crop movement is functional direct manipulation, not decorative motion.

## 9. One reusable credential-field contract

Implementation creates one account-owned reusable password field composition (for example `AccountPasswordField`) using maintained `Field`, `Input`, `Button` and Lucide mechanics rather than changing the generic `Input` into an account-policy component.

Every current RenderLab password-entry field listed in section 2.3 must use it.

### 9.1 Reveal/hide

- default state is hidden (`type="password"`);
- one trailing `type="button"` control toggles only the field presentation between password/text;
- control has a programmatic name (`Show password` / `Hide password`) and exposes pressed/state semantics such as `aria-pressed`;
- Eye/EyeOff icon is decorative to assistive technology;
- toggling does not change, trim, re-create or submit the secret value;
- each field owns independent reveal state;
- validation errors do not automatically reveal a secret;
- successful completion/navigation may clear values under the existing flow semantics;
- no test screenshot/artifact may capture a revealed fixture secret.

### 9.2 Keyboard, touch and mobile behavior

- reveal control is keyboard reachable with visible focus and an effective 44×44 target where practical;
- field remains pasteable; no `onPaste`/clipboard prevention is permitted;
- keep browser/password-manager semantics using the correct `autocomplete` value;
- when revealed as text, disable spellcheck/autocorrect/autocapitalization so a mobile keyboard does not transform the password;
- no hover-only affordance;
- trailing control must not cause horizontal overflow at 390px.

### 9.3 Caps Lock

Where keyboard events expose `getModifierState("CapsLock")`, show concise textual `Caps Lock is on` feedback while the field is active/being typed.

- this is advisory, not validation;
- absence of detectable Caps Lock on touch/mobile is normal;
- do not use color alone;
- announcement must not echo the password.

### 9.4 Autocomplete matrix

Preserve exactly:

- sign-in password: `current-password`;
- reauthentication Current password (password change/email change/delete account): `current-password`;
- new and confirm-new fields: `new-password`;
- sign-in email remains `email`.

Do not add a client `minLength` gate to sign-in/current-password reauthentication fields. Existing credentials must reach authoritative Auth even if policy changed after their creation.

## 10. Password policy and validation UX

### 10.1 One application-side policy source

`src/features/account/password-policy.ts` (or a deliberately relocated shared equivalent) remains the single application-side representation of the currently configured password-creation policy.

Initial binding policy:

- minimum 15 characters;
- no mandatory uppercase/lowercase/number/symbol composition classes;
- compromised-password screening through the existing RenderLab HIBP k-anonymity path;
- no strength score/meter is required.

#223 does **not** mutate hosted Supabase Auth policy. If hosted policy changes, the shared RenderLab policy module and verification must change in the same work so UI guidance cannot drift.

### 10.2 Live guidance only where a new password is being chosen

New-password fields show live requirement state derived from the shared policy module, not duplicated literals.

- length requirement can update locally while typing;
- compromised-password status is checked only through the existing bounded screening flow and must not send every keystroke to the HIBP service;
- do not imply a password is globally “strong” or “safe” because it meets the local length check.

### 10.3 Confirm-password feedback

Once Confirm new password is non-empty, show textual match state:

- `Passwords match`; or
- `Passwords do not match`.

Mismatch prevents submission. Success/error meaning must not rely on color alone and should be announced accessibly without turning every keystroke into disruptive assertive output.

### 10.4 Value preservation and errors

- keep entered values in local browser state across ordinary client validation and sanitized transient errors unless the existing security flow explicitly completes/navigates;
- never persist password values to URL, local/session storage, analytics, logs, database, screenshots or workflow artifacts;
- provider/Auth errors remain sanitized at the product boundary.

## 11. Security and privacy invariants

#223 must prove that profile changes:

- leave `auth.users.id` unchanged;
- do not mutate Auth email, password, identities, sessions or MFA factors;
- do not mutate `renderlab_account_access` role/status/quota fields;
- do not mutate media/job/collection/upload/admission ownership;
- cannot cross account boundaries;
- cannot access another account’s avatar by changing a URL/body ID;
- do not expose R2 storage identity;
- do not create public profile discovery;
- do not put email into avatar fallback rendering;
- do not send avatar bytes to Modal/generation workers;
- fail closed when shared server configuration is unavailable.

The profile is display metadata, never an authorization principal.

## 12. Verification and acceptance

Implementation needs a dedicated configured **Account Profile & Credential UX** workflow plus affected regression workflows.

Minimum configured acceptance:

### Profile/data

1. create two deterministic admitted fixture accounts;
2. Account A creates/updates/clears display name; normalization/bounds are verified;
3. Account B cannot read or mutate A’s profile/avatar;
4. A’s `auth.users.id`, access/role and existing owner-linked rows remain unchanged;
5. valid JPEG/PNG/WebP avatar upload + crop produces one normalized 512×512 WebP at the deterministic owner key;
6. invalid MIME, spoofed bytes, animation/multi-page input, oversize input, invalid dimensions and invalid crop geometry fail before activation;
7. replace uses the same owner key and does not accumulate historical avatar objects;
8. remove falls back immediately, purges/proves the object and leaves truthful state; injected/transient purge failure converges through maintenance if a test fault is provided;
9. re-upload after removal works only after pending purge is settled;
10. profile export is schema v2 and contains safe profile/avatar projection only;
11. complete account deletion removes profile row + deterministic avatar bytes before Auth deletion;
12. deletion/export of Account A does not alter Account B profile/avatar;
13. exact cleanup leaves no run-owned profile rows, R2 avatar objects or Auth/access fixtures.

### Credential UX

1. signed-out sign-in, ordinary password change, recovery replacement, email-change reauthentication and delete-account reauthentication all compose the same credential-field implementation;
2. Show/Hide is keyboard/touch operable, correctly named/stateful and leaves the exact secret value unchanged;
3. password remains masked by default and screenshot evidence is captured only while fixtures are blank/masked;
4. paste/input insertion works; no clipboard prevention is present;
5. autocomplete values match section 9.4;
6. sign-in/current-password fields do not enforce the new-password minimum;
7. new-password guidance derives from the shared 15-character policy; no character-class fiction appears;
8. match/mismatch feedback is textual + accessible and submission rejects mismatch;
9. Caps Lock text appears only when browser keyboard state reports it;
10. desktop + 390px have no horizontal overflow, reveal controls remain reachable, focus is visible and reduced motion is complete;
11. no secret values appear in logs/artifacts.

### Required regressions

At minimum run the workflows covering:

- Engineering Quality;
- UI Shell Validation;
- Account Identity;
- Account Data Lifecycle;
- Email Identity Change;
- Session Controls;
- MFA / privileged-step-up coverage;
- Account/Admin Operations where shared account helpers change;
- Integrated Release / Release Candidate Matrix when repository path selection attaches them.

Every workflow GitHub actually attaches to the final PR head must be terminal-success or have a documented external-only exception with unchanged-head proof, consistent with existing closure discipline.

## 13. Expected implementation ownership

Likely production files (exact names may be adjusted to repository conventions without changing the contract):

- `supabase/migrations/0022_renderlab_account_profiles.sql`;
- `src/server/account/account-profile.ts`;
- `src/app/api/account/profile/route.ts`;
- `src/app/api/account/profile/avatar/route.ts`;
- `src/app/(app)/settings/profile/page.tsx`;
- `src/features/account/account-profile-form.tsx`;
- `src/features/account/account-password-field.tsx`;
- existing `account-settings.tsx`, `account-password-form.tsx`, `account-email-form.tsx`, `account-data-privacy.tsx`;
- `src/server/account/account-data-lifecycle.ts` + #219 migration/RPC successor logic;
- configured verifier/workflow and focused unit/UI coverage;
- authoritative architecture/UI docs after verified implementation.

Do not create a second account/profile client store, a second upload subsystem, or a parallel Settings shell.

## 14. Implementation sequence

1. **Schema + server profile boundary** — additive profile migration, server normalization/authorization, deterministic avatar key helpers, lifecycle guards.
2. **#219 integration before UI claims completion** — export v2, avatar purge/proof, finalizer/residue/maintenance updates.
3. **Reusable credential field** — migrate every current password field and add focused accessible interaction coverage.
4. **Profile UI** — extend Account row + `/settings/profile`, avatar crop/replace/remove/reset inside UI-078 grammar.
5. **Configured two-account + lifecycle acceptance** — include R2 and secret-safe browser evidence.
6. **Repository closure docs** — update actual applied migration, component catalog, screen registry, UI migration/decision state and production boundary from verified reality.

Implementation may combine these steps in one PR, but it may not call #223 complete while any earlier invariant remains unverified.

## 15. Explicitly not authorized by this contract

- production deployment;
- hosted Supabase Auth/password-policy mutation;
- username/handle implementation;
- public profile/search/share routes;
- shell/avatar redesign;
- Admin directory redesign;
- OAuth/social identity linking;
- passkeys/WebAuthn;
- new recovery channels or custom recovery codes;
- preferences/notifications;
- billing/team/workspace/developer-profile fields;
- using profile/avatar data as generation input automatically;
- exposing raw R2 URLs/keys;
- weakening #216/#217/#218/#219 security or lifecycle guarantees.
