# Phase 28 R&D — Admin Operations Register v0.1

**Status:** REVIEW CANDIDATE — design R&D only, not production authority  
**Tracker:** #230  
**Baseline:** `main` `580ede245f1e5b6e84a2b1439a7c193aa9ed97b8`  
**Current-render evidence:** Account/Admin Operations run `34768896750`, artifact `10321451087` (`sha256:5cc3f27623356e874c865112d50a708ffc0ba4dd70f2c87f336cd5a8f8565c3f`)  
**Prototype:** `design/prototypes/admin-operations-register-v01/index.html`

## Intent

Phase 28 does not add Admin capability. It redesigns the existing privileged operator surface so the same verified information is faster to scan, less repetitive, and visually continuous with the finished RenderLab application system.

Admin stays at **1/4 expressiveness**. The design goal is authored operational clarity, not spectacle.

Working name: **Operations Register**.

The page becomes one registered operator field with three attached numbered zones:

1. `01 / ACCESS`
2. `02 / GENERATION`
3. `03 / HEALTH`

The zones retain the exact current information architecture and current product meanings. The visual change is from isolated rounded cards to flatter ledgers, aligned control columns, precise rules, compressed technical microtype, and a stronger global-vs-account hierarchy.

## Current-render audit

The configured baseline is functionally sound and security-truthful. The visual debt is structural:

- desktop repeats large rounded containers for every admitted account and every account override;
- account identity, role/status controls and save action are not aligned into a stable reading grid across records;
- global generation defaults are visually only one more card instead of the parent control tier for all overrides;
- Health is a collection of small cards, which reads like a conventional KPI dashboard rather than one bounded product-health object;
- 390px turns each desktop card into a vertically padded mini-form, making the page extremely tall and repetitive;
- section labels are useful but the internal card treatment disconnects each record from the surrounding operator context;
- the surface predates the newer registered-field language used by Activity and Settings.

The redesign should preserve the baseline's strongest qualities: explicit copy, ordinary controls, visible UUID/account context, truthful aggregate health definitions, safe self-account treatment, and no hidden operator magic.

## Locked product/security boundary

The prototype is visual evidence only. Production behavior remains exactly as documented in `SCREEN_REGISTRY.md` and current source.

Do not infer any capability from representative prototype content beyond these existing contracts:

- `/admin` remains fresh-active-admin only and fails closed;
- ordinary navigation still omits Admin; Settings exposes it conditionally;
- Access lists only RenderLab invitations/admitted accounts, never all shared Supabase Auth users;
- invite role stays `member | admin`;
- admitted-account role stays `member | admin`;
- admitted-account status stays `active | suspended`;
- self and last-active-admin protections remain server-owned;
- global Generation controls remain typed `generationEnabled`, `maxActiveJobs`, `maxJobsPerHour`;
- account overrides remain nullable and inherit global values when blank/default;
- current field bounds and defaults remain unchanged;
- Health remains bounded/sanitized aggregate product state with current definitions only;
- no provider/worker/storage identities, raw errors/prompts/media, arbitrary flags, account deletion, reservation browser, logs, job inspector, or new health metrics;
- no route/API/schema/RLS/Auth/provider/storage/deployment change.

## Visual system

### Field and registration

The page keeps the UI-074 compact horizontal shell and a near-black canvas. The operator content sits inside a maximum-width field with one continuous left registration line.

Each major zone uses:

- an index (`01`, `02`, `03`) in small technical mono;
- a short uppercase zone label;
- one restrained sentence of operator guidance;
- a thin horizontal rule connecting the label rail to its register content.

Large section containers are flat. Ordinary controls keep familiar 6–8px radii. Data records use separators and subtle row hover/focus treatment rather than isolated card elevation.

### Typography

- page title remains concise: `Admin`;
- eyebrow remains `OPERATIONS`;
- zone indices and field labels use technical mono/microtype;
- identity/email is visually primary inside a record;
- UUID and inherited/effective notes are secondary microtype;
- avoid marketing-scale headings.

### Atmosphere

Use the established restrained near-black/cool field. A very faint warm/cool atmospheric wash may sit behind the registered content, but it must not carry meaning and must never compete with controls/data.

Semantic color is sparse:

- active/healthy text may use a restrained cool-success tint;
- suspended/paused/error uses existing semantic warning/danger roles;
- ordinary counts and metrics remain neutral rather than color-coded as a dashboard.

## Zone 01 — Access Register

### Invitation strip

The invitation form becomes the first row of the Access Register, not a detached card.

Wide layout:

`Invite email | Role | Create invitation`

Pending invitations follow immediately as compact rows with:

`Email | role + expiry | Revoke`

### Account ledger

Admitted accounts use a stable column grammar on wide screens:

`Identity | Role | Status | Action`

Identity contains:

- email / known-account label;
- UUID as secondary mono;
- `YOU` as restrained technical metadata for the acting account.

The acting account keeps disabled role/status/action treatment and the current truthful self-protection note.

The ledger may use subtle row bands/rules but not one rounded panel per account.

### Narrow behavior

At 390px each account remains one record separated by rules, not a floating card. Identity occupies the first line; `Role` and `Status` form a compact two-column control grid when width allows; the save action spans the record width beneath them. UUID wraps safely. Self-account explanation sits directly under the disabled controls.

## Zone 02 — Generation Control Register

### Global tier

Global defaults must read as the parent tier. It uses one registered control strip with a clear `GLOBAL DEFAULTS` label and the existing update timestamp.

Wide layout:

`Generation | Active job limit | Hourly limit | Save global limits`

Existing helper/bound text remains directly associated with its field.

### Account override ledger

Overrides follow in one attached ledger. Every row starts with identity + current role/status, then the existing three override fields and `Save overrides`.

`Default` / blank continues to mean inherit; the prototype must not imply a second inheritance model.

Wide layout aligns override controls across records. Narrow layout groups the three controls into a compact stack under identity and keeps the save action full-width.

The goal is to remove repeated container padding, not to hide the per-account controls.

## Zone 03 — Health Matrix

Health becomes one bounded operational readout rather than a set of unrelated KPI cards.

### Primary metric matrix

Four primary current metrics occupy one flat 4-column matrix on wide screens:

- Active jobs
- Active reservations
- Completion p50
- Completion p95

On narrow screens this becomes a 2×2 matrix. The accepted-to-terminal / not-SLA-or-ETA explanation remains directly beneath.

### Diagnostic register

Current diagnostic groups remain exactly the current set:

- Status counts
- Operation counts
- Sanitized error codes
- Active state age
- Failover incidence
- Maintenance backlog

Wide layout uses a 3-column attached register with internal rules. Narrow layout stacks groups inside the same enclosing field, separated by rules rather than cards.

The window/capacity/bounded-count explanation closes the Health zone as technical footer copy.

## Feedback and state treatment

### Success / error

The current feedback message remains near the top of the operator field. It uses the maintained Alert semantics in production. The visual candidate keeps it as a thin registered message band rather than a large detached notice.

### Busy

Production continues to disable concurrent Admin mutation controls using the existing busy key and Spinner semantics. The design should show busy state by preserving the control footprint and replacing/augmenting the relevant action label with spinner feedback; do not shift rows.

### Disabled / self account

Disabled fields stay visibly disabled and legible. Self-account protection uses `YOU` metadata plus the existing explanatory sentence. The design must not make disabled controls appear editable.

### Unavailable

The existing page-level unavailable state keeps the same title/context and a destructive Alert. It should use the same registered field geometry if implemented, but no separate capability is introduced.

## Interaction choreography

This surface intentionally has no signature motion requirement.

Allowed production behavior after later approval:

- 120–180ms hover/focus/background transitions for row/control feedback;
- brief feedback-band entrance/update when an operation completes;
- no layout spring, parallax, continuous glow, pointer tilt, magnetic controls, animated KPI counters or background loops;
- `prefers-reduced-motion` receives the same settled layout with transitions removed or effectively instantaneous.

The prototype itself is static except for ordinary CSS control hover/focus demonstration.

## Accessibility / input behavior

Future production implementation must preserve:

- maintained `Button`, `Input`, `NativeSelect`, `Field`, `Alert`, `Spinner` primitives;
- labels bound to every field;
- minimum practical 44px touch hit area for primary actions on narrow layouts;
- visible focus rings;
- keyboard traversal in visual reading order;
- no hover-only action;
- disabled semantics for protected self controls;
- safe wrapping for long email/UUID fixture values;
- no horizontal page overflow at 390px;
- complete static meaning with reduced motion.

The R&D prototype uses native HTML only as non-production design scaffolding; it does not authorize raw production controls.

## Reference matrix

| RenderLab task | Reference authority | Borrow | Do not copy | Wide behavior | Narrow behavior | Reduced motion |
|---|---|---|---|---|---|---|
| Scan operator zones | UI-077 registered Activity composition | numbered registered zones, precise rules, technical microtype | chronological job semantics or 2/4 lifecycle energy | 01/02/03 attached field | indices remain attached above each collapsed register | static |
| Read trust/access identity | UI-078 Settings Trust Register | calm account hierarchy, read-only identity emphasis, low expression | Settings-specific sign-in/password layout | aligned identity + state columns | record stack with identity first | static |
| Operate dense account rows | current Admin functional baseline | complete visible role/status/action semantics | rounded card-per-row presentation | stable ledger columns | border-separated records, full-width actions | static |
| Understand global vs override controls | current Admin product hierarchy | global defaults before account overrides, helper text/bounds | equal visual weight for global and per-account tiers | dominant global strip + attached override ledger | global strip then records | static |
| Read health truth | current Admin Health + UI-077 registration language | bounded aggregate truth, precise labels, attached matrix | colorful SaaS KPI dashboard, fake trend/score graphics | flat 4-metric matrix + diagnostic register | 2×2 metric matrix + stacked diagnostic groups | static |
| Use ordinary controls | UI-074/UI_SYSTEM maintained-control guidance | stationary conventional controls | custom instrument-like controls | aligned compact fields | touch-safe full-width actions | static |

## Prototype fixture rules

All names, counts, timestamps and UUIDs in the R&D prototype are representative **design fixture data**. They are chosen to exercise long identity strings, self-account treatment, inheritance labels, bounded counts and health density. They are not production metrics or claims.

The prototype includes an explicit `DESIGN FIXTURE / NOT PRODUCT DATA` marker.

## Acceptance questions for v0.1 review

1. Does the flatter registered treatment make the page materially faster to scan than the current rounded-card stack?
2. Is Access still obvious and safe rather than visually compressed past usability?
3. Do global Generation defaults clearly read as the parent tier over account overrides?
4. Does Health feel like one truthful operational object rather than a generic analytics dashboard?
5. Is the 390px composition meaningfully shorter/less repetitive while keeping every essential control reachable?
6. Does Admin now feel like the same RenderLab family as Settings/Activity without becoming decorative?
7. Is the 1/4 expressiveness ceiling respected?

## Approval / implementation gate

v0.1 is not production approval by itself.

Before production work:

1. remotely render desktop and 390px prototype evidence;
2. review the evidence for hierarchy, overflow, legibility and coherence against the configured baseline;
3. obtain explicit user approval;
4. write/merge a Phase 28 implementation contract and durable UI decision;
5. only then modify production Admin source and verifier locators/presentation expectations;
6. exact-head functional/security verification and real implementation fidelity review remain mandatory;
7. deployment remains separately explicit.
