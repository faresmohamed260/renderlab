# Screen Registry

Tracks approved product surfaces and actual route/status/component composition.

## Statuses
- `PLANNED` — approved surface, not yet implemented beyond temporary scaffolding
- `UNAUDITED` — implementation exists but has not been audited
- `MIGRATING` — implementation is actively being brought to the approved RenderLab design
- `APPROVED` — rendered implementation has been reviewed and approved
- `LOCKED` — approved surface whose established design should not change without explicit product reason

## Initial Information Architecture
Primary: **Create**, **Library**. Utility: **Activity**, **Settings**. Contextual: **Media Viewer**.

Models, Workflows, separate Image/Video apps, separate Edit/Animate/Upscale apps and ComfyUI graph/node surfaces are not top-level destinations by default. Cycle 2 includes the privileged Admin surface at `/admin` under UI-051. The public **Brand / Landing** remains `/` and the authoritative Create workspace remains `/create`; UI-052 established that route boundary in PR #73, while the current approved four-section Lab Matrix Landing redesign is merged through PR #174 / `1dc04f68d059a9f7d903c8313fe2e690aeec9d0e`. Admin stays out of ordinary shell navigation and remains reachable contextually from Settings only for an active admin.

## Application Shell
**Status:** APPROVED  
**Implementation:** `src/components/shell/app-shell.tsx`

Approved behavior:
- compact fixed horizontal application header across desktop and narrow layouts;
- RenderLab/Create identity at the left with Library plus Activity/Settings-account access at the right;
- no persistent desktop left rail and no fixed mobile bottom dock under UI-074;
- feature surfaces own route content, not the shell;
- navigation destinations and route hierarchy remain unchanged;
- keyboard/touch-friendly semantic navigation with reduced-motion equivalence.

`APPROVED` does not mean `LOCKED`.

**Phase 23 / UI-074 fidelity correction — merged / verified:** PR #188 restored the approved compact horizontal application header across application routes and removed the persistent desktop rail / fixed mobile dock. User-approved implementation head `c786a17fa3a3c7f76dba5a64cb7822926749c1a2` and documentation-final head `b6a2590875432ba75c28db9e0f4b465133e1873c` passed their complete attached suites; PR #188 squash-merged as `3f0d21ed55554b3c48791d35dd17cb6005212076`. Merged-main UI Shell `34684825448` passed. Production remains unchanged until a separately authorized deployment.

## Screens

### Brand / Landing
**Route:** `/`
**Status:** APPROVED — Lab Matrix redesign merged and production-live
**Implementation:** `src/app/page.tsx`, `src/features/landing/landing-experience.tsx`, `src/features/landing/landing-experience.module.css`, `src/components/brand/renderlab-brand.tsx`, `src/app/opengraph-image.tsx`
**Design / implementation authority:** `docs/ui/LANDING_BRAND_RD.md`, `docs/ui/LANDING_IMPLEMENTATION_CONTRACT.md`, `docs/ui/LANDING_MEDIA_SOURCES.md`

**Purpose:** Public product home for verified RenderLab capability and truthful invitation-only Closed Beta access without application-shell chrome or public self-admission.

**Approved composition:** one continuous four-section sequence — **Hero / Lab Matrix → One creative thread → Living Library → Resolve to Create**. The page uses the locked Lab Grid identity as the visual grammar, keeps media dominant, supports bounded pointer/scroll choreography on capable desktop input, deliberately adapts the composition for 390px/touch, and provides a complete static `prefers-reduced-motion` equivalent.

**Verified behavior:** `/` renders without `AppShell`; `/create` and application routes use the `(app)` shell; `Open Create` → `/create`; `Sign in` → `/settings`; legacy root continuation preserves the complete query into `/create`; Closed Beta / invitation-only / no-public-sign-up truth remains explicit; forbidden pricing/testimonial/fake-metric/provider/model/SLA/public-admission claims remain absent. The implementation uses the existing Motion for React runtime, maintained `Button` primitives and locked `RenderLabBrand`; no GSAP, Lenis, Three.js/WebGL or new animation runtime was added.

**Locked geometry:** the Hero and Resolve lower-right Lab Grid media module is the canonical **quarter-circle / large outer arc**, not a rounded rectangle. Its repository-owned source path is `M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z`, shared through the Landing mask and test-enforced by Brand / Launch Visual. The locked RenderLab logo/wordmark must not be reinterpreted.

**Approval evidence:** final exact implementation head `a7f94b77bf1be989c0101376aa0404cbb28b34ae` passed all eight attached workflows: Engineering Quality `34539565814`, Create Durable Upload `34539565867`, Account Ownership `34539565817`, UI Shell `34539565835`, Brand / Launch Visual `34539565857`, Integrated Release `34539565832`, Library Lifecycle `34539565822`, and Release Candidate Matrix `34539565841`. Brand / Launch artifact `10176777155` (`sha256:249575e790be67219927ccefb6edef00efaf6aedc5694a95f2ed62f4aef48e38`) was reviewed clean. PR #174 merged as `1dc04f68d059a9f7d903c8313fe2e690aeec9d0e`; merged-main Engineering Quality `34540955036`, Integrated Release `34540955056`, exact-main UI Shell `34541063502` and exact-main Brand / Launch Visual `34541065002` passed. PR #175 records the repository closure. Production rollout on 2026-09-11 deployed current `main` source `0173c4c5ba08360b6352331118abc81978cfa774` as READY Vercel deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; explicit alias run `34547608773` then moved `renderlab.faresuniform.uk` to that deployment and passed root plus `/create`, `/library`, `/activity` and `/settings` smoke. Independent Vercel post-rollout checks found no runtime-error clusters and no error/fatal logs. `PROJECT.md` remains authoritative for the current production pointer.

**Do not change:** Do not alter the locked mark/wordmark or canonical quarter-circle geometry; materially reinterpret the accepted four-section visual grammar; add public registration/waitlist, pricing/testimonials/fake metrics, provider/model/SLA claims, analytics marketing cookies, fabricated generation state or public-admission behavior without a new explicit decision and the normal design/validation gates.

### Create
**Route:** `/create`
**Status:** APPROVED  
**Implementation:** `src/features/create/create-workspace.tsx`  
**Supporting:** `src/features/create/create-advanced-panel.tsx`  
**Design artifacts:** `design/penpot/create-v0.2-desktop.svg`, `design/penpot/create-v0.2-mobile.svg`, `design/penpot/create-v0.2-runtime-states.svg`, `design/penpot/create-v0.3-advanced.svg`
**Phase 23 design authority:** `design/rd/create-usability-first-v05.md`, `docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md`; fidelity correction PR #188 is merged to `main` as `3f0d21ed55554b3c48791d35dd17cb6005212076` and the corrected Clear Composer/UI-074 shell is the repository-authoritative Create surface. Production remains on the prior deployed source until a separately authorized rollout.

**Purpose:** Start and continue creative operations from one task-oriented workspace.

**Approved operations:** Create Image, Edit Image, Create Video, Animate Image.

**Verified behavior:**
- prompt + Image/Video output intent;
- Video output includes contextual Audio on/off, default ON, carried through the validated generation contract as `output.audioEnabled`;
- Video output includes contextual **Resolution** with exact `480p`, `720p`, `1080p`, `2K` choices, default `480p`, hidden/rejected `4K`, and server-normalized/persisted `output.resolution`;
- PNG/JPEG/WebP user reference input up to 25 MB;
- UI-069 adds optional desktop file drag/drop onto the Create composer for one reference image through the exact same durable upload/validation transaction as the maintained file picker; the picker remains the keyboard/touch/mobile baseline and no second upload path exists;
- signed-R2 persistent upload promoted to an owner-scoped durable `media_asset` before generation;
- newly uploaded Create references remain ordinary Library media even if Generate is never pressed;
- generation binds newly uploaded references through opaque `media-asset` identity rather than exposing R2/storage identity;
- reference preview/removal/replacement;
- Image + reference → Edit; Video + reference → Animate;
- RenderLab `generation_jobs` + durable `media_assets` persistence;
- capability-derived Edit/Animate continuation from durable images;
- Advanced controls from verified capability definitions;
- UI-061 gives Image and Video the same dedicated compact Advanced disclosure; Video settings contain Resolution / Duration / Audio only, and the 390px primary control cluster stays on one no-wrap row while Generate remains the separate primary action;
- UI-043 purposeful Create spatial continuity for operation/context changes, reference add/remove/reorder, contextual Image↔Video controls, Advanced field changes and result arrival, with static reduced-motion behavior;
- complete configured browser lifecycle `33031817744`;
- uploaded-media continuation preserves uploaded display identity;
- UI-030 keeps prompt/settings draftable while signed out, but generation/reference upload and other persistent actions require a verified non-anonymous account;
- signed-in generation jobs, reference/media inputs and persisted outputs remain within the verified account owner boundary;
- UI-051 Phase 10C applies the shared transactional generation-admission boundary after request/input preflight and before backend/provider dispatch; Create preserves the draft and shows sanitized product-level disabled/limit feedback without exposing infrastructure detail.

**Phase 7 Create v2 extension:** the durable Create-upload foundation is implemented/verified through PR #46; source-aware `Original` geometry and curated fixed ratios through PR #47 (`de50efe6ba462ec604ea2cace741e11904a62425`); composer hierarchy/de-crowding through PR #49 (`d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`); stable `@imageN` addressing through PR #51 (`7afe257b069e74d322d8f83c1a0868a30acd3686`); and bounded two-image reference exposure/reorder/count/role enforcement through UI-046 / PR #53 (`0286b18802fc3d766d9d09e2ba8ed9a494eabd08`). Phase 7C live audit `33266905978` is complete and UI-047 deliberately defers Director productization because the deployed worker has no structured Director fields. Phase 7D Video Resolution is implemented/verified under UI-048 at exact code/test head `594ad7eb39a9d5eec1d2f0283ac6e327f86129b3`: exact 480p/720p/1080p/2K choices with 480p default, canonical persisted resolution, Video Steps/Guidance removal/rejection, responsive/reduced-motion menu review and the four-case live Video matrix all passed; Video Generation `33270777081` produced `854×480`, `1920×1080`, `720×1280` and `2304×1152` outputs for the accepted cases. The deliberate premium interaction/motion pass under UI-043 is verified at exact head `51c293dad114c98754933ab192b13427a90d9570`: UI Shell `33273370797`, configured Create Lifecycle `33273370720` and the complete 19-workflow affected suite passed; reference reorder motion and static reduced-motion behavior were exercised and responsive artifacts reviewed clean. Phase 7 Create v2 exit criteria are complete, while existing approved Create/reference/Resolution behavior remains authoritative.

**Post-Cycle 3 UI-061 correction:** Advanced discovery is mode-consistent: the dedicated compact ellipsis control opens the existing `CreateAdvancedPanel` in both Image and Video, while Video's contextual dropdown owns only Resolution / Duration / Audio. Narrow Create chrome is compacted without changing generation capability. Final exact head `4334d76cfaf112c11ba87e961de565673551d500` passed all 11 attached workflows; Create Lifecycle `34073557139` / artifact `10001298383` verified and human review confirmed the 390px Image/Video primary controls stay on one row without horizontal overflow. PR #118 merged as `ea88425554a39ab904c56bbeed51ac396e0bfb38`.

**UI-030 evidence:** exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Create Lifecycle `33131090243`, Generation Integration `33131090251`, Video Generation Integration `33131090262` and Account Ownership `33131090207`. Desktop/mobile generated-result artifacts were visually reviewed without unintended Create hierarchy drift.

**UI-036 / PR #37 audio evidence:** final exact head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates, including Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676` and UI Shell `33239584665`. Audio OFF is verified for Create Video, Audio ON for Animate Image, persisted request parameters retain the choice, Image requests reject the Video-only field, and the mobile essential-control row keeps Audio/duration/Advanced/Generate reachable. PR #37 merged as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.

**Phase 23 / UI-073 verified candidate:** The approved Clear Composer keeps one stable `Create an image` / `Create a video` workspace heading, promotes the maintained Image/Video choice, labels Add reference / Start image, names attached roles Primary image / Reference image / Start image, keeps prompt and Generate visually dominant, and places truthful generation/media-first result composition above the persistent composer. The production candidate retains existing model/aspect/video/Advanced controls, durable upload identity, `@imageN` aliases, one-source Video/two-source Image limits, native video playback and capability-derived continuation. Landing-derived 64px Lab Matrix registration, cool/warm atmosphere, precise rules and quarter-arc media framing are Create-owned presentation; depth remains media-only. On 390px, stage/result context compacts and continuation actions stay above the fixed mobile dock. Final implementation-verification head `e46d9383dc74878713d0ec4f47aaf6383b266c21` passed Engineering Quality `34639132519`, Clear Composer Visual `34639132478`, configured Create Lifecycle `34639132510`, corrected Account/Admin Operations `34639132466` and Release Candidate Matrix `34639132431` with 23/23 exact-SHA children successful. PR #185 squash-merged as `d360f60afeca0b6c417ff1c12dec3c7e922c20f7` from final exact head `428cbd025d9f314f5b8d1582fd6911f1abd5094b`; merged-main Release Candidate Matrix `34645636285` passed all 23 exact-SHA children. Repository `main` now carries Clear Composer, while production remains on the prior deployed source until an explicitly authorized rollout.

**Phase 23 fidelity correction closure — 2026-09-12:** PR #188 restored the approved 900px authoring / 1120px result widths, mode-before-composer order, visible `PROMPT`, reference-before-prompt grammar, flat labelled settings footer, stable high-contrast Generate, attached Advanced, truthful registration-framed generating stage and asymmetric media-first result rail while preserving all Create product contracts. User-approved implementation head `c786a17fa3a3c7f76dba5a64cb7822926749c1a2` produced accepted artifacts `10293387664` and `10293653778`; documentation-final head `b6a2590875432ba75c28db9e0f4b465133e1873c` passed all 16 attached workflows. PR #188 squash-merged as `3f0d21ed55554b3c48791d35dd17cb6005212076`, and all five merged-main workflows passed, including unchanged Creative Iteration retry after a transient Supabase 504. Production remains unchanged and deployment remains separately explicit.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED — Gallery Rail v0.3 / UI-075 with existing durable-media discovery, upload, Favorites, Collections, Delete and page-scoped batch organization contracts
**Implementation:** `src/features/library/library-view.tsx`  
**Collection management:** `src/features/library/library-collection-menu.tsx`, `src/features/library/library-collection-manager.tsx`
**Batch selection:** `src/features/library/library-batch-selection.tsx`
**Sort control:** `src/features/library/library-sort-toggle.tsx`
**Persistent upload interactions:** `src/features/library/library-upload-button.tsx`, `src/features/library/library-drop-upload-surface.tsx`  
**Shared browser upload transaction:** `src/features/library/library-upload-client.ts`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `POST /api/media/assets/batch-delete`, `POST /api/media/assets/batch-favorite`, `GET|POST /api/media/collections`, `PATCH|DELETE /api/media/collections/[collectionId]`, single-asset collection membership routes, `POST /api/media/collections/[collectionId]/items/batch`, media-upload ticket/completion routes
**Approved design artifacts:** `design/penpot/library-v0.1.svg`, `design/penpot/library-v0.2-upload.svg`
**Phase 24 redesign:** APPROVED / IMPLEMENTED / VERIFIED / MERGED / NOT DEPLOYED. Authority: Gallery Rail v0.3 R&D head `ba842e919305e07262ae95c81b3c2063a455b54d`, artifact `10296866215`; production contract: `docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md`; definitive implementation head `d0a6f66937986ace109e301913f17410a8e95548`; PR #194 merge `af88b93dcb4fcbca502b42f9ea1186192af48a6a`. The fresh 13-workflow exact-head acceptance set and both workflows attached to merged main passed; production remains on the prior deployed source until separately authorized.

**Purpose:** Find, inspect, reuse and continue from durable RenderLab media. Library is a reusable creative-asset workspace, not merely generation history.

**Approved behavior:**
- unified durable `media_assets` browsing with canonical newest-first default;
- explicit URL-owned `Newest first / Oldest first` ordering via `sort`, exposed as one direct toggle with deterministic server ordering by `created_at` + `id` in matching direction;
- `All / Images / Videos` URL-owned kind filter;
- UI-069 keeps Creatives/Uploads sections and All/Images/Videos filtering URL/server-owned while explicitly prefetching relevant destinations and exposing immediate link-pending feedback during dynamic server resolution; no client-owned media/filter dataset is introduced;
- bounded pagination with direction-aware Newer/Older navigation;
- responsive media grid and product media URLs;
- truthful unavailable/empty/no-match states;
- deep links to `/library/[assetId]`;
- compact native-file-picker Upload action with verified durable promotion;
- optional desktop drag/drop of one image through the exact same persistent upload transaction, with a temporary drag-only full-Library affordance and no persistent dropzone;
- multi-file drops are rejected before upload requests start; Upload button remains the keyboard/touch/mobile baseline;
- uploaded cards prefer durable display names and preserve Unicode filenames;
- URL-owned server-side search `q` over display name, original filename and generated prompt;
- search is case-insensitive literal substring matching, max 120 characters, composed with kind/sort/pagination;
- changing search, kind or sort clears stale pagination appropriately;
- renamed durable assets are immediately discoverable through the same display-name search contract;
- UI-030 makes Library private to the verified account: signed-out users see an explicit sign-in state rather than media/search/upload controls, while signed-in list/search/history/upload queries are owner-scoped.
- UI-031 adds URL-owned `favorite=true` as a server-side owner-scoped Favorites view that composes with kind/search/sort/pagination and preserves clean URL state when Favorites is inactive.
- Favorites remains a compact Library toolbar filter, not a new top-level destination or client-only card filter.
- UI-069 requires Favorites, Collections and chronological sort controls to share one true control baseline/height; closed collection-management disclosure content must not reserve phantom spacing in the toolbar.
- UI-032 adds optional URL-owned `collection=<uuid>` as an owner-scoped server-side Library view that composes with kind/search/Favorites/sort/pagination.
- Collections remain a compact Library selector plus Viewer contextual membership action, not a new top-level destination, card/batch action system or client-owned media store.
- UI-049 Phase 8A makes Library collection management reachable even with zero collections, reuses the existing create contract, and adds owner-scoped rename/delete in a compact progressive-disclosure manager. Collection Delete removes only the collection and cascade memberships; durable media, Favorite state, R2 content, generation history and provenance remain unchanged.
- Deleting the currently active collection filter navigates to the canonical equivalent Library view with `collection` and stale `offset` removed while compatible kind/search/Favorites/sort state remains. Viewer stays focused on current-asset membership and does not duplicate rename/delete management.
- UI-034 adds an explicit Library `Select` mode over only the current rendered page, maintained Checkbox selection, Select/Clear Page, Cancel and one destructive batch Delete action. Selection resets when the Library URL/server view changes.
- UI-070 keeps UI-034 selection semantics unchanged while making card-level selection visually compact: the maintained checkbox retains a 44×44 interactive/focus root with a centered 22×22 visible control. Library cards use the media frame as the full card surface with a compact floating glass metadata shelf for title/kind/date rather than a separate opaque footer; no card quick actions or client-owned media state are introduced.
- UI-034 batch Delete is capped at 24 IDs and best-effort per item; successful items are not rolled back because another selected item fails, while failed items remain selected for retry. It reuses UI-033 tombstone/R2 semantics and adds no schema migration.
- UI-049 Phase 8B extends that same current-page selection state with one non-destructive Organize disclosure. Favorite selected / Unfavorite selected and Add selected / Remove selected to one existing owner collection are explicit target states over bounded 1–24-item best-effort APIs; permanent Delete stays separate. Still-visible selections remain after organization for chaining, while active Favorites/Collection filters refresh and prune items/selection that no longer belong. Uploaded and generated assets use the same path.

**Approval evidence:**
- base Library/Viewer lifecycle `33034606396`;
- persistent upload final pre-merge runs `33067469516`, `33067469518`, `33067469527`; PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`;
- search implementation runs `33069004219`, `33069004207`, `33069004227`, `33069004204`;
- search documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186`;
- PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge `33070215358` passed;
- Rename configured search-discovery regression passed in Media Rename Visual `33074480356`;
- history ordering implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`;
- history desktop Oldest, open sort menu and mobile Newest screenshots were visually inspected with no unintended Library hierarchy drift;
- drag/drop implementation head `d957242d9b45fbb9fb115c8fd2b0a4dc60dc88ef` passed UI Shell `33102672560`, Library Search `33102672572`, Library History `33102672507`, Library Lifecycle `33102672568`, and Library Drag Drop `33102672468`;
- clean drag-active/completed desktop and completed mobile drag/drop screenshots were visually inspected; exactly one current run-owned durable card rendered with a valid preview and the mobile Upload baseline remained unchanged;
- direct Supabase cleanup after drag/drop verification found `0` drag/drop sessions/assets and `0` known legacy lifecycle sessions/assets;
- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265` and Account Ownership `33131090207`; signed-out desktop/mobile and signed-in Library artifacts were reviewed clean.
- UI-031 exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Account Ownership `33200364288` and UI Shell `33200364256`; fresh desktop/mobile Favorites Library screenshots were visually reviewed clean and shared-resource cleanup returned to zero.
- Final UI-031 head `4bd41d55af27c7240d75862424039fc59027988e` passed the complete 13-gate affected suite, then PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`; merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation `33205766671`, and Video Generation `33205766691` passed, and the post-merge shared-resource audit returned to zero.
- UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 affected gates, including Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Library Lifecycle `33210501160`, Generation `33210501178` and Video Generation `33210501167`; four responsive Collections artifacts were visually reviewed, PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`, merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed, and post-merge shared-resource cleanup returned to zero.
- UI-049 Phase 8A exact code/test head `34f9573eaabff6a91c780266ff03fedc9058df56` passed all 16 minimum/affected gates: UI Shell `33275470009`, Account Ownership `33275469977`, Library Collections `33275469972`, Library Favorites `33275470058`, Library Batch Delete `33275470041`, Library Lifecycle `33275469967`, Library Search `33275469987`, Library History `33275469981`, Library Drag Drop `33275469963`, Persistent Media Upload `33275794675`, Media Download `33275795313`, Media Rename `33275795970`, Media Delete `33275470098`, Create Lifecycle `33275469978`, Generation Integration `33275469986`, and Video Generation Integration `33275469940`. Configured Collections artifact `9721370669` (`sha256:26eb381867bf2b270363dbb8561c0cfbe93df873e2d191873b4aeda5bb208389`) was reviewed clean across desktop/narrow manager, empty, delete-confirmation, active-filter and Viewer-membership states; exact fixtures cleaned and no migration/deployment occurred.
- UI-049 Phase 8B exact implementation head `e460a7e9e805ac9eb214277eb495adddd3c50f38` passed all 16 minimum/affected gates: UI Shell `33276766491`, Account Ownership `33276766501`, Library Collections `33276766508`, Library Favorites `33276766502`, Library Batch Delete/Actions `33276766476`, Library Lifecycle `33276766549`, Library Search `33276766510`, Library History `33276766481`, Library Drag Drop `33276766492`, Persistent Media Upload `33276766522`, Media Download `33276766512`, Media Rename `33276766480`, Media Delete `33276766497`, Create Lifecycle `33276766503`, Generation Integration `33276766505`, and Video Generation Integration `33276766504`. Configured Batch Actions artifact `9721752806` (`renderlab-library-batch-actions-screenshots`, `sha256:9dfebfad4a97aa79e6bd11a2b86de5071fa7a1e6739258d95688d37496b3adb0`) was reviewed clean across desktop/narrow Organize open/completed/filter-pruned states plus unchanged Delete confirmation; exact owner/foreign database/R2 fixtures cleaned and no migration/deployment occurred.
- UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected gates: Library Batch Delete `33220127853`, Account Ownership `33220127858`, UI Shell `33220127872`, Create Lifecycle `33220127874`, Library Search `33220127883`, Library History `33220127859`, Library Lifecycle `33220127864`, Library Drag Drop `33220127921`, Persistent Media Upload `33220127879`, Media Download `33220127852`, Media Rename `33220127885`, Library Favorites `33220127888`, Library Collections `33220127868`, Media Delete `33220127873`, Generation Integration `33220127851`, and Video Generation `33220127855`. Configured validation covered request bounds, signed-out and foreign denial, mixed partial success, database/R2 cleanup, preserved generation history, idempotence, Library-view selection reset and responsive real-browser deletion. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed clean; the shared-resource audit returned to zero with `0009` still latest.
- UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; merged-`main` UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed, the post-merge shared-resource audit returned to zero, and Vercel created no deployment from the merge.

**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032, single-asset Durable Media Delete v0.1 / UI-033, Library Batch Delete v0.1 / UI-034 and Phase 8 Library organization / UI-049 are approved. Selection deliberately remains current-page only; Delete and organization remain bounded best-effort per item with explicit target states for reversible organization.

**Phase 24 Gallery Rail closure:** Gallery Rail v0.3 now replaces the former stacked Library command composition under UI-075. Search is first-class, retrieval/organization controls share one compact rail, selection morphs that rail in place, media remains dominant, and card metadata is attached/legible. The implementation preserves maintained 44×44 / 22×22 selection geometry, card→Viewer activation, URL/server-owned discovery, current-page batch semantics, Uploads-only upload/drop and all ownership/security contracts. Exact implementation head `d0a6f66937986ace109e301913f17410a8e95548` passed the fresh 13-workflow suite; PR #194 merged as `af88b93dcb4fcbca502b42f9ea1186192af48a6a`, and merged-main Engineering Quality `34699439085` plus UI Shell `34699439083` passed.

**Do not change:** Do not couple Library to legacy `studio_*` or expose temporary `generation_sources` as durable media. UI-060's approved Creatives/Uploads sections are origin-scoped views over the same durable media identity; do not split them into parallel asset stores or add a third section without an explicit product contract. Do not turn search/history ordering into a Saga-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED — UI-076 Media Register + Source Fold v0.2 / Phase 25 merged and merged-main verified, plus existing Viewer behavior contracts
**Implementation:** `src/features/library/media-viewer.tsx`, `src/features/library/media-viewer-comparison.tsx`, `src/features/library/media-viewer-register.tsx`, `src/features/library/media-viewer.module.css`, `src/features/library/media-viewer-upscale-action.tsx`
**Viewer actions:** `src/features/library/media-viewer-actions.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts` (GET/PATCH/DELETE), `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/app/api/media/collections/route.ts`, collection membership route, `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-collections.ts`
**Design authority:** historical `design/penpot/media-viewer-v0.1.svg`, `design/penpot/media-viewer-v0.2-compare-source.md`; current UI-076 authority is approved R&D `design/rd/media-viewer-register-fold-v02.md` at `639aef25e57e166be8d8b3d226b3e83930e05a25` plus `docs/ui/MEDIA_VIEWER_REGISTER_FOLD_IMPLEMENTATION_CONTRACT.md`

**UI-076 / Phase 25 closure — 2026-09-13:** The old permanent Viewer sidebar is replaced by the approved Media Register + Source Fold v0.2 system. Quick actions own Favorite/Download; Manage owns Collections/Rename/Delete; Prompt/Details/Manage/Compare stay attached to the local register; Source Fold keeps Result primary, reveals Source horizontally on wide layouts and stacks Result→Source on narrow layouts; native video, continuation, Reuse Settings, Upscale, ownership and durable-media contracts remain intact. Exact implementation head `3e468ad0abd4f7b6645e86e298ce53a3a8ecf034` passed the full affected acceptance set; dedicated Viewer run `34717466185` / artifact `10304951419` (`sha256:d551006acffa260e8bbd83e25c2b156204a4391f1f9b1abcfc4e58aa0cc28e04`) was human-reviewed faithful. PR #200 merged as `b672c711f885092c5e92c42824078e7bd5bc691e`; all six merged-main workflows passed. Production remains unchanged pending separately authorized deployment.

**Approved behavior:**
- deep-linked durable asset route;
- responsive media-primary image/video presentation;
- UI-069 requires shrinkable min-content-safe Viewer layout/stage/rail composition and safe wrapping for long unbroken labels so intrinsic media or filenames cannot force horizontal viewport overflow at narrow/intermediate widths;
- secondary product metadata;
- capability-derived continuation actions;
- persisted images expose Edit/Animate via opaque media identity + action intent;
- Create reloads durable media and validates compatibility server-side;
- uploaded assets show truthful Upload/display-name/original-file metadata;
- one secondary Viewer-only `Download` action for durable generated/uploaded media;
- Download uses `/api/media/assets/[assetId]/download`, reloads the durable asset server-side, then redirects to a short-lived signed R2 attachment GET;
- uploaded download filenames preserve a sanitized Unicode basename with canonical MIME extension;
- generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback names rather than prompt/storage identity;
- one Viewer-only `Rename` action changes only durable `display_name` through `PATCH /api/media/assets/[assetId]`;
- Rename strips controls, collapses whitespace, requires non-empty input and caps names at 240 characters;
- Rename preserves original filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics;
- Rename and Download remain side-by-side while the inline edit form expands beneath them on desktop/mobile;
- UI-031 adds one full-width accessible `Favorite` / `Favorited` Viewer action above Rename/Download; it exposes `aria-pressed`, local saving/error feedback and an idempotent owner-scoped product mutation without changing continuation hierarchy;
- UI-032 adds one contextual `Collections` disclosure below Favorites; it lists only the verified owner's collections, supports create-and-add plus idempotent membership toggles with pressed state, and keeps Rename/Download plus continuation hierarchy unchanged.
- UI-033 adds one visually secondary permanent `Delete` action beneath existing durable actions. Confirmation uses the maintained AlertDialog primitive; successful deletion tombstones first, removes collection/upload links, purges R2 content/thumbnail, preserves generation-history IDs and returns to Library. Tombstoned media is not reusable as a new generation input.
- UI-030 requires a verified account for private Viewer state; the asset is loaded by owner and foreign IDs collapse to normal not-found behavior. Signed-out access renders the compact sign-in state rather than exposing private media.
- UI-056 adds eligible successful-history `Reuse settings` and conditional `Compare source` without changing the default Viewer. Comparison appears only when the producing owner-scoped job resolves an active same-owner durable primary `media-asset`; temporary/deleted/foreign/no-source history fails closed. Wide layouts keep Result primary at roughly 60/40 with contained truthful media geometry; narrow layouts place a full-width Result first and a compact contextual Source card immediately below. Source exposes only `Open source` to its ordinary Viewer. Prompt, Details, Continue, Actions and result video playback controls remain result-owned; active comparison exits through `Close comparison`. No new route or durable comparison state is introduced.

**UI-056 Reuse / Compare approval evidence:** exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed Creative Iteration `33964679539` plus all 26 affected workflows. Artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed clean across Image→Image and Image→Video desktop/narrow comparison. Configured Chromium separately verified keyboard activation, reduced-motion, native result-video controls, `Open source`, no horizontal overflow, ineligible fail-closed behavior and exact cleanup. No corrective Viewer implementation change was required.

**Download approval evidence:**
- implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Library Search `33070792317`, Persistent Media Upload `33070792362`, Library Lifecycle `33070792329` and Media Download Visual `33070792343`;
- documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed;
- PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Rename approval evidence:**
- refined implementation head `fb6f42cdfae377cf841655320dc4bbeee74d3549` passed UI Shell `33074480462`, Library Search `33074480419`, Persistent Media Upload `33074480288`, Media Download Visual `33074480319`, Media Rename Visual `33074480356`, and Library Lifecycle `33074480489` on rerun after stale shared fixture cleanup;
- configured Chromium verified generated/uploaded rename, Unicode/whitespace normalization, invalid/blank/overlength rejection, search discovery, original/provenance/storage preservation and unchanged uploaded Download filename/bytes;
- four refined edit/renamed Viewer screenshots were visually inspected at desktop/mobile widths;
- direct cleanup verification left `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions;
- the unrelated stale lifecycle R2 object was explicitly removed by cleanup run `33075125636`;
- UI-030 exact head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Lifecycle `33131090245`, Media Download `33131090206`, Media Rename `33131090198` and Account Ownership `33131090207`; signed-in mobile Viewer media/continuation/Rename/Download presentation was visually reviewed clean.

**Favorites approval evidence:** exact UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Media Download `33200364193`, Media Rename `33200364178`, Library Lifecycle `33200364235`, Account Ownership `33200364288` and UI Shell `33200364256`. Final head `4bd41d55af27c7240d75862424039fc59027988e` passed the full 13-gate affected suite before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`. Configured Chromium verified favorite/unfavorite state, `aria-pressed`, owner isolation, idempotent persistence and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Collections approval evidence:** UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Media Download `33210501133`, Media Rename `33210501203`, Library Lifecycle `33210501160` and UI Shell `33210501226`; PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` and merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed. Configured Chromium verified create/add/remove membership, `aria-pressed` persistence, Library collection navigation and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Delete approval evidence:** final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`. Configured verification proved signed-out/foreign denial, database tombstone cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotent retry and rejected post-delete generation reuse. Desktop/mobile confirmation screenshots were visually reviewed clean. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`; merged-`main` UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed and post-merge shared-resource cleanup returned to zero.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation and recipe reuse remain capability/current-validation derived. Favorite/Collections/Download/Rename remain contextual product actions; UI-033 Delete follows its explicit tombstone/purge contract; UI-056 Source stays contextual and exposes only its ordinary Viewer link. Do not expose raw R2 keys/signed URLs as durable product links, revive unavailable historical sources, or infer collection management/batch actions from the single-asset Viewer/comparison context.

### Activity
**Route:** `/activity`  
**Status:** APPROVED — Activity v0.1 / UI-035 + failed-job Retry / UI-050 + native Cancel / UI-055 + successful Run Again / UI-056 + Upscale lifecycle/recovery summary / UI-058
**Implementation:** `src/app/(app)/activity/page.tsx`, `src/features/activity/activity-view.tsx`, `src/features/activity/activity-auto-refresh.tsx`, `src/features/activity/activity-retry-button.tsx`, `src/features/activity/activity-cancel-button.tsx`, `src/features/activity/activity-run-again-button.tsx`
**Supporting:** `src/lib/api/generation-activity-contract.ts`, `src/lib/api/generation-retry-contract.ts`, `src/lib/api/generation-cancel-contract.ts`, `src/lib/api/generation-run-again-contract.ts`, `src/server/generation/generation-activity.ts`, `src/server/generation/retry-generation.ts`, `src/server/generation/run-again-generation.ts`, `src/server/generation/cancel-generation.ts`, `POST /api/generation/jobs/[jobId]/retry`, `POST /api/generation/jobs/[jobId]/run-again`, `POST /api/generation/jobs/[jobId]/cancel`, server-owned reconciliation
**Purpose:** Show current/recent account-owned RenderLab `generation_jobs`, real execution state and actionable product recovery/control without exposing worker infrastructure as user responsibility.

**Current verified behavior:** newest-first 20-job pages; queued/preparing/running/**cancelling**/persisting/succeeded/failed/cancelled product state; lightweight refresh only while jobs are nonterminal; sanitized failure copy; result links only for currently active owner media; signed-out/unavailable/empty states; compact failed-row Retry using current-revalidated persisted intent; and compact native Cancel only when server-derived `canCancel` is true. Cancel confirmation uses the maintained AlertDialog, states that the attempt cannot be resumed and a late result will not be published if cancellation is accepted, renders `Cancelling` while server reconciliation is pending, and removes the action once intent is accepted. `persisting`, terminal and unsupported/external-backend rows never expose Cancel. Cancelled jobs remain non-retryable. Provider/worker/storage identity, queue position, fake percentage/SLA and shell-global job polling remain absent. UI-056 additionally exposes compact `Run again` only for succeeded rows whose historical product intent is still current-valid; it reconstructs server-side and submits through ordinary current admission/routing, creates a distinct job and never replays provider/worker/workflow/model/failover state. Failed Retry, successful Run Again and active Cancel remain separate product semantics.

**Retry evidence:** UI-050 exact code/test head `ab33e146ccaa7770f3dd66146708f01933cc0173`; Activity `33279062575`; final artifact `9722428767` reviewed clean. Phase 10C preserved Retry through shared transactional admission.

**Cancel evidence:** UI-055 exact implementation head `9cd0528ff50ef55a3ad3e09080980a71234af096`. Activity Cancel Visual `33939690827` passed confirmation, Escape dismissal, intermediate `Cancelling`, final `Cancelled`, no-repeat Cancel, desktop 1440×1000, narrow 390×844 and reduced-motion states. The visually identical artifact `9960993664` (`sha256:caa369b98b444f968538584a340739cc5dadf7c4a34eb529b42fc3fbf6bbf699`) was human-reviewed clean. Generation Cancellation `33939690824` verified the serialized lifecycle and real FLUX/REDGraft provider mapping with zero durable late output.

**Run Again evidence:** UI-056 exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115`; Creative Iteration `33964679539` verified succeeded-only eligibility, current-valid reconstruction, distinct immutable attempts, current admission denial, provider/execution-metadata isolation, responsive Activity rendering and exact cleanup. The earlier Phase 16 recipe/Activity artifact `9967633913` was reviewed clean.

**Do not change:** Activity remains a utility/history surface, not a worker/provider administration console. Keep failed Retry, successful Run Again and active Cancel eligibility distinct; do not add in-row recipe editing, provider replay/identity, or a shell-global client job store.

### Settings
**Route:** `/settings`  
**Status:** APPROVED — Account Identity Foundation / UI-029 + Phase 10A/10B account/admin integration / UI-051
**Implementation:** `src/app/(app)/settings/page.tsx`
**Account surface:** `src/features/account/account-settings.tsx`; password security: `src/features/account/account-password-form.tsx`
**Session boundary:** `src/lib/supabase/config.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, root `proxy.ts`

**Purpose:** Own persistent account/application settings only when backed by real requirements. UI-029 uses Settings for the first real RenderLab account identity surface; it is not a workflow/model parameter dumping ground.

**Approved behavior:**
- compact email/password Sign in + Forgot password when signed out, and access-status / Change password / Sign out when signed in; public self-service Create account is absent under the Closed-Beta admission contract;
- Supabase Auth `auth.users.id` is the canonical account identity;
- maintained Supabase SSR cookie sessions are refreshed through the root Next.js proxy and server identity uses verified claims;
- public Supabase URL/publishable key may reach browser code; service-role credentials remain server-only;
- UI-029 itself did not gate or redesign Create/Library and did not imply owner columns; UI-030 now consumes that verified identity as the private product owner without moving media authorization into the Settings component.

**Approval evidence:**
- Account Identity Visual `33111299356` built and exercised an exact run-owned confirmed Supabase user through real Settings sign-in, reload-persistent cookie identity, responsive signed-in state, sign-out and exact cleanup;
- UI Shell `33111299265`, Create Lifecycle `33111299305`, Library Search `33111299144`, Library History `33111299040`, Library Lifecycle `33111299250`, Library Drag Drop `33111299309`, Media Download `33111299155`, and Media Rename `33111299172` also passed on the shared package-change code head;
- desktop signed-in and mobile signed-in/signed-out screenshots were visually reviewed without shell hierarchy drift;
- direct Supabase verification found `0` account CI fixture users after cleanup;
- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Account Identity `33131090197` and Account Ownership `33131090207` while the private product routes consumed the same verified account principal.

**Still intentionally open:** UI-030 strict database enforcement is complete. Personal Library organization remains owned by Library/Viewer rather than Settings; other Settings sections remain requirement-driven.


**Phase 10A/10B verified extension — UI-051:** Settings remains the ordinary account/security surface. Signed-out state is Sign in + Forgot password with no public Create account; signed-in state includes Change password and server-owned RenderLab access status; recovery/invite completion uses `/settings/password`. Suspended users retain Settings for recovery/sign-out. Active admins get a contextual `/admin` link after fresh privilege confirmation. Raw Supabase errors, role editing and other users never belong in ordinary Settings.

### Admin
**Route:** `/admin`
**Status:** APPROVED / VERIFIED — Phase 10B + 10C / UI-051
**Implementation:** `src/app/admin/page.tsx`, `src/features/admin/admin-operations.tsx`, `src/server/admin/*`, `src/app/api/admin/**`

**Purpose:** Operate the controlled RenderLab beta without exposing provider infrastructure or the shared Supabase Auth namespace.

**Verified v0.1 composition:**
- **Access:** RenderLab invitations and admitted accounts only; invite/revoke, active/suspended status and member/admin role. Account discovery starts from `renderlab_account_access`; Auth Admin lookup is only by already-known RenderLab UUID.
- **Generation controls:** fresh-admin typed global `generationEnabled`, `maxActiveJobs` (1–4) and `maxJobsPerHour` (1–120) defaults above nullable per-account overrides. Account override wins when present; otherwise the global value is effective. These controls now feed the shared Create/Retry transactional admission boundary.
- **Health:** bounded aggregate RenderLab operation/status counts, active-job count and sanitized product error-code counts; no prompt/media/provider/worker/workflow/raw-error data.
- `/admin` and `/api/admin/**` require a freshly server-confirmed Supabase identity plus active RenderLab `admin` access. Unauthorized page/API paths fail closed without privileged payload.
- ordinary global shell navigation remains Create/Library/Activity/Settings; Settings exposes `Open Admin` only to a fresh active admin.
- member/admin and active/suspended changes are transactionally protected against self-lockout and removal of the last active admin.
- desktop uses dense maintained-primitive rows/cards; narrow layout stacks records/actions without horizontal clipping.

**Approval evidence:** Phase 10B exact head `56d5a2c26fc14f6fcad8c7093024bcc9632eb7c8` established the privileged Admin boundary. Phase 10C exact head `ca8e426066385934b296b6d4f88324e9c12861f7` then passed the complete 22-workflow matrix including Account/Admin Operations `33309162310`, Generation Admission `33309162313`, Activity `33309162322`, Generation `33309162306` and Video Generation `33309162305`. Final Admin artifact `9731449736` (`sha256:66188b46f4249a7be6e7efba6f613331de07525f76b8a931f5ffbf85e3f56e81`) was human-reviewed clean on desktop/narrow layouts with global defaults above account overrides; Admission artifact `9731487718` (`sha256:e6e94bfabbd125c20c65aa959900a0081d6ca94bbd5b6d6a5b28fd817a09c3e7`) was reviewed clean for Create/Activity denial states. Migrations `20260830015449 renderlab_admin_access_control` and `20260830101734 renderlab_generation_admission` are applied/audited; exact final fixture cleanup and singleton restoration passed.

**Do not change:** Do not turn Admin into a shared-Supabase user browser, cloud/provider console, arbitrary feature-flag framework or generic internal dashboard. Do not expose provider identity/credentials, raw errors, other applications' users or destructive account/data deletion. Keep global/account controls typed and bounded; generation reservations remain server-only operational state rather than a browser/admin reservation console.

### Brand / Landing — Phase 11 route migration (historical)
**Status:** COMPLETE / SUPERSEDED by the current Brand / Landing entry above.

Phase 11 / UI-052 established the route split later retained by the Lab Matrix redesign: public `/` renders outside `AppShell`, authoritative Create lives at `/create`, `Open Create` targets `/create`, `Sign in` targets `/settings`, and legacy root `source` / `action` intent redirects to `/create` with the full query preserved before ordinary server validation. PR #73 merged that migration as `46c5daa2866c6758907ee9be219bcb3cb274ca83`.

The old pre-implementation state in which `/` still served Create is historical only and must not be used as current repository reality. The current Landing implementation and approval evidence are recorded in the primary Brand / Landing entry above and in `docs/ui/LANDING_BRAND_RD.md` / `docs/ui/LANDING_IMPLEMENTATION_CONTRACT.md`.

## Creation Experience Resolution
- Prompt + Image → Create Image.
- Prompt + ready image reference/media asset + Image → Edit Image.
- Prompt + Video, no reference → Create Video.
- Prompt + ready image reference/media asset + Video → Animate Image.

Phase 7 will extend these current rules with durable Create uploads, source-aware geometry, named/ordered multi-reference inputs and audited Director-video semantics. Until those slices are implemented, the current four resolution rules above remain the production contract.

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`; UI-038–UI-043 now additionally govern the revised Cycle 2 roadmap, source-aware geometry, durable Create uploads, explicit multi-reference addressing, curated hidden-workflow productization and the premium maintained-component visual-quality target.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.

**Phase 10A verified extension:** Settings remains the ordinary account/security destination. Signed-out state exposes Sign in + Forgot password and no public Create account. Verified identities see server-owned Closed Beta access status; Active users retain private product access, while Suspended users keep password/sign-out recovery but are denied private product operations when admission enforcement is enabled. `/settings/password` requires current-password reauthentication for ordinary changes and accepts old-password-free replacement only after the server verifies a signed short-lived recovery marker created by `/auth/confirm`. `e36140911c63527927ef404d1befa7670d590f8a` passed Account Identity `33282141315`, Account Ownership `33282141349`, UI Shell `33282141382` and the full 20-workflow affected suite. Artifact `9723305472` was reviewed clean across active/suspended/signed-out/recovery desktop+narrow states. Production admission enforcement remains off pending explicit known-user UUID bootstrap.

## Cycle 3 Phase 16 screen extensions — COMPLETE / VERIFIED

### Create — successful recipe prefill extension
The approved `/create` workspace now accepts an untrusted `recipe=<generation-job-uuid>` navigation intent for successful current-valid history. The server reloads the job under the verified owner, reconstructs only current product intent and revalidates source availability before passing an initial recipe to the existing Create composition. Prompt, output settings, Advanced values and stable reference aliases/roles/sources are editable after prefill. Opening the recipe never dispatches generation. Invalid, foreign, mixed recipe/media continuation and unavailable-source navigation fails closed without partial private prefill. This is an extension of the approved Create surface, not a new Recipe mode or top-level destination.

### Activity — successful Run Again extension
Successful current-valid rows may expose **Run again** beside **View result**. The server derives eligibility; the browser sends only the historical job ID and receives a new ordinary generation attempt. Failed rows keep **Retry** and active rows keep **Cancel** where supported. On narrow layouts, job details keep the full card width and successful actions move to a dedicated row below the details; when both are present, `View result` and `Run again` stay side-by-side instead of forming a narrow right-side action rail. This corrected composition was implemented in PR #114 at exact source head `7e62ddbd0818b5af4f90daff8f4b9512d349223b` and squash-merged as `14df1b716e1e9d7ba092c898d4aa3a2217ca718b`; Activity Visual `34064167931` and Creative Iteration `34064167934` passed, and their 390px artifacts were reviewed without clipping or horizontal overflow. Exact configured Activity/Creative Iteration validation passed on exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115`.

### Media Viewer — Reuse Settings + Compare source approved / render verified
Generated Viewer results with a current-valid producing recipe may expose **Reuse settings** in the existing Continue hierarchy and navigate to `/create?recipe=<job-id>`. UI-056's conditional **Compare source** extension is implemented at exact head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` against the user-approved PR #100 direction. The default Viewer remains unchanged until comparison is opened. Eligibility is server-derived from the producing owner-scoped job and requires an active same-owner durable primary `media-asset`; temporary/deleted/foreign/no-source history does not expose comparison. Wide comparison keeps Result primary with truthful media geometry; narrow comparison keeps the full-width Result first and a compact contextual Source immediately below; Source exposes only **Open source**; result Prompt/Details/Continue/Actions and video controls remain intact; the active exit action is **Close comparison**. Creative Iteration `33964679539` and the full 26-workflow exact implementation-head matrix passed, including desktop+narrow, keyboard and reduced-motion automated checks. Final artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed clean on 2026-09-05 across Image→Image and Image→Video desktop/narrow renders. Result remained primary, geometry was undistorted, Source stayed contextual, existing result-owned controls/actions remained intact, and narrow layouts showed no horizontal clipping/overflow. No corrective implementation change was required.

### Phase 17 Admin Health expansion — render verified
The existing fresh-active-admin `/admin` Health section exposes bounded accepted-to-terminal timing samples, failover incidence, active-state age bands, active admission reservations/current global guardrails and Phase 15 maintenance backlog. Counts remain aggregate and bounded; raw prompt/media/account/provider/storage identity is not part of the Health browser contract. Exact head `1ecd46bb809c1953cd24f1eecbd4bbfab7dbd4be` passed Account/Admin Operations `33976269977` with exact aggregate/privacy/cleanup assertions and desktop+narrow no-overflow checks. Artifact `9972464342` (`sha256:f0b26931cb8e5ae574c457cf0f3f1ecff19f04dcde0fc3c390f19bbb57dbbd4c`) was independently hash-checked and human-reviewed clean on 2026-09-05: the existing dense Admin card/list hierarchy remains readable on desktop and 390px narrow layout, timing is explicitly labelled as accepted-to-terminal rather than SLA/ETA, and bounded truncated counts are explained with `+`. No corrective UI change was required.

### Media Viewer — Phase 18 Image Upscale extension — render verified
**Status:** APPROVED incremental extension — UI-058 / 18E implemented and render verified; 18F product proof remains next
**Route:** existing `/library/[assetId]`; no new Upscale route

**Verified behavior:** an eligible active durable image exposes **Upscale 2×** in the existing Continue hierarchy as a full-width secondary row beneath Edit/Animate. Action presence is server-derived from owner-loaded durable metadata plus backend configuration; the browser sends only the opaque asset route identity. Starting is duplicate-locked and truthful (`Starting upscale…`); acceptance keeps the source Viewer stable, shows `Upscale started. Track progress in Activity.` plus **Open Activity**, and does not fabricate completion; errors stay local/retryable. Ineligible geometry omits the action rather than showing a false disabled promise. Succeeded Upscale results continue to use the existing UI-056 Compare source path from 18D while the same-owner source remains active. Implementation head `ac4aed60e64061ee6a911c858cdc032b6f9a7423` passed Upscale Viewer Visual `34033506667`; artifact `9989427506` (`sha256:49e40583899891a1f1863ff8fd49a714febf11bfdb999bb781849f45c3e01121`) was hash-checked and human-reviewed clean for desktop/narrow eligible, starting, accepted and error states with no horizontal overflow or hierarchy correction required. Design checkpoint: `design/penpot/media-viewer-v0.3-upscale-2x.md` plus desktop/mobile SVGs. No new route, Create mode, generic primitive or production rollout was introduced.

**Eligibility / scope:** fixed 2× only; PNG/JPEG/WebP source; source max edge 4096 px, max 4,194,304 pixels and max 25 MB; no video, batch, model picker, prompt, Restore claim or arbitrary factor. Server state is authoritative. A desktop+narrow Viewer design checkpoint is required before implementation and final configured screenshots require human review.

**Do not change:** keep the existing Viewer media-primary hierarchy, result/source comparison rules and ordinary Edit/Animate actions. Do not create an Upscale application, route, modal management framework or generic post-processing toolbar for v0.1.

## Post-Cycle 3 Create Extension — Contextual Image Model Choice
**Route:** `/create`
**Status:** IMPLEMENTED / VERIFIED / MERGED
**Implementation:** existing `CreateWorkspace` + `CreateAdvancedPanel`; no new route or generic component.

Image output now owns a compact contextual **Image model** choice. **FLUX.2 Klein** remains the default and **Qwen Image Edit** is an explicit alternative for both source-free image generation and source-backed Edit. The selector disappears in Video mode because REDGraft is currently the only productized Video choice. The browser submits only a stable product model ID; worker fleet selection/failover remains server-side. Qwen's fixed 4-step tuning removes configurable Steps/Guidance from Advanced while retaining applicable prompt/seed controls. Current-valid recipe reconstruction restores the selected model. Historical recipes lacking model identity default to the former FLUX/REDGraft behavior.

Responsive Create lifecycle validation covered the default FLUX state, Qwen menu selection, Qwen-specific Advanced composition, serialized model intent and narrow/mobile menu rendering. No top-level Models screen is approved by this extension.

Exact PR head `d5f80c02f041b645b7a3b1dee13d70d8139cc832` passed all 19 attached workflows and the responsive Create/model-selection review before PR #115 merged as `e8649ba39e660e2ec98cfd2fd864b22db74e64e3`. No new route, generic component, worker deployment or production rollout was introduced.

## Post-Cycle 3 Library Extension — Creatives / Uploads
**Route:** `/library`
**Status:** IMPLEMENTED / VERIFIED / MERGED — UI-060

The approved Library remains one route and one durable-media workspace, but now exposes two higher-level origin sections. **Creatives** is canonical `/library` and maps to generated assets; **Uploads** is URL-owned as `?tab=uploads` and maps to uploaded assets. All/Images/Videos, search, Favorites, Collections, sort and pagination remain inside the active section. Upload and desktop drag/drop exist only in Uploads. Media Viewer stays `/library/[assetId]`; Rename, Download, Favorite, Collections, Delete and continuation remain asset-ID based and origin-agnostic.

Exact reconciled head `a81c02e82abb0cec6b386e4cfb69f1075f377e33` passed all 30 attached workflows and final desktop/390px Library review. PR #116 merged as `999d32812e74afdba73e3cbaa7607a64ce65d603`; all nine attached merged-main workflows passed. No new route, schema, parallel Upload media identity or deployment was introduced.


## Cycle 4 Phase 19 shared screen treatment
Create, Library/Viewer, Activity, Settings and Admin continue using their existing routes and feature ownership but now inherit the UI-062 Kinetic Precision `AppShell`: atmospheric spectral canvas, floating dimensional rail/topbar, morphing active navigation, tactile navigation response and floating mobile dock. Phase 19 does not claim feature-internal redesign; Create internal composition remains Phase 20, Library/Viewer internals Phase 21, and Activity/Settings internals Phase 22. Exact reviewed shell head `ea21d56e4ac643ec32d586759fc48c2ef165e44b`.

## Cycle 4 Phase 22 screen extensions — VERIFIED ON IMPLEMENTATION HEAD / MERGE PENDING

### Brand / Landing — Kinetic Precision public expression
**Historical visual state:** this Phase 22 Landing treatment was later superseded by the current approved Lab Matrix redesign in PR #174. Its route/access/product-truth constraints remain relevant historical evidence; its visual composition is not the current Landing specification.

The approved `/` product home at this phase used the reviewed Phase 22 Kinetic Precision hero and dimensional product-preview composition from `design/penpot/phase22-landing-kinetic-v0.1.svg` / `phase22-system-cohesion-v0.1.md`. `Open Create` still targeted `/create`, `Sign in` still targeted `/settings`, legacy root continuation remained intact, and invitation-only Closed Beta truth remained explicit. The preview was labeled as a static illustration and did not imply live generation state. No public signup/pricing/testimonial/fake-metric/provider/model/SLA or marketing-analytics expansion was approved.

### Activity — Kinetic Precision lifecycle hierarchy
`/activity` keeps server-owned account-private generation history, ordering, pagination and observational auto-refresh while presenting persisted lifecycle status with stronger dimensional hierarchy. Running/queued/saving/completed/failed/cancelled meaning remains textual and action eligibility stays separate: successful current-valid history may View result / Run again, failed current-valid history may Retry, and active eligible work may Cancel. Raw provider/worker detail and fabricated percent/ETA/queue/SLA state remain forbidden. 390px includes dedicated bottom clearance for the floating dock, and reduced motion uses static lifecycle meaning.

### Settings / password — Kinetic Precision trust/security composition
`/settings` and `/settings/password` now visually separate identity, Closed Beta access and security continuation without moving authority into the browser. Signed-out state contains Sign in + Forgot password and does not expose Admin. Active/suspended state keeps truthful server-derived access feedback and password/sign-out recovery; conditional Admin appears only for a real fresh active-admin identity match. Mobile Settings/password reserve bottom clearance so Change password / Sign out remain reachable above the shell dock. No preferences/profile/role editing/public account creation/Admin redesign is added.

**Phase 22 implementation evidence:** exact functional head `c081d53afecdd76f8c687cfc950d8f4bb0454a8a`; design review `34265429235` / artifact `10071612375`; Release Candidate Matrix `34270048015` with all 23 exact-SHA child workflows successful; final reviewed artifacts Account Identity `10073476200`, Activity `10073569449`, Brand / Launch `10073485236`, Create Lifecycle `10073636995`, Library Lifecycle `10073489435`, Creative Iteration `10073548921`. Exact fixture cleanup passed on the reviewed Account, Activity, Create, Library and Creative Iteration runs. UI-065 is the controlling Phase 22 visual decision. Merge and merged-main verification remain pending; production deployment is not authorized.
