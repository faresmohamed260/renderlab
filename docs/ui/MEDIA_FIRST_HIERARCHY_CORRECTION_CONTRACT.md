# UI-082 — Media-first Hierarchy & Whole-site Legibility Correction

**Status:** Checkpoint 5 complete / checkpoint 6 next
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

**Checkpoint 2 verification — 2026-09-20:** exact source head `a9d80dce2f1c78f09cbe08537b5ef2108b08344b` passed all 19 attached workflows after one same-head retry of Library History recovered from a transient configured-session `401 authentication_required`; no implementation change was needed. Media Viewer Register Fold run `35530109364` passed the deterministic long-prompt, Source Fold, native video, touch, reduced-motion and no-overflow assertions. Artifact `10611305473` (`sha256:9d493fc6e057fb9c10d36dc7a121d5b746dac2a12ddcc176c0fb04910d851337`) was human-reviewed at 1440px, 1920px and 390px: media is the first strong object, prompt content is bounded and no longer controls H1 height, wide space is used intentionally, and quick actions remain attached to asset context. Checkpoint 3 is now the next runtime checkpoint; production is unchanged.

### Checkpoint 3 — Activity + Library
- Activity: cap prompt-summary dominance, strengthen state/time/action hierarchy, preserve 01/02/03 chronology and History Register;
- Library: audit command-rail density and title/control balance; make only evidence-backed reductions that keep media primary;
- desktop + `390px` + reduced-motion evidence as applicable;
- update docs before moving on.

**Checkpoint 4B verification — 2026-09-21:** exact implementation head `700cc89e9d61063817208eabf76dfe48fe83cd6c` passed Account/Admin Operations `35544269607` and configured Account Profile Credential `35544753703`. The account run completed profile, credential, preferences and exact fixture cleanup; artifacts `10616291853` (`sha256:1af4bbfc1eabb0453a3bd9ed0fa8280d3b0f94a77532b4ce547fcb5feea4a197`) and `10616496595` (`sha256:50c6107a3869d834124c50aeb9682ca57fd6b3088d2a93ffaefb603873b3ab5c`) were human-reviewed across desktop, 390px and reduced-motion evidence with no reproduced defect, so Settings/Profile/Preferences remain pixel-unchanged. Admin artifact `10615716556` (`sha256:7922b507a83e6697873552ba86ae3c8995a5454e0afd3e2f7bca8f88c79c48d5`) was reviewed after the bounded microtype correction; user ID/identity metadata, self badge, metric labels and diagnostic titles now meet the 10px floor while the 01/02/03 structure and privileged product/security semantics are unchanged.

**Checkpoint 4C verification — 2026-09-21:** Brand / Launch `35544269610` / artifact `10616680057` (`sha256:deeac330f648f0bcf8fae593feb7b57440293fc08c8ce4369d0f2e8d61b3d8d3`) and UI Shell `35544269606` / artifact `10615634368` (`sha256:9919e862f62ba5ba3d592a2396b6d703d8cc400b5d44707dd84d8c4de11d4018`) passed on `700cc89e9d61063817208eabf76dfe48fe83cd6c`. Desktop/mobile rendered review found no Landing or shell defect requiring a source change. Locked brand geometry, canonical quarter-circle, application navigation and UI-074 responsive shell remain unchanged. Checkpoint 4 is complete; checkpoint 5 now owns whole-product acceptance.

**Checkpoint 4A verification — 2026-09-21:** Create keeps the approved Clear Composer composition. Essential active-lifecycle and persisted-result registration labels were the only reproduced Create microtype defects and now meet the 10px floor. Exact implementation head `b174eba5be1ec37c548f6f349e71d1cc0ea279c6` passed all nine attached workflows. Create Clear Composer Visual `35543744625` / artifact `10615174763` (`sha256:9611a0cd6eedacf08a0f2ab9e7b4199f947f460ba8686e6aeb7b1b7957d40670`) and Create Lifecycle Visual `35543744613` / artifact `10616030332` (`sha256:0b64377356df061af957aeeda89dc3087870fbd8474c76069dae95d8091f3260`) were human-reviewed across desktop, 390px, reduced-motion, active-generation and persisted-result evidence with no hierarchy, overflow, touch-target or semantics regression. Checkpoint 4B now owns account-family verification and Admin.

**Checkpoint 3 verification — 2026-09-20:** exact source head `f6245c3953d7517d0b40011893135d4a2ac0028f` passed all 18 attached workflows after the prior head's sole whitespace-audit failure was corrected without runtime change. Activity Visual `35531996901` / artifact `10611591672` (`sha256:4f1fd684ee6518315a93dda67622dc978a8232d6d3eb090469b23cfe8ac05b61`) was human-reviewed at desktop and 390px reduced motion: the deliberately long request summary is bounded and no longer participates in heading hierarchy, while lifecycle state, timestamp, operation and actions remain scannable. Library History Visual `35531996914` / artifact `10611526669` (`sha256:91e24628af5bd7af4d322d7d0a965ca8c5b16f7972367a9b79d4b31cbc12914c`) was human-reviewed across desktop, selection/reduced-motion and 390px: media remains primary, the command rail is slightly less visually dominant, controls remain complete/reachable and no overflow or selection-origin regression is present. Job Matrix chronology/lifecycle semantics and Library query/filter/selection/media semantics are unchanged. PR #308 squash-merged as `058b8d10b0dcbfc93e47657a2c6ed0cea4c2c7e1`; merged-main Engineering Quality `35543303501`, UI Shell Validation `35543303489`, Activity Cancel Visual `35543303603`, Creative Iteration `35543303491`, and Image Upscale Integration `35543303495` all passed. Checkpoint 4 is next; production is unchanged.

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

**Checkpoint 5 verification — 2026-09-21:** exact candidate `c194ae299f0bdee2243c54eb2be00612c86f03e2` passed every workflow GitHub attached to PR #310: Engineering Quality `35545111587`, Brand / Launch Visual `35545111542`, Account Identity Visual `35545111615`, Create Clear Composer Visual `35545111611`, Activity Cancel Visual `35545111592`, Integrated Release `35545111555`, Account/Admin Operations `35545111584`, UI Shell Validation `35545111605`, Create Lifecycle Visual `35545111606`, and Activity Visual `35545111569`. Dedicated Media Viewer Register Fold `35545120954` / artifact `10616312242` (`sha256:026a06d1585537b4beaedaf31d557b9a334420af18a2631f18a516f490a5de89`) passed the same-SHA 1440px/wide/390px long-prompt acceptance. Release Candidate Matrix `35545344706` passed all 23 configured child workflows and published manifest artifact `10615743591` (`sha256:699ee1de823e3f0f6355fa3095a2114cb43651bd6614800ef6d55e5e25a68cee`). Exact-candidate rendered review covered Landing, AppShell, Create, Library, Viewer, Activity, Settings/account and Admin using Brand / Launch `35545111542` / artifact `10616292213` (`sha256:47b2403535695f872bc9ef1dc95dcedf73bd28c2c047c237eb284134557cc342`), UI Shell `35545111605` / artifact `10616302419` (`sha256:4eb2ff9c8c8fbf5f9ab63ce17903cd2038e8773ac75ab89b5d7a7d2a13d06b05`), Create Lifecycle `35545111606` / artifact `10616137801` (`sha256:22323e751a907513aa3a0efe6fb5bc594d026b8a78f24d4737cd429cedcb7b25`), Library History `35545393522` / artifact `10616731894` (`sha256:80f8ede3b749a09db958fc4159c5b993d4c7ed48edaa32d2aab0f6d28c0c854d`), Activity Visual `35545111569` / artifact `10616502062` (`sha256:83423c7e8ce0587005eea8513136410b42331f358eb6d28309b4a2a5c3b87dee`), Account Identity `35545111615` / artifact `10615832262` (`sha256:b31b946e3da82c318f8c6a9df0e224cf90177012bb2c544bf63cab9cc6288b6d`) and Account/Admin Operations `35545111584` / artifact `10616442086` (`sha256:cb4fa83fee599346095a56a6efefbb3d8b281fbfbf643861f14bedd479fd0c0f`); desktop, 390px and changed-path reduced-motion states showed no prompt-as-title recurrence, horizontal overflow, action-reachability defect, accidental visual flattening or essential-text regression. No reusable component state changed, so `COMPONENT_CATALOG.md` was intentionally not modified. Checkpoint 6 now owns merge and production.

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
