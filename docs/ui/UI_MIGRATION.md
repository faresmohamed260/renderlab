# RenderLab Product & UI Foundation

## Objective
Build RenderLab as a fresh, extensible product using Saga only as behavioral/backend reference. Preserve proven capabilities where useful; re-evaluate UI, architecture and product structure deliberately.

## Core Principles
- Saga is reference material, not the RenderLab specification.
- Simple by default, powerful when needed.
- Expose user goals, not ComfyUI graph/workflow complexity.
- Reuse approved RenderLab components and maintained interaction mechanics before inventing generic primitives.
- Conventional visible feature/shell controls compose the approved maintained primitive layer under UI-026.
- Validate rendered UI, not only compilation.
- Keep repository documentation synchronized with verified implementation.

## Phase 0 — Product & Capability Baseline
- [x] Audit Saga behavior/backend contracts and UX problems.
- [x] Define RenderLab capability model, progressive-disclosure boundaries and information architecture.
- [x] Establish frontend/infrastructure architecture and durable UI decisions.

## Phase 1 — Design & Frontend Foundation
- [x] Select/document Next.js App Router + React + TypeScript + Tailwind architecture.
- [x] Establish design tokens, component sourcing policy and repository-backed design workflow.
- [x] Establish application-shell direction and Penpot/open-SVG design handoff.

### Maintained primitive foundation — merged PR #13 / UI-026
This is foundation maintenance, not a product redesign or new Phase 4 media capability.

- [x] Configure shadcn `radix-nova` and consolidate conventional visible controls into `src/components/ui` maintained shadcn/Radix wrappers.
- [x] Adopt/normalize Alert, Button, Collapsible, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- [x] Refactor Application Shell, Create, Create Advanced, Library search/filter/upload/empty state, Media Viewer and Viewer Rename/Download controls onto the shared primitive layer while preserving approved product composition.
- [x] Keep native file/hidden inputs only as browser/form plumbing.
- [x] Add `npm run verify:ui-purity`; reject raw visible button/select/textarea/ordinary-input controls in feature/shell code.
- [x] Run the purity audit before the UI Shell production build.
- [x] Harden visual workflow path filters so shared primitive/config/package changes retrigger Create, Library Search, Library Lifecycle, Download, Rename and Shell regression coverage.
- [x] Preserve semantic Library empty-state heading behavior when adapting the maintained Empty primitive.
- [x] Normalize shared Button icon/text spacing centrally rather than feature-by-feature.
- [x] Use maintained Radix single-choice semantics for Create Image/Video (`radiogroup` + checked `radio`) and update tests/verifiers to assert the accessible behavior rather than legacy `aria-pressed` DOM shape.
- [x] Harden Library Search configured verification to target exact durable asset IDs while separately asserting human labels.
- [x] Update Library Upload → Viewer → Create verifier to the Radix continuation semantics.
- [x] Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`.
- [x] Final-code UI Shell and Library lifecycle desktop/mobile screenshots visually inspected; no unintended hierarchy/layout drift found.
- [x] Library lifecycle `33088086872` verified real browser Upload → Library → Viewer → Edit continuation, Image radio initialization, 400×300 media geometry and self-cleanup.
- [x] Documentation-finalized candidate head `ba8199b49d4576dc5495779f8e84812786c5b586` passed UI Shell `33089332190`, Create Lifecycle `33089332135`, Library Search `33089333557`, Library Lifecycle `33089332001`, Media Download `33089332087`, and Media Rename `33089332021`.
- [x] Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`.
- [x] Treat the first Create Lifecycle attempt on the final head as runner infrastructure failure only: Playwright dependency installation hit a transient Microsoft Ubuntu apt-repository 403 before browser execution; unchanged attempt 2 passed.
- [x] Direct pre-merge cleanup verified `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job.
- [x] Merge PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- [x] Verify merged `main`: UI Shell `33092354072` and Reference Upload Integration `33092353971` passed.

**Maintained primitive foundation status: `APPROVED` and merged.**

## Phase 2 — Application Shell
- [x] Scaffold the fresh application.
- [x] Implement responsive shell/navigation and route-content boundary.
- [x] Establish GitHub production-build + Playwright validation.
- [x] Verify primary/utility/contextual routes.

**Application shell status: `APPROVED`.**

## Phase 3 — Creation Experience
- [x] Implement task-oriented Create workspace with Image/Video output intent.
- [x] Implement reference-driven Edit/Animate resolution.
- [x] Implement signed temporary-reference upload and opaque source identity.
- [x] Implement RenderLab-native `generation_jobs` orchestration and durable `media_assets` persistence.
- [x] Verify Create Image, Edit Image, Create Video and Animate Image end-to-end.
- [x] Implement durable `media-asset` continuation and capability-derived Edit/Animate.
- [x] Implement conservative poll-time reassignment and bounded client polling recovery.
- [x] Implement compact Advanced disclosure from verified capability definitions.
- [x] Complete configured browser lifecycle review in `33031817744` with responsive screenshots and cleanup.
- [x] Remove the transitional Studio compatibility adapter after verifying current product generation no longer depends on it; PR #33 merged as `4d224f949bd1d74edd1d51783930b914dbc34da5` after exact head `47d19eb1d1fb04dd560843c21c4552b672ca6580` passed Account Ownership `33222242161`, UI Shell `33222242167`, Create Lifecycle `33222242155`, Generation Integration `33222242169`, and Video Generation `33222242163`. Merged `main` UI Shell `33222444188`, Generation Integration `33222444204`, and Video Generation `33222444221` passed; Vercel created zero deployments.

**Create status: `APPROVED`.**

## Phase 4 — Media & Continuation
**Current phase.** Library and Media Viewer use RenderLab-owned durable media plus the shared continuation capability model.

### Base Library + Viewer
- [x] Library v0.1: newest-first unified durable-media grid, All/Images/Videos filtering, pagination, truthful states and deep links.
- [x] Media Viewer v0.1: responsive durable-media inspection, metadata and capability-derived continuation.
- [x] Viewer → Create durable-media continuation is server-validated.
- [x] Credential-free run `33034606323` passed.
- [x] Configured R2/Supabase lifecycle `33034606396` passed with responsive render review and cleanup.

**Library v0.1 status: `APPROVED`.**  
**Media Viewer v0.1 status: `APPROVED`.**

### Persistent uploads — merged PR #9
UI-022: durable user uploads become ordinary `media_assets`; pending direct transfer belongs to `media_upload_sessions`.

- [x] Uploaded/generated media share opaque `media-asset` identity.
- [x] Keep temporary `generation_sources` separate and do not reuse Saga `studio_uploads`.
- [x] Apply `0003_persistent_media_uploads.sql` as `20260827031630 renderlab_persistent_media_uploads`.
- [x] Implement ticket → signed R2 PUT → completion → HEAD verification → promotion.
- [x] Support PNG/JPEG/WebP ≤25 MB.
- [x] Preserve readable Unicode filenames and recover concurrent completion races.
- [x] Integrate compact native-file-picker Upload without Uploads tab/modal framework.
- [x] Verify uploaded Library → Viewer → Create continuation.
- [x] Final pre-merge runs `33067469516`, `33067469518`, `33067469527` passed.
- [x] PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`; post-merge main checks passed.

**Persistent upload status: `APPROVED` and merged.**

### Library search v0.1 — merged PR #10
UI-023: search is URL-owned server-side discovery over durable `media_assets`.

- [x] Define shareable `q`, whitespace normalization and 120-character cap.
- [x] Search display name, original uploaded filename and generated prompt as case-insensitive literal substrings.
- [x] Keep punctuation literal and exclude storage/provider/temporary/legacy data.
- [x] Compose with All/Images/Videos and newest-first pagination.
- [x] Add GET search form, clear action and truthful no-match state; visible controls use maintained primitives while hidden kind state remains native form plumbing.
- [x] Defer relevance ranking/index/search service until real scale justifies it.
- [x] Implementation-head runs `33069004219`, `33069004207`, `33069004227`, `33069004204` passed.
- [x] Four result/no-match desktop/mobile screenshots reviewed; cleanup verified.
- [x] Documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186` passed.
- [x] PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- [x] Post-merge main shell `33070215358` passed.

**Library search v0.1 status: `APPROVED` and merged.**

### Durable media Download v0.1 — merged PR #11
UI-024: Download is a contextual Media Viewer product action over opaque durable media identity.

- [x] Add Viewer-only secondary Download action.
- [x] Add `/api/media/assets/[assetId]/download`; reload durable asset server-side.
- [x] Redirect to short-lived signed R2 GET with attachment `Content-Disposition`; do not proxy bytes through RenderLab.
- [x] Keep raw R2 key/signed URL out of durable product identity.
- [x] Uploaded filename preserves sanitized Unicode basename and canonical extension from MIME.
- [x] Generated filename uses deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback; no prompt/storage-key filename.
- [x] Dedicated configured Chromium verifier uses real self-cleaning R2-backed uploaded/generated assets.
- [x] Verify uploaded filename `RenderLab-Download-画像.png` and generated deterministic fallback.
- [x] Verify both downloaded files are byte-identical to the durable 68-byte R2 fixtures.
- [x] Verify Cloudflare R2 honors signed `ResponseContentDisposition`.
- [x] Implementation-head UI Shell `33070792349`, Search `33070792317`, Upload Integration `33070792362`, Library Lifecycle `33070792329`, and Media Download Visual `33070792343` passed.
- [x] Three Viewer desktop/mobile screenshots visually inspected; Download remains secondary to Continue.
- [x] Direct cleanup verification found `0` Download fixtures, `0` upload sessions and `0` uploaded test assets.
- [x] Documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed.
- [x] PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Durable Media Download v0.1 status: `APPROVED` and merged.**

### Durable media Rename v0.1 — merged PR #12
UI-025: Rename changes durable human-facing display identity only.

- [x] Add one Viewer-only `Rename` action beside Download.
- [x] Add `PATCH /api/media/assets/[assetId]` against opaque durable media identity.
- [x] Update only `media_assets.display_name`; preserve original filename, MIME, R2 storage key and generated provenance/prompt.
- [x] Remove controls, collapse whitespace, require a non-empty name and cap at 240 characters.
- [x] Keep uploaded/generated Download naming unchanged after Rename.
- [x] Keep Library search immediately discoverable through existing `display_name` search.
- [x] Keep the edit interaction feature-owned and inline; no modal/global management framework.
- [x] Refine Viewer composition so Rename and Download remain side-by-side while the editor expands beneath them.
- [x] Configured Media Rename Visual `33074480356` passed with real R2/Supabase fixtures and Chromium.
- [x] Refined-head UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, and Rename `33074480356` passed.
- [x] Library Lifecycle `33074480489` passed on rerun after an unrelated stale shared test fixture was identified and removed.
- [x] Four refined desktop/mobile edit/renamed screenshots from `33074480356` were visually inspected.
- [x] Remove both unrelated stale lifecycle database/R2 fixtures exposed during PR validation; cleanup runs `33075125636` and `33076888858` deleted the exact orphaned objects, with the second run HEAD-verifying absence.
- [x] Serialize the shared configured Library lifecycle workflow with `concurrency: renderlab-library-lifecycle-shared` to avoid overlapping mutable fixture windows.
- [x] Harden `verify-library-lifecycle.mjs` to select the exact durable asset ID returned by its own upload completion while separately asserting the expected display name; fixture-name uniqueness is not assumed.
- [x] Final exact head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Search `33077320839`, Upload Integration `33077320935`, Download `33077320886`, Rename `33077321228`, and Library Lifecycle `33077320976`.
- [x] Direct pre-merge cleanup verified `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions.
- [x] PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

**Durable Media Rename v0.1 status: `APPROVED` and merged.**

### Library history ordering v0.1 — merged PR #14 / UI-027
UI-027: chronological direction is URL-owned server-side durable-media state, not a client filter or organization schema.

- [x] Keep Newest first as the canonical default; omit default `sort=newest` from clean links.
- [x] Add explicit `sort=oldest` navigation and validate `newest|oldest` at the product API boundary.
- [x] Order durable `media_assets` by `created_at` plus `id` in the same direction for deterministic pagination.
- [x] Compose ordering with `q`, All/Images/Videos, Clear and bounded pagination; changing sort clears stale offset.
- [x] Use direction-aware `Newer` / `Older` pagination labels.
- [x] Add maintained shadcn/Radix Dropdown Menu primitive and feature-owned `LibrarySortMenu`; no bespoke selector or generic filter console.
- [x] Add configured Library History Visual with exact R2/Supabase fixtures, controlled timestamps, API order/pagination/kind assertions, real Chromium menu interaction, desktop/mobile screenshots and self-cleanup.
- [x] Harden the verifier to wait for `domcontentloaded` plus explicit UI/card readiness instead of flaky media-grid `networkidle`.
- [x] Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`.
- [x] Visually inspect desktop Oldest, open Dropdown menu and mobile Newest screenshots; no unintended Library hierarchy/layout drift found.
- [x] Direct Supabase cleanup verification found `0` `library-history-order-v0-1` media fixtures and `0` upload sessions.
- [x] Explicitly defer Favorites/Collections until RenderLab has an account/user ownership model; do not add global durable-media favorite flags.
- [x] Explicitly defer Delete until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.
- [x] Final documentation-head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed UI Shell `33097006928`, Create Lifecycle `33097006913`, Persistent Media Upload Integration `33097007064`, Library Lifecycle `33097006853`, Library Search `33097007092`, Library History `33097006833`, Media Download `33097006968`, and Media Rename `33097006959`.
- [x] PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; merged `main` UI Shell `33097463519` passed.

**Library history ordering v0.1 status: `APPROVED` and merged.**

### Library drag-and-drop upload v0.1 — merged PR #15 / UI-028
UI-028: drag/drop is an optional interaction path into the existing persistent upload contract, not a new media or storage model.

- [x] Keep the visible Upload button + native file picker as the keyboard/touch/mobile baseline.
- [x] Reveal a temporary full-Library drop affordance only during an active file drag; no always-visible dropzone.
- [x] Accept one dropped PNG/JPEG/WebP image at a time, using the same 25 MB limit and existing ticket → signed R2 PUT → completion → durable promotion flow.
- [x] Extract the shared browser transaction into feature-owned `library-upload-client.ts`; picker and drag/drop do not maintain parallel upload implementations.
- [x] Reject multi-file drops locally before any upload ticket/completion request starts.
- [x] Keep success/error feedback local and refresh the server-owned Library after completion; no global toast/store.
- [x] Add configured `Library Drag Drop Visual` with real browser DataTransfer, R2/Supabase promotion, exact ticket/completion/session/asset/card uniqueness assertions, responsive screenshots and cleanup.
- [x] Serialize drag/drop verification with the existing shared Library lifecycle fixture lock.
- [x] Harden configured fixtures with run-unique drag/drop filenames and pre-run cleanup of the `renderlab-drop-*` namespace plus the known stale legacy lifecycle fixture.
- [x] Implementation head `d957242d9b45fbb9fb115c8fd2b0a4dc60dc88ef` passed UI Shell `33102672560`, Library Search `33102672572`, Library History `33102672507`, Library Lifecycle `33102672568`, and Library Drag Drop `33102672468`.
- [x] Visually inspect clean desktop drag-active/completed and mobile completed screenshots; drop affordance is temporary, completed desktop has exactly one current run-owned card with valid preview, and mobile preserves the ordinary Upload baseline.
- [x] Final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`.
- [x] Drag Drop `33109026739` verified pre-run namespace cleanup, real DataTransfer upload through the existing ticket → signed R2 PUT → completion path, exact one upload session/durable asset/rendered card, and post-run cleanup for `renderlab-drop-33109026739-اختبار-画像.png`.
- [x] Re-review exact-head desktop drag-active/completed and mobile completed screenshots; no redesign or responsive hierarchy drift found.
- [x] Direct Supabase cleanup after the exact-head suite verified `0` drag/drop sessions, `0` drag/drop assets, `0` legacy lifecycle sessions and `0` legacy lifecycle assets.
- [x] Merge PR #15 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8` using the expected exact-head SHA guard.
- [x] Verify merged `main`: push-triggered UI Shell `33109435978` passed on merge commit `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`.

**Library drag-and-drop upload v0.1 status: `APPROVED` and merged.**

### Account identity foundation v0.1 — merged PR #16 / UI-029
UI-029 establishes a real RenderLab account principal without pretending media ownership is already enforced.

- [x] Use Supabase Auth `auth.users.id` as the canonical future account identity.
- [x] Replace the Settings placeholder with compact email/password sign-in, account creation and sign-out states composed from maintained Field/Input/Button/Alert/Spinner primitives.
- [x] Use `@supabase/ssr` cookie sessions with root `proxy.ts` refresh and verified server claims; expose only the public project URL/publishable key to browser code.
- [x] Keep existing Create and Library routes available and visually unchanged in this slice; identity does not become a global login wall.
- [x] Add configured `Account Identity Visual` with an exact run-owned confirmed Supabase test user, real Settings sign-in, cookie persistence across reload, responsive signed-in/signed-out screenshots and exact user cleanup.
- [x] Final exact PR head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`.
- [x] Visually inspect desktop signed-in and mobile signed-in/signed-out Settings screenshots; the existing shell hierarchy and bottom navigation remain intact and long account email text wraps safely.
- [x] Direct final shared-resource verification found `0` account CI users, `0` drag/drop upload sessions/assets and `0` legacy Library lifecycle sessions/assets.
- [x] Merge PR #16 as `bcb20365db102252db51263968de96fc795be518` using the expected exact-head SHA guard.
- [x] Verify merged `main`: UI Shell `33113289145` and Reference Upload Integration `33113289156` passed on merge commit `bcb20365db102252db51263968de96fc795be518`.

**Account identity foundation v0.1 status: `APPROVED` and merged.**

### Core account ownership v0.1 — merged PR #17 / UI-030
UI-030 establishes account-private ownership across RenderLab's existing generation/reference/upload/media records before any personal organization feature is allowed.

- [x] Apply rolling prepare migration `0004_core_account_ownership_prepare.sql` as `20260827203604 renderlab_core_account_ownership_prepare`; add nullable `owner_id -> auth.users.id ON DELETE RESTRICT`, owner-time indexes and revoke direct `anon`/`authenticated` raw-table grants while keeping RLS enabled.
- [x] Thread verified non-anonymous Supabase `claims.sub` through private Library/Viewer/media/upload/reference/generation routes and server services.
- [x] Create generation sources/jobs, persistent upload sessions/assets and generated output assets with the authenticated owner.
- [x] Scope list/read/update/completion/poll/input-resolution operations by owner so foreign opaque IDs collapse to normal not-found behavior.
- [x] Keep Create draftable while signed out, but require sign-in before persistent upload/generation actions.
- [x] Pass the configured two-account ownership gate on exact product SHA `7dfda5e61b787f6ac30ed905ccc565e3bc32266b` in run `33115683962`, including production build, configured app startup, own-vs-foreign media/job denial, owner-bound upload/reference writes, raw Data API denial and cleanup.
- [x] Correct staged `0005_core_account_ownership_enforce.sql` at `7f0b74887ec8bb84a3fb17c4542d83f0ddc8177e` after a rollback-only simulation exposed that one shared polymorphic trigger function referenced a field unavailable on `media_assets`; split the media→job and upload→asset checks into table-specific trigger functions.
- [x] Semantically verify the corrected `0005` transactionally against the live prepared schema: same-owner links succeed; cross-owner media→job and upload→asset links fail on insert/update; owner reassignment and null ownership fail; Auth-owner deletion is restricted while owned rows exist; all six enforcement triggers exist inside the transaction.
- [x] Verify existing cleanup semantics under corrected `0005`: deleting a generation job still sets linked `media_assets.generation_job_id` to null, while deleting an uploaded media asset still cascades its `media_upload_sessions` row.
- [x] Roll back all enforcement simulations and verify four nullable owner columns, zero enforcement triggers/functions, zero simulation Auth users and zero core rows remain afterward; migration history still contains only applied `0004`.
- [x] Require authenticated server-to-server transport for the optional external RenderLab generation adapter: URL alone no longer activates it; `RENDERLAB_GENERATION_BACKEND_URL` + server-only `RENDERLAB_GENERATION_BACKEND_TOKEN` are required, and both submit/poll send bearer auth before forwarding `x-renderlab-owner-id`. Native generation remains the fallback when that pair is incomplete.
- [x] Strengthen current verifier to cover both owners' own lists, signed-out persistent actions, unchanged foreign upload/reference pending rows and raw Data API denial on all four core tables.
- [x] Make configured account cleanup reconstructible from deterministic owner IDs so fresh-runner reruns clean only their own DB/R2 state before Auth-user recreation.
- [x] Remove active namespace-wide destructive drag/drop cleanup and scope fixed-name/run-name fixture discovery/deletion to deterministic owners.
- [x] Align Generation Image/Edit and Video/Animate workflow timeout budgets with their sequential verifier deadlines.
- [x] Make the repository public to remove the private-repository GitHub-hosted Actions capacity block; verify hosted runners acquire normally afterward.
- [x] Run the complete configured suite on exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82`: Account Ownership `33131090207`, Account Identity `33131090197`, UI Shell `33131090250`, Create Lifecycle `33131090243`, Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265`, Media Download `33131090206`, Media Rename `33131090198`, Reference Upload `33131090263`, Generation Integration `33131090251`, and Video Generation `33131090262` all passed.
- [x] Fix the verifier-only Playwright redirect-auth bug exposed by resumed CI: local product media routes are authenticated with a non-following fetch and the browser follows signed R2 redirects without carrying the fixture bearer. Create Lifecycle, Library Lifecycle, Download and Rename all pass after the shared helper fix.
- [x] Review fresh exact-head screenshots/artifacts: signed-out Library private-account state and signed-in Create/Library/Viewer desktop/mobile states preserve the approved hierarchy with no unintended UI drift.
- [x] Re-audit shared Supabase after exact-head CI: all four ownership tables contain 0 rows / 0 null owners, browser roles have no direct grants, all four owners remain nullable for rolling rollout, enforcement trigger count is 0, migration history ends at applied `0004`, and no RenderLab fixture Auth users remain.
- [x] Run Supabase advisors: security reports only expected informational RLS-with-no-policy notices for the deliberately server-owned tables; performance reports unused-index INFO findings on currently empty/low-traffic tables, with no UI-030 remediation required.
- [x] Final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates; merge PR #17 as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; merged `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` passed.
- [x] Merge Deployment Readiness PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed 15/15 configured gates, including the permanent non-deploying readiness build and the run-scoped fixture-isolation regression; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. No Vercel deployment was created by the merge, and the final shared-Supabase audit was clean with corrected `0005` still unapplied.
- [x] Complete the separately authorized owner-aware rollout: production deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` became READY from exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c`; live two-account run `33196254711` passed; the final no-unowned-row audit was clean; corrected `0005_core_account_ownership_enforce.sql` was applied as `20260828174940 renderlab_core_account_ownership_enforce`; all four owners are `NOT NULL`, all six expected enforcement triggers are active, and post-enforcement production run `33196534150` passed with clean fixture cleanup.

The earlier zero-step/no-log Actions failures were a private-repository hosted-capacity issue, not a RenderLab regression. Making the repository public restored runner allocation immediately; the resumed exact-head suite produced real build/browser/integration evidence and is fully green on `49f08013dc428d8d390a1bd803b10886f853cd82`.

**Core account ownership v0.1 status: `APPROVED`; owner-aware production is live, corrected `0005` is applied/verified, the post-enforcement production ownership suite is green, and automatic Vercel Git deployment remains disabled.**

### R2 browser-origin boundary
Direct browser PUT CORS remains exact-origin restricted to the approved localhost CI origins and current stable RenderLab Vercel origins. The admin-capable R2 access-key credentials reconcile the managed rule through the S3 API during configured lifecycle verification. If a future public origin changes, add it explicitly before direct browser upload use. Download uses product-route → signed-R2 top-level GET navigation and does not add a new upload-CORS requirement. Rename mutates Supabase metadata only and does not rename/move R2 objects or add a new CORS requirement. History ordering is a server-side Supabase query concern and adds no R2/CORS requirement. Drag/drop reuses the persistent direct-browser upload path and adds no new R2/CORS contract.

### Follow-ups after Core Account Ownership
- [x] PR #17 merged after final documentation-head validation; the merge did not authorize or complete a production rollout.
- [x] Owner-aware runtime is live through the separately authorized rollout; no-unowned-row audits passed before enforcement; corrected `0005` is applied and verified; the live post-enforcement two-account suite and cleanup are green.
- [x] Select Favorites v0.1 / UI-031 as the next approved personal-organization slice now that the owner-scoped data boundary is fully enforced; Collections remains a separate later contract.
- [ ] Delete and batch management after storage/reference/recovery semantics are explicit.
- [ ] Other Library interaction enhancements only when separately justified.

These require explicit RenderLab-owned contracts. Do not infer Saga organization/destructive-action schemas automatically.

### Library Favorites v0.1 — UI-031
Favorites is the first personal Library organization slice after completed UI-030 ownership enforcement. Keep it intentionally smaller than a Collections or batch-management system.

- [x] Establish the RenderLab-owned UI-031 contract: durable account-owned `media_assets` carry nullable favorite state; Library gets a URL/server-owned Favorites filter; Media Viewer gets one owner-scoped toggle.
- [x] Apply additive `0006_media_favorites.sql` as `20260828183102 renderlab_media_favorites`; `favorited_at` is nullable, the partial owner/favorites browse index exists, `owner_id` remains `NOT NULL`, RLS remains enabled, browser grants remain zero and the media table remained empty after migration.
- [x] Extend the typed media contract and owner-scoped list service with favorite state plus `favorite=true` filtering that composes with kind/search/sort/pagination.
- [x] Add an idempotent owner-scoped favorite mutation API with signed-out denial and foreign-ID not-found behavior.
- [x] Integrate a compact Favorites filter into the approved Library toolbar without redesigning the media grid or adding a new top-level destination.
- [x] Integrate one accessible favorite toggle into Media Viewer Actions while preserving Rename/Download behavior and continuation hierarchy.
- [x] Add configured Favorites verification covering own/foreign accounts, signed-out denial, favorite/unfavorite idempotence, Library query composition, responsive Viewer/Library screenshots and exact DB/R2/Auth cleanup.
- [x] Run the affected exact-head GitHub gates, review responsive artifacts, and audit shared Supabase cleanup/security state; exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates and cleanup/security verification is clean.
- [x] Finalize documentation and rerun the same 13-gate matrix on exact head `4bd41d55af27c7240d75862424039fc59027988e`; all passed before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`.
- [x] Verify merged `main` push checks and post-merge cleanup: UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` passed; shared Supabase returned to zero fixtures with ownership/RLS/Favorites schema intact; Vercel created no deployment from the merge.

**Library Favorites v0.1 status: `APPROVED`. PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after final documentation head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 applicable gates. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**

Implementation-head evidence: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198` all passed. Configured Favorites verification covered signed-out denial, two-account own/foreign isolation, idempotent PUT/DELETE behavior, composed favorite/kind/search/sort filtering, real responsive Library/Viewer browser interaction and exact cleanup. Four fresh Favorites screenshots were visually reviewed clean.

Final documentation-head evidence: Library Favorites `33205471360`, Account Ownership `33205471266`, UI Shell `33205471298`, Create Lifecycle `33205471299`, Library Search `33205471263`, Library History `33205471326`, Library Lifecycle `33205471335`, Library Drag Drop `33205471286`, Persistent Media Upload `33205471255`, Media Download `33205471419`, Media Rename `33205471361`, Generation Integration `33205471331`, and Video Generation `33205471358` all passed on unchanged product tree plus finalized documentation. Final pre-merge and post-merge Supabase verification returned 0 core rows, 0 null owners, 0 fixture users, 0 browser grants, four RLS-enabled core tables, four non-null owner columns and all six UI-030 enforcement triggers; `favorited_at` remains nullable, the partial favorite index remains present, and `0006` remains latest. Security advisors remain only the expected informational RLS-with-no-policy notices for deliberately server-owned tables, while performance advisors report unused-index INFO on empty/low-traffic tables including the favorite index.

### Library Collections v0.1 — UI-032
Collections is the second personal Library organization slice after approved Favorites. It remains a separate owner-scoped relation/model rather than expanding `favorited_at` into a generic organization system.

- [x] Select Collections as the next Phase 4 slice in the documented order.
- [x] Establish the RenderLab-owned UI-032 contract: account-owned named collections; many-to-many membership over same-owner durable `media_assets`; one URL/server-owned Library collection filter; Viewer-only create/add/remove membership.
- [x] Apply additive `0007_media_collections.sql` as `20260828201740 renderlab_media_collections`; verify RLS, zero browser grants, `NOT NULL` immutable owners and same-owner collection/media membership enforcement.
- [x] Implement owner-scoped collection list/create and idempotent membership APIs; signed-out mutation is denied and foreign collection/asset IDs collapse to owner-scoped not-found behavior.
- [x] Compose `collection=<uuid>` with existing Library kind/search/Favorites/sort/pagination without client-only filtering or a new top-level route.
- [x] Integrate the compact Library collection selector and Viewer collection membership panel without redesigning cards or continuation hierarchy.
- [x] Add configured two-account Collections verification with database integrity assertions, real Chromium Library/Viewer interaction, four responsive screenshots and exact DB/R2/Auth cleanup.
- [x] Fix the verifier-only create-and-add timing assertion exposed by the first browser run; verification waits for persisted `aria-pressed=true` rather than assuming visibility means membership persistence completed.
- [x] Remediate the Supabase performance advisor's uncovered `media_asset_id` foreign-key lookup with additive `0008_media_collection_asset_fk_index.sql`, applied as `20260828202601 renderlab_media_collection_asset_fk_index`.
- [x] Final exact head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 applicable gates: Library Collections `33210501106`, Account Ownership `33210501089`, UI Shell `33210501226`, Create Lifecycle `33210501211`, Library Search `33210501182`, Library History `33210501191`, Library Lifecycle `33210501160`, Library Drag Drop `33210501202`, Persistent Media Upload `33210501130`, Media Download `33210501133`, Media Rename `33210501203`, Library Favorites `33210501168`, Generation Integration `33210501178`, and Video Generation `33210501167`.
- [x] Visually review the four passing Collections artifacts: desktop/mobile Library preserve the approved grid/toolbar hierarchy; desktop/mobile Viewer keep Continue dominant and Collections contextual beneath Favorites without displacing Rename/Download.
- [x] Merge PR #24 as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`; verify merged `main` checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085`; final shared Supabase cleanup is zero across all six RenderLab tables with six RLS tables, six non-null owners, zero browser grants, nine ownership/integrity triggers and `0008` latest.
- [x] Verify Vercel created zero RenderLab deployments after the merge; automatic Git deployment remains disabled.

**Library Collections v0.1 status: `APPROVED`. PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` after final exact head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 applicable gates. Collection rename/delete, card/batch membership and Delete/batch media management remain out of scope.**

Final exact-head evidence: Library Collections `33210501106`, Account Ownership `33210501089`, UI Shell `33210501226`, Create Lifecycle `33210501211`, Library Search `33210501182`, Library History `33210501191`, Library Lifecycle `33210501160`, Library Drag Drop `33210501202`, Persistent Media Upload `33210501130`, Media Download `33210501133`, Media Rename `33210501203`, Library Favorites `33210501168`, Generation Integration `33210501178`, and Video Generation `33210501167` all passed. Configured Collections verification covered signed-out denial, two-account collection isolation, same-owner database enforcement, owner immutability, idempotent PUT/DELETE membership, composed `collection + favorite + kind + search + sort` filtering, real Viewer create/add/remove behavior, responsive Library filtering and exact cleanup.

Applied schema evidence: `0007 = 20260828201740 renderlab_media_collections`; `0008 = 20260828202601 renderlab_media_collection_asset_fk_index`. Final pre-merge and post-merge audits both returned all six RenderLab tables and fixture users to zero while retaining zero browser grants, six RLS-enabled tables, six `NOT NULL` owner columns, nine ownership/integrity triggers and the normalized-name/owner-asset/asset-FK indexes.

### Durable media Delete v0.1 — PR #25 / UI-033
UI-033 resolves the previously blocked destructive-media contract with the smallest coherent action: one permanent Media Viewer Delete. Batch/card selection remains a separate future slice.

- [x] Define tombstone-first semantics in `UI_DECISIONS.md`: `deleted_at` makes media immediately unavailable; `purged_at` records completed R2 cleanup; user restore/trash is not part of v0.1.
- [x] Preserve generation-job input/output media IDs as historical opaque references instead of rewriting execution history.
- [x] Apply `0009_media_asset_deletion.sql` as `20260828221611 renderlab_media_asset_deletion`.
- [x] Keep deleted rows out of ordinary owner-scoped Library/Viewer/content/thumbnail/download/Favorites/Collections reads and out of new generation-input resolution.
- [x] Clear Favorite state plus collection/upload-session links on the first tombstone at the database boundary.
- [x] Add owner-scoped idempotent `DELETE /api/media/assets/[assetId]`; purge primary + optional thumbnail R2 objects and set `purged_at` only after physical cleanup succeeds.
- [x] Return truthful cleanup-pending state when tombstoning succeeds but R2 cleanup does not; never reverse a tombstone.
- [x] Reject tombstoned media before native or external generation submission; do not implicitly cancel generation already in flight.
- [x] Add maintained Radix/shadcn AlertDialog confirmation and one visually secondary Viewer Delete action; do not add Library-card or batch actions.
- [x] Add configured two-account Media Delete lifecycle covering signed-out/foreign denial, database cleanup, R2 purge, historical-job preservation, idempotence, generation-input rejection, responsive confirmation UI and exact cleanup.
- [x] Decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 applicable gates: Media Delete `33216665876`, Account Ownership `33216665938`, UI Shell `33216665773`, Create Lifecycle `33216665796`, Library Search `33216665758`, Library History `33216665833`, Library Lifecycle `33216665791`, Library Drag Drop `33216665793`, Persistent Media Upload `33216665806`, Media Download `33216665819`, Media Rename `33216665790`, Library Favorites `33216665770`, Library Collections `33216665804`, Generation Integration `33216665787`, and Video Generation `33216665774`.
- [x] Visually review desktop/mobile Delete confirmation artifacts; Continue remains dominant, existing Favorite/Collections/Rename/Download composition is preserved and mobile confirmation remains touch-friendly.
- [x] Pre-finalization shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants, nullable `deleted_at`/`purged_at`, deletion triggers and `media_assets_owner_active_created_at_idx` intact.
- [x] Post-`0009` Supabase advisors show no new actionable security/performance issue: expected server-owned no-policy INFO plus unused-index INFO only.
- [x] Final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed the complete 15-gate suite: Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`.
- [x] Merge PR #25 as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`; merged-`main` checks UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed.
- [x] Verify post-merge shared-resource cleanup: all six RenderLab tables and configured fixture users returned to zero; RLS/owner/grant/deletion invariants remain intact; Vercel created zero deployments from the merge.

**Durable Media Delete v0.1 status: `APPROVED`. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445` after final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 affected gates. Batch media management remains a separate future contract.**

### Library Batch Delete v0.1 — PR #29 / UI-034
UI-034 extends approved single-asset Delete with the smallest coherent Library batch contract. Selection remains transient and page-scoped; deletion remains per-asset and idempotent rather than pretending database + R2 cleanup is globally transactional.

- [x] Select page-scoped Library Batch Delete as the next Phase 4 media-management slice.
- [x] Define UI-034: explicit Library selection mode, current-page selection only, maximum 24 durable IDs, reset across Library view navigation, and no global media selection store.
- [x] Add maintained Radix Checkbox plus a feature-owned `LibraryBatchSelection` composition without redesigning the approved Library toolbar/grid hierarchy.
- [x] Add owner-scoped `POST /api/media/assets/batch-delete` with UUID validation, deduplication, a one-page/24-item cap and per-item results.
- [x] Reuse the existing UI-033 `deleteMediaAsset` contract per item; successful tombstones/purges are not rolled back because another selected asset fails.
- [x] Keep foreign/missing IDs indistinguishable as per-item not-found; retain failed active IDs for retry and report cleanup-pending success truthfully.
- [x] Add configured two-account batch verification covering request bounds, signed-out/foreign denial, mixed partial success, Favorite/collection/upload-session cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotence, page-scoped selection reset, responsive confirmation and exact cleanup.
- [x] Correct the first browser verifier timing issue by immediately hiding successfully deleted cards while the authoritative server refresh catches up; the underlying API/database/R2 deletion had already succeeded and cleanup remained exact.
- [x] Implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected gates: Library Batch Delete `33220127853`, Account Ownership `33220127858`, UI Shell `33220127872`, Create Lifecycle `33220127874`, Library Search `33220127883`, Library History `33220127859`, Library Lifecycle `33220127864`, Library Drag Drop `33220127921`, Persistent Media Upload `33220127879`, Media Download `33220127852`, Media Rename `33220127885`, Library Favorites `33220127888`, Library Collections `33220127868`, Media Delete `33220127873`, Generation Integration `33220127851`, and Video Generation `33220127855`.
- [x] Visually review the successful configured artifacts: desktop selection remains compact, selected cards remain media-first, destructive confirmation is explicit, and the mobile dialog remains touch-friendly without hierarchy drift.
- [x] Pre-finalization shared-resource audit is clean: all six RenderLab tables and configured fixture users are back to zero; six RLS tables, six non-null owner columns, zero browser grants, nullable `deleted_at`/`purged_at`, all three deletion-integrity triggers and `media_assets_owner_active_created_at_idx` remain intact; `20260828221611 renderlab_media_asset_deletion` remains the latest migration.
- [x] Final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`.
- [x] Merge PR #29 as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; merged-`main` checks UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed.
- [x] Verify post-merge shared-resource cleanup: all six RenderLab tables and configured fixture users returned to zero; six RLS tables, six non-null owners, zero browser grants, nullable deletion timestamps, all three deletion-integrity triggers and `media_assets_owner_active_created_at_idx` remain intact; `20260828221611 renderlab_media_asset_deletion` is still latest. Vercel created zero deployments after the merge.

**Library Batch Delete v0.1 status: `APPROVED`. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8` after final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates. Cross-page selection, Trash/restore, batch Favorites/Collections and other bulk-management actions remain separate future contracts.**

## Phase 5 — Operational & Secondary Experiences

### Activity v0.1 — PR #34 / UI-035
UI-035 replaces the Activity placeholder with the smallest useful account-private generation-history surface. Job state stays product-level; worker/provider/workflow routing remains internal.

- [x] Select Activity/jobs as the first Phase 5 operational slice.
- [x] Read recent `generation_jobs` by verified owner only, newest-first, 20 per page with bounded offset pagination.
- [x] Show real queued/preparing/running/persisting/succeeded/failed/cancelled state without fabricated percentages.
- [x] Lightly refresh only while active jobs exist and reuse the existing owner-aware poll path; preserve stored state if live polling is unavailable.
- [x] Sanitize failure copy so provider/worker/gateway detail is not rendered as product UI.
- [x] Link completed results only when the referenced owner `media_assets` row is still active; preserved UI-033 historical output IDs do not create dead Viewer actions after deletion.
- [x] Add explicit signed-out/unavailable/empty states and keep Activity private to the verified account.
- [x] Add configured two-account Activity verification covering privacy, pagination, active status, error redaction, active/deleted result-link behavior, responsive desktop/mobile rendering and exact cleanup.
- [x] Implementation head `153e2a10daebea7c0a8fdfa0dfb786533b9c1c4c` passed Activity `33222845134`, Account Ownership `33222845130`, UI Shell `33222845124`, Create Lifecycle `33222845174`, Generation Integration `33222845170`, and Video Generation `33222845127`.
- [x] Visually review the passing Activity desktop/mobile artifacts; status hierarchy, secondary result action, failure treatment and existing shell behavior remain coherent.
- [x] Pre-finalization shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants and `20260828221611 renderlab_media_asset_deletion` still latest.
- [x] Final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed all six affected gates: Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`.
- [x] Merge PR #34 as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4`; merged-`main` UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed. Post-merge shared-resource cleanup returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners and zero browser grants; `0009` remains latest. Vercel created zero deployments after the merge.

**Activity v0.1 status: `APPROVED`. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4` after exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed the complete six-gate suite. Cancellation/retry controls, global job state, worker management and workflow/model inspection are not part of UI-035.**

- [x] Evaluate Models/Workflows as dedicated user-facing surfaces. The current verified capability set does not justify them: Create already exposes the approved user goals while model/workflow/ecosystem identity remains replaceable execution metadata under UI-008/UI-011 and `PRODUCT_CAPABILITIES.md`.
- [x] Settings account identity foundation backed by Supabase Auth / UI-029; broader settings remain requirement-driven.
- [x] Audit additional capability-specific experiences against the current verified capability set. No additional experience is approved today; extensibility categories remain architecture pressure-tests, and any future approved user goal becomes a new explicit slice instead of an indefinite open checkbox.

### Create Upload Reliability + Video Audio v0.1 — UI-036
- [x] Reproduce/trace the production reference-upload failure: ticket creation succeeds, completion is never reached, and exact-origin R2 CORS rejects the immutable manual-deployment hostname while approved stable RenderLab aliases pass.
- [x] Keep exact-origin R2 CORS; do not add wildcard deployment-host access. Treat stable production aliases as the supported direct-browser-upload entry points.
- [x] Add a shared browser-upload origin guard for the existing Create reference and Library persistent upload paths so unsupported Vercel deployment URLs fail before creating storage tickets and return actionable product copy instead of raw `Failed to fetch`.
- [x] On failed Create reference upload, remove the unverified local preview so Create cannot silently fall back from Edit/Animate to a no-reference operation.
- [x] Add a contextual Video audio on/off Toggle using the maintained primitive; default audio on.
- [x] Thread `audioEnabled` through the typed generation request/API validation and native worker form while preserving default-on compatibility for callers that omit the field.
- [ ] Pass production build, UI purity, reference/upload, Create, ownership, generation and video regressions on the implementation head.
- [ ] Review desktop/mobile Video audio-control artifacts.
- [ ] Finalize authoritative architecture/screen/component documentation from verified implementation evidence.
- [ ] Pass the complete affected suite on the exact documentation-finalized head.
- [ ] Merge, verify merged `main`, shared-resource cleanup and Vercel no-automatic-deployment boundary.

**UI-036 status: `IN IMPLEMENTATION`. No schema migration or worker-fleet change is part of this slice.**

## Feature/Surface Procedure
1. Establish the user goal and required behavior.
2. Inspect applicable RenderLab decisions/components and architecture.
3. Compose conventional visible controls from the approved maintained primitive layer; search approved component sources before implementing any new generic interaction mechanic.
4. Inspect Saga only when useful as behavioral/backend reference.
5. Inspect the actual backend/capability contract.
6. Decide default vs contextual vs advanced complexity.
7. Use Penpot/open SVG artifacts when visual exploration reduces implementation churn.
8. Implement the smallest coherent experience.
9. Run production build, UI purity and affected lifecycle validation through GitHub.
10. Check responsive/accessibility behavior and inspect rendered output.
11. Update authoritative documentation from verified reality.

## Current Work
**Current phase:** Phase 5 — Operational & Secondary Experiences.
**Current product slice:** None. Activity v0.1 / UI-035 is complete and approved.
**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, Library Batch Delete PR #29 / UI-034, and Activity PR #34 / UI-035 are merged and approved.
**Completed foundation/maintenance:** PR #13 / UI-026 maintained primitive purity refactor; PR #16 / UI-029 Account Identity; PR #33 removed the unused Studio compatibility adapter and verified external/native generation routing.
**Current gate:** None. The currently defined Phase 5 backlog is complete.
**Next product slice:** None selected. Models/Workflows and additional capability-specific experiences were evaluated against the current verified capability set and are not justified as separate surfaces today; future approved user goals require new explicit contracts.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
