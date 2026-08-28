# Frontend Architecture

Defines approved RenderLab frontend architecture and verified implementation state.

## Verified Scaffold
RenderLab is remotely built and validated through GitHub Actions.

Core stack from `package.json`:
- Next.js `16.3.3`
- React / React DOM `19.2.8`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3`
- Lucide React `1.34.0`
- `radix-ui` `1.6.7`
- `@supabase/ssr` `0.12.5`
- `@supabase/supabase-js` `2.112.4`
- `class-variance-authority` `0.7.1`
- `clsx` `2.1.1`
- `tailwind-merge` `3.6.0`
- Playwright `1.62.1`
- AWS SDK S3 client/request presigner `3.1116.0`

`components.json` configures shadcn with the `radix-nova` style. RenderLab owns the normalized wrapper layer under `src/components/ui`; shadcn/Radix supplies maintained mechanics and accessibility behavior while RenderLab owns semantic tokens, variants, spacing, required semantic elements and reviewed product integration.

Approved product state includes Application Shell, Create, Library v0.1, persistent Upload, Library search v0.1, Library history ordering v0.1, Library drag/drop upload v0.1, Media Viewer v0.1, Download v0.1, Rename v0.1, Account Identity/UI-029 and fully enforced Core Account Ownership/UI-030. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; exact owner-aware production SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` is live and migration `20260828174940 renderlab_core_account_ownership_enforce` is applied/verified. Library Favorites v0.1 / UI-031 is approved and merged through PR #23 as `45991e1d55b75dcc13eab162093fc1be1f5c2431`; no product slice is currently active. Activity remains a placeholder.

## Framework
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Rendering:** Server Components by default; Client Components only for interactive feature behavior  
**Styling:** Tailwind CSS + semantic project tokens  
**Components:** approved RenderLab components first; conventional visible controls use the maintained `src/components/ui` layer; new mechanics follow the approved source order in `docs/ui/COMPONENT_CATALOG.md`.

Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration and the approved shared Supabase URL. GitHub remains the development/validation path; production deployment is an explicit operation.

## Maintained Primitive Boundary — UI-026
Conventional visible controls are centralized rather than hand-styled in feature/shell code.

Current normalized primitive layer:
- Alert / AlertDescription
- Button
- Collapsible / Trigger / Content
- DropdownMenu / Content / Group / Item / Label / Separator / RadioGroup / RadioItem
- Empty composition
- Field / FieldLabel / FieldDescription / FieldError / FieldGroup
- Input
- Label
- NativeSelect
- Spinner
- Textarea
- Toggle / ToggleGroup / ToggleGroupItem

Rules:
- `src/features` and `src/components/shell` must not introduce raw visible `<button>`, `<select>`, `<textarea>` or ordinary visible `<input>` controls;
- native `file` and `hidden` inputs are allowed as browser/form plumbing;
- feature composition remains feature-owned; the primitive layer does not absorb product data contracts;
- fix shared spacing/variants/semantics in the wrapper once rather than recreating them in each feature;
- maintained accessibility semantics are authoritative when they correctly represent the interaction. Create Image/Video is a required single-choice Radix `radiogroup` with checked `radio` items, not two independent legacy pressed buttons; Library Newest/Oldest uses Radix Dropdown Menu radio semantics;
- custom generic mechanics are the last option and require a concrete documented reason that approved maintained sources do not satisfy the requirement.

`npm run verify:ui-purity` enforces the native-control boundary in UI Shell CI.

## Routing
```text
/                  Create
/library           Library
/library/[assetId] Media Viewer
/activity          Activity
/settings          Settings / Account
```

Rules:
- Create remains the default route.
- Image/Video/Edit/Animate/models/workflows are not separate top-level routes by default.
- Library `kind`, `q`, `sort`, `offset` are URL-owned shareable browsing/discovery/history state after account context is resolved. Active UI-031 will add optional `favorite=true` as another server-owned Library filter without changing route hierarchy.
- `sort=newest|oldest`; Newest is canonical and omitted from clean links.
- Viewer → Create `source` + `action` are untrusted navigation intent; the server reloads durable media for the verified owner and validates compatibility.
- Durable Download uses the Viewer asset route context and a product API; the browser never treats an R2 key/signed URL as durable identity.
- Durable Rename stays on the Viewer asset identity; the client submits a bounded display-name mutation and refreshes server-rendered asset state.
- Library drag/drop is transient browser interaction state only; it does not become URL or durable media-management state.
- Settings owns requirement-backed account/application state. UI-029 uses it for Supabase Auth identity. UI-030 does not turn the entire application into a redirect-based login wall: signed-out Create remains draftable, while private Library/Viewer data and persistent generation/upload actions require a verified account.

## Product API Boundaries
```text
POST     /api/generation/jobs
GET      /api/generation/jobs/[jobId]

POST     /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions

GET      /api/media/assets
GET      /api/media/assets/[assetId]
PATCH    /api/media/assets/[assetId]
PUT      /api/media/assets/[assetId]/favorite
DELETE   /api/media/assets/[assetId]/favorite
GET      /api/media/assets/[assetId]/content
GET      /api/media/assets/[assetId]/thumbnail
GET      /api/media/assets/[assetId]/download
POST     /api/media/uploads/upload-tickets
POST     /api/media/uploads/upload-completions
```

`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `favorite`, `limit`, `offset`; `favorite` accepts only `true` when present, and `sort` accepts only `newest|oldest` with newest as default. `PATCH /api/media/assets/[assetId]` remains the UI-025 Rename mutation; UI-031 uses idempotent owner-scoped `PUT`/`DELETE /api/media/assets/[assetId]/favorite`. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.

UI-029 account operations use the maintained Supabase Auth client contract rather than adding parallel RenderLab password/session APIs. UI-030 resolves the verified non-anonymous account at the product boundary and threads that owner through media, upload, reference and generation services. Foreign opaque IDs are resolved through owner-scoped service queries and collapse to ordinary not-found state rather than exposing another account's record.

## Ownership Structure
```text
proxy.ts
src/
├── app/
│   ├── page.tsx
│   ├── library/
│   ├── settings/
│   └── api/
│       ├── generation/jobs/
│       ├── assets/reference/
│       ├── media/assets/
│       └── media/uploads/
├── components/
│   ├── shell/
│   └── ui/
├── features/
│   ├── account/
│   │   └── account-settings.tsx
│   ├── create/
│   └── library/
│       ├── library-view.tsx
│       ├── library-sort-menu.tsx
│       ├── library-upload-button.tsx
│       ├── library-drop-upload-surface.tsx
│       ├── library-upload-client.ts
│       ├── media-viewer.tsx
│       └── media-viewer-actions.tsx
├── lib/
│   ├── api/
│   ├── capabilities/
│   └── supabase/
│       ├── config.ts
│       ├── browser.ts
│       ├── server.ts
│       └── proxy.ts
└── server/
    ├── data/
    ├── generation/
    ├── media/
    └── storage/
```

Ownership rules:
- root `proxy.ts` + `lib/supabase/proxy.ts` — Supabase Auth cookie refresh only; not product authorization policy;
- `components/ui` — normalized generic maintained primitives without feature data contracts;
- `components/shell` — persistent application chrome composed from approved primitives;
- `features/account` — product-facing Settings account composition, not session infrastructure or media authorization;
- `features/<feature>` — product-specific composition/behavior composed from approved primitives;
- `lib/supabase` — public/server Supabase Auth client/session boundary; browser code never receives service-role credentials; `getCurrentRenderLabAccount()` derives the product owner only from verified claims and rejects anonymous principals;
- `lib/capabilities` — user-facing capability definitions/resolution;
- `lib/api` — typed product API/query contracts;
- `server/generation` — owner-scoped orchestration/worker boundaries. Native jobs and outputs persist the account owner. The optional external backend is active only with URL + server-only bearer token and must authenticate RenderLab before trusting `x-renderlab-owner-id`;
- `server/media` — owner-scoped durable media/query/upload/download/rename/reference services;
- `server/storage` — R2 implementation;
- `server/data` — server-only Supabase/repository access.

Do not extract generic upload/search/history/download/rename/dropzone/auth-form frameworks from single feature needs. Reuse follows a second real product need. UI-026 applies to generic conventional control mechanics, not to feature-domain extraction.

## Component / Client Boundaries
### Server Components by default
Library route composition, Library search/history query resolution, Media Viewer loading, root Create continuation validation and Settings account-state loading are server-owned. UI-030 resolves account context before private service-role media/job queries are made from Server Components.

### Client Components deliberately
Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, the small Library sort navigation menu, Rename edit/saving state, Settings account form actions and interactions that truly require browser state.

Library picker/drop interactions share feature-owned `library-upload-client.ts`; that client owns validation and the existing ticket → signed PUT → completion transaction, while the Library dataset itself remains server-owned and is refreshed after successful completion. `LibraryDropUploadSurface` owns only transient DragEvent/DataTransfer state and local feedback; it does not copy Library media into a global client store or create a second upload contract. Library search remains a URL-owned native GET form while its visible input/actions use maintained primitives and its hidden kind/sort state remains native plumbing. `LibrarySortMenu` uses a small client component only for Radix menu interaction + URL navigation; actual ordering remains server-owned. Media Viewer Download uses normal product-route navigation. Rename uses one small Viewer-owned client component, submits to the product API, then calls router refresh so the server-rendered Viewer title/metadata stays authoritative. AccountSettings calls Supabase Auth through the public browser client for sign-in/create-account/sign-out, then refreshes the server-rendered Settings account state. No global media-management or auth client store exists.

## State Architecture
### URL state
- Library `kind` / `q` / `sort` / `favorite` / `offset`;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Auth/session state
- Supabase Auth cookie session;
- verified server account principal from Auth claims (`sub` / `auth.users.id`).

### Server state
- owner-scoped `generation_jobs`;
- owner-scoped durable `media_assets` including human-facing `display_name`;
- owner-scoped `media_upload_sessions`;
- owner-scoped temporary `generation_sources`.

### Local transient browser state
- Create form/runtime interaction state;
- Library file-picker/drop uploading, drag-active and local feedback state;
- Viewer Rename editor and Favorite mutation feedback state;
- Settings account-form fields/busy/local feedback state.

Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; active UI-031 adds Favorites directly to the existing owner-scoped durable-media contract while Collections remains deferred.

## Account Identity Flow
UI-029 (merged PR #16):
```text
Settings
  -> public Supabase Auth client
  -> email/password sign-in or sign-up
  -> Supabase cookie session
  -> root proxy refreshes session cookies
  -> Settings Server Component calls getCurrentRenderLabAccount()
  -> server client verifies claims
  -> RenderLab account identity = claims.sub
```

Rules:
- public browser configuration is `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- service-role credentials stay in server/CI boundaries and are never used by the account browser component;
- server identity is derived from verified Supabase claims, not a browser-provided owner UUID;
- UI-029 introduced identity without silently redesigning the approved product loop; UI-030 is now the completed production ownership/enforcement layer used by later personal organization.

Configured Account Identity exact head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed the nine affected gates, including Account Identity `33112405837`; PR #16 merged as `bcb20365db102252db51263968de96fc795be518`, and merged-main UI Shell `33113289145` plus Reference Upload Integration `33113289156` passed.

## Core Account Ownership Flow
UI-030 (PR #17; production enforced):
```text
browser cookie or Authorization bearer session
  -> getCurrentRenderLabAccount()
  -> verified non-anonymous claims.sub
  -> product route / Server Component
  -> owner-scoped server service query/write
  -> service-role Supabase/R2/worker boundary
  -> owned generation_sources / generation_jobs / media_assets / media_upload_sessions
```

Rules:
- signed-out private API access returns the product authentication-required state; malformed input may still fail validation before authorization where the route contract intentionally validates first;
- Library and Media Viewer never service-role query another account's durable media; foreign IDs appear missing;
- upload/reference completion can mutate only the authenticated owner's pending record;
- generation jobs, inputs, polling and persisted outputs carry the same owner;
- raw core tables remain server-owned: RLS is enabled and browser roles have no direct table grants;
- corrected `0005_core_account_ownership_enforce.sql` is applied as `20260828174940 renderlab_core_account_ownership_enforce`; all four owners are non-null/immutable and table-specific same-owner generation/media and upload/media guards are active;
- optional external generation is a server-to-server owner boundary: it requires both `RENDERLAB_GENERATION_BACKEND_URL` and `RENDERLAB_GENERATION_BACKEND_TOKEN`; submit and poll authenticate with the bearer token before sending `x-renderlab-owner-id`, and the external service must verify that token before trusting the header.

Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed the complete 14-gate configured PR suite, including Account Ownership `33131090207`, Create Lifecycle `33131090243`, Library Lifecycle `33131090245`, Generation Integration `33131090251` and Video Generation `33131090262`. The resumed suite also verified the final external-backend authentication hardening and corrected ownership persistence. A verifier-only signed-media redirect issue was found and fixed in the shared Playwright auth helper; local product media routes are authenticated without carrying the fixture bearer across the external signed-R2 redirect. Fresh desktop/mobile artifacts were reviewed and shared Supabase/Auth cleanup returned to zero.

Corrected `0005` first passed rollback-only live-schema same-owner/cross-owner/immutability/null-owner/Auth-delete and FK-cleanup compatibility simulations, then was applied only after the owner-aware runtime was live and the final no-unowned-row audit passed. Post-enforcement production Account Ownership verification remained green and cleanup returned shared RenderLab rows/users to zero.

## Library Favorites v0.1 Architecture — UI-031 (approved)
Verified contract:
```text
verified account + durable media asset
  -> owner-scoped favorite mutation
  -> media_assets.favorited_at nullable timestamp
  -> GET /api/media/assets?favorite=true
  -> server-owned Library Favorites view
```

Rules:
- favorite state belongs to the existing account-owned durable asset; do not create a parallel user-media identity or global flag outside the owner boundary;
- the additive schema change must preserve RLS and zero direct browser grants;
- Library favorite filtering composes with existing kind/search/sort/pagination URL state and remains server-owned;
- Viewer owns the initial favorite toggle; v0.1 does not redesign cards or introduce batch actions;
- foreign asset IDs remain ordinary not-found state and signed-out mutation remains authentication-required;
- Collections remain a separate future relation/model rather than being inferred from Favorites.

Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable configured gates, including Library Favorites `33200364267`, Account Ownership `33200364288`, Library Lifecycle `33200364235`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233` and Video Generation `33200364198`. Final documentation head `4bd41d55af27c7240d75862424039fc59027988e` passed the complete 13-gate affected matrix again before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`. Four fresh desktop/mobile Library/Viewer artifacts were visually reviewed clean. Final pre-merge and post-merge Supabase audits returned zero shared RenderLab rows/fixture users/browser grants while preserving four RLS-enabled tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at` and the UI-031 partial index. Merged-main UI Shell, Reference Upload, Generation and Video Generation checks all passed.

## Capability Architecture
```text
Creative Operation
      ↓
Workflow Capability
      ↓
Input Slots + Parameter Definitions
      ↓
Normalized Generation Request
      ↓
Generation Job
      ↓
Persisted Media Asset
      ↓
Continuation / Asset Actions
```

Generation inputs bind by product identity:
```text
GenerationInput
  ├── temporary-source { id }
  └── media-asset      { id }
```

Generated/uploaded durable media both use `media-asset`. R2/provider/worker/ComfyUI identifiers remain server-side.

## Native Generation Flow
```text
Create
  -> POST /api/generation/jobs
  -> verify account for persistent submission
  -> validate / resolve operation
  -> create owned generation_jobs
  -> resolve owner-scoped opaque inputs
  -> submit to compatible worker
  -> poll RenderLab API with owner context
  -> persist output to R2
  -> create owned media_assets
  -> job succeeds with outputAssetIds
  -> render durable result + continuation
```

Worker completion is not product completion; success requires durable persistence. All four initial operations were live verified before UI-030. UI-030 keeps the same product flow while requiring persistent generation state to remain within the verified account boundary.

## Persistent Library Upload Flow
UI-022 + UI-028 + UI-030:
```text
signed-in Library picker OR one-file desktop drop
  -> shared feature validation: PNG/JPEG/WebP ≤25 MB
  -> POST owner-scoped upload ticket
  -> owned media_upload_sessions pending + opaque uploadId
  -> short-lived signed R2 PUT
  -> browser PUT
  -> POST owner-scoped completion
  -> server HEAD verifies MIME + bytes
  -> create owned media_assets(origin=uploaded)
  -> complete session
  -> refresh owner-scoped Library
  -> Library / Viewer / Create use normal media-asset identity
```

Rules: no browser R2 credentials; storage key opaque; human filename Unicode-preserving after cleanup; only verified completion creates durable media; completion is idempotent/race-safe; no public Uploads asset type/tab. UI-028 adds no persistent drop state: the Upload button remains the keyboard/touch/mobile baseline, drag affordance is visible only during a compatible file drag, and multiple-file drops are rejected before ticket creation. Picker/drop share one feature-owned browser transaction rather than parallel implementations. UI-030 requires a verified account for ticket/completion and binds both pending and durable rows to that owner.

PR #9 final verification passed `33067469516`, `33067469518`, `33067469527`; merged as `d306f2abd1831538c51692545d72db1e5e9e0814`. UI-028 final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`; exact-head responsive screenshots and zero shared fixture counts were verified. PR #15 merged as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

## Library Search Flow
UI-023 + UI-030:
```text
signed-in /library?q=<text>&kind=<optional>&sort=<optional>&offset=<optional>
  -> verify account
  -> normalize/cap q
  -> validate sort newest|oldest
  -> listMediaAssets(ownerId, { search, kind, sort, offset })
  -> escape literal query
  -> owner_id AND PostgREST OR display_name/original_filename/provenance.prompt imatch
  -> AND optional kind
  -> UI-027 chronological order
  -> existing cards / truthful no-match state
```

Search is server-side across the authenticated account's durable media, not current-page filtering. It excludes storage/provider/model/temporary/legacy data. No separate search schema/service is introduced. PR #10 final documentation-head runs passed `33070046222`, `33070046205`, `33070046336`, `33070046186`; merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Post-merge main `33070215358` passed.

## Library History Ordering Flow
UI-027 + UI-030:
```text
signed-in /library?sort=<newest|oldest>&kind=<optional>&q=<optional>&offset=<optional>
  -> verify account
  -> parse/validate URL-owned sort
  -> newest default when omitted
  -> listMediaAssets(ownerId, { sort, search, kind, offset })
  -> owner_id AND PostgREST order created_at.<dir>,id.<dir>
  -> fetch limit + 1 for hasMore
  -> render existing media grid
  -> direction-aware Newer/Older pagination
```

Rules:
- ordering is server-owned across the authenticated owner's durable `media_assets`, never a current-page client reorder;
- `created_at` and `id` use the same direction so offset pagination is deterministic for equal timestamps;
- kind/search/sort preserve one another in generated links and form state;
- changing sort or kind resets offset; search submission resets offset while preserving sort/kind;
- Newest is canonical and clean links omit `sort=newest`;
- `LibrarySortMenu` is UI-only navigation composition using maintained Dropdown Menu radio items; no global client data store is introduced;
- UI-027 adds no relevance ranker, date/model filter console, Favorites/Collections, Delete or batch framework.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Direct Supabase cleanup found `0` history fixtures and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed all eight affected gates; PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; merged `main` UI Shell `33097463519` passed.

## Durable Media Download Flow
UI-024 + UI-030:
```text
Media Viewer
  -> GET /api/media/assets/[assetId]/download
  -> verify account
  -> server reloads owner-scoped durable media_assets row
  -> derive safe product filename from durable metadata + verified MIME
  -> sign R2 GetObject with ResponseContentDisposition=attachment
  -> 302 redirect, private/no-store
  -> browser downloads directly from R2
```

Rules:
- product identity is the opaque `media-asset` ID, not an R2 key or signed URL;
- RenderLab does not proxy file bytes through the application server;
- uploaded downloads prefer sanitized `original_filename`, then `display_name`, while forcing canonical extension from `mime_type`;
- filename sanitization preserves legitimate Unicode but removes controls/path/platform-forbidden semantics and mitigates Windows reserved basenames;
- generated media uses `renderlab-<kind>-<id-prefix>.<ext>` fallback, not prompt/storage identity;
- response disposition includes ASCII `filename` fallback plus UTF-8 RFC5987 `filename*`;
- Download is Viewer-only/secondary in v0.1, not a Library-card or batch action;
- foreign asset IDs resolve as ordinary not-found rather than revealing another account's ownership.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after configured and documentation-finalized verification.

## Durable Media Rename Flow
UI-025 + UI-030:
```text
Media Viewer
  -> user opens inline Rename editor
  -> PATCH /api/media/assets/[assetId] { displayName }
  -> verify account + validate opaque UUID + normalize bounded human name
  -> reload owner-scoped durable media_assets row
  -> update display_name only
  -> return public media asset
  -> client closes editor + refreshes server-rendered Viewer
  -> owner-scoped Library search sees the new display name immediately
```

Rules:
- control characters are removed and whitespace is collapsed before persistence;
- normalized name must be non-empty and at most 240 characters;
- only `media_assets.display_name` changes;
- uploaded `original_filename`, `mime_type`, `storage_key`, generated provenance/prompt and object contents are preserved;
- Download semantics remain independent: uploaded downloads continue to prefer original filename, generated downloads keep deterministic fallback naming;
- no R2 object move/rename occurs and Rename adds no browser-upload CORS requirement;
- foreign asset IDs are not mutable and are indistinguishable from nonexistent IDs at the product boundary;
- the interaction remains Viewer-only and feature-owned in v0.1; no generic management framework, Library-card rename, delete, collections or batch actions are implied.

PR #12 final exact head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Search `33077320839`, Upload Integration `33077320935`, Download `33077320886`, Rename `33077321228`, and Library Lifecycle `33077320976`; direct cleanup was zero and the PR merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

## Media Delivery and Continuation
Product media APIs expose owner-scoped metadata/content/thumbnail/download plus bounded metadata mutation without exposing raw storage identity. Ordinary content routes sign inline reads; Download signs attachment reads. Library cards deep-link to Viewer. Image continuation actions come from shared capabilities, and Create revalidates the authenticated owner's durable identity/action compatibility before initialization.

## Supabase Boundary
RenderLab reuses shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables: `generation_sources`, `generation_jobs`, `media_assets`, `media_upload_sessions`. Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630`. UI-030 prepare migration `0004_core_account_ownership_prepare.sql` is applied as `20260827203604 renderlab_core_account_ownership_prepare`: all four core tables have nullable `owner_id -> auth.users.id ON DELETE RESTRICT`, RLS remains enabled, and browser roles have no direct raw-table grants. Corrected `0005_core_account_ownership_enforce.sql` remains staged/unapplied until owner-aware code is safely live; its rollback-only semantic simulations pass and leave the live schema unchanged afterward.

Product application-table access remains behind server-only service-role credentials plus explicit owner filters. Supabase Auth browser code uses only the public URL/publishable key and server identity derives from verified claims; service-role credentials are never sent to the browser.

## Cloudflare R2 Boundary
- shared R2 is deliberately reused;
- generated media uses `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`;
- credentials stay server-only;
- upload uses short-lived signed PUT + exact-origin CORS;
- picker and drag/drop share that exact upload path/origin boundary;
- the current admin-capable R2 access-key credentials can reconcile the managed exact-origin CORS rule through the S3 API;
- ordinary media delivery uses short-lived signed GET;
- Download uses short-lived signed GET with `ResponseContentDisposition` attachment override;
- Rename does not mutate R2 objects at all;
- Library history ordering does not touch R2 or CORS;
- signed URLs are ephemeral implementation details, never durable product links.

Do not disable browser security, use broad wildcard upload CORS, proxy transfers solely for convenience, expose raw storage identity, or implement Rename by moving storage objects.

## Remote Validation Architecture
GitHub-based iteration; no Vercel preview dependency. The repository is public so the normal mid-development GitHub-hosted Actions path is not constrained by private-repository minute exhaustion; Actions secrets remain private.

Key workflows:
- `.github/workflows/ui-shell.yml` — UI purity audit, production build, credential-free signed-out UI/API behavior and responsive screenshots;
- `.github/workflows/account-ownership.yml` — configured two-account private-record isolation, signed-out denial, foreign opaque-ID denial, raw-table denial and cleanup;
- `.github/workflows/create-lifecycle-visual.yml` — configured real owner-bound generation lifecycle;
- `.github/workflows/media-upload-integration.yml` — owner-bound persistent upload backend contract, no ComfyUI;
- `.github/workflows/library-lifecycle-visual.yml` — real signed-in Upload → Library → Viewer → Create, responsive screenshots, cleanup; serialized with `concurrency: renderlab-library-lifecycle-shared` because it mutates shared Supabase/R2 fixture state;
- `.github/workflows/library-search-visual.yml` — real owner-bound durable-media search fixtures, responsive result/no-match states, cleanup;
- `.github/workflows/library-history-visual.yml` — real owner-bound R2/Supabase-backed controlled-timestamp fixtures, newest/oldest API + pagination/kind composition, real Dropdown Menu navigation, responsive screenshots and cleanup;
- `.github/workflows/library-drag-drop-visual.yml` — real authenticated DataTransfer drag/drop into the persistent upload contract, multi-file rejection before network, exact request/session/asset/card uniqueness, clean desktop/mobile screenshots and cleanup; shares the serialized Library upload fixture lock;
- `.github/workflows/media-download-visual.yml` — real owner-bound uploaded/generated R2-backed downloads, exact filenames/bytes, Viewer screenshots, cleanup;
- `.github/workflows/media-rename-visual.yml` — real owner-bound generated/uploaded durable Rename, Search/Download invariants, desktop/mobile edit/renamed screenshots, cleanup;
- `.github/workflows/account-identity-visual.yml` — real Supabase Auth fixture, Settings sign-in/session persistence/sign-out, responsive screenshots and exact fixture cleanup;
- `.github/workflows/reference-upload-integration.yml` — owner-bound temporary reference persistence;
- `.github/workflows/generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence/continuation;
- `.github/workflows/video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary-reference ownership.

Shared primitive/config/package paths are included in the affected visual workflow triggers. A change to `src/components/ui`, `components.json`, `package.json` or the shared primitive contract must not bypass Create/Library/Viewer regression coverage merely because a feature file itself was untouched.

Cancellation remains limited to workflows whose interrupted state is safely reconstructible. UI Shell, Persistent Media Upload Integration and Reference Upload Integration currently use `cancel-in-progress: true`; worker-backed and shared-mutable visual workflows remain non-canceling. Exact-head validation remains required even when runner availability or budget pressure prevents execution.

### PR #13 maintained-primitive verification
Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed all six affected gates:
- UI Shell Validation `33088086901`;
- Create Lifecycle Visual `33088086892`;
- Library Search Visual `33088086914`;
- Library Lifecycle Visual `33088086872`;
- Media Download Visual `33088086907`;
- Media Rename Visual `33088086871`.

The Library lifecycle verified real browser Upload → Library → Viewer → Edit continuation with the Radix Image radio selected, 400×300 media geometry and self-cleanup. Final-code desktop/mobile screenshots from UI Shell and Library lifecycle were visually inspected with no unintended hierarchy/layout drift.

Documentation-finalized candidate head `ba8199b49d4576dc5495779f8e84812786c5b586` passed UI Shell `33089332190`, Create Lifecycle `33089332135`, Library Search `33089333557`, Library Lifecycle `33089332001`, Media Download `33089332087`, and Media Rename `33089332021`. UI-026 and the maintained primitive architecture are approved and merged through PR #13.

### PR #14 Library history verification
Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed all eight affected gates:
- Library History Visual `33094977896`;
- UI Shell Validation `33094977929`;
- Library Search Visual `33094977911`;
- Library Lifecycle Visual `33094977899`;
- Media Download Visual `33094977913` after an unchanged rerun of a transient second-download event timeout;
- Media Rename Visual `33094977895`;
- Create Lifecycle Visual `33094977825`;
- Persistent Media Upload Integration `33094978022`.

History screenshots for desktop Oldest, open menu and mobile Newest were visually inspected with no unintended hierarchy drift. Direct Supabase cleanup found `0` history verification assets and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed all eight affected gates:
- UI Shell Validation `33097006928`;
- Create Lifecycle Visual `33097006913`;
- Persistent Media Upload Integration `33097007064`;
- Library Lifecycle Visual `33097006853`;
- Library Search Visual `33097007092`;
- Library History Visual `33097006833`;
- Media Download Visual `33097006968`;
- Media Rename Visual `33097006959`.

PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; the push-triggered merged `main` UI Shell `33097463519` passed.

### PR #15 Library drag/drop verification
Implementation head `d957242d9b45fbb9fb115c8fd2b0a4dc60dc88ef` passed all five affected gates:
- UI Shell Validation `33102672560`;
- Library Search Visual `33102672572`;
- Library History Visual `33102672507`;
- Library Lifecycle Visual `33102672568`;
- Library Drag Drop Visual `33102672468`.

The configured drag/drop lifecycle rejected multi-file DataTransfer without network upload, then verified exactly one ticket, completion, upload session, durable asset and Library card for one dropped run-unique Unicode PNG. The clean artifact showed the temporary desktop drag affordance, one valid completed desktop card and the normal mobile Upload baseline. The serialized pre-run cleanup also removed a stale historical Library lifecycle fixture from Supabase/R2; direct verification found zero drag/drop and legacy-lifecycle fixture rows.

Final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`. Drag Drop `33109026739` verified pre-run cleanup, real DataTransfer upload through the existing lifecycle and post-run cleanup. PR #15 merged with the expected-head SHA guard as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

### PR #16 Account identity verification
Final exact head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed all nine affected gates:
- Account Identity Visual `33112405837`;
- UI Shell Validation `33112405863`;
- Create Lifecycle Visual `33112405840`;
- Library Search Visual `33112405831`;
- Library History Visual `33112405838`;
- Library Lifecycle Visual `33112405858`;
- Library Drag Drop Visual `33112405827`;
- Media Download Visual `33112405889`;
- Media Rename Visual `33112405850`.

The account verifier created an exact run-owned confirmed Supabase Auth user through the server-only admin API, signed in through the actual Settings form, verified the cookie session survived reload, captured clean desktop/mobile signed-in and mobile signed-out states, signed out and removed the exact fixture. Direct Supabase verification afterward found `0` matching CI users. PR #16 merged as `bcb20365db102252db51263968de96fc795be518`; merged-main UI Shell `33113289145` and Reference Upload Integration `33113289156` passed.

### PR #17 Core account ownership verification — implementation green, rollout in progress
Original product SHA `7dfda5e61b787f6ac30ed905ccc565e3bc32266b` passed Account Ownership `33115683962`: production build/startup, two real confirmed accounts, own-vs-foreign private media/job behavior, owner-bound upload/reference writes, raw Data API denial and cleanup.

Later PR #17 hardening corrected staged `0005` after a rollback-only semantic simulation found an invalid polymorphic trigger-field reference, strengthened deterministic owner cleanup/verifiers, added safe workflow cancellation where cleanup is reconstructible, and requires authenticated server-to-server submit/poll for the optional external generation adapter. The corrected migration passes rollback-only enforcement and existing FK-cleanup compatibility simulations with no persistent schema/data/auth residue.

After the repository was made public, hosted Actions runner allocation resumed. Exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates. The resumed suite exposed and then verified the fix for one CI-only media redirect-auth problem: Playwright no longer carries the fixture bearer onto signed R2 redirects. Fresh responsive Create/Library/Viewer artifacts were reviewed and the post-suite shared-resource audit found 0 core rows, 0 fixture Auth users, no browser direct grants and no enforcement triggers.

PR #17 can proceed through final documentation-head validation and merge. Corrected `0005` remains unapplied until owner-aware code is actually live and a final no-unowned-row audit passes; no deployment is implied by this documentation/merge step.

## Naming Conventions
- React files: `kebab-case.tsx`
- Hooks: `use-*.ts`
- Services/libraries: `kebab-case.ts`
- framework route filenames remain framework-defined
- component exports/types: `PascalCase`
- functions/variables: `camelCase`
- semantic CSS/Tailwind tokens: lowercase kebab-case

## Architecture Guardrails
- Server Components by default; no broad client boundaries for convenience.
- Product contracts use opaque IDs, never provider/storage identity.
- Shared capability logic owns continuation eligibility.
- Browser does not talk directly to workers.
- Shared infrastructure reuse never authorizes legacy `studio_*` coupling.
- Approved Create/Library/Viewer visual language is not redesigned by incremental media features, primitive maintenance, account identity or ownership work.
- Conventional visible feature/shell controls compose the approved maintained primitive layer; raw native controls are plumbing-only exceptions defined by UI-026.
- Supabase Auth `auth.users.id` is the approved account principal; browser-supplied user IDs are never authoritative.
- Private generation/reference/upload/media state is owner-scoped through UI-030. Raw browser table access remains denied; server service-role access always carries explicit owner filters.
- Optional external generation owner forwarding is trusted only across an authenticated server-to-server bearer boundary; `x-renderlab-owner-id` is not standalone authentication.
- Corrected `0005` remains a staged rollout step until owner-aware code is safely live and the final no-unowned-row audit passes. Do not reverse that order.
- Favorites/Collections remain blocked until UI-030 is fully enforced; Delete remains blocked on explicit database/R2/reference-history cleanup and recovery/tombstone semantics.
- Search remains server-owned durable discovery within the account boundary.
- Library chronological ordering remains URL/server-owned over the owner's durable corpus; do not replace it with page-only client sorting or expand it into a generic filter console by implication.
- Library drag/drop remains a feature-owned optional path into the existing persistent upload transaction; do not infer batch upload, a global dropzone framework or new storage semantics from it.
- Download remains a Viewer-contextual product action through a stable owner-scoped media route; raw signed R2 URLs are ephemeral only.
- Rename remains a bounded owner-scoped durable display-name mutation; do not reinterpret it as file/storage rename or broader management approval.
- Future public upload origins must be added explicitly to exact-origin R2 CORS.