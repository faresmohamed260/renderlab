# UI-082 — Media-first Hierarchy & Whole-site Legibility Correction

**Status:** Planning checkpoint complete / implementation pending  
**Tracker:** #305  
**Baseline main:** `5f1df1c364bf5aca0a47fd964bd3dd21714f22a7`  
**Current production application source:** `c00664d9d88c09bd4a6794ad1ad5fbe7ce662e8a`  
**Work mode:** Authorized Redesign Mode for application visual hierarchy, spacing, typography, density and presentation chrome  
**Deployment:** User-authorized only after all checkpoints, exact-head acceptance, rendered review, merge and merged-main verification

## Why this cycle exists

Direct production review of Media Viewer exposed a concrete hierarchy failure: a long generation prompt can become the dominant page headline, consuming the first viewport while the durable media result is pushed below it. The same implementation simultaneously constrains the useful content column on wide desktop, duplicates prompt content in attached result/register treatment, uses multiple nested registration/border layers, strands Favorite/Download relative to the media object, and jumps from oversized prompt/title typography to very small technical microtype.

The user explicitly requested that these issues be documented, planned and corrected across the entire site, with work performed in small checkpoints, repository documentation updated after every checkpoint, rendered review before release and production deployment after completion.

This cycle does **not** assume every route needs the same pixel change. It audits every current route against the same hierarchy and legibility principles and changes only surfaces where the problem reproduces.

## Evidence baseline

- Production complete-user-journey run `35440027637`, artifact `10583333354`, digest `sha256:4e6208f8a223fb68c8eccc6a327fdb65e377075222729da60beb2128fad0b227`, supplies current production desktop/mobile screenshots for Landing, Create, Library, Viewer, Activity and account surfaces.
- The current Viewer implementation uses `assetTitle(asset)`, whose fallback includes the full prompt, as the H1. CSS allows a prompt-derived title up to `860px` at `clamp(25px, 3vw, 34px)` with unrestricted wrapping on desktop.
- The same Viewer separately exposes Prompt in the attached register, so a prompt-derived H1 and the Prompt disclosure represent the same content at two hierarchy levels.
- Current Viewer stage/register geometry remains product-correct and responsive; the correction is about hierarchy, allocation of space, chrome density and legibility, not media ownership or action semantics.

## User-approved design direction

The design direction accepted by the user's follow-up is:

1. **Media is the hero.** Generated/uploaded media is the first strong focal object on media-centric surfaces.
2. **Prompt is metadata, not a page title.** Prompt text is readable and copyable but must not determine first-viewport height.
3. **Use wide desktop space intentionally.** Large displays should not force text into narrow columns while leaving major unused regions.
4. **One canonical presentation per fact.** Avoid showing the same prompt/title as both a hero and a metadata strip.
5. **Reduce chrome layers.** Registration lines, borders and diagnostic labels are accents; they do not all need equal visual weight.
6. **Keep actions attached to the object they affect.** Quick media actions sit with Viewer context/media controls; continuation actions read as the next workflow.
7. **Normalize typography.** Application text should have a readable floor; expressive headings must not overpower product content.
8. **Preserve surface-specific expressiveness.** Landing/Create/Library/Viewer may remain more expressive than Settings/Admin. Cohesion does not mean flattening every route into one template.

## Locked / unchanged product boundaries

This cycle changes presentation only unless a later checkpoint explicitly documents a separately approved product change. It must not alter:

- route hierarchy or destinations;
- generation capability/model/workflow resolution;
- Activity lifecycle truth or Retry / Run Again / Cancel eligibility;
- durable media identity, Favorite, Collections, Rename, Download, Delete, Compare Source, Reuse Settings or Upscale semantics;
- account identity, admission, role, MFA, sessions, email/profile/preferences, export/deletion or Admin authorization semantics;
- Supabase schema/RLS/Auth configuration;
- R2 storage contracts;
- provider/worker routing or credentials;
- deployment configuration or automatic Git deployment;
- locked `RenderLabBrand` geometry;
- Landing canonical quarter-circle geometry and truthful Closed Beta messaging.

## Whole-site audit matrix

| Surface | Current finding | Planned treatment |
|---|---|---|
| Landing `/` | Media-first composition is intentional and current evidence does not reproduce the Viewer failure. | Audit typography/readability and responsive rhythm only. Preserve four-section Lab Matrix composition and locked brand geometry unless new evidence demonstrates a defect. |
| Application shell | Compact horizontal shell is appropriately subordinate in current evidence. | Preserve geometry by default. Change only if a downstream checkpoint demonstrates action/context collision or legibility failure. |
| Create `/create` | Primary task hierarchy is substantially correct: task heading → truthful stage → composer. Some technical microtype is near the readability floor. | Preserve Clear Composer geometry and result/generation truth. Audit microtype floor, large-display space use and excess decorative registration only. |
| Library `/library` | Media grid is already visually primary. Command rail is comparatively dense/heavy. | Keep media-card semantics and URL/server state. Reduce avoidable rail/chrome weight only if rendered comparison improves media emphasis without hurting scanability. |
| Viewer `/library/[assetId]` | **Severe.** Prompt-derived H1 can dominate first viewport; media starts too low on long prompts; prompt is duplicated; quick actions feel detached; stage has many equal-weight chrome layers; micro labels are very small. | First implementation checkpoint. Introduce stable contextual page title/asset label, move prompt to one canonical compact disclosure/summary, bring media stage immediately into the first viewport, widen useful desktop composition, attach quick actions to context/media, reduce registration weight and raise legibility floor. Preserve Source Fold and all durable actions. |
| Activity `/activity` | **Moderate.** Prompt is used as the dominant job headline and can become oversized; utility surface spends disproportionate height on copy rather than state/action. | Reduce prompt headline dominance, bound/clamp summary presentation, strengthen status/time/action scan path, preserve Job Matrix chronology and truthful lifecycle semantics. |
| Settings `/settings` | Structure is appropriate, but dense helper/microtype can become tiring. | Preserve Trust Register. Improve minimum text size/line-height and action/value scanability without adding spectacle or hiding information. |
| Profile / Preferences | Composition is appropriately subordinate but shares account microtype/density. | Apply only account-family readability/rhythm corrections proven by Settings review. |
| Admin `/admin` | Structure correctly inherits Settings; dense technical text is intentionally compact but some microcopy is below preferred readability floor. | Preserve 01/02/03 register and all controls. Raise legibility floor and spacing only where it does not reduce operational density or cause overflow. |

## Typography / hierarchy targets

These are acceptance targets, not arbitrary global CSS overrides:

- ordinary body/helper text: generally `13–16px` depending on density;
- ordinary controls/actions: generally `13–15px`;
- technical micro labels: target `10–12px`; avoid new 8–9px essential text;
- utility/screen headings: usually `28–44px` depending on surface, but content-derived text such as prompts must not become unbounded hero headings;
- prompt/details copy: readable body scale with bounded line length and expansion where needed;
- no essential metadata may depend on low-contrast microtype alone.

## Checkpoint plan

### Checkpoint 1 — Planning and audit
- merge this contract and UI-082 decision before runtime source changes;
- document production evidence, route-by-route findings and locked boundaries;
- no production pixels change.

### Checkpoint 2 — Viewer hierarchy correction
- make durable media visible in the first desktop viewport even with a deliberately long prompt;
- remove prompt-derived H1 behavior;
- keep one canonical Prompt surface with bounded default presentation and full accessible expansion;
- place Favorite/Download with clear asset context;
- simplify equal-weight registration/chrome while keeping RenderLab identity;
- keep Source Fold, native video, continuation, Manage and Compare behavior unchanged;
- add deterministic desktop `1440px`, wide desktop, `390px`, long-prompt, reduced-motion and comparison evidence;
- update UI decision, migration tracker and screen registry before moving on.

### Checkpoint 3 — Activity + Library
- Activity: cap prompt-summary dominance, strengthen state/time/action hierarchy, preserve 01/02/03 chronology and History Register;
- Library: audit command-rail density and title/control balance; make only evidence-backed reductions that keep media primary;
- desktop + `390px` + reduced-motion evidence as applicable;
- update docs before moving on.

### Checkpoint 4 — Create + account family + Admin
- Create: audit legibility floor and decorative chrome without changing Clear Composer task flow;
- Settings/Profile/Preferences: improve reading rhythm and microtype while preserving Trust Register/subordinate page grammar;
- Admin: apply only compatible readability corrections while preserving dense operational semantics;
- audit Landing and shell; change only demonstrated defects;
- update docs before moving on.

### Checkpoint 5 — Whole-product acceptance
- exact final implementation head passes Engineering Quality, UI Shell and every attached affected workflow;
- configured feature workflows retain substantive product/security assertions;
- cross-route desktop + `390px` screenshots are reviewed for hierarchy, overflow, text scale, action reachability and accidental drift;
- reduced-motion review covers every changed temporal path;
- add regression checks for long prompt / prompt-as-title behavior and no horizontal overflow;
- update PROJECT, UI_MIGRATION, UI_DECISIONS, SCREEN_REGISTRY and COMPONENT_CATALOG only if reusable component state changed.

### Checkpoint 6 — Merge and production
- merge only verified exact implementation head;
- verify every workflow GitHub attaches to merged `main`;
- run guarded production deployment from the exact accepted source;
- explicitly move `renderlab.faresuniform.uk` only after READY deployment;
- smoke root/Create/Library/representative Viewer/Activity/Settings/Profile/Preferences/Admin-access boundary as supported by the existing rollout workflow;
- inspect bounded runtime errors/logs;
- run Production Documentation Sync with the exact deployed SHA;
- repository closure is complete only after production documentation authorities agree.

## Review standard

A checkpoint is not accepted because it compiles. Review the actual rendered result and reject it if:

- the prompt again becomes the page's primary visual object;
- media is pushed below nonessential text on a normal desktop viewport;
- wide desktop space remains materially unused while content is cramped;
- essential controls look detached from the object they affect;
- a decorative register/border layer competes with the media;
- essential labels rely on unreadably small type;
- responsive fixes merely hide information or create horizontal overflow;
- a surface is made visually identical to another at the expense of its intended expressiveness level.

## Documentation discipline

After every checkpoint, record verified reality in the existing authoritative documents. Do not mark later checkpoints complete in advance. Temporary implementation notes belong in PR/issue history; durable visual rules, screen state and release evidence belong in repository documentation.
