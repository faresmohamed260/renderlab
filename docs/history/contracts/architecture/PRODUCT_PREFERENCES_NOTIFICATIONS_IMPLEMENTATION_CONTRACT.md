# Product Preferences, Accessibility & Notifications — Implementation Contract

**Tracker:** #220  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `e6583fa0a87cc0127793166beb845f57f3c6a5fa`  
**Audit date:** 2026-09-16  
**Status:** INITIAL CREATE-DEFAULT SLICE COMPLETE + VERIFIED + MERGED + MERGED-MAIN VERIFIED / RENDERED-EVIDENCE REVIEWED / NOT DEPLOYED; notification/accessibility follow-ons remain deferred
**Scope:** durable owner-scoped Create defaults, truthful Settings management, capability-safe fallback, and complete #219 account-lifecycle registration  
**Out of scope for the initial slice:** product notification delivery/toggles, browser notifications, an app-level reduced-motion override, theme/language/timezone controls, provider/model defaults, Advanced tuning defaults, Library/view state, hosted Auth changes, provider changes, worker changes, production deployment

## Implementation verification — 2026-09-16

- PR #275 implementation-verification head `f01399bac0a50fef82ac55cf2c9a088c18443415` implements the five curated owner-scoped Create defaults without adding notification controls, accessibility overrides, model/provider identity, Advanced tuning persistence or deployment changes.
- Shared-project migration `0023_renderlab_account_preferences.sql` is applied as `20260916150243 renderlab_account_preferences`. Fresh hosted inspection confirms RLS enabled, no `anon`/`authenticated` DML and service-role DML available for the server-owned application boundary.
- Dedicated Account Profile Credential run `35138292468` passed the existing #223 profile/credential verifier and the new #220 configured verifier. Markers prove cross-session Settings→Create portability, owner isolation, recipe/continuation precedence, stale-value fallback/reset, export-v3 inclusion, account-deletion cleanup/non-interference and fixture cleanup. Artifact `10463549435` has digest `sha256:8751ce800695841d94668653fa3c02eb065fa56c52ba8161d18771c7e107954e`.
- Rendered evidence was reviewed clean at desktop Settings, 390px reduced-motion Settings and mobile Create. The Trust Register hierarchy remains intact, no document horizontal overflow was visible, and the clean Create evidence showed the saved Image `4:5` default without redesigning the approved composer.
- Account Data Lifecycle `35138293298` passed the real export/deletion verifier with export schema v3 and clean configured fixture teardown. The previous v2 assertion was corrected narrowly to v3; no #219 lifecycle coverage was removed.
- Every workflow GitHub attached to the implementation head passed: 16/16. Email Identity Change `35138292829` initially encountered hosted Supabase `429 email_change_rate_limited` twice after its local build/Settings/a11y/wrong-password checks passed; an unchanged same-head retry after cooldown then passed the full real identity-change verifier and cleanup. No #220 product code changed to resolve that external rate limit.
- The shared `renderlab_account_preferences` fixture table was confirmed empty after acceptance. Production remains on exact source `d18ef8833d46c812dac6b43572b3f4f7069990f8`; implementation merge and any deployment remain separate operations.
- Documentation-complete PR head `e6045a28462ed40859a656c49f73b1772e9e4700` passed all 16 workflows GitHub attached to it, including Email Identity Change, Account Data Lifecycle, Account Profile Credential, Engineering Quality and UI Shell Validation.
- PR #275 squash-merged to `main` as `ec29fd160d7ce7a90beb3025da32ec4cc18f0898`. All 10 workflows GitHub attached to the merged-main SHA passed; Account Data Lifecycle `35148209427` and worker-backed Video Generation Integration `35148209254` both completed their real acceptance, cleanup and evidence paths successfully. Issue #220 is closed as completed. Production remains on exact source `d18ef8833d46c812dac6b43572b3f4f7069990f8`; deployment remains separately explicit.
## 1. Goal

#220 closes one real cross-device product-preference gap without inventing settings for systems RenderLab does not yet have.

The initial implementation will let an admitted RenderLab account persist a small curated set of **new-Create defaults**:

- default Create output kind — `Image` or `Video`;
- default Image aspect ratio from the current supported fixed-ratio capability set;
- default Video resolution;
- default Video duration;
- default Video audio on/off.

These values are convenience defaults only. They never become generation authority, never change already-created jobs/assets/history, and never override an explicit saved recipe or media continuation.

The broader #220 roadmap also names accessibility preferences and product notifications. The repository audit does not currently justify shipping either as a preference surface: RenderLab already honors OS/browser reduced-motion behavior, while there is no generic product-notification delivery system for generation completion/failure. Those controls remain deferred until the underlying product capability exists.

## 2. Verified starting state

At this contract baseline:

- #223 is complete, merged, merged-main verified and not production-deployed; current `main` is `e6583fa0a87cc0127793166beb845f57f3c6a5fa`.
- `/settings` uses the approved UI-078 low-expressiveness Trust Register and currently composes Account, Access, Security, Sessions, Data & Privacy, plus conditional Admin. `/settings/profile` is the approved subordinate account continuation introduced by UI-081.
- `src/app/(app)/create/page.tsx` server-resolves saved generation recipes and media continuations before rendering `CreateWorkspace`.
- `src/features/create/create-workspace.tsx` currently initializes a clean new workspace to Image output, fixed Image ratio `1:1`, fixed Video ratio `16:9`, capability default Video resolution, 5-second Video duration and capability default Video audio. Existing recipe/continuation values already take precedence over these clean-draft fallbacks.
- `src/lib/capabilities/generation.ts` is the product authority for supported Image ratios, Video resolutions, Video durations, default Video resolution, default Video audio and current model capability. Provider/worker identities are not product preference data.
- Create already uses `useReducedMotion()` so `prefers-reduced-motion` remains the current cross-product motion baseline. No evidence-backed need for a separate app override has been established.
- RenderLab has no generic generation-completion/failure email, in-app inbox or browser-push notification service. The existing Resend use in `account-deletion-notification.ts` is a mandatory security/transactional deletion notice, not an optional product-notification channel.
- no `renderlab_account_preferences` table or equivalent preference store exists.
- #219 requires every new user-linked durable schema to join the account export/deletion/residue registry and configured non-interference acceptance before it ships. #223 already demonstrated the required integration pattern.

## 3. Binding product decision

### 3.1 Initial #220 capability is Create defaults only

The first #220 implementation ships the five Create-default preferences listed in section 1 and no other preference category.

The following are deliberately **not** persisted by this slice:

- Image or Video model identifiers;
- provider, worker, workflow or ecosystem identifiers;
- Image seed, steps or guidance;
- Video seed or frame rate;
- reference media, prompt text or uploaded asset identity;
- Video aspect ratio;
- Library filter/search/sort/pagination state;
- Activity state;
- theme, language, timezone, density or generic appearance flags;
- security/authentication/session state.

The omission of Video aspect ratio is intentional for this first slice: #220 explicitly selected Image aspect plus Video resolution/duration/audio as the curated defaults. A clean Video draft therefore keeps the existing product default `16:9` unless a later explicit decision expands the preference contract.

### 3.2 Preferences affect only a truly new Create draft

Saved defaults are consumed only when entering a clean `/create` workspace that has no saved recipe and no media continuation supplying the relevant value.

Precedence is binding:

1. **explicit saved recipe values** win;
2. **explicit media-continuation/source-aware behavior** wins, including current `Original` geometry behavior where the continuation contract requires it;
3. **saved account preferences** may seed remaining clean-draft defaults;
4. **current capability/product defaults** are the final fallback.

Preferences must never re-apply after the user has begun editing a draft, after client hydration, or after a mode/control change. Loading preferences cannot cause a visible late reset of user-entered Create state.

### 3.3 Capability truth always wins over stored preference truth

Stored values are conveniences, not capability declarations.

If a stored value is missing, malformed or no longer supported by the current capability definitions:

- Create must fall back to the current valid product default;
- Settings must present a valid effective value rather than an unusable stale control state;
- generation submission must continue using the existing authoritative capability validation;
- the user must not be blocked from Create merely because an old preference became stale.

Implementation may opportunistically normalize stale preference rows on a successful preference save/reset, but a background migration is not required merely to read an old value safely.

## 4. Durable preference model

### 4.1 Owner identity and table

Add one RenderLab-owned 1:1 table keyed by immutable Supabase Auth identity:

`public.renderlab_account_preferences`

Required columns:

- `owner_id uuid primary key references auth.users(id) on delete restrict`;
- `create_output_kind text not null`;
- `create_image_aspect_ratio text not null`;
- `create_video_resolution text not null`;
- `create_video_duration_seconds integer not null`;
- `create_video_audio_enabled boolean not null`;
- `created_at timestamptz not null default now()`;
- `updated_at timestamptz not null default now()`.

The migration should be the next repository migration after `0022_renderlab_account_profiles.sql` unless another migration lands first.

A missing row means **follow current RenderLab product defaults**. `Reset to RenderLab defaults` removes the preference row rather than snapshotting today’s defaults forever.

### 4.2 Validation strategy

Do not encode the complete evolving generation capability set as database enum-like checks that would require a schema migration every time a curated value changes.

Database constraints should enforce structural sanity only, for example bounded non-empty text and a sensible positive bound for duration. The server preference write boundary must validate every submitted value against current RenderLab capability definitions before persistence.

This separation intentionally permits an older stored value to remain representable after a future capability is removed so the application can apply the stale-value fallback contract instead of making the row unreadable.

### 4.3 Authorization and browser access

Follow the current private account-state pattern:

- enable RLS;
- revoke direct table privileges from `public`, `anon` and `authenticated`;
- grant required CRUD to `service_role` only;
- keep the service-role credential server-only;
- make `owner_id` immutable using the existing owner-change guard;
- apply the existing deleting-owner insert/update guard so account deletion cannot race with new preference state.

Preferences are display/product convenience state only. They never grant admission, role, generation entitlement, ownership or security privilege.

### 4.4 Read/write contract

Add a server-owned typed preference module, expected under `src/server/account/`, that:

- reads at most the authenticated owner’s row;
- maps raw storage fields to a narrow product type;
- derives valid **effective preferences** from current capability definitions;
- validates a complete preference update before writing;
- supports row deletion for Reset;
- never exposes service credentials or raw database errors to the browser.

The browser-facing contract may distinguish `saved` from `product-defaults` so Settings can explain whether the account is following RenderLab defaults, but the browser must always receive usable effective values.

## 5. Account and Settings UX

### 5.1 Main Settings register

Extend UI-078 in Integration Mode rather than redesigning Settings.

For signed-in admitted accounts, add a quiet **Preferences** register row after Data & Privacy and before conditional Admin. The row should contain:

- label: `Create defaults`;
- concise helper copy explaining that saved choices apply to new Create drafts only;
- one subordinate action such as `Manage preferences` linking to `/settings/preferences`.

If Admin is present, its register index shifts naturally after Preferences. Do not create a new top-level navigation destination.

Signed-out Settings does not display private preference controls.

### 5.2 `/settings/preferences`

Add a subordinate Trust Register-family route at `/settings/preferences`.

Authorization follows the existing admitted-account Settings/profile boundary:

- require a fresh signed-in identity;
- require a RenderLab account-access record, but do not require active generation entitlement merely to manage private account preferences;
- do not require MFA step-up because changing Create defaults is not a privileged security action;
- redirect missing/unavailable account state through existing sanitized Settings feedback patterns.

The route contains one bounded **Create defaults** form with:

- Default Create mode — Image / Video;
- Default Image aspect ratio — current supported fixed Image ratios only; `Original` is not valid for a clean new draft;
- Default Video resolution — current capability choices;
- Default Video duration — current capability choices;
- Default Video audio — On / Off.

Primary action: **Save defaults**.  
Secondary action: **Reset to RenderLab defaults**.

Copy must state that saved defaults affect new Create drafts and do not alter existing generations, media, history, saved recipes or explicit continuations.

### 5.3 Visual and accessibility constraints

This is an additive Settings capability, not a new Settings visual phase.

Preserve:

- UI-078 1/4-expressiveness Trust Register composition;
- conventional labels and controls;
- visible keyboard focus;
- 44px practical touch targets where applicable;
- 390px single-column order without document horizontal overflow;
- textual state/feedback rather than color-only meaning;
- existing `prefers-reduced-motion` behavior.

Do not introduce ambient motion, fake accessibility toggles, dashboard cards or a separate design system for this form.

## 6. Create integration

### 6.1 Server load

When `/create` has a current admitted account, the server page may load effective account preferences alongside its existing recipe/continuation resolution and pass them as initial data to `CreateWorkspace`.

Preference-read failure is non-critical to creation: Create should fall back to current product defaults rather than becoming unavailable.

Signed-out Create continues to use current product defaults and remains draftable as today.

### 6.2 Initialization rules

`CreateWorkspace` must seed state once from the precedence in section 3.2.

The implementation must prove at minimum:

- clean authenticated new Create uses saved output kind;
- saved Image ratio is used only for a clean Image draft;
- saved Video resolution/duration/audio are used only where Video defaults are applicable;
- recipe values override saved preferences;
- media continuation semantics override saved preferences where applicable;
- removing/changing references or switching Image/Video after the workspace has initialized does not silently reload account defaults;
- existing generation validation still rejects unsupported request values independently of preference storage.

## 7. #219 export, deletion and residue integration

Preferences are durable account-owned product data and must join the existing centralized #219 lifecycle registry before #220 may close.

### 7.1 Export

Bump the account export schema from version 2 to version 3 and include safe preference metadata.

The exported preference section must contain only product preference values/timestamps. It must not expose provider/model internals, tokens, service credentials or unrelated global settings.

An absent preference row must be represented unambiguously as following product defaults rather than fabricating a historical saved row.

### 7.2 Account deletion

Extend the transactional product-deletion finalizer to remove `renderlab_account_preferences` before Auth deletion and return/count that removal consistently with other owner data classes.

No R2 cleanup is associated with preferences.

### 7.3 Residue verification and maintenance

Add the preference table to database residue verification so successful account deletion cannot report completion while an owner preference row remains.

Preferences require no independent maintenance job. The existing deleting-owner guard prevents new writes after deletion begins.

### 7.4 Non-interference acceptance

Configured lifecycle acceptance must prove two-account isolation:

- deleting account A removes A’s preferences;
- account B’s preferences remain unchanged;
- export for A includes only A’s preference state;
- preference writes cannot target another owner.

## 8. Notifications are deliberately deferred

The current Resend-backed account-deletion notice does **not** establish an optional product-notification channel. It is mandatory security/transactional communication.

Do not add generation-completed/failed notification toggles in this slice.

A later #220 notification phase requires a separate execution-ready amendment that first establishes a real delivery contract, including:

- the supported event set;
- actual delivery channel(s);
- ownership and authorization;
- retry/idempotency and duplicate-suppression behavior;
- delivery-failure semantics;
- email sender/content policy where applicable;
- in-app read/unread lifecycle if an inbox exists;
- explicit browser permission/background behavior before web notifications;
- separation from mandatory security/account notices;
- export/deletion/retention treatment for any new durable notification state.

Until that exists, no disabled or nonfunctional notification preference UI should be shown.

## 9. Accessibility preference is deliberately deferred

RenderLab already uses the platform `prefers-reduced-motion` signal in the current Create surface and broader approved UI contracts require reduced-motion equivalence.

Do not add an app-specific `Reduce motion`, `High contrast`, font-size or similar toggle merely to fill a Preferences page.

An application-level override may be added only after an evidence-backed need and a cross-product precedence decision covering at minimum:

- OS/browser preference vs app override;
- signed-out behavior;
- persistence/account portability;
- every motion-bearing product surface;
- accessible semantics and test coverage.

Accessibility remains mandatory product quality regardless of whether an optional preference exists.

## 10. Expected implementation surface

Likely implementation files include:

- one new Supabase migration after `0022_renderlab_account_profiles.sql`;
- `src/server/account/account-preferences.ts` or equivalent typed server module;
- `/api/account/preferences` read/update/reset handling or an equivalent existing account-route convention;
- `src/app/(app)/settings/preferences/page.tsx`;
- a bounded account preference form under `src/features/account/`;
- `src/features/account/account-settings.tsx` for the new register continuation;
- `src/app/(app)/create/page.tsx` and `src/features/create/create-workspace.tsx` for one-time default seeding;
- #219 export/deletion/residue registry and schema-version integration;
- focused unit/configured browser tests and workflow wiring;
- authoritative closure documentation after verified implementation.

Do not touch provider routing, worker code, model identifiers, R2 media behavior, shell navigation or unrelated feature styling merely to implement preferences.

## 11. Validation contract

### 11.1 Engineering and static gates

At the final implementation head:

- `npm run build`;
- `npm run verify:ui-purity`;
- repository lint/TypeScript/static gates required by Engineering Quality;
- migration/schema checks required by current repository conventions;
- every workflow GitHub attaches to the exact final SHA must pass.

### 11.2 Preference acceptance

Configured acceptance must cover:

1. authenticated owner can read current effective defaults with no row;
2. owner can save all five curated preferences;
3. a second session/device sees the saved values;
4. another account cannot read or mutate them;
5. unsupported/stale stored values fail soft to current capability defaults;
6. Reset removes the row and restores current RenderLab defaults;
7. suspended-but-admitted account can manage private preference state without gaining generation entitlement;
8. no preference field changes admission, role, ownership, MFA/session or generation-admission truth.

### 11.3 Create precedence acceptance

Configured Create coverage must prove:

1. clean new draft consumes saved defaults;
2. saved generation recipe wins over preferences;
3. media continuation/source-aware geometry wins over preferences;
4. changing controls after initialization is not overwritten by a later preference load;
5. signed-out Create retains current product defaults;
6. invalid preference state never produces an unsupported generation request.

### 11.4 Account lifecycle acceptance

Account Data Lifecycle coverage must prove export schema v3, owner-only preference export, deletion cleanup, residue absence and two-account non-interference.

### 11.5 Visual/accessibility evidence

Review Settings and `/settings/preferences` at desktop and 390px, including:

- default-row and saved-row states;
- validation/error feedback;
- reset state;
- keyboard focus and label/control relationships;
- no horizontal overflow;
- reduced-motion equivalent rendering.

The Create surface should receive regression evidence sufficient to prove that preference seeding changes initial values without redesigning the approved composer.

## 12. Definition of done

#220’s initial implementation slice is complete only when:

- this contract has merged before production-code implementation;
- the owner-scoped preference schema and server contract are implemented;
- Settings can save and reset the five curated Create defaults;
- clean new Create drafts consume them with the documented precedence;
- stale values fall back safely to current capability truth;
- #219 export is version 3 and preference state is fully registered for deletion/residue/non-interference;
- no fake notification or accessibility preference has been introduced;
- final exact-head engineering/configured/visual gates pass;
- durable project, roadmap, UI/screen and lifecycle documentation reflect verified repository reality;
- implementation merge and production deployment remain separate operations, with deployment requiring explicit authorization.

## 13. Explicit non-goals

This contract does not authorize:

- production deployment;
- notification delivery infrastructure or preference toggles;
- browser notification permissions/service workers;
- a user-disableable security notification;
- an app-level reduced-motion/high-contrast/theme/language/timezone system;
- new model/provider/worker/workflow preferences;
- persisting Advanced generation tuning;
- changing the generation capability set;
- changing generation admission/quota policy;
- a Settings redesign or new top-level navigation destination;
- public profiles or identity changes;
- hosted Supabase Auth configuration changes;
- provider, Vercel-plan or Supabase-plan changes.
