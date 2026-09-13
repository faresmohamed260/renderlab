# Phase 28 R&D — Admin System Continuity v0.2

**Status:** REVIEW CANDIDATE — design R&D only, not production authority  
**Tracker:** #230  
**Supersedes:** rejected Admin Operations Register v0.1 / draft PR #231  
**Baseline:** `main` `580ede245f1e5b6e84a2b1439a7c193aa9ed97b8`  
**Direct visual parent:** UI-078 Settings Trust Register  
**Secondary density reference:** UI-077 Activity Job Matrix + History Register  
**Prototype:** `design/prototypes/admin-system-continuity-v02/index.html`

## Correction from v0.1

v0.1 is rejected for system drift. It introduced an Admin-specific long zone rail, a new operator-ledger skeleton and too much custom technical chrome. Those choices made Admin read as a separate product even though the repository explicitly requires every remaining surface to reuse the established RenderLab visual/interaction family.

v0.2 does **not** create a new Admin design language. Admin is a denser member of the same family already approved for Settings and Activity.

The governing rule is simple:

> **Use the Settings Trust Register as the structural template. Use Activity only to solve density inside that template.**

Admin and Settings are both 1/4-expressiveness surfaces. Therefore Settings owns the page rhythm, register geometry, label/value grammar, border/radius/surface language, signature arc and narrow collapse behavior. Activity contributes only the established way to compress dense records with precise internal rules and technical microtype without turning them into isolated cards.

## Locked product/security boundary

This is presentation R&D only. Existing Admin behavior remains authoritative:

- `/admin` remains fresh-active-admin only and fails closed;
- ordinary navigation still omits Admin; Settings exposes it conditionally;
- Access lists only RenderLab invitations/admitted accounts, never all shared Supabase Auth users;
- invite role remains `member | admin`;
- admitted-account role remains `member | admin`;
- admitted-account status remains `active | suspended`;
- acting-account and last-active-admin protections remain server-owned;
- global Generation controls remain typed `generationEnabled`, `maxActiveJobs`, `maxJobsPerHour`;
- per-account overrides remain nullable and inherit global values when blank/default;
- current field bounds/defaults remain unchanged;
- Health remains bounded/sanitized aggregate product state with current definitions only;
- no provider/worker/storage identities, raw errors/prompts/media, arbitrary flags, account deletion, reservation browser, logs, job inspector or new health metrics;
- no route/API/schema/RLS/Auth/provider/storage/deployment change.

## Binding continuity rules

### 1. Shared application shell

Use UI-074 exactly:

- compact horizontal header;
- locked `RenderLabBrand` at left;
- Library text plus Activity and Settings/account utilities at right;
- no Admin top-level navigation item;
- no desktop rail;
- no mobile bottom dock;
- no page-specific shell invention.

### 2. Settings owns Admin's page grammar

Admin uses the same hierarchy as Settings:

- calm mono eyebrow;
- compact page title;
- one restrained lede;
- one thin gradient rule beneath the intro;
- one continuous bordered register;
- one quarter-arc signature in the register corner;
- numbered left label cells on desktop;
- value/content cells on the right;
- precise horizontal rules between top-level rows;
- the exact same label-band → content-stack collapse on narrow screens.

The three Admin rows are:

1. `01 Access`
2. `02 Generation`
3. `03 Health`

Do not add a second zone-navigation rail, sidebar, floating section tabs or detached dashboard cards.

### 3. Activity may inform density, not skeleton

Inside the Settings-derived right-hand value cells, dense Admin records may use Activity's accepted internal language:

- 1px internal separators;
- compact identity/state rows;
- technical microtype for UUIDs, timestamps and inherited/effective notes;
- attached flat metric groups;
- sparse truthful status color.

Do **not** copy Activity's asymmetric 01/02/03 Job Matrix, large editorial job typography or lifecycle energy. Admin is lower-expression and operational.

### 4. Controls stay ordinary

Inputs, selects and actions remain conventional RenderLab maintained controls. No instrument-like custom controls, oversized white CTAs, decorative gauges, radial controls or dashboard widgets.

## Page composition

### Intro

Directly mirror Settings' intro proportions:

- eyebrow: `Privileged operations`;
- title: `Admin`;
- lede: `Manage RenderLab beta access, generation guardrails and sanitized product health.`

The intro is not a hero. It remains compact and left aligned.

### Register row 01 — Access

The left label cell contains only `01` and `Access`.

The right content cell has three attached subsections separated by internal rules.

#### Invitation

First subsection:

- micro-label `Invitation`;
- one short helper sentence;
- ordinary `Invite email`, `Role`, `Create invitation` controls.

Wide: email grows, Role stays compact, action aligns to the field baseline.  
Narrow: fields stack; primary action becomes full width.

#### Pending invitations

Second subsection:

- heading + truthful pending count;
- compact rows: identity, role/expiry metadata, Revoke;
- no rounded container per invitation.

#### Admitted accounts

Third subsection:

- heading + account count;
- rows separated by 1px rules;
- identity/email primary;
- UUID secondary mono;
- `YOU` shown as restrained technical metadata for the acting account;
- Role / Status / Save access aligned on wide screens;
- protected self controls remain visibly disabled with the existing explanatory sentence.

Narrow layout keeps one continuous register: identity first, Role/Status in a compact two-column control grid when width allows, then full-width action. No floating mini-cards.

## Register row 02 — Generation

The left label cell contains `02` and `Generation`.

The right content cell has two attached subsections.

### Global defaults

Global defaults are visually first and parent-level, but they remain inside the same value cell rather than becoming a separate hero panel.

Show:

- `Global defaults` micro-heading;
- existing update time;
- Generation, Active-job limit, Hourly limit, Save global limits;
- existing bounds/helper copy.

A subtle tonal band may distinguish this parent tier, using the same Settings register surface vocabulary.

### Account overrides

Follow with a compact attached list:

- identity + current role/status;
- Generation override;
- Active-job limit;
- Hourly limit;
- Save overrides;
- blank/default continues to mean inherit.

Use internal rules, not one card per account. Narrow layout stacks each record's controls beneath identity and makes Save overrides full width.

## Register row 03 — Health

The left label cell contains `03` and `Health`.

The right content cell treats Health as data inside the same register, not as a separate analytics dashboard.

### Primary metrics

Current four metrics only:

- Active jobs
- Active reservations
- Completion p50
- Completion p95

Wide: one flat four-column strip with internal rules.  
Narrow: 2×2 matrix inside the value cell.

Keep the accepted-to-terminal / not-SLA-or-ETA explanation immediately below.

### Diagnostics

Current six diagnostic groups only:

- Status counts
- Operation counts
- Sanitized error codes
- Active state age
- Failover incidence
- Maintenance backlog

Wide: attached 3-column grid with internal rules.  
Narrow: stacked groups separated by rules in the same enclosing value cell.

Close with the existing window/capacity/bounded-count explanation as subdued technical footer copy.

## Surface treatment

Reuse Settings' accepted treatment rather than reinterpret it:

- near-black register field;
- subtle violet/cool atmosphere behind the page;
- `1px` low-contrast borders;
- approximately `1rem` register radius desktop and slightly tighter narrow radius;
- same top-right quarter-arc signature;
- same restrained shadow/inner highlight;
- semantic status colors only where state benefits from them;
- no large background grid required for this 1/4 surface;
- no glow behind body text;
- no decorative section numbering beyond the established left-cell indices.

## Typography

Follow Settings:

- page title around the existing Settings scale, not Activity's large editorial title;
- body/helper copy at the existing Settings density;
- mono only for eyebrow, indices, value labels, UUIDs and tightly technical metadata;
- ordinary labels and actions use the product UI face;
- no all-mono console aesthetic.

## Narrow behavior

At 390px:

- shared header remains the UI-074 mobile/narrow header;
- intro matches Settings' compact rhythm;
- each top-level Admin row becomes one column;
- label cell becomes a horizontal `index + title` band above content exactly like Settings;
- no horizontal overflow;
- long email/UUID values wrap safely;
- actions become full width where needed;
- Health primary metrics use 2×2 layout;
- all content remains in one continuous register.

## Motion / interaction

Admin remains 1/4 expressiveness.

Allowed:

- ordinary 120–180ms hover/focus/background transitions;
- existing button/spinner busy feedback;
- existing Alert feedback.

Not allowed:

- signature motion requirement;
- pulsing background grids;
- animated KPI counters;
- parallax;
- pointer tilt;
- magnetic controls;
- continuous glows;
- animated zone rails.

`prefers-reduced-motion` preserves the exact same settled hierarchy with transitions removed/effectively instant.

## Accessibility

Future production implementation must preserve:

- maintained `Button`, `Input`, `NativeSelect`, `Field`, `Alert`, `Spinner` primitives;
- bound labels for every field;
- visible focus;
- keyboard traversal in reading order;
- no hover-only action;
- disabled semantics for protected self controls;
- practical 44px primary touch targets on narrow layouts;
- safe wrapping of long identity values;
- no page-level horizontal overflow at 390px.

The static prototype uses native controls only as non-production design scaffolding; it does not authorize raw production controls.

## Reference matrix

| Admin task | Binding reference | Borrow | Explicitly do not borrow |
|---|---|---|---|
| Page/surface structure | UI-078 Settings Trust Register | intro scale/rule, single register, numbered label/value rows, signature arc, mobile label bands | new Admin-specific rails, dashboard cards, extra shell |
| Dense account rows | UI-077 Activity History Register | internal 1px rules, compact row rhythm, mono technical metadata | asymmetric Job Matrix, large job typography, lifecycle animation |
| Global vs account generation | current Admin semantics inside UI-078 register | existing hierarchy and controls, subtle parent tier | detached hero settings card or second visual system |
| Health | current Admin truth + UI-078 register | flat attached metrics/diagnostics, sparse state color | colorful KPI dashboard, charts, invented trends |
| Shell | UI-074 | exact horizontal header family and locked brand | Admin nav destination, rail, bottom dock |
| Brand | UI-072 | exact `RenderLabBrand` mark/wordmark geometry | reconstructed logo or alternate mark |

## v0.2 review questions

1. Does Admin immediately read as the same application family as Settings rather than a separate operator product?
2. Are the Settings label/value register grammar and signature arc unmistakably preserved?
3. Is Admin's extra density solved *inside* that grammar rather than by introducing a new scaffold?
4. Do Access, Generation and Health remain easy to scan without reverting to isolated card stacks?
5. Does 390px look like the mobile Settings system with denser content, not a separate mobile dashboard?
6. Are all current product/security meanings preserved with no invented Admin capability?
7. Is the 1/4 expressiveness ceiling respected without becoming visually generic?

## Approval / implementation gate

v0.2 remains design evidence only.

Before production changes:

1. remotely render desktop, 390px and reduced-motion 390px evidence;
2. compare directly against the approved Settings evidence and current Admin baseline;
3. obtain explicit user approval;
4. write and merge a Phase 28 implementation contract and durable UI decision;
5. only then modify production Admin source/verifier presentation expectations;
6. exact-head functional/security validation and implementation fidelity review remain mandatory;
7. deployment remains separately explicit.
