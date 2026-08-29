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

## Post-Phase-5 Production Usability Maintenance

### Custom-domain browser upload CORS — PR #36
- [x] Trace the reported browser `Failed to fetch` during direct signed-R2 upload from `https://renderlab.faresuniform.uk` to missing browser-origin coverage rather than changing the upload API/session/ownership model.
- [x] Add `https://renderlab.faresuniform.uk` to the canonical `RENDERLAB_BROWSER_UPLOAD_ORIGINS` used by configured Library upload lifecycle validation.
- [x] Keep the approved ticket → signed PUT → completion → HEAD verification → durable promotion contract unchanged.
- [x] Final head `a66bcff942efa82b9823f031b25487e97eeb3fa6` passed Library Lifecycle `33238196620` and Library Drag Drop `33238196599`; configured verification returned a successful `204` PUT preflight and completed a real upload lifecycle.
- [x] Merge PR #36 as `0d4f05980e78a3c3b29beb68e91ebf0e225d2815`; merged-`main` Generation Integration `33238360406`, Video Generation `33238360399`, and UI Shell `33238360429` passed.

**Custom-domain upload CORS status: `APPROVED` maintenance. No upload API, schema, authentication or ownership contract changed.**

### Video audio control — PR #37 / UI-036
- [x] Expose Audio on/off only for Video output as an understandable contextual Create control; default ON.
- [x] Centralize `defaultVideoAudioEnabled = true` in the capability contract and serialize the user choice as `output.audioEnabled`.
- [x] Validate `audioEnabled` as a boolean video-only field; reject it on Image requests.
- [x] Map the validated product value to native REDGraft `audio_enabled` instead of hardcoding audio on.
- [x] Keep the control on the maintained Toggle primitive and preserve the approved Create composition; mobile essential controls wrap so Audio, duration, Advanced and Generate remain reachable.
- [x] Extend configured Video Generation verification to exercise Audio OFF for Create Video and Audio ON for Animate Image and verify persisted job request parameters.
- [x] Final head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates: Account Ownership `33239584670`, UI Shell `33239584665`, Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676`, Media Delete `33239584663`, Library Lifecycle `33239584662`, and Activity `33239584661`.
- [x] Merge PR #37 as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation Integration `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.

**Video audio control status: `APPROVED` maintenance. No schema migration or unrelated Create redesign was introduced.**

## Cycle 2 — Creative Productivity & Beta Maturity

**Roadmap status: `ACCEPTED`. Cycle execution status: `IN PROGRESS`.**

Cycle 1 / Phases 0–5 and the post-Phase-5 production-usability maintenance established the product foundation. Cycle 2 is a new development cycle focused on repeated creative productivity and beta maturity; it must not reinterpret completed Cycle 1 work as unfinished backlog.

### Phase 6 — Cycle 2 Baseline & Production Hardening

**Phase contract status: `EXPANDED/PLANNED`. Execution status: `IN PROGRESS`; verified audit evidence is complete pending the beta operating-boundary decision.**

#### Goal
Establish a truthful, current Cycle 2 baseline before new product capability is implemented. Phase 6 reconciles the authoritative repository with actual production deployment, custom-domain behavior, shared infrastructure, current generation capability and operational constraints.

#### User value
Prevent Cycle 2 from shipping on stale assumptions. The Phase 6 result should give later features a verified capability boundary, safer defaults, clear production expectations and a deliberate beta-access posture.

#### Verified planning starting state
- Planning baseline `main` is `d01dad1da6ddd94a8c823274f47b9f45a3ced459`; Phase 6 execution must re-check `main` because this SHA is not frozen.
- Phases 0–5 and post-Phase-5 production-usability maintenance are recorded complete.
- Current approved product surfaces are Create, Library, Media Viewer, Activity and Settings; Phase 6 does not redesign them.
- Current product creative operations are Create Image, Edit Image, Create Video and Animate Image.
- Multi-reference image edit and video resolution are audited backend capabilities, not yet Cycle 2 product contracts.
- Private core records are owner-scoped by verified Supabase Auth identity; raw core tables remain server-only with RLS enabled and no browser grants.
- Automatic Git → Vercel deployment remains disabled; merge does not authorize deployment.
- `renderlab.faresuniform.uk` is the approved custom production domain and approved direct-browser R2 PUT CORS origin.

#### In scope
1. **Repository → production reconciliation:** verify exact current `main`, actual Vercel project/production deployment SHA, aliases, custom-domain attachment/status and the names/presence of required production environment variables without reading or exposing secret values.
2. **Production-domain health:** verify DNS, TLS and HTTPS for `renderlab.faresuniform.uk`, then run the minimum non-destructive signed-out/private-route checks needed to prove the current application boundary.
3. **Account/privacy baseline:** when configured, use exact run-owned test accounts to verify sign-in/session persistence, signed-out denial and own/foreign isolation for any private production data touched; remove exact fixtures afterward.
4. **Custom-domain upload/media baseline:** verify the existing ticket → signed R2 PUT → completion → HEAD verification → durable promotion path from the custom production origin, plus Library/Viewer read and Download continuity, without changing the storage identity contract.
5. **Generation baseline:** verify current authorized native/external routing and the existing Create Image/Edit Image and Create Video/Animate Image persistence paths using the fewest live worker runs needed to establish the baseline; verify durable result/continuation behavior and clean exact fixtures.
6. **Capability audit — multi-reference image edit:** inspect current RenderLab capability/request/orchestration code and actual configured worker behavior to determine exact supported image count, semantic input roles, accepted formats/size, temporary vs durable input support, output sizing behavior and failure/fallback semantics. Saga is cross-check evidence only.
7. **Capability audit — video resolution:** determine the actual accepted/produced resolution set on the current REDGraft path, defaults and validation boundaries, interactions with aspect/duration/frame rate/audio, and failure behavior. Avoid exhaustive expensive generation when code/contract evidence plus a bounded live probe is sufficient.
8. **Operational constraints:** record observable end-to-end latency bands, timeout/retry behavior, concurrency/credit/quota signals, reliably observable provider cost and any constraint that should shape Cycle 2 defaults or beta access. If cost/quota is not reliably observable, mark it unresolved instead of guessing.
9. **Beta operating boundary:** present the verified evidence and implications for private use, closed beta or broader beta. Do not silently choose a more public access model; the user approves the operating boundary if it has not already been explicitly set.
10. **Documentation reconciliation:** update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/architecture/PRODUCT_CAPABILITIES.md` and `docs/architecture/INFRASTRUCTURE.md` from verified reality. Update `FRONTEND_ARCHITECTURE.md` or UI/screen/component docs only if the audit actually changes those contracts.

#### Explicitly out of scope
- Implementing Multi-reference Image Edit or Video quality/resolution UI.
- Creating Models, Workflows or ComfyUI top-level surfaces.
- Redesigning approved Create, Library, Viewer, Activity, Settings or shell composition.
- Changing account ownership, raw Supabase grants/RLS architecture, durable media identity or the current tombstone/delete contract.
- Applying new Supabase migrations or adding durable schema unless a verified baseline defect requires a separately approved maintenance slice.
- Adding Trash/restore, cross-page selection, cancellation, billing/credits or any Phase 8–10 feature.
- Deploying to Vercel or changing Cloudflare DNS/R2 configuration.
- Running an exhaustive provider-cost benchmark; capture reliable operational evidence and record unknowns truthfully.

#### Architecture / contracts to inspect
- `src/lib/capabilities/generation.ts` — user-facing capability defaults, limits and visibility.
- generation API contracts/routes under `src/lib/api` and `/api/generation/jobs` — normalized request, validation and persistence boundary.
- `src/server/generation/*` — workflow resolution, orchestration, worker routing, polling, persistence and failure semantics.
- `src/server/generation/worker-fleet.ts` — current primary/standby endpoint metadata.
- `src/server/media/*`, `src/server/storage/*`, `src/lib/supabase/*` — ownership, media, upload and storage boundaries.
- `vercel.json`, `next.config.ts`, `scripts/verify-vercel-env.mjs` — deployment and environment contract.
- `.github/workflows/deployment-readiness.yml` and existing configured verifiers — remote production-high-fidelity validation paths.

#### Security / ownership rules for Phase 6
- Do not expose or log secret values when checking environment configuration; verify names, presence, scopes and boundaries only.
- Use exact run-owned Auth/Supabase/R2 fixtures. Do not perform broad namespace cleanup against shared production resources.
- All private probes remain owner-scoped; foreign opaque IDs must preserve the existing not-found/denial behavior.
- Do not use an existing production user or user asset as a test fixture.
- Preserve zero browser grants to server-owned core tables and the verified ownership/same-owner database invariants.
- Any verified baseline defect requiring code, schema, DNS, R2 or deployment change becomes a separate explicitly scoped maintenance slice with its own validation and authorization boundary.

#### Validation matrix
| Area | Evidence required before Phase 6 can close |
| --- | --- |
| Repository | Current `main` SHA and authoritative project/architecture state reconciled |
| Vercel | Actual project, READY production deployment SHA, aliases/custom domain and required env-contract presence |
| DNS/TLS | `renderlab.faresuniform.uk` resolves to approved Vercel target, certificate verifies and HTTPS response is served by Vercel |
| Account/privacy | Signed-out denial, session persistence, own/foreign isolation and exact fixture cleanup |
| Upload/media | Custom-domain PUT preflight + real persistent upload → Library → Viewer/Download continuity, with exact cleanup |
| Image generation | Authorized Create Image + Edit Image persistence/continuation baseline |
| Video generation | Authorized Create Video + Animate Image persistence baseline |
| Multi-reference audit | Exact input counts/roles/formats/size, durable/temporary support and backend failure semantics from current RenderLab + configured worker evidence |
| Video-resolution audit | Accepted/produced resolutions, defaults/bounds and aspect/duration/fps/audio interactions with bounded live probing where needed |
| Operational | Latency bands, timeouts/retries, concurrency/quota/credit signals and reliably observable cost recorded or explicitly marked unresolved |
| Beta boundary | User-approved private/closed/broader beta posture and resulting Phase 10 implications recorded |

#### Visual / responsive review
Phase 6 is not a visual redesign phase. Capture new screenshots only when a production-domain baseline probe is needed to verify an existing responsive state, or when a separately scoped blocker fix changes rendered UI. If rendered UI changes, existing desktop/mobile, accessibility and reduced-motion requirements still apply.

#### Documentation outputs
Before Phase 6 can close, verified results must be recorded in:
- `PROJECT.md` — current Cycle 2 priority/boundary and Phase 7 handoff;
- `docs/ui/UI_MIGRATION.md` — Phase 6 evidence, blockers and completion status;
- `docs/architecture/PRODUCT_CAPABILITIES.md` — current generation capability plus multi-reference/video-resolution audit results;
- `docs/architecture/INFRASTRUCTURE.md` — actual Vercel/custom-domain/env/storage/worker/operational baseline;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` only if the audit reveals a real frontend architecture change;
- screen/UI/component docs only if rendered product behavior or approved composition actually changes.

#### Verified audit evidence — run `33250031468`
- [x] Reconciled audit-starting `main` `5072fe96495ea53d06f4891c6073b16203c819d2` with READY Vercel production deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` / application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; every repository change between those SHAs is documentation-only. The latest production build passed `verify-vercel-env.mjs`, proving required canonical environment-variable presence without reading secret values.
- [x] Fresh DNS/TLS/HTTPS verification on `renderlab.faresuniform.uk`: exact DNS-only CNAME target `736ea4abfec91fb9.vercel-dns-017.com`, HTTPS `200`, Vercel edge headers, TLS 1.3 and certificate verification OK for the custom hostname.
- [x] Production Account Identity completed in 7s and configured two-account Ownership completed in 15s; signed-out/private/foreign isolation behavior passed and exact Auth/data fixtures were removed.
- [x] Custom-domain persistent upload → Library → Media Viewer → Edit handoff completed in 16s using real direct-R2 upload and durable media; the exact upload/media fixture was removed.
- [x] Production Create Image → durable Edit continuation completed in 91s total. Create Image and Edit both persisted successfully through native FLUX primary routing with no observed failover; exact output/R2/job fixtures were removed.
- [x] Production Create Video + Animate Image completed in 155s total through REDGraft primary routing with no observed failover; the 5-second Create Video job took about 101s created→completed in this sample. Exact jobs/media/reference/R2 fixtures were removed.
- [x] Deployed FLUX health advertises `multiple_references=true`; a bounded two-reference live edit was accepted with `reference_count=2` and returned PNG in 12.6s total. The runtime dynamically conditions every reference after the first and has no explicit worker-side count ceiling. Phase 7 must still choose a deliberate product maximum and add server media-kind/role/count validation because current RenderLab parsing is more permissive than the future multi-reference product contract should be.
- [x] Deployed REDGraft runtime enables `480p`, `720p`, `1080p` and `2K`, with 24/25/30 fps; `4K` is present in internal resolution metadata but disabled. RenderLab currently hardwires native Video submission to `480p`. A bounded live `720p`, `16:9`, 5-second, 24-fps, audio-off probe returned a `1280×720` MP4 in 62.7s total / about 59.0s worker time.
- [x] Operational evidence is intentionally bounded: no app-level generation rate/concurrency/abuse gate exists; worker source serializes each container invocation, while exact deployment-wide autoscaling/capacity and provider per-generation billing are not reliably exposed by current health/contracts. Treat both as unresolved rather than guessed. Observed timings are samples, not SLAs.
- [x] Final shared-resource audit found zero Phase 6 fixture rows and zero Phase 6 Auth users. All six RenderLab tables retain RLS, `owner_id NOT NULL`, zero `anon`/`authenticated` grants and the expected ownership/integrity triggers; latest migration remains `20260828221611 renderlab_media_asset_deletion`. Pre-existing non-fixture data was not modified.
- [x] Supabase security advisors show the expected server-owned `rls_enabled_no_policy` INFO notices plus `auth_leaked_password_protection` WARN. Performance advisors show unused-index INFO only. No Phase 6 schema/Auth/config mutation is justified from those notices.
- [x] Vercel reported no production runtime error cluster during/after the audit and no deployment was created by the temporary audit branch. The temporary audit branch was reset to `main` after evidence collection.
- [x] Operating boundary selected: **Closed Beta**. Keep access controlled until Phase 10 adds broader-access rate/concurrency/abuse hardening and addresses the Auth warning; broader beta requires a separate explicit decision.

#### Exit criteria
Phase 6 is complete only when all of the following are true:
- [x] Current `main` and actual Vercel production deployment/custom-domain/env contract are reconciled and documented.
- [x] Critical custom-domain account/privacy, upload/media, image-generation and video-generation baselines are verified, or a truthful blocker is recorded and handled as a separate slice.
- [x] Multi-reference image-edit support is documented with exact input semantics/limits from current RenderLab + configured worker evidence.
- [x] Video resolution support is documented with accepted/produced resolutions, defaults/interactions and operational constraints.
- [x] Reliably observable latency/resource/cost/quota evidence is recorded and unobservable items are marked unresolved rather than guessed.
- [x] The user-approved Cycle 2 beta operating boundary is recorded as **Closed Beta**.
- [x] All Phase 6 fixtures are cleaned and Supabase/R2/Auth security invariants remain intact.
- [x] Authoritative docs are updated from verified reality and no Phase 7 feature has been implemented.

#### Next-phase dependencies
Before Phase 7 can be expanded into its own execution-ready contract, Phase 6 must hand off:
- verified multi-reference image-edit input semantics and limits;
- verified video resolution support, defaults and operational constraints;
- verified production/custom-domain/account/storage/generation baseline;
- user-approved beta operating boundary;
- any blocker or required maintenance slice that Phase 7 planning must account for.

**Phase 6 status:** `COMPLETE`. Closed Beta was selected on 2026-08-29. The subsequent production-feedback triage is complete at roadmap level and is incorporated into the Phase 7 contract below.

### Phase 7 — Create v2 / Creative Direction
**Contract status:** `EXPANDED/PLANNED`
**Execution status:** `IN PROGRESS`

#### Goal
Make Create capable of richer reference-driven image/video work without turning the existing composer into a dense workflow form. Phase 7 establishes the media/input/geometry and interaction foundations first, then layers multi-reference editing, verified Director-video capability and curated video quality on top.

#### User value
- Reference-backed Edit/Animate begins from the user's source geometry rather than silently assuming an unrelated aspect ratio, while still allowing an explicit override.
- User-uploaded creative inputs remain available as owned Library assets even if the user never submits a generation.
- Multi-reference prompts can identify which input is which instead of relying only on implicit upload order.
- Video can grow into richer directed creation without exposing ComfyUI nodes or crowding the default composer.
- The workspace should feel like a premium modern creative application while remaining clear, accessible and performant.

#### Verified starting state
- Phase 6 verified the current production/custom-domain/account/storage/generation baseline and selected Closed Beta.
- Current Create supports one user-facing image reference through temporary `generation_sources`; generated/persistent Library media is durable `media_assets`.
- Current image ratios are `1:1`, `16:9`, `9:16`, `4:3`, `3:4`; current video ratios are `16:9`, `9:16`, `1:1`. Reference-backed operations currently resolve through these product ratios rather than a dedicated source-aware `Original` choice.
- Deployed FLUX accepted a bounded two-reference edit and has no explicit worker-side reference-count ceiling; current RenderLab request parsing still lacks product-level media-kind/role/multiplicity/count enforcement.
- Qwen Image Edit remains an audited available ecosystem but is not a user-facing model selector today.
- REDGraft runtime enables `480p`, `720p`, `1080p`, `2K`; `4K` is disabled. RenderLab still submits fixed `480p`.
- Director/frame/dialogue/ambient-sound behavior described from workflow use is a **user-reported capability to verify** against the actual current deployed LTX/REDGraft workflow before product UI is approved. Do not document node-level assumptions as verified capability until audited.
- The existing Create composer is approved and functional but closed-beta feedback reports increasing control density, especially in Video mode; Phase 7 may refine its internal composition without creating separate Image/Video/Edit/Animate apps.

#### Phase 7A — Create Foundation
- [ ] **Composer hierarchy / de-crowding:** keep prompt, active references and Generate immediately understandable; move task-dependent settings into compact contextual controls/disclosures and keep technical reproducibility under Advanced. Avoid an always-visible wall of Video controls.
- [ ] **Source-aware geometry:** for Edit/Animate with an attached source image, default to an understandable `Original`/source geometry behavior rather than an arbitrary preset ratio. Let the user explicitly override to another supported ratio. Audit exact worker normalization/crop/resize behavior before locking the product rule for each operation.
- [ ] **Aspect-ratio expansion:** audit common useful image/video ratios against current worker contracts and add only a curated verified set. Do not turn the selector into an exhaustive geometry console.
- [x] **Durable Create uploads:** newly uploaded Create references now reuse the persistent media ticket/R2/completion transaction and become owner-scoped durable `media_assets` before generation. Create binds the resulting opaque `media-asset` into generation requests, and the asset remains ordinary Library media even if Generate is never pressed. Configured run `33256497167` verified upload/session ownership, persisted dimensions/provenance, Library visibility, request binding and exact cleanup without spending a generation. `generation_sources` remains internal compatibility/staging only and is no longer the user-facing identity for newly uploaded Create references.
- [ ] **Reference identity/order/roles:** establish stable human-visible reference aliases, deterministic request order, optional task-relevant semantic roles, and reordering/removal behavior before multi-reference UI expands.
- [ ] **Prompt reference foundation:** define a product-level reference-addressing grammar/autocomplete (for example an `@reference` interaction) that resolves only to inputs attached to the current request and persists enough structured mapping to reconstruct intent. Final syntax is locked before Phase 7B implementation.
- [ ] **Premium interaction pass:** apply deliberate spatial/layout transitions, reference motion/reordering feedback and contextual control transitions using approved maintained mechanics; basic default-library styling is not the quality target. Preserve reduced motion, keyboard/touch parity and performance.

#### Phase 7B — Multi-reference Image Editing
- [ ] Choose and enforce a deliberate bounded product maximum for reference count; worker permissiveness is not the product contract.
- [ ] Add server-authoritative media-kind, role, multiplicity and same-owner validation for every input slot.
- [ ] Guarantee deterministic input ordering, alias/role mapping and prompt-reference resolution from RenderLab to the selected worker request.
- [ ] Audit current FLUX and Qwen multi-input behavior for subject/outfit/pose/style/background-like use cases, output geometry and failure semantics. Route/model choice remains internal unless evidence shows a user-facing choice provides concrete value.
- [ ] Be explicit that RenderLab can guarantee correct input mapping/validation but **cannot guarantee probabilistic model obedience** to every semantic relation in the prompt; validation must not imply deterministic generative compliance.
- [ ] Preserve the simple one-reference case and avoid exposing a generic model/workflow form.

#### Phase 7C — Director Video
- [ ] Audit the actual current deployed LTX/REDGraft workflow/gateway/runtime for Director-like inputs: supported frame count/order, image/frame semantics, scene/action text, character dialogue/speech intent, ambient/background sound intent, audio interactions, duration/resolution/fps constraints and failure behavior.
- [ ] If the audited capability is stable and useful, expose it as a curated **Director** creative mode inside Create: storyboard/frame inputs plus understandable action/dialogue/sound controls. Do not expose ComfyUI node names or raw graph parameters.
- [ ] Director frame uploads use the durable Create-upload foundation from Phase 7A and the same reference identity/order rules rather than creating another upload identity.
- [ ] If a reported workflow capability is not present/reliable in the current configured worker, record the blocker truthfully instead of creating fake UI.

#### Phase 7D — Video Quality / Resolution
- [ ] Add a curated Video quality/resolution product choice from verified `480p`, `720p`, `1080p`, `2K`; keep disabled `4K` hidden.
- [ ] Decide default resolution from verified latency/resource/quality evidence; do not silently raise the default merely because higher modes exist.
- [ ] Validate resolution with aspect, duration, fps, audio and Director/reference geometry; server validation remains authoritative.
- [ ] Keep resolution contextual to Video rather than adding infrastructure/model UI.

#### Recommended Phase 7 evaluations — not automatic exit criteria
- `Reuse settings` / `Remix` from persisted normalized generation intent.
- Before/after comparison for Edit when the source/result relationship is available.
- Variations that reuse a recipe without reconstructing the task manually.
- Prompt/settings history only if it can be owned cleanly without creating a premature global preset system.

#### Explicitly out of Phase 7
- LoRA/Civitai/Hugging Face model library, download/cache or LoRA strength UI.
- Privileged Admin panel and beta-user management (Phase 10).
- Logo/brand/landing-page work (Phase 11).
- Generic Models/Workflows screens, ComfyUI graph editing or raw node-parameter forms.
- Library collection-management/batch-organization work beyond integration of newly durable Create uploads.
- Activity Retry/Cancel, billing/credits, Trash/restore, cross-page selection or broad account lifecycle work.

#### Architecture / contracts to inspect
- `src/features/create/*` and maintained UI primitives/motion sources — composer hierarchy, contextual disclosure, reference interaction and visual quality.
- `src/lib/capabilities/generation.ts` — source-aware geometry, ratio sets, input-slot count/roles, resolution and visibility tiers.
- generation request/API contracts under `src/lib/api` and `/api/generation/jobs` — structured reference mapping, role/count/media validation and persisted normalized intent.
- `src/server/generation/*` plus configured FLUX/Qwen/REDGraft worker contracts — ordering, prompt construction, output geometry, Director capability and resolution behavior.
- `src/server/media/*`, upload routes and `media_upload_sessions`/`media_assets` — reuse the durable persistent-upload contract for Create-originated user uploads before considering new schema.
- Library/Viewer continuation contracts — durable input reuse must remain opaque, owner-scoped and compatible with existing search/Favorites/Collections/Delete behavior.

#### Data / security / ownership implications
- Durable Create uploads must be owned by the authenticated account and must not depend on whether a generation job is later created.
- Do not expose raw R2 keys or signed URLs; reuse opaque `media-asset` identity.
- Prompt reference aliases are request/product metadata, never authorization. Server resolution is by same-owner opaque asset identity and validated slot membership.
- Multi-reference foreign IDs must preserve not-found/denial behavior; user-facing alias/order cannot bypass ownership checks.
- Audit whether existing `media_upload_sessions` + `media_assets` and persisted generation parameter JSON are sufficient before proposing schema changes. Any migration must be justified by a concrete contract gap and separately validated.
- Director and Qwen/FLUX routing remain server-owned. Ordinary users never gain provider/worker credentials or graph access.

#### Validation matrix
| Area | Required evidence before Phase 7 closes |
| --- | --- |
| Composer | Desktop/narrow Create remains understandable with Image/Video, one/many references and expanded Video settings; no essential control is crowded out |
| Geometry | Edit/Animate defaults preserve source-aware geometry truthfully and explicit ratio overrides produce validated output behavior |
| Ratios | Curated expanded ratios are capability-backed and server-validated |
| Durable inputs | Create upload becomes Library-visible durable media even without Generate; reuse/search/Viewer/ownership/delete paths stay coherent |
| Reference semantics | Alias/order/role/reorder/removal and prompt addressing round-trip into normalized product intent deterministically |
| Multi-reference | FLUX/Qwen verified cases, bounded count, same-owner/media-kind/role validation, truthful probabilistic-semantics messaging |
| Director | Actual configured worker capability audited; any implemented frame/action/dialogue/sound controls work end-to-end without raw node UI |
| Video quality | 480p/720p/1080p/2K request/production validation with aspect/duration/fps/audio interactions |
| Motion/accessibility | Intentional motion reviewed in normal + reduced-motion modes; keyboard/touch/focus behavior remains complete |
| Persistence/cleanup | Generated results and newly durable user inputs persist correctly; exact configured fixtures clean without touching user data |

#### Documentation outputs
- `PROJECT.md` — verified Phase 7 outcomes and next-phase handoff.
- `docs/ui/UI_MIGRATION.md` — slice status/evidence.
- `docs/ui/UI_DECISIONS.md` — final geometry, durable-upload, reference and Director UX contracts.
- `docs/architecture/PRODUCT_CAPABILITIES.md` — verified ratios/reference/Director/resolution capability.
- `docs/ui/UI_SYSTEM.md`, `COMPONENT_CATALOG.md`, `SCREEN_REGISTRY.md` only where implemented composition/components/routes actually change.
- `docs/architecture/INFRASTRUCTURE.md` only if worker/storage/admin infrastructure reality changes.

#### Exit criteria
- [ ] Phase 7A foundation is implemented and verified before Phase 7B/7C/7D are treated as complete.
- [ ] Source-aware geometry + explicit override and curated ratios are verified.
- [x] Create-originated user uploads are durable Library media regardless of generation submission/use; configured evidence `33256497167`.
- [ ] Reference identity/order/roles and prompt addressing are deterministic and server-validated.
- [ ] Multi-reference image editing has bounded product semantics and configured FLUX/Qwen evidence appropriate to the final routing contract.
- [ ] Director-video capability is either implemented from verified current worker behavior or explicitly documented as blocked/deferred; no speculative node UI ships.
- [ ] Curated Video resolution is implemented from verified enabled modes with a deliberate default.
- [ ] Create visual density/motion/accessibility is reviewed on desktop/narrow layouts and feels intentionally productized rather than mechanically appended.
- [ ] Exact-head affected CI passes, shared fixtures are clean and authoritative docs match implementation reality.

### Phase 8 — Library v2 / Media Workflow Productivity
- [ ] Collection Rename as an owner-scoped Library/Viewer organization contract.
- [ ] Collection Delete with explicit membership/media consequences; deleting a collection must not imply deleting its media.
- [ ] Reuse UI-034 page-scoped selection for batch Add/Remove Collection rather than inventing a global media store.
- [ ] Reuse UI-034 page-scoped selection for batch Favorite/Unfavorite.
- [ ] Ensure durable Create-originated reference/frame uploads from Phase 7 compose with existing Library search/Favorites/Collections/Viewer/Delete behavior as ordinary `media_assets`; do not create a parallel Uploads destination merely for them.
- [ ] Keep cross-page selection deferred until real usage shows the page-scoped model is insufficient.
- [ ] Treat Trash/restore/retention as a separate explicit decision because UI-033 currently makes deletion permanent to the user and tombstone reversal is forbidden.

### Phase 9 — Activity v2 / Recovery & Job Control
- [ ] **Generation Retry v0.1** creates a new owner-scoped job from persisted normalized product intent after revalidating current capability, parameters and referenced media; never replay raw historical worker/ComfyUI payloads.
- [ ] Audit cancellation semantics by execution state/provider before approving any Cancel UI.
- [ ] If useful, add restrained shell-level running/failed attention while Activity remains the operational surface and provider/workflow detail stays internal.
- [ ] Do not introduce a global client job store merely for Activity refresh/status presentation.

### Phase 10 — Account, Admin & Closed-Beta Operations
- [ ] Add account recovery/password reset and improve requirement-backed verification/session failure handling through the maintained Supabase Auth/session boundary.
- [ ] Address the Phase 6 leaked-password-protection warning before broader access if supported by the chosen Auth plan/configuration.
- [ ] Define an explicit server-authoritative admin authorization role/claim before exposing any privileged route or mutation.
- [ ] Build a privileged Admin surface for closed-beta user/access management, generation concurrency/rate limits, feature flags and useful job/service-health/failure visibility. Keep it separate from ordinary user Settings.
- [ ] Admin may expose more operational context than ordinary Activity, but raw secrets and unsafe arbitrary cloud/provider mutation are not implied.
- [ ] Establish server-enforced generation concurrency/rate/abuse limits before any deliberate move beyond controlled Closed Beta.
- [ ] Evaluate account/data deletion separately from UI-033 media deletion.
- [ ] Billing/credits remain a separate product decision.

### Phase 11 — Brand & Launch Experience
- [ ] Establish RenderLab logo/brand identity and production-ready brand assets/banners.
- [ ] Design and implement a launch/landing/onboarding experience appropriate to the selected access posture.
- [ ] Make an explicit information-architecture decision before changing `/`: either keep Create at `/` with a separate landing route or deliberately move Create (for example to `/create`) and update shell/deep-link/auth behavior consistently. Until that decision is implemented, `/` remains Create.
- [ ] Keep marketing motion/visual richness consistent with the premium RenderLab quality bar without contaminating the dense application workspace with decorative marketing patterns.
- [ ] Verify responsive/accessibility/performance and update brand/design/screen docs from the actual implementation.

### Phase 12 — Cycle 2 Release Validation
- [ ] Run exact-head GitHub validation for every affected slice and a final integrated Account → Create → generation → durable input reuse → Library → Viewer → organization → Activity/recovery path plus Admin authorization boundary and launch surfaces.
- [ ] Review required desktop/narrow artifacts, normal/reduced motion, accessibility and performance; a passing build alone is insufficient.
- [ ] Audit RenderLab Supabase schema/owners/RLS/browser grants/fixtures, Auth/admin boundary, R2 fixtures/CORS, generation configuration and custom-domain production routing.
- [ ] Record the final approved application SHA and release evidence in the authoritative docs.
- [ ] Deploy to Vercel only with explicit user authorization; merge remains distinct from deployment.
- [ ] Reverify the live custom-domain product after the deliberate rollout and clean all configured verification fixtures.

### Cycle 2 explicit non-commitments
Cycle 2 does not include the future LoRA/Civitai/Hugging Face library/adapter system, generic Models/Workflows screens, ComfyUI graph editing, ordinary-user provider/worker management, arbitrary workflow-parameter generation, inpainting/outpainting, pose/depth/edge guidance, workflow chaining, full billing, a global media client store or cross-page selection. LoRA/model-adapter support is now an accepted post-Cycle-2 direction rather than an ignored idea. Safe cancellation and Trash/restore remain contingent on their own evidence/decisions.

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
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is in progress; Phase 6 is complete under Closed Beta and the roadmap has been revised from the first production-feedback pass.
**Current phase contract:** Phase 7 — Create v2 / Creative Direction is `EXPANDED/PLANNED`; execution is `IN PROGRESS`.
**Current product slice:** Phase 7A — Durable Create Upload Foundation is verified in PR #45; Phase 7A as a whole remains incomplete.
**Current gate:** Continue Phase 7A with source-aware geometry + explicit ratio override from the verified durable media foundation.
**Phase 7 ordered slices:** 7A Create Foundation → 7B Multi-reference Image Editing → 7C Director Video → 7D Video Quality/Resolution.
**Later Cycle 2:** Phase 8 Library v2 → Phase 9 Activity v2 → Phase 10 Account/Admin/Closed-Beta Ops → Phase 11 Brand & Launch → Phase 12 integrated release validation.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library and selection from external ecosystems such as Civitai/Hugging Face, with compatibility/source/license/cache/admin/safety/strength contracts defined before implementation.
**Persistent scope boundary:** Models/Workflows remain non-destinations for ordinary users; ComfyUI nodes/provider routing stay internal. Trash/restore, safe cancellation, billing and cross-page selection still require their own evidence/decisions.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
