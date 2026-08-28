# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui Radix Nova + `radix-ui` through the approved maintained component ecosystem
- RenderLab-owned normalized primitive layer under `src/components/ui`
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

## Product Areas
Primary:
- **Create** `/`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current Priority
**Phase 4 — Media & Continuation.**

### Approved product state
- Application shell: `APPROVED`.
- Create: `APPROVED`; complete configured browser lifecycle run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured lifecycle `33034606396`.
- Persistent Library upload: `APPROVED`, merged through PR #9 as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- Library search v0.1: `APPROVED`, merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- Durable Media Download v0.1: `APPROVED`, merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`.
- Durable Media Rename v0.1: `APPROVED`, merged through PR #12 as `d76f0ce30502e2aff2384dcd168f07b2184768a4` after exact-head six-gate CI and clean shared-resource verification.
- Maintained UI primitive foundation / UI-026: `APPROVED`, merged through PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- Library history ordering v0.1 / UI-027: `APPROVED`, merged through PR #14 as `a7ecaa6a704e4378b31e694e5f21c5629920b520` after final documentation-head eight-gate CI, responsive screenshot review, clean fixture verification and green post-merge `main` UI Shell `33097463519`.
- Library drag-and-drop upload v0.1 / UI-028: `APPROVED`, merged through PR #15 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`. Final exact head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`; responsive screenshots were re-reviewed, shared fixtures were verified clean, and merged `main` UI Shell `33109435978` passed.
- Account Identity Foundation v0.1 / UI-029: `APPROVED`, merged through PR #16 as `bcb20365db102252db51263968de96fc795be518`. Final exact head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`; responsive Settings screenshots and exact auth-fixture cleanup were reviewed clean. Merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` passed.
- Create supports Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media share RenderLab `media_assets`, product APIs and opaque `media-asset` identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.

### Latest completed product slice
- Core Account Ownership v0.1 / UI-030 is **APPROVED**. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; owner-aware production deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` is READY at `https://renderlab-lake.vercel.app` from exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c`; corrected `0005` was applied as `20260828174940 renderlab_core_account_ownership_enforce` after live two-account verification and a zero-unowned-row audit.
- Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates: Account Ownership `33131090207`, Account Identity `33131090197`, UI Shell `33131090250`, Create Lifecycle `33131090243`, Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265`, Media Download `33131090206`, Media Rename `33131090198`, Reference Upload `33131090263`, Generation Integration `33131090251`, and Video Generation `33131090262`.
- Final PR documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates again before merge. PR #17 then merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; push-triggered `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed.
- The staged `0005_core_account_ownership_enforce.sql` was corrected after rollback-only semantic testing found an invalid shared trigger-field reference. Table-specific owner-link triggers pass same-owner, cross-owner, null-owner, owner-immutability, Auth-delete restriction and existing FK cleanup compatibility simulations against the live prepared schema.
- The optional external generation adapter requires both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN`; submit and poll authenticate with that token before forwarding the owner header. Native generation remains the fallback when the external pair is incomplete.
- Shared Supabase has both ownership migrations applied: `20260827203604 renderlab_core_account_ownership_prepare` and `20260828174940 renderlab_core_account_ownership_enforce`. All four owner columns are `NOT NULL`; six UI-030 enforcement triggers and their three functions are active; RLS remains enabled; browser roles still have no raw core-table grants; final cleanup left 0 core rows and 0 RenderLab fixture Auth users.
- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. During the authorized rollout the Vercel project preset was corrected to Next.js and the stale explicit `dist` output override was removed. Automatic Git deployment remains disabled, so production deployment is still explicit only.
- Deployment Readiness v0.1 merged through PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured gates; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. Vercel created no deployment for the PR #18 merge. During the later authorized rollout the dashboard project preset was corrected from Vite to Next.js and the stale `dist` output override was removed while repository `vercel.json` continued to disable automatic Git deployments. Final post-merge Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser core-table grants, four still-nullable owner columns, 0 enforcement triggers, and migration history still ending at applied `0004`.
- No new Phase 4 product slice is active. Favorites/Collections, Delete/batch, and other follow-ups remain unstarted until separately approved with their own RenderLab contracts.

Do not redesign approved surfaces merely because new media capabilities or ownership enforcement are added.

## Maintained UI Primitive Contract
UI-026 makes maintained conventional controls a repository-enforced frontend foundation rule.

- `components.json` configures shadcn `radix-nova`.
- `src/components/ui` owns normalized Alert, Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- Conventional visible controls in `src/features` and `src/components/shell` compose those approved primitives rather than hand-styled raw native controls.
- Native `file` and `hidden` inputs remain allowed as browser/form plumbing.
- Local wrappers own RenderLab tokens, variants, spacing, required semantic elements and product accessibility adaptations; features should not rebuild the same mechanic independently.
- Correct maintained accessibility semantics are authoritative. Create Image/Video is a required Radix single-choice `radiogroup` with checked `radio` items; Library history ordering uses maintained Radix Dropdown Menu radio items.
- `npm run verify:ui-purity` rejects raw visible button/select/textarea/ordinary-input controls in feature/shell code and runs in UI Shell CI.
- Shared primitive/config/package changes retrigger the dependent Create, Library Search, Library Lifecycle, Library History, Download, Rename and Shell regressions.

PR #13 was foundation-only and preserved approved Create/Library/Viewer/shell product behavior. Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`. Final-code UI Shell and Library lifecycle desktop/mobile screenshots were visually inspected with no unintended hierarchy/layout drift. Library lifecycle verified real Upload → Library → Viewer → Edit continuation, correct Radix Image selection, 400×300 media geometry and self-cleanup.

Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`. Create Lifecycle attempt 1 was blocked before browser execution by a transient Microsoft Ubuntu apt-repository 403 during Playwright dependency installation; unchanged attempt 2 completed successfully. Direct pre-merge cleanup found `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job. PR #13 merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; post-merge `main` UI Shell `33092354072` and Reference Upload Integration `33092353971` both passed.

## Account Identity Foundation v0.1 Contract
UI-029 establishes a real RenderLab account principal while deliberately leaving media/job ownership enforcement to the next slice.

- Supabase Auth `auth.users.id` is the canonical account identity.
- Settings owns the initial email/password sign-in, account-creation and sign-out experience.
- Browser/server sessions use maintained Supabase SSR cookie handling; root `proxy.ts` refreshes sessions and server identity is read from verified claims.
- Browser code receives only the public Supabase project URL and publishable key; service-role credentials remain server-only.
- Existing Create and Library behavior is not gated or redesigned by this slice.
- UI-029 does not add owner columns, account-scoped media queries, Favorites/Collections, Delete/batch behavior or a schema migration.

Final exact PR head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`. Account Identity created one run-owned confirmed Supabase user through the server-only Auth admin API, signed in through the actual Settings UI, verified cookie persistence across reload, rendered desktop/mobile signed-in states, signed out, rendered the mobile signed-out state and deleted the exact fixture. Direct final cleanup found `0` account CI users and zero shared Library drag/drop/lifecycle fixtures. PR #16 merged as `bcb20365db102252db51263968de96fc795be518`; merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` both passed.

## Core Account Ownership v0.1 Contract
UI-030 owner-scopes the existing core persistence model without introducing a parallel account-media system.

- Supabase Auth `auth.users.id` / verified `claims.sub` is the canonical owner identity.
- `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` carry `owner_id -> auth.users.id ON DELETE RESTRICT`.
- Raw core tables remain server-owned: RLS stays enabled, `anon`/`authenticated` have no direct table grants, and product routes/services use the server-only service role after resolving verified account context.
- Private media list/read/rename/content/thumbnail/download, upload ticket/completion, reference ticket/completion, generation submission/polling and generation input resolution are owner-scoped.
- New pending/durable records receive the authenticated owner; generated output media inherits the generation job owner.
- Foreign opaque media/job/upload/reference IDs resolve like ordinary not-found records; ownership is not disclosed.
- Create may hold a signed-out draft, but persistent upload/generation actions require a verified non-anonymous account.
- An optional external RenderLab generation backend is trusted only when both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN` are configured. RenderLab authenticates submit/poll calls with that bearer token; the external service must verify it before trusting `x-renderlab-owner-id`. A URL without the token does not activate the external path.
- The prepare migration allowed nullable owners during rolling deployment. Applied `0005` now rejects unowned rows, requires owner non-null/immutable, and enforces the table-specific same-owner relational guards.
- The required enforcement sequence was owner-aware application live first, then a final no-unowned-row audit, then `0005`; the completed production rollout followed that order.
- Configured fixtures are isolated by deterministic test owner; cleanup reconstructs DB/R2 state by owner, deletes in dependency order, then removes the Auth fixture. Active workflows must not perform namespace-wide service-role deletion across owners.

Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates, including the two-account Account Ownership gate, owner-bound upload/reference/generation persistence, signed-out denial, foreign opaque-ID denial, real browser Library/Viewer/Create lifecycles, generated image/video flows, Download/Rename, responsive UI artifacts and exact cleanup. The resumed suite exposed one verifier-only issue: Playwright's header override followed product-media 302 redirects and leaked the fixture bearer to signed R2 requests. The shared helper now authenticates the local route with a non-following fetch and lets Chromium follow the signed external redirect cleanly; the four affected lifecycle tests all pass after that fix.

Corrected `0005` was applied after exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production and live two-account Account Ownership run `33196254711` passed. Migration `20260828174940 renderlab_core_account_ownership_enforce` makes all four owners `NOT NULL`, binds four owner-immutability triggers plus the media→job and upload→asset same-owner guards, and preserves RLS/no-browser-grant boundaries. Post-enforcement production run `33196534150` passed the same two-account isolation suite and cleanup; final shared-resource audit found zero core rows and zero RenderLab fixture Auth users. Supabase security advisors still report only the expected informational no-policy notices for these deliberately server-owned tables; performance notices remain unused-index INFO findings on empty/low-traffic tables.

**Core Account Ownership v0.1 status: `APPROVED`; owner-aware production is live, corrected `0005` is applied and verified, post-enforcement two-account isolation is green, and final shared-resource cleanup is clean.**

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state belongs to server-side `media_upload_sessions`.
- `generation_sources` remains temporary generation/reference state; legacy Saga `studio_uploads` is not reused.
- Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique durable asset winner.

## Library Drag-and-Drop Upload v0.1 Contract
UI-028 adds a second interaction path into UI-022 without changing persistence.

- The ordinary visible Upload button + native file picker remain the keyboard/touch/mobile baseline.
- Desktop file drag over Library reveals a temporary full-surface drop affordance; there is no persistent dropzone.
- Exactly one PNG/JPEG/WebP image up to 25 MB is accepted per drop; multi-file drops fail locally before ticket creation.
- Picker and drop use the same feature-owned `library-upload-client.ts` transaction: upload ticket → signed R2 PUT → completion → durable `media_assets` promotion.
- Success refreshes the server-owned Library and announces completion; errors stay local. No global media store or toast framework is introduced.
- Configured verification is serialized with the shared Library upload fixture lock, uses run-unique fixtures, and asserts exactly one ticket/completion/session/asset/card.
- Under UI-030 configured verification cleanup is additionally owner-scoped; the active Drag Drop workflow no longer runs namespace-wide destructive cleanup across owners.
- Drag/drop adds no schema migration, account/organization state, Delete/batch framework or new R2/CORS contract.

Final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`. Drag Drop `33109026739` verified pre-run namespace cleanup, real DataTransfer upload through ticket → signed R2 PUT → completion, exact one session/asset/card, and post-run cleanup using the run-unique fixture `renderlab-drop-33109026739-اختبار-画像.png`. Desktop drag-active/completed and mobile completed screenshots were re-reviewed with no hierarchy drift. Direct Supabase cleanup after the exact-head suite found `0` drag/drop sessions, `0` drag/drop assets, `0` legacy lifecycle sessions and `0` legacy lifecycle assets. PR #15 merged as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

## Library Search v0.1 Contract
UI-023 defines durable-media discovery.

- Search state is shareable URL parameter `q`.
- Search is server-owned against durable `media_assets`, not a client-only current-page filter.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring across `display_name`, `original_filename`, and generated `provenance.prompt`.
- Search composes with All/Images/Videos and URL-owned chronological ordering/pagination.
- v0.1 adds no relevance ranking, model/date filters, command palette, collection schema or dedicated search service/index.

PR #10 passed implementation and documentation-finalized Search/upload/lifecycle/UI gates before merge. Post-merge main shell `33070215358` passed.

## Durable Media Download v0.1 Contract
UI-024 defines Download as a contextual product-media action.

- Media Viewer exposes one secondary `Download` action for durable generated/uploaded media.
- `/api/media/assets/[assetId]/download` reloads the durable asset and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`.
- RenderLab does not proxy media bytes through the application server and never treats raw R2 identity as product identity.
- Uploaded downloads preserve a sanitized Unicode basename with canonical extension from verified MIME.
- Generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` names rather than prompts/storage keys.
- v0.1 adds no Library-card Download or batch framework.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after implementation and documentation-finalized configured verification; `main` remained green.

## Durable Media Rename v0.1 Contract
UI-025 defines Rename as durable display identity, not file/storage mutation.

### Product behavior
- Media Viewer exposes `Rename` beside Download under secondary **Actions**.
- Rename changes only `media_assets.display_name` through `PATCH /api/media/assets/[assetId]`.
- Names remove control characters, collapse whitespace, must remain non-empty and are capped at 240 characters.
- Original uploaded filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics remain unchanged.
- Library search immediately discovers the new display name because `display_name` is already part of UI-023.
- The edit UI is feature-owned inline Viewer state; Rename and Download remain side-by-side while the form expands beneath them.
- v0.1 adds no Library-card rename, modal framework, global store, delete, batch actions, favorites/collections or database migration.

### Verified approval evidence
Final exact-head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Library Search `33077320839`, Persistent Media Upload `33077320935`, Media Download `33077320886`, Media Rename `33077321228`, and Library Lifecycle `33077320976`. Direct Supabase cleanup immediately before merge found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

The configured Library lifecycle is serialized with `concurrency: renderlab-library-lifecycle-shared` and targets the exact durable asset ID returned by its own upload completion while separately asserting the expected human display name. Fixture-name uniqueness is not a correctness assumption.

## Library History Ordering v0.1 Contract
UI-027 defines the approved chronological history control.

- URL state is `sort=newest|oldest`; Newest first is canonical and omitted from clean links.
- Ordering is server-owned against durable `media_assets`; it is not client-only sorting of the current page.
- `created_at` and `id` use the same direction to keep pagination deterministic.
- Sort composes with `q`, All/Images/Videos, Clear and `offset`; changing sort drops stale offset.
- Pagination labels follow the active direction so `Newer` / `Older` remain truthful.
- The visible selector is feature-owned `LibrarySortMenu` composed from the maintained shadcn/Radix Dropdown Menu primitive.
- No schema migration, global client media store, relevance ranking, model/date filter console, Favorites/Collections, Delete or batch framework is introduced.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Desktop Oldest, open Dropdown menu and mobile Newest screenshots were visually reviewed without unintended hierarchy drift. Direct Supabase verification found `0` history fixtures and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed UI Shell `33097006928`, Create Lifecycle `33097006913`, Persistent Media Upload Integration `33097007064`, Library Lifecycle `33097006853`, Library Search `33097007092`, Library History `33097006833`, Media Download `33097006968`, and Media Rename `33097006959`. PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; the merged `main` UI Shell run `33097463519` passed.

UI-030 is now the active prerequisite for personal organization. Favorites/Collections remain deferred until its owner-scoped boundary is fully enforced; do not encode them as global durable-media flags. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.

## R2 Browser CORS State
The admin-capable R2 access-key credentials manage the exact-origin `renderlab-browser-uploads` rule through the S3 API for:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Download uses product-route → signed-R2 top-level GET navigation. Rename is a server-side Supabase metadata mutation and introduces no R2 object write/move or new CORS requirement. History ordering is a server-side Supabase query concern and adds no R2/CORS requirement. Drag/drop reuses the same direct browser PUT origin policy as the approved Upload button and introduces no new CORS surface.

If a future user-facing production origin changes, add that exact origin before serving direct browser uploads there. Do not use broad wildcard CORS or replace direct-to-R2 transfers with an application-server proxy merely for convenience.

## Still Open in Phase 4
Core account ownership / UI-030 is the active Phase 4 slice and must finish before any other product slice is selected. Remaining work, in order:
- make the verified owner-aware application code live only through a separately authorized production rollout;
- recheck for unowned rows, then apply and verify corrected `0005_core_account_ownership_enforce.sql` (`NOT NULL`, owner immutability, table-specific same-owner relational guards);
- favorites/collections or another personal organization model only after UI-030 is fully enforced;
- delete and batch management after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.

Do not infer Saga organization/destructive-action schemas automatically. Do not reverse the ownership rollout order merely because the implementation and configured PR suite are green.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions/native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
- If the eventual public RenderLab origin differs from currently configured stable Vercel domains, add the exact origin to R2 CORS before direct browser upload use.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`