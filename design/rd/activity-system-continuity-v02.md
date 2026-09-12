# Activity System Continuity v0.2 — Phase 26 R&D

**Status:** EXPERIMENTAL / REVIEW CANDIDATE — NOT APPROVED  
**Tracker:** issue #202  
**Branch:** `rd/activity-system-continuity-v02`  
**Starting main:** `639e84b5198a7b566eb18b3d34cf52b327249fc4`  
**Production boundary:** R&D only. This does not authorize production `/activity` changes, an implementation contract, merge to `main`, backend/schema/infrastructure changes, or deployment.

## Why v0.2 exists

The user rejected Activity Lifecycle Register v0.1 because it did not match the same design pattern as the finished RenderLab surfaces closely enough. The problem was structural rather than cosmetic.

v0.1 preserved truthful job semantics and used technical microtype, rules and a dark canvas, but it reduced the established RenderLab visual system to a ledger/list treatment. It lacked enough of the approved system's actual composition: atmospheric field, 64px Lab Matrix registration, asymmetric primary object, quarter-arc geometry, attached-surface logic, compressed editorial hierarchy and cool/warm spatial light.

v0.2 therefore starts from the **approved browser evidence itself**, not from generic activity/history references.

## Approved visual evidence reviewed

### Landing — Lab Matrix

Reviewed production browser artifact `10176777155` and `docs/ui/LANDING_BRAND_RD.md`.

Inherited rules:
- near-black canvas with restrained blue/orange atmosphere;
- 64px registration/grid logic;
- asymmetric composition with one dominant object and smaller related objects;
- canonical large quarter-arc geometry as registration/media silhouette;
- compressed editorial heading hierarchy plus uppercase technical microtype;
- high contrast primary action with quiet secondary chrome;
- spatial continuity rather than independent floating cards.

### Create — Clear Composer / UI-074

Reviewed approved R&D browser artifact `10269841181`, `design/rd/create-usability-first-v05.md`, UI-073/UI-074 and the merged production system.

Inherited rules:
- compact horizontal application header;
- concise eyebrow + large compressed heading + one short support line;
- one stable bounded work surface rather than multiple dashboard cards;
- conventional stationary actions, with expressive treatment concentrated in the meaningful work object;
- subtle cool/warm atmosphere and registration framing behind/around the work surface;
- full-width, direct mobile adaptation rather than a scaled desktop layout.

### Library — Gallery Rail / UI-075

Reviewed approved browser artifact `10296866215` and `design/rd/library-gallery-rail-v03.md`.

Inherited rules:
- 1440px workspace with approximately 48px desktop edges and 72px compact header;
- 64px Lab Matrix grid and restrained grain;
- 9px uppercase microtype with wide tracking;
- approximately 42–52px compressed screen heading;
- one rounded 16–18px bounded command/work surface using subtle 1px rules;
- media/work content visually dominates controls;
- narrow layout preserves the same hierarchy without stacking unnecessary chrome;
- selection/state change transforms an existing surface rather than adding disconnected floating UI.

### Media Viewer — Media Register + Source Fold / UI-076

Reviewed user-approved browser artifact `10300577421` and `design/rd/media-viewer-register-fold-v02.md`.

Inherited rules:
- one registered primary stage owns the current object;
- related controls and context attach directly below the primary stage rather than living in a separate property sidebar;
- large primary object plus quieter attached register is the preferred hierarchy;
- local state/disclosure changes happen inside the same geometry;
- fine controls remain stationary and ordinary;
- reduced motion reaches the complete settled geometry immediately.

## Locked Activity product behavior

v0.2 changes presentation only. The following remain non-negotiable:

- route `/activity`;
- account-private ownership and server-owned dataset;
- newest-first real jobs;
- truthful statuses only: `queued`, `preparing`, `running`, `cancelling`, `persisting`, `succeeded`, `failed`, `cancelled`;
- polling/refresh only while nonterminal jobs require it;
- sanitized product-level errors;
- owner-scoped active result links;
- Retry for eligible failed jobs;
- Run Again for eligible successful prompt-generation jobs;
- Cancel for eligible active jobs;
- Retry / Run Again / Cancel remain semantically distinct;
- deleted-output success suppression;
- no provider, worker, workflow, failover, storage/R2 or backend identity;
- no fake queue position, percentage, ETA, SLA or fabricated stage;
- current cancellation-safe lifecycle and confirmation semantics;
- maintained primitives, keyboard/focus/touch and reduced-motion requirements.

## v0.2 focused concept — Job Matrix + History Register

This is a focused correction, analogous to Library v0.3 and Viewer v0.2 after their earlier multi-concept studies. v0.1 already explored three Activity topologies; the user feedback establishes that the next iteration should improve **system continuity**, not invent more unrelated layouts.

### Composition

Activity becomes one registered work object.

The three newest jobs occupy an asymmetric Lab Matrix inside the top of the stage:

- `RL / 01` is the dominant newest job;
- `RL / 02` and `RL / 03` are secondary but still clearly ordered;
- the numbering is presentation-only chronology, not provider/job identity;
- the dominant cell gets the strongest atmospheric and quarter-arc treatment;
- state is explicit text first, decoration second.

The attached **History Register** continues immediately with `04`, `05`, `06` and so on. It is not a separate dashboard/table and does not group jobs by status.

This preserves newest-first truth while borrowing the exact RenderLab pattern of **dominant object → attached contextual register** from Landing/Viewer and the compact technical cadence from Library.

### Why the asymmetric top three are acceptable

The layout does not claim priority, queue rank or execution importance. The numbers explicitly communicate chronological order: newest job is `01`, then `02`, then `03`, and the attached register continues at `04`.

The dominant visual weight means only **most recent**, not "most important" or "further along". No cell size changes with progress or status.

### State expression

Activity is 2/4 expressiveness:

- nonterminal state gets only a small bounded state-marker pulse;
- `LIVE` appears only while any displayed job is nonterminal;
- status words remain the primary truth;
- no bar fills, countdowns, spinner stages, queue rank or elapsed-progress metaphor;
- terminal transition receives one short local wash then becomes completely still;
- failed guidance stays attached to the failed job;
- cancellation confirmation expands inside the current job sheet;
- `Cancelling` is a state, not a disabled pseudo-action.

### Action ownership

Actions remain conventional and stationary:

- active eligible job: `Cancel`;
- eligible success: `View result` + `Run again`;
- eligible failure: `Retry`;
- terminal cancelled / ineligible states: no fabricated action.

The historical row never morphs into a new Retry/Run Again attempt. Existing server behavior creates a distinct job and refreshes the server-owned feed.

### Loading

Loading keeps the same stage footprint with a three-cell structural skeleton plus attached register skeleton. It does not show fake job labels or progress.

### Empty

Empty state stays inside the registered Activity stage, with the large quarter-arc registration motif and one truthful `Open Create` action. It does not become a separate marketing card.

### Terminal-only history

When no nonterminal jobs exist, the same composition remains. `LIVE` disappears and all rows are static. There is no idle animation.

## Responsive behavior

### Desktop

- compact 72px UI-074 application header;
- 1440px maximum workspace with 48px side rhythm;
- concise context block above the stage;
- newest job uses the large left matrix cell;
- second and third jobs stack to the right;
- history continues in the attached register beneath;
- ordinary controls stay fixed and obvious.

### 390px

- compact horizontal header remains;
- screen heading scales down without becoming a hero block;
- `01`, `02`, `03` stack vertically in chronological order;
- the quarter-arc remains a background registration accent only;
- attached register rows fold into number/time/state → summary → action bands;
- all required controls remain at least 44px high;
- no horizontal overflow or hover dependency.

## Reduced motion

`prefers-reduced-motion` removes:

- active marker pulse;
- terminal wash;
- any nonessential transition duration.

The same complete state, ordering, actions and geometry remain immediately available.

## What v0.2 explicitly avoids

- generic dashboard cards;
- an admin-style data table as the primary composition;
- another navigation/sidebar system;
- status pills as the whole visual language;
- grouping/reordering by lifecycle status;
- fake progress visualizations;
- provider/worker/storage detail;
- perpetual ambient animation across terminal history;
- decorative card hover scaling;
- invented media thumbnails for jobs that may not have results;
- model/provider labels not already part of the user-facing Activity contract.

## Browser acceptance target

The repository-backed verifier must prove on one exact R&D head:

- desktop 1440×1000 full state;
- 390×844 full state;
- loading, empty and terminal-only history;
- all eight real lifecycle labels;
- View result / Run again / Retry / Cancel distinctions;
- local sanitized failed guidance;
- chronological matrix `01 → 02 → 03` continuing into attached register at `04`;
- Cancel confirmation → `Cancelling` → `Cancelled` continuity;
- Running → Succeeded terminal settling;
- keyboard-reachable Cancel with visible focus;
- required narrow touch targets >=44px;
- no horizontal body/document overflow;
- reduced-motion static equivalent;
- no browser runtime errors;
- prototype review chrome excluded from evidence screenshots.

Passing automation makes v0.2 reviewable. It does not approve it.

## Approval boundary

The user must explicitly approve the complete v0.2 Activity direction before any Phase 26 implementation contract or production `/activity` source change is written.

Until then:

- v0.1 remains rejected historical R&D;
- v0.2 remains isolated R&D;
- `main` remains authoritative and unchanged;
- production deployment remains unchanged and unauthorized.
