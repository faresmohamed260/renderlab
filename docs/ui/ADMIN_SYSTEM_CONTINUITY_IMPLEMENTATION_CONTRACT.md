# Phase 28 — Admin System Continuity Implementation Contract

**Status:** EXECUTION CONTRACT — implementation authorized after merge; deployment is not authorized  
**Tracker:** issue #230  
**Planning baseline:** `main` `580ede245f1e5b6e84a2b1439a7c193aa9ed97b8`  
**Rejected R&D:** PR #231 / Operations Register v0.1, closed unmerged  
**Approved R&D:** draft PR #232, exact head `419a58c8c7877bab21673342775eb0650108412e`  
**Approved evidence:** focused run `34777699455`, artifact `10323843563`, `sha256:1ada86fbb81b19ee0da11dbadbc5bab1aa15f31b56652f64aabd8eac6001940b`  
**Decision:** UI-079

## Goal

Implement the user-approved Phase 28 **Admin System Continuity v0.2** redesign for `/admin` so the privileged operator surface becomes a coherent 1/4-expressiveness member of the finished RenderLab application system without changing any Admin product, authorization, generation-admission, health, storage, provider, schema or deployment contract.

The binding structural parent is the merged Phase 27 **Settings Trust Register / UI-078**. Activity / UI-077 may inform dense technical microtype and internal row separators only. Phase 28 must not invent a new Admin-specific page skeleton, navigation model, dashboard system, ledger theme or operator chrome.

Phase 28 changes presentation, grouping, density and responsive composition. It is not a new Admin capability phase.

## User value

The current Admin surface is functionally mature and security-conscious, but its presentation predates the completed UI-074 through UI-078 system:

- Access, Generation controls and Health are presented as long stacks of isolated rounded records/cards;
- the page becomes repetitive and excessively tall at 390px;
- global generation defaults and nullable account overrides are correct but do not read as one clear parent/child control relationship;
- Health is truthful and sanitized but reads as a collection of generic cards rather than one bounded operational field;
- the screen does not yet inherit the same calm registered utility grammar as Settings.

Phase 28 makes the existing operator truth faster to scan while preserving every current action and safety boundary.

## Verified starting state

At planning start:

- repository `main` is `580ede245f1e5b6e84a2b1439a7c193aa9ed97b8`;
- Phase 27 Settings / UI-078 is implemented, verified, merged and not deployed;
- UI-074 is the current application-shell authority: one compact horizontal application header, no persistent desktop rail and no fixed mobile dock;
- Admin is a Visual North Star **1/4-expressiveness** surface with operational clarity first;
- `/admin` calls `getCurrentRenderLabAdmin()` and fails closed via `notFound()` unless a fresh Supabase identity has active RenderLab `admin` access;
- `getCurrentRenderLabAdmin()` returns null when identity lookup fails, RenderLab access is missing, access is not `active`, role is not `admin`, or the access read fails;
- the Admin directory is RenderLab-owned `renderlab_account_access`, not the shared Supabase Auth directory;
- current account listing is bounded to 100 RenderLab account-access rows and enriches only those known user IDs with server-side Auth email lookup;
- pending invitation listing is bounded to 100 open, unclaimed, unrevoked, unexpired RenderLab invitations;
- invitation email normalization, duplicate/open-invite handling and enumeration-safe delivery behavior remain server-owned;
- self-admin role/status controls are disabled in the UI and server mutation protection also rejects self-lockout and last-active-admin removal;
- global generation settings remain typed `generationEnabled`, `maxActiveJobs` and `maxJobsPerHour` with existing bounds;
- account generation overrides remain nullable: `null` / blank / `Default` inherits the global value;
- the existing server mutation RPC remains authoritative for role/status/generation override updates;
- Admin Health remains a bounded, sanitized aggregate product view with a 24-hour base window, bounded job/reservation/maintenance scans, accepted-to-terminal timing, active-state age, failover incidence and maintenance backlog;
- raw prompts, media, raw backend errors, provider/worker identities, storage identities and arbitrary shared Auth users are excluded from the UI;
- the configured Admin workflow currently verifies authorization, directory isolation, self/last-admin protections, invitations, global settings, nullable overrides, Health sanitization/bounding, responsive rendering and fixture cleanup;
- current configured visual baseline is Account/Admin Operations run `34768896750`, artifact `10321451087`, digest `sha256:5cc3f27623356e874c865112d50a708ffc0ba4dd70f2c87f336cd5a8f8565c3f`;
- production remains source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled.

## Design authority and continuity rule

The user explicitly approved **Admin System Continuity v0.2** on 2026-09-13 after rejecting the earlier Operations Register v0.1 for visual drift.

Binding design authority:

- R&D exact head `419a58c8c7877bab21673342775eb0650108412e`;
- focused browser run `34777699455`;
- evidence artifact `10323843563`, digest `sha256:1ada86fbb81b19ee0da11dbadbc5bab1aa15f31b56652f64aabd8eac6001940b`;
- `design/rd/admin-system-continuity-v02.md` and `design/prototypes/admin-system-continuity-v02/index.html` on the R&D head;
- explicit approval recorded on issue #230.

The production interpretation is intentionally strict:

1. **Settings / UI-078 is the structural parent.**
   - same UI-074 compact horizontal shell;
   - same compact intro hierarchy and restrained rule;
   - same one-register skeleton;
   - same numbered left label/value row grammar;
   - same near-black surface, precise border, restrained radius/shadow and small quarter-arc signature;
   - same desktop registered rows and 390px label-band → content-stack collapse.

2. **Activity / UI-077 is only a density reference.**
   - technical microtype;
   - precise 1px separators;
   - compact metadata alignment;
   - no Activity page skeleton, asymmetric job matrix or chronology semantics are imported into Admin.

3. **The rejected Operations Register v0.1 is not authority.**
   - no separate operator-register theme;
   - no new navigation/scaffold;
   - no generic dashboard/KPI visual system;
   - no competing brand or shell reconstruction.

If production implementation materially departs from these rules, fidelity review must fail even if functionality remains green.

## In scope

### 1. Page intro and shell continuity

Keep the existing `/admin` route and UI-074 application shell. Recompose only the feature content below the shell.

The page intro should follow the approved utility-surface family:

- small technical eyebrow such as **Privileged operations**;
- page title **Admin**;
- concise supporting copy covering beta access, generation guardrails and sanitized product health;
- restrained horizontal registration rule;
- no duplicated route bar, left rail, mobile dock or Admin-specific navigation.

The server-error state must remain truthful and visually belong to the same family.

### 2. One Settings-derived Admin register

Replace the current stack of three independent `AdminSection` blocks and nested rounded cards with one registered Admin object containing exactly three top-level rows:

1. **01 Access**
2. **02 Generation**
3. **03 Health**

Desktop uses the same narrow numbered label column + wide content column grammar as Settings where practical.

390px collapses each top-level row in document order:

`index + section label → content`.

The top-level register is the primary grouping object. Internal Admin records use spacing and 1px separators before additional rounded cards.

### 3. Access row

Preserve all existing Access behavior while restructuring it inside the first register row.

#### Invitation

Keep:

- Invite email;
- Role (`Member` / `Admin`);
- **Create invitation**;
- existing validation, busy state and enumeration-safe feedback;
- current one-hour invitation lifetime and server-owned delivery semantics.

The invitation form should read as one compact subsection, not a separate dashboard card.

#### Pending invitations

Keep:

- current pending count;
- email;
- role;
- expiry time;
- **Revoke** action;
- empty state when none exist.

Rows should use precise separators and safe long-email wrapping.

#### Admitted accounts

Keep only known RenderLab account-access rows. Do not enumerate arbitrary shared Supabase Auth identities.

Each account record retains:

- email when available, otherwise existing fallback copy;
- user ID as technical metadata;
- Role select;
- Status select;
- **Save access**;
- acting-account `You` context;
- self-account role/status/action disabled state;
- existing explanatory self-protection copy.

Do not weaken the server-enforced self-lockout or last-active-admin protections.

### 4. Generation row

Preserve the current global settings + nullable account override model.

#### Global defaults

The global controls are the parent tier and must be visually clearer than the override rows without becoming a new dashboard panel.

Keep exactly:

- Generation: `Enabled` / `Paused`;
- Active-job limit: integer `1–4`;
- Hourly limit: integer `1–120`;
- current Updated timestamp;
- **Save global limits**;
- existing unchanged/invalid/busy disabling behavior.

The copy must continue to state that these defaults apply unless a per-account override is set.

#### Account overrides

Keep one row per known RenderLab account with:

- account identity;
- role/status context;
- Generation override: `Default` / `Enabled` / `Disabled`;
- nullable Active-job limit (`1–4` or blank);
- nullable Hourly limit (`1–120` or blank);
- **Save overrides**;
- existing validation and unchanged/busy disabling behavior.

`Default` / blank continues to mean **inherit global**. Do not change precedence, validation, persistence or admission behavior.

### 5. Health row

Recompose the existing Health data into one bounded operational field, not a consumer analytics dashboard.

Keep the four current primary values:

- Active jobs;
- Active reservations;
- Completion p50;
- Completion p95.

Keep the explanatory timing sentence and current sample-count truth. Completion timing remains accepted-to-terminal duration and must continue to say that it is **not an SLA or ETA**.

Keep all six current diagnostic groups and their current server-provided values:

- Status counts;
- Operation counts;
- Sanitized error codes;
- Active state age;
- Failover incidence;
- Maintenance backlog.

Keep the existing footer truth:

- bounded window;
- current generation capacity/defaults;
- `+` means the bounded operator scan was truncated;
- raw job/account/provider/storage identities remain server-only.

No new metric, trend, chart, percentage, severity score, raw log, provider state or fabricated operational signal is authorized.

### 6. Feedback, busy and empty states

The existing single sanitized feedback channel remains authoritative.

- success/error feedback stays near the page/register entrance;
- busy state remains tied to the current mutation key and continues to prevent overlapping Admin mutations;
- existing spinners remain available where currently shown;
- empty pending-invitation and empty Health-count states remain truthful;
- no toast-only rewrite, optimistic mutation model or client cache ownership change is required.

### 7. Visual language

Admin remains 1/4 expressiveness.

Use:

- UI-078 near-black registered field;
- restrained cool/warm atmosphere subordinate to text/control clarity;
- technical microtype for indexes, compact metadata and bounded Health labels;
- precise 1px separators;
- one small canonical quarter-arc/system-signature accent;
- conventional maintained controls;
- restrained semantic state color only where state requires it.

Avoid:

- card-within-card-within-card composition;
- large glass panels;
- ornamental KPI colors;
- fake terminal/log aesthetics;
- graphs/charts introduced for decoration;
- ambient motion or operator spectacle;
- oversized marketing typography;
- new Admin-specific brand marks, icons or shell geometry.

### 8. Responsive behavior

Representative desktop target: 1440px wide.

Requirements:

- intro and register align with the approved utility-surface family;
- numbered label column remains compact;
- invitation/global controls align horizontally when space allows;
- account records and override rows remain scan-friendly without hiding actions;
- Health remains one bounded field;
- no horizontal overflow.

Representative narrow target: 390×844.

Requirements:

- same header model as UI-074;
- top-level label cells collapse above content like Settings;
- form controls stack predictably;
- self-account Role/Status remain legible and disabled;
- actions become full-width where useful;
- long email/user IDs wrap safely;
- no essential information/action is hidden to shorten the page;
- no horizontal overflow;
- effective touch target is at least 44px where practical;
- no hover dependency.

The narrow page may remain vertically long because current capability is intentionally preserved. The goal is reduced repetition and stronger hierarchy, not hiding product truth.

### 9. Reduced motion and interaction

No signature kinetic interaction is required or authorized.

- current/shared shell transitions may remain;
- local hover/focus/state transitions must be brief and useful;
- `prefers-reduced-motion` presents complete settled state immediately;
- no status animation may imply changing health, risk, queue movement or generation progress.

## Explicitly out of scope

Phase 28 does **not** authorize:

- any new Admin capability or route;
- shared Supabase Auth directory browsing/listing;
- arbitrary user search outside admitted RenderLab accounts;
- new invitation lifecycle behavior;
- account creation/deletion;
- password/session/MFA/passkey management;
- arbitrary feature flags;
- provider/worker/cloud controls;
- worker selection or failover control;
- raw logs, raw backend errors, prompts or media inspection;
- job/reservation drill-down or reservation-console controls;
- new Health metrics, charts, trends, alerts or SLA/ETA claims;
- changing role/status semantics;
- changing self-lockout/last-active-admin protections;
- changing generation setting names, types, ranges, defaults or precedence;
- changing nullable override semantics;
- changing generation admission behavior;
- changing health calculation, sanitization, truncation, bounding or privacy semantics;
- schema/database migration;
- API or RLS changes;
- Supabase Auth configuration changes;
- provider/worker/R2/storage changes;
- new runtime dependency, global state store or animation runtime;
- application-shell redesign;
- Phase 29 cohesion work beyond fixes strictly required for Phase 28 fidelity;
- production deployment.

## Architecture and state ownership

Preserve current ownership boundaries:

- `getCurrentRenderLabAdmin()` remains the route authorization gate;
- fresh Supabase identity + server-owned RenderLab access remains the authorization source;
- RenderLab account access, not user-editable Auth/profile metadata, owns Admin privilege;
- `listAdminAccounts()` remains scoped to RenderLab account-access rows and must not become shared Auth enumeration;
- invitation normalization, recording, revocation and delivery posture remain server-owned;
- account access mutation remains server/RPC-owned and retains self/last-admin enforcement;
- global generation settings remain server-owned through the existing Admin settings path;
- account generation overrides remain server/RPC-owned and nullable;
- Health remains server-derived, authorized first, bounded and sanitized;
- browser state owns only form values, local busy key and sanitized feedback;
- `router.refresh()` remains sufficient to reconcile successful mutations with server truth;
- no raw credential, service-role key, token, storage key, provider identifier or forbidden operational detail is rendered/logged into browser evidence.

If implementation appears to require changing one of these boundaries, stop and record a separate explicit product/architecture decision instead of expanding Phase 28 silently.

## Component and dependency policy

Use, in order:

1. existing Admin product/server contracts;
2. existing UI-074/UI-078 composition patterns;
3. existing RenderLab primitives under `src/components/ui`;
4. feature-local composition and styling.

No dependency addition is expected or authorized.

Visible Admin controls must continue to use the maintained primitive layer. Do not replace `Button`, `Input`, `NativeSelect`, `Field`, `Alert` or `Spinner` with hand-styled raw native controls.

A reusable generic component should be added only if implementation proves a real cross-feature reuse case. The expected solution is feature-local Admin composition, not a new component framework.

## Expected implementation files

Likely production changes are bounded to:

- `src/app/(app)/admin/page.tsx`;
- `src/features/admin/admin-operations.tsx`;
- a feature-local Admin stylesheet/module if needed to reproduce the approved geometry cleanly;
- `scripts/verify-admin-operations.mjs` only where locators/evidence must migrate while preserving substantive product/security assertions;
- `.github/workflows/admin-operations.yml` only if bounded evidence capture requires it;
- authoritative UI/project documentation after verified implementation.

Do not modify Admin server semantics, API routes, migrations, Auth configuration, generation-admission logic, maintenance logic, provider/worker/storage systems or unrelated feature source merely for visual convenience.

## Validation matrix

### Required functional/security verification

At minimum the final implementation head must pass the existing **Account/Admin Operations** workflow with all existing substantive assertions preserved, including:

- fresh active-admin route/API authorization;
- member/non-admin denial;
- RenderLab-directory-only scope;
- invitation create/revoke behavior and safe delivery messaging;
- account role/status mutation;
- acting-admin self protection;
- last-active-admin protection;
- global generation setting validation/persistence;
- nullable account override validation/persistence/inheritance semantics;
- generation-admission integration covered by existing affected workflows where GitHub path filters attach them;
- Health authorization, sanitization, bounding, timing/failover/maintenance semantics;
- fixture isolation and cleanup.

Do not weaken a product/security assertion to fit the new DOM.

### Engineering gates

Final exact-head acceptance requires:

- Engineering Quality;
- `npm run verify:ui-purity` through the existing workflows;
- TypeScript type-check;
- production build;
- UI Shell Validation;
- every other workflow GitHub actually attaches to the exact implementation head;
- successful merged-main workflows actually attached after merge.

If generation-admission or other shared server files remain untouched, do not manufacture unrelated changes merely to trigger additional workflows. If GitHub attaches a relevant shared-resource workflow, it must pass unchanged.

### Visual/fidelity evidence

The final production implementation must produce configured Admin browser evidence from the real application, not only the static R&D fixture.

Required review states:

- desktop `/admin` at representative wide width;
- full 390px `/admin` composition;
- reduced-motion 390px settled state;
- current self-admin disabled state;
- invitation/global/account-override controls present and reachable;
- Health primary metrics + diagnostics + bounded/truncation copy visible;
- long account identity wrapping;
- no horizontal overflow;
- no fixed-header capture contamination;
- no raw credential/provider/storage/backend identity exposed in screenshots.

Human fidelity review must compare production output directly against the approved v0.2 R&D evidence and the Settings/UI-078 structural parent.

Material failure examples:

- restoring the old stack of isolated Admin cards;
- importing the rejected v0.1 operator/ledger page scaffold;
- losing the Settings-style numbered register skeleton;
- changing the UI-074 shell;
- making Health look like a generic colorful analytics dashboard;
- hiding current controls/data on narrow screens merely to shorten the page;
- changing action meaning or server truth for visual convenience.

## Documentation outputs

After verified implementation, update from actual repository state:

- `PROJECT.md`;
- `docs/ui/UI_MIGRATION.md`;
- `docs/ui/UI_DECISIONS.md` UI-079 implementation evidence;
- `docs/ui/SCREEN_REGISTRY.md` Admin status/composition/evidence;
- `docs/ui/COMPONENT_CATALOG.md` only if a reusable component is genuinely introduced;
- issue #230 and implementation PR evidence.

Do not mark Phase 28 complete from the approved design or contract alone.

## Exit criteria

Phase 28 is complete only when all are true:

1. this contract and UI-079 are merged before production source changes;
2. production `/admin` faithfully implements the approved Settings-derived system-continuity composition;
3. all existing Admin product/security semantics remain unchanged;
4. exact-head required/attached workflows pass;
5. configured desktop/390px/reduced-motion Admin evidence is human-reviewed for fidelity;
6. no horizontal overflow, accessibility regression or primitive-purity regression remains;
7. final documentation records verified implementation/merge reality;
8. implementation PR is merged and merged-main attached workflows pass;
9. issue #230 is closed only after verified repository closure;
10. production remains unchanged unless the user separately authorizes deployment.

## Next-phase dependency

Phase 29 whole-product cohesion remains roadmap-level until Phase 28 is verified and merged. Phase 28 may identify cohesion observations, but it must not silently expand into the Phase 29 cross-product audit.