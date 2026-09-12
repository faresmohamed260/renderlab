# Library Approved-System R&D v0.2

Status: `ACTIVE R&D / NOT PRODUCTION / HUMAN APPROVAL REQUIRED`

Tracker: #191  
R&D branch: `rd/library-approved-system-v02`  
Repository restart baseline: `6b4625000dfe50618232a0ef741416cd68adac12`

## Purpose

Restart Library visual exploration from the corrected, user-approved Create v0.5 system and approved Lab Matrix Landing system. This record supersedes the visual direction from #187 / `rd/library-spatial-archive-v01`; that older candidate is historical evidence only and must not be resumed or promoted.

This work changes no production route, capability, API, schema, worker/provider, R2, identity, ownership, security, generation or deployment contract.

## Binding visual authority

- approved Create prototype/code head: `6237f59351d2cd7b397881f617a483d62d9bf438`
- user-approved corrected Create implementation: `c786a17fa3a3c7f76dba5a64cb7822926749c1a2`
- verified application merge from PR #188: `3f0d21ed55554b3c48791d35dd17cb6005212076`
- approved Landing/brand records in `docs/ui/BRAND_SYSTEM.md`, `docs/ui/LANDING_BRAND_RD.md` and `docs/ui/VISUAL_NORTH_STAR.md`

The inherited visual grammar is: compact horizontal application header; dark field; sparse 64px registration grid; cool/warm atmospheric balance; editorial title hierarchy; technical microtype; restrained quarter-arc registration geometry; stable ordinary controls; expressive depth concentrated around media rather than controls.

## Current rendered audit

Accepted current Library evidence comes from Library Lifecycle run `34684442106`, artifact `10294579370`, digest `sha256:e13a5ff486bdf8a64edc45944db59152ea797b902fb13b769b5d1129db4fc2b4` on the accepted Create application tree.

Observed desktop hierarchy:

1. Library heading / description / Upload affordance;
2. separate Creatives / Uploads glass tab surface;
3. separate large All / Images / Videos + Favorites / Collections / Sort glass toolbar;
4. separate search glass panel;
5. separate Select affordance / selection deck;
6. finally, the media field.

Roughly half of the initial desktop viewport is command chrome before the first asset row. On the 390px evidence, the same layers become multiple stacked blocks before the first media card. The problem is therefore spatial hierarchy, not missing styling polish.

### Audit conclusion

The next Library must make media the dominant first-read surface while keeping every existing command obvious. Persistent commands should compress around the media field; batch commands should appear only when selection is active. The redesign must not hide essential behavior behind hover or invent new actions.

## Locked product contract

The R&D prototype must preserve these semantics:

- `/library` remains the primary Library route and `/library/[assetId]` remains the contextual Viewer.
- Creatives is the default view. Uploads remains `tab=uploads` over the same durable `media_assets` identity.
- All / Images / Videos, `q` search, Favorites, Collections, sort and pagination remain URL/server-owned in production.
- Upload button and desktop drop remain Uploads-only; picker remains the keyboard/touch/mobile baseline.
- Uploaded and generated media retain the same opaque durable identity.
- Selection is current-page transient state. Existing Organize/Delete semantics remain unchanged and selection resets on server-view changes.
- Card activation opens Viewer. No hover-only product actions are introduced.
- UI-070 card/selection contract remains binding, including the maintained 44×44 checkbox root and 22×22 visible indicator.
- Viewer media-primary hierarchy, capability-derived actions and native video controls remain unchanged.
- No third Library section, client-owned global media store, fake capability or product-symmetry action.

## Interaction-reference matrix — 2026-09-12

References are used for interaction grammar, not visual styling.

| Reference | Useful grammar | RenderLab adaptation | Explicitly not copied |
| --- | --- | --- | --- |
| Midjourney Organize / Folders | Search, view/filter controls and media feed stay spatially adjacent; multi-selection causes bulk actions to appear | Keep source/search/filter commands compact beside the media field; reveal Organize/Delete only in selection mode | Midjourney visual skin, icon language, masonry specifics, product capabilities |
| Runway Assets | Durable asset categories/folders remain understandable; search and filters belong to the asset workspace; multi-select supports organization | Preserve Creatives/Uploads and Collections while reducing stacked toolbar height | Runway sidebar/navigation skin, asset taxonomy or capabilities |
| Adobe Firefly Favorites | Favorites read as a narrow retrieval mode rather than a new destination | Keep Favorites a compact Library filter | Firefly page composition or brand treatment |

## Concept set

The prototype intentionally contains three materially different same-family compositions. They share product behavior, media cards, brand atmosphere and accessibility targets.

### A — Gallery Rail

A single compact command rail sits immediately above the media field. Source switch, search and high-frequency filters occupy one horizontal instrument on desktop. Lower-priority context sits in a thin foot line. On 390px the same controls wrap into a compact sequence without becoming separate card panels.

Hypothesis: best balance of obviousness and media dominance. Closest to Create's “one primary instrument, flat labelled controls” grammar without making Library look like Create.

Risk: too many inline controls can become horizontally dense at intermediate widths.

### B — Index Strip

The command layer becomes a thin editorial index: source tabs on the first line, search opposite, then a border-separated filter line. Enclosure is intentionally minimal. Media begins almost directly beneath the index.

Hypothesis: strongest media-first reading and strongest continuity with Landing's editorial/technical hierarchy.

Risk: reduced enclosure can make first-time command grouping feel less obvious than Gallery Rail.

### C — Media Ledger

Desktop uses a narrow route-local index column beside a much larger media field. This is not application navigation and does not replace the horizontal app header. Search, source, filters and Select become a compact local index; media occupies the remaining width. At 390px the index collapses into a compact control block above media with no persistent bottom navigation.

Hypothesis: clearest separation of retrieval controls from media while preserving a large uninterrupted field.

Risk: a local side index can drift toward dashboard/sidebar grammar if its visual weight becomes too strong. The prototype therefore keeps it narrow, low-contrast and route-local.

## Shared state model in the prototype

Each concept is rendered through query parameters:

- `?concept=gallery|index|ledger`
- `&state=default|uploads|search|selection`

All concepts cover:

- default Creatives;
- Uploads with truthful Upload and desktop-drop copy;
- active search/filter state;
- selection/batch state with 44×44 targets and contextual Organize/Delete/Cancel surface;
- desktop and 390px layouts;
- keyboard-visible focus;
- `prefers-reduced-motion` fallback.

The static prototype is a design simulation only. Buttons do not call production APIs and no product state is persisted.

## Interaction choreography

Ordinary commands remain stationary. The only signature transition in this R&D slice is selection emergence:

1. Select activates current-page selection targets in place without moving the media grid.
2. A contextual action rail enters from the lower edge and reports the selected count.
3. Card selection changes only the card boundary/checkbox state; media position and scale do not reflow.
4. Cancel removes the contextual rail and selection targets.

This transition is intended to reinforce mode change without turning persistent navigation into motion. Browser verification must capture timed frames of the selection-rail entry. Under reduced motion, the rail appears essentially immediately and card hover lift is disabled.

## Review criteria

A concept is not approval-ready unless browser evidence proves:

- first-row media appears materially earlier than the current baseline on desktop and 390px;
- source/search/filter/select remain discoverable without hover;
- Upload appears only in Uploads state;
- no horizontal overflow at 1440px or 390px;
- essential touch targets remain at least 44px;
- selection indicator root is at least 44×44 with a 22×22 visible control;
- selection actions do not occupy persistent vertical space outside selection mode;
- keyboard focus is visible;
- reduced-motion removes nonessential transforms/entry animation;
- no desktop application rail and no fixed mobile navigation dock appear;
- all three concepts remain visibly part of the approved Create/Landing family rather than generic glass SaaS dashboards.

## Approval / implementation boundary

No concept in this record is approved merely because it is coded or passes the R&D verifier. Repository-backed screenshots/temporal evidence must be human-reviewed. Only explicit user approval can select a direction. A separate bounded implementation contract/tracker must then translate the approved design into production `/library` code with functional QA and visual-fidelity QA kept separate.

Production deployment remains separately explicit and automatic Git → Vercel deployment remains disabled.