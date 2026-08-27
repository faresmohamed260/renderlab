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

Approved product state includes Application Shell, Create, Library v0.1, persistent Upload, Library search v0.1, Library history ordering v0.1, Library drag/drop upload v0.1, Media Viewer v0.1, Download v0.1 and Rename v0.1. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`; PR #13 merged the foundation-only maintained-primitive refactor under UI-026; PR #14 merged Library chronological direction/UI-027 as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; PR #15 merged Library drag/drop upload/UI-028 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`. Account Identity Foundation/UI-029 is implementation-approved on PR #16 and replaces the Settings placeholder with a real account surface without yet changing media/job ownership. Activity remains a placeholder.

## Framework
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Rendering:** Server Components by default; Client Components only for interactive feature behavior  
**Styling:** Tailwind CSS + semantic project tokens  
**Components:** approved RenderLab components first; conventional visible controls use the maintained `src/components/ui` layer; new mechanics follow the approved source order in `docs/ui/COMPONENT_CATALOG.md`.

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
- Library `kind`, `q`, `sort`, `offset` are URL-owned shareable browsing/discovery/history state.
- `sort=newest|oldest`; Newest is canonical and omitted from clean links.
- Viewer → Create `source` + `action` are untrusted navigation intent; the server reloads durable media and validates compatibility.
- Durable Download uses the Viewer asset route context and a product API; the browser never treats an R2 key/signed URL as durable identity.
- Durable Rename stays on the Viewer asset identity; the client submits a bounded display-name mutation and refreshes server-rendered asset state.
- Library drag/drop is transient browser interaction state only; it does not become URL or durable media-management state.
- Settings owns requirement-backed account/application state. UI-029 uses it for Supabase Auth identity; it does not become a login gate around other routes.

## Product API Boundaries
```text
POST     /api/generation/jobs
GET      /api/generation/jobs/[jobId]

POST     /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions

GET      /api/media/assets
GET      /api/media/assets/[assetId]
PATCH    /api/media/assets/[assetId]
GET      /api/media/assets/[assetId]/content
GET      /api/media/assets/[assetId]/thumbnail
GET      /api/media/assets/[assetId]/download
POST     /api/media/uploads/upload-tickets
POST     /api/media/uploads/upload-completions
```

`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `limit`, `offset`; `sort` accepts only `newest|oldest` and defaults to newest. `PATCH /api/media/assets/[assetId]` currently owns the UI-025 durable display-name Rename mutation only. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.

UI-029 account operations use the maintained Supabase Auth client contract rather than adding parallel RenderLab password/session APIs. The next ownership slice must explicitly thread verified account identity through the product APIs/services above before any of those resources are considered account-private.

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
- `lib/supabase` — public/server Supabase Auth client/session boundary; browser code never receives service-role credentials;
- `lib/capabilities` — user-facing capability definitions/resolution;
- `lib/api` — typed product API/query contracts;
- `server/generation` — orchestration/worker boundaries;
- `server/media` — durable media/query/upload/download/rename services;
- `server/storage` — R2 implementation;
- `server/data` — server-only Supabase/repository access.

Do not extract generic upload/search/history/download/rename/dropzone/auth-form frameworks from single feature needs. Reuse follows a second real product need. UI-026 applies to generic conventional control mechanics, not to feature-domain extraction.

## Component / Client Boundaries
### Server Components by default
Library route composition, Library search/history query resolution, Media Viewer loading, root Create continuation validation and Settings account-state loading are server-owned.

### Client Components deliberately
Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, the small Library sort navigation menu, Rename edit/saving state, Settings account form actions and interactions that truly require browser state.

Library picker/drop interactions share feature-owned `library-upload-client.ts`; that client owns validation and the existing ticket → signed PUT → completion transaction, while the Library dataset itself remains server-owned and is refreshed after successful completion. `LibraryDropUploadSurface` owns only transient DragEvent/DataTransfer state and local feedback; it does not copy Library media into a global client store or create a second upload contract. Library search remains a URL-owned native GET form while its visible input/actions use maintained primitives and its hidden kind/sort state remains native plumbing. `LibrarySortMenu` uses a small client component only for Radix menu interaction + URL navigation; actual ordering remains server-owned. Media Viewer Download uses normal product-route navigation. Rename uses one small Viewer-owned client component, submits to the product API, then calls router refresh so the server-rendered Viewer title/metadata stays authoritative. AccountSettings calls Supabase Auth through the public browser client for sign-in/create-account/sign-out, then refreshes the server-rendered Settings account state. No global media-management or auth client store exists.

## State Architecture
### URL state
- Library `kind` / `q` / `sort` / `offset`;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Auth/session state
- Supabase Auth cookie session;
- verified server account principal from Auth claims (`sub` / `auth.users.id`).

### Server state
- `generation_jobs`;
- durable `media_assets` including human-facing `display_name`;
- `media_upload_sessions`;
- temporary `generation_sources`.

### Local transient browser state
- Create form/runtime interaction state;
- Library file-picker/drop uploading, drag-active and local feedback state;
- Viewer Rename editor state;
- Settings account-form fields/busy/local feedback state.

Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-029 establishes account identity only; it does not make existing core rows owner-scoped. Favorites/Collections must remain deferred until the verified account principal is persisted/enforced across generation/reference/upload/media boundaries and cross-account denial is proven.

## Account Identity Flow
UI-029:
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
- Create/Library remain accessible in UI-029 so identity introduction does not silently redesign the approved product loop;
- account identity and data ownership are separate contracts: owner columns, account-scoped product queries, cross-account denial and RLS policy work are explicitly next.

Configured Account Identity Visual `33111299356` created a deterministic run-owned confirmed Auth fixture through the server-only admin API, exercised real Settings sign-in, verified session persistence after reload, rendered desktop/mobile signed-in states, signed out, rendered mobile signed-out state and deleted the exact test user. Direct verification found zero matching CI account users afterward.

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
  -> validate / resolve operation
  -> create generation_jobs
  -> resolve opaque inputs
  -> submit to compatible worker
  -> poll RenderLab API
  -> persist output to R2
  -> create media_assets
  -> job succeeds with outputAssetIds
  -> render durable result + continuation
```

Worker completion is not product completion; success requires durable persistence. All four initial operations are live verified. UI-029 does not change this flow yet; owner enforcement is intentionally deferred to the next slice so a partial principal check cannot create false isolation.

## Persistent Library Upload Flow
UI-022 + UI-028:
```text
Library picker OR one-file desktop drop
  -> shared feature validation: PNG/JPEG/WebP ≤25 MB
  -> POST upload ticket
  -> media_upload_sessions pending + opaque uploadId
  -> short-lived signed R2 PUT
  -> browser PUT
  -> POST completion
  -> server HEAD verifies MIME + bytes
  -> create media_assets(origin=uploaded)
  -> complete session
  -> refresh Library
  -> Library / Viewer / Create use normal media-asset identity
```

Rules: no browser R2 credentials; storage key opaque; human filename Unicode-preserving after cleanup; only verified completion creates durable media; completion is idempotent/race-safe; no public Uploads asset type/tab. UI-028 adds no persistent drop state: the Upload button remains the keyboard/touch/mobile baseline, drag affordance is visible only during a compatible file drag, and multiple-file drops are rejected before ticket creation. Picker/drop share one feature-owned browser transaction rather than parallel implementations.

PR #9 final verification passed `33067469516`, `33067469518`, `33067469527`; merged as `d306f2abd1831538c51692545d72db1e5e9e0814`. UI-028 final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`; exact-head responsive screenshots and zero shared fixture counts were verified. PR #15 merged as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

## Library Search Flow
UI-023:
```text
/library?q=<text>&kind=<optional>&sort=<optional>&offset=<optional>
  -> normalize/cap q
  -> validate sort newest|oldest
  -> listMediaAssets({ search, kind, sort, offset })
  -> escape literal query
  -> PostgREST OR display_name/original_filename/provenance.prompt imatch
  -> AND optional kind
  -> UI-027 chronological order
  -> existing cards / truthful no-match state
```

Search is server-side across durable media, not current-page filtering. It excludes storage/provider/model/temporary/legacy data. No schema migration/index/service in v0.1. PR #10 final documentation-head runs passed `33070046222`, `33070046205`, `33070046336`, `33070046186`; merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Post-merge main `33070215358` passed.

## Library History Ordering Flow
UI-027:
```text
/library?sort=<newest|oldest>&kind=<optional>&q=<optional>&offset=<optional>
  -> parse/validate URL-owned sort
  -> newest default when omitted
  -> listMediaAssets({ sort, search, kind, offset })
  -> PostgREST order created_at.<dir>,id.<dir>
  -> fetch limit + 1 for hasMore
  -> render existing media grid
  -> direction-aware Newer/Older pagination
```

Rules:
- ordering is server-owned across durable `media_assets`, never a current-page client reorder;
- `created_at` and `id` use the same direction so offset pagination is deterministic for equal timestamps;
- kind/search/sort preserve one another in generated links and form state;
- changing sort or kind resets offset; search submission resets offset while preserving sort/kind;
- Newest is canonical and clean links omit `sort=newest`;
- `LibrarySortMenu` is UI-only navigation composition using maintained Dropdown Menu radio items; no global client data store is introduced;
- UI-027 adds no database migration, relevance ranker, date/model filter console, Favorites/Collections, Delete or batch framework.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Direct Supabase cleanup found `0` history fixtures and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed UI Shell `33097006928`, Create Lifecycle `33097006913`, Persistent Media Upload Integration `33097007064`, Library Lifecycle `33097006853`, Library Search `33097007092`, Library History `33097006833`, Media Download `33097006968`, and Media Rename `33097006959`. PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; merged `main` UI Shell `33097463519` passed.

## Durable Media Download Flow
UI-024:
```text
Media Viewer
  -> GET /api/media/assets/[assetId]/download
  -> server reloads durable media_assets row
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
- Download is Viewer-only/secondary in v0.1, not a Library-card or batch action.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after configured and documentation-finalized verification.

## Durable Media Rename Flow
UI-025:
```text
Media Viewer
  -> user opens inline Rename editor
  -> PATCH /api/media/assets/[assetId] { displayName }
  -> validate opaque UUID + normalize bounded human name
  -> reload durable media_assets row
  -> update display_name only
  -> return public media asset
  -> client closes editor + refreshes server-rendered Viewer
  -> Library search sees the new display name immediately
```

Rules:
- control characters are removed and whitespace is collapsed before persistence;
- normalized name must be non-empty and at most 240 characters;
- only `media_assets.display_name` changes;
- uploaded `original_filename`, `mime_type`, `storage_key`, generated provenance/prompt and object contents are preserved;
- Download semantics remain independent: uploaded downloads continue to prefer original filename, generated downloads keep deterministic fallback naming;
- no R2 object move/rename occurs and Rename adds no browser-upload CORS requirement;
- the interaction remains Viewer-only and feature-owned in v0.1; no generic management framework, Library-card rename, delete, collections or batch actions are implied.

PR #12 final exact head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Search `33077320839`, Upload Integration `33077320935`, Download `33077320886`, Rename `33077321228`, and Library Lifecycle `33077320976`; direct cleanup was zero and the PR merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail/download plus bounded metadata mutation without exposing raw storage identity. Ordinary content routes sign inline reads; Download signs attachment reads. Library cards deep-link to Viewer. Image continuation actions come from shared capabilities, and Create revalidates durable identity/action compatibility before initialization.

## Supabase Boundary
RenderLab reuses shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables: `generation_sources`, `generation_jobs`, `media_assets`, `media_upload_sessions`. Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630`. RLS remains enabled. Product application-table mutations still use server-only service-role credentials. UI-029 introduces maintained Supabase Auth clients/session refresh using public URL/publishable-key configuration and verified server claims but adds no schema migration or owner-scoped policy yet. Search, Download, Rename, history ordering, drag/drop and UI-026 also add no schema migration.

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
GitHub-based iteration; no Vercel preview dependency.

Key workflows:
- `.github/workflows/ui-shell.yml` — UI purity audit, production build, credential-free UI/API behavior and responsive screenshots;
- `.github/workflows/create-lifecycle-visual.yml` — configured real generation lifecycle;
- `.github/workflows/media-upload-integration.yml` — persistent upload backend contract, no ComfyUI;
- `.github/workflows/library-lifecycle-visual.yml` — real Upload → Library → Viewer → Create, responsive screenshots, cleanup; serialized with `concurrency: renderlab-library-lifecycle-shared` because it mutates shared Supabase/R2 fixture state;
- `.github/workflows/library-search-visual.yml` — real durable-media search fixtures, responsive result/no-match states, cleanup;
- `.github/workflows/library-history-visual.yml` — real R2/Supabase-backed controlled-timestamp fixtures, newest/oldest API + pagination/kind composition, real Dropdown Menu navigation, responsive screenshots and cleanup;
- `.github/workflows/library-drag-drop-visual.yml` — real DataTransfer drag/drop into the persistent upload contract, multi-file rejection before network, exact request/session/asset/card uniqueness, clean desktop/mobile screenshots and cleanup; shares the serialized Library upload fixture lock;
- `.github/workflows/media-download-visual.yml` — real uploaded/generated R2-backed downloads, exact filenames/bytes, Viewer screenshots, cleanup;
- `.github/workflows/media-rename-visual.yml` — real generated/uploaded durable Rename, Search/Download invariants, desktop/mobile edit/renamed screenshots, cleanup;
- `.github/workflows/account-identity-visual.yml` — real Supabase Auth fixture, Settings sign-in/session persistence/sign-out, responsive screenshots and exact fixture cleanup.

Shared primitive/config/package paths are included in the affected visual workflow triggers. A change to `src/components/ui`, `components.json`, `package.json` or the shared primitive contract must not bypass Create/Library/Viewer regression coverage merely because a feature file itself was untouched.

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
Code head `e87e1c89e339c5ca1a4c29dc414500072a71a3c5` passed all nine affected gates triggered by the shared package/auth changes:
- Account Identity Visual `33111299356`;
- UI Shell Validation `33111299265`;
- Create Lifecycle Visual `33111299305`;
- Library Search Visual `33111299144`;
- Library History Visual `33111299040`;
- Library Lifecycle Visual `33111299250`;
- Library Drag Drop Visual `33111299309`;
- Media Download Visual `33111299155`;
- Media Rename Visual `33111299172`.

The account verifier created an exact run-owned confirmed Supabase Auth user through the server-only admin API, signed in through the actual Settings form, verified the cookie session survived reload, captured clean desktop/mobile signed-in and mobile signed-out states, signed out and removed the exact fixture. Direct Supabase verification afterward found `0` matching CI users. The screenshots preserved the approved shell hierarchy and responsive bottom navigation.

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
- Approved Create/Library/Viewer visual language is not redesigned by incremental media features, primitive maintenance or account identity work.
- Conventional visible feature/shell controls compose the approved maintained primitive layer; raw native controls are plumbing-only exceptions defined by UI-026.
- Supabase Auth `auth.users.id` is the approved account principal; browser-supplied user IDs are never authoritative.
- Account identity alone does not imply data ownership. Owner scoping across generation/reference/upload/media plus cross-account denial is the next required contract before Favorites/Collections.
- Search remains server-owned durable discovery.
- Library chronological ordering remains URL/server-owned over the durable corpus; do not replace it with page-only client sorting or expand it into a generic filter console by implication.
- Library drag/drop remains a feature-owned optional path into the existing persistent upload transaction; do not infer batch upload, a global dropzone framework or new storage semantics from it.
- Delete requires explicit database/R2/reference-history cleanup and recovery/tombstone semantics before product approval.
- Download remains a Viewer-contextual product action through a stable media route; raw signed R2 URLs are ephemeral only.
- Rename remains a bounded durable display-name mutation; do not reinterpret it as file/storage rename or broader management approval.
- Future public upload origins must be added explicitly to exact-origin R2 CORS.