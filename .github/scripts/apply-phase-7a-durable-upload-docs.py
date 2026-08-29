from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


# PROJECT — Phase 7 is now executing and the first verified foundation slice is durable Create uploads.
replace_once(
    "PROJECT.md",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary; closed-beta production feedback has been triaged into a revised Create v2 plan and the Phase 7 contract is expanded/planned but not started.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary; Phase 7A Create Foundation is now in progress and its first verified slice makes Create-originated user uploads durable Library media.**",
)
replace_once(
    "PROJECT.md",
    '''- Current phase contract: **Phase 7 — Create v2 / Creative Direction**, `EXPANDED/PLANNED`; execution `NOT STARTED`.\n- Current product slice: `None`; no Phase 7 implementation has started.\n- Production-feedback triage classified the reported items into Phase 7 Create foundations/capability work, Phase 10 privileged admin/beta operations, Phase 11 brand/launch work, and post-Cycle-2 LoRA/model extensibility. No item from the list has yet been verified as an emergency security/privacy defect; implementation audits may still surface a narrow maintenance blocker and such a blocker takes precedence.\n- Next gate: explicit user authorization to start **Phase 7A — Create Foundation**. Phase 7B/7C/7D must not bypass the Phase 7A input/media/composer foundations they depend on.\n''',
    '''- Current phase contract: **Phase 7 — Create v2 / Creative Direction**, `EXPANDED/PLANNED`; execution `IN PROGRESS`.\n- Current product slice: **Phase 7A — Durable Create Upload Foundation** is implemented and configured-verified in PR #45; the broader Phase 7A foundation remains incomplete.\n- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.\n- The shared browser upload transaction now serves both Library and Create while feature-specific picker/drop validation remains feature-owned. User-facing Create no longer depends on temporary `generation_sources` for newly uploaded references; temporary-source APIs remain an internal compatibility/staging capability until separately retired.\n- Next Phase 7A slice: **source-aware geometry + explicit ratio override**, including correcting the current mismatch where native FLUX output geometry is controlled by its first image input rather than the persisted Image aspect-ratio field. Composer de-crowding, reference identity/prompt addressing and the premium interaction pass remain subsequent 7A work.\n- Phase 7B/7C/7D must not bypass the Phase 7A input/media/composer foundations they depend on.\n''',
)

# UI_MIGRATION — record only the verified checkbox and keep 7A incomplete.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Execution status:** `NOT STARTED`",
    "**Execution status:** `IN PROGRESS`",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '''- [ ] **Durable Create uploads:** once a user upload is verified, it becomes an owner-scoped durable `media_asset` visible in Library whether or not Generate is pressed or the asset is ultimately used. Reuse the existing persistent-upload/media promotion contract where practical; `generation_sources` may remain internal staging only if needed, not the user's durable product identity.\n''',
    '''- [x] **Durable Create uploads:** newly uploaded Create references now reuse the persistent media ticket/R2/completion transaction and become owner-scoped durable `media_assets` before generation. Create binds the resulting opaque `media-asset` into generation requests, and the asset remains ordinary Library media even if Generate is never pressed. Configured run `33256497167` verified upload/session ownership, persisted dimensions/provenance, Library visibility, request binding and exact cleanup without spending a generation. `generation_sources` remains internal compatibility/staging only and is no longer the user-facing identity for newly uploaded Create references.\n''',
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '''- [ ] Create-originated user uploads are durable Library media regardless of generation submission/use.\n''',
    '''- [x] Create-originated user uploads are durable Library media regardless of generation submission/use; configured evidence `33256497167`.\n''',
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '''**Current phase contract:** Phase 7 — Create v2 / Creative Direction is `EXPANDED/PLANNED`; execution is `NOT STARTED`.\n**Current product slice:** None.\n**Current gate:** User authorization to start **Phase 7A — Create Foundation**.\n''',
    '''**Current phase contract:** Phase 7 — Create v2 / Creative Direction is `EXPANDED/PLANNED`; execution is `IN PROGRESS`.\n**Current product slice:** Phase 7A — Durable Create Upload Foundation is verified in PR #45; Phase 7A as a whole remains incomplete.\n**Current gate:** Continue Phase 7A with source-aware geometry + explicit ratio override from the verified durable media foundation.\n''',
)

# PRODUCT_CAPABILITIES — current user-facing reference identity is durable media.
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    '''### Input identities\nCurrent generation inputs are opaque product identities:\n- `{ type: "temporary-source", id }` for ready uploaded references;\n- `{ type: "media-asset", id }` for durable RenderLab results.\n\nThe browser does not submit R2 keys.\n\n### Initial supported reference behavior\n- PNG, JPEG, WebP;\n- ≤25 MB;\n- signed direct-R2 upload;\n- server HEAD verification;\n- opaque `generation_sources.id` binding.\n''',
    '''### Input identities\nCurrent generation inputs remain opaque product identities:\n- `{ type: "media-asset", id }` for durable user uploads and durable RenderLab results;\n- `{ type: "temporary-source", id }` remains accepted for internal compatibility/staging but is no longer the user-facing identity for newly uploaded Create references.\n\nThe browser never submits R2 keys. Phase 7A PR #45 extracted one persistent browser upload transaction shared by Create and Library; feature-specific picker/drop behavior remains feature-owned.\n\n### Current supported reference upload behavior\n- PNG, JPEG, WebP;\n- ≤25 MB;\n- signed direct-R2 upload;\n- server HEAD verification before promotion;\n- authenticated owner-scoped `media_upload_sessions` → durable `media_assets`;\n- persisted dimensions plus ordinary Library/Viewer/search/organization semantics immediately after successful completion, independent of whether a generation is ever submitted.\n\nConfigured Create Durable Upload run `33256497167` verified that a Create upload persisted with `generation_job_id = null`, appeared in Library, and was subsequently referenced by the generation request as the same owner-scoped `{ type: "media-asset", id }`; exact R2/database/Auth cleanup passed.\n''',
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    '''- user uploads initiated from Create should promote to durable owner-scoped `media_assets` after verification and remain in Library even if no generation is submitted;\n''',
    '''- user uploads initiated from Create now promote to durable owner-scoped `media_assets` after verification and remain in Library even if no generation is submitted; configured run `33256497167` verifies this Phase 7A foundation;\n''',
)

# SCREEN_REGISTRY — current implementation truth changes, later planned items remain planned.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    '''- PNG/JPEG/WebP temporary reference input up to 25 MB;\n- signed-R2 temporary reference input with opaque source identity;\n- reference preview/removal/replacement;\n''',
    '''- PNG/JPEG/WebP user reference input up to 25 MB;\n- signed-R2 persistent upload promoted to an owner-scoped durable `media_asset` before generation;\n- newly uploaded Create references remain ordinary Library media even if Generate is never pressed;\n- generation binds newly uploaded references through opaque `media-asset` identity rather than exposing R2/storage identity;\n- reference preview/removal/replacement;\n''',
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    '''**Planned Phase 7 Create v2 extension — not yet implemented:** de-crowded progressive composer; source-aware `Original` geometry with explicit ratio override; curated ratio expansion; durable Library persistence for Create-originated user uploads; named/ordered/role-aware references with prompt addressing; multi-reference FLUX/Qwen verification; audited Director Video; curated 480p/720p/1080p/2K Video quality; deliberate premium motion/interaction treatment under UI-043. Current approved Create behavior remains authoritative until each slice is implemented and verified.\n''',
    '''**Phase 7 Create v2 extension:** durable Library persistence for newly uploaded Create references is now implemented/verified through PR #45 and configured Create Durable Upload run `33256497167`. Still planned/not yet implemented: de-crowded progressive composer; source-aware `Original` geometry with explicit ratio override; curated ratio expansion; named/ordered/role-aware references with prompt addressing; multi-reference FLUX/Qwen verification; audited Director Video; curated 480p/720p/1080p/2K Video quality; deliberate premium motion/interaction treatment under UI-043. Existing verified behavior remains authoritative for every unfinished item.\n''',
)

# COMPONENT_CATALOG — persistent upload transport is now product-shared rather than Library-only.
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    '''**Dependencies:** RenderLab generation/reference/media contracts, capabilities, React client state, Lucide, maintained Button/Textarea/ToggleGroup/Alert/Spinner/Collapsible primitives.  \n''',
    '''**Dependencies:** RenderLab generation/media contracts, shared persistent browser media-upload client, capabilities, React client state, Lucide, maintained Button/Textarea/ToggleGroup/Alert/Spinner/Collapsible primitives.  \n''',
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    '''**Reuse rules:** Keep picker interaction feature-owned while the persistent upload contract belongs to Library. Share the transaction through `library-upload-client.ts` rather than duplicating ticket/R2/completion logic.  \n''',
    '''**Reuse rules:** Keep picker interaction Library-owned while persistent upload transport is shared through the product browser media-upload client. `library-upload-client.ts` owns Library-specific validation/copy and delegates the ticket/R2/completion transaction rather than duplicating it.  \n''',
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    '''### LibraryUploadClient\n**Status:** APPROVED  \n**Source:** `src/features/library/library-upload-client.ts`  \n**Origin:** RenderLab feature-owned browser transaction extracted from the approved picker upload behavior  \n**Purpose:** One shared validation + ticket/R2 PUT/completion transaction for Library picker and drag/drop interaction paths.  \n**Used by:** `LibraryUploadButton`, `LibraryDropUploadSurface`.  \n**Dependencies:** `media-upload-contract`, browser `fetch`, `createImageBitmap`.  \n**Reuse rules:** Share it only across Library persistent upload interaction paths; it is not a generic application upload service.  \n**Do not:** Expose R2 credentials/storage keys, bypass server completion verification, or merge temporary Create reference uploads into this durable Library contract.  \n**Notes:** UI-028. PNG/JPEG/WebP and 25 MB validation remains identical across picker/drop paths.\n''',
    '''### PersistentBrowserMediaUpload\n**Status:** APPROVED  \n**Source:** `src/lib/browser/media-upload-client.ts`  \n**Origin:** UI-040 / Phase 7A extraction of the already-approved persistent media upload transaction  \n**Purpose:** Shared browser transport for authenticated image upload ticket → signed R2 PUT → dimension read → verified durable-media completion.  \n**Used by:** Create reference upload and Library's `LibraryUploadClient`.  \n**Dependencies:** `media-upload-contract`, browser `fetch`, `createImageBitmap`.  \n**Reuse rules:** Share the network/promotion transaction across product features that create the same durable user media identity; keep feature-specific picker/drop UX, validation wording and post-upload behavior in the owning feature.  \n**Do not:** Expose credentials/storage keys, skip server HEAD/completion verification, or turn this helper into a client-side media store.  \n**Notes:** Configured Create Durable Upload run `33256497167` verifies durable Create persistence + Library visibility + `media-asset` generation binding and exact cleanup. Existing Library upload regressions stayed green on the same code head.\n\n### LibraryUploadClient\n**Status:** APPROVED  \n**Source:** `src/features/library/library-upload-client.ts`  \n**Origin:** Library-specific validation wrapper over `PersistentBrowserMediaUpload`  \n**Purpose:** Library picker/drop validation and copy while delegating the persistent ticket/R2/completion transaction to the shared product helper.  \n**Used by:** `LibraryUploadButton`, `LibraryDropUploadSurface`.  \n**Dependencies:** `media-upload-contract`, `src/lib/browser/media-upload-client.ts`.  \n**Reuse rules:** Keep Library-specific behavior here; reuse the lower-level persistent upload helper when another feature creates the same durable media identity.  \n**Do not:** Duplicate the persistent transaction, expose R2 credentials/storage keys, or bypass server completion verification.  \n**Notes:** UI-028 + UI-040. PNG/JPEG/WebP and 25 MB validation remains identical across Library picker/drop paths.\n''',
)
