from pathlib import Path

ROOT = Path.cwd()


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


# PROJECT.md
replace_once(
    "PROJECT.md",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary; Phase 7A Create Foundation is now in progress and its first verified slice makes Create-originated user uploads durable Library media.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary; Phase 7A Create Foundation is in progress with durable Create uploads plus source-aware geometry and curated ratio expansion now verified and merged.**",
    "project current priority",
)
replace_once(
    "PROJECT.md",
    "- Current product slice: **Phase 7A — Durable Create Upload Foundation** is implemented and configured-verified in PR #45; the broader Phase 7A foundation remains incomplete.",
    "- Current product slice: **Phase 7A — Composer Hierarchy / De-crowding** is next and has not started implementation. Durable Create uploads are merged through PR #46; source-aware geometry + curated ratios are merged through PR #47. The broader Phase 7A foundation remains incomplete.",
    "project current product slice",
)
replace_once(
    "PROJECT.md",
    "- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.\n- The shared browser upload transaction now serves both Library and Create while feature-specific picker/drop validation remains feature-owned. User-facing Create no longer depends on temporary `generation_sources` for newly uploaded references; temporary-source APIs remain an internal compatibility/staging capability until separately retired.",
    "- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.\n- Source-aware geometry + curated ratio expansion merged through PR #47 as `de50efe6ba462ec604ea2cace741e11904a62425`. Exact implementation head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed the complete 20-workflow retriggered affected suite, including Generation Integration `33259410952`, Video Generation Integration `33259411008`, Create Lifecycle `33259411062`, Library Lifecycle `33259411170`, UI Shell `33259410968` and Deployment Readiness `33259410991`. Earlier exact-head configured runs `33258831654` / `33258831636` explicitly verified real output geometry for Create Image 16:9 → Edit Original → Edit 4:5 and Create Video 16:9 → Animate Original from a 2:1 source; all generation/reference/media/Auth fixtures cleaned.\n- The shared browser upload transaction now serves both Library and Create while feature-specific picker/drop validation remains feature-owned. User-facing Create no longer depends on temporary `generation_sources` for newly uploaded references; temporary-source APIs remain an internal compatibility/staging capability until separately retired.",
    "project geometry evidence",
)
replace_once(
    "PROJECT.md",
    "- Next Phase 7A slice: **source-aware geometry + explicit ratio override**, including correcting the current mismatch where native FLUX output geometry is controlled by its first image input rather than the persisted Image aspect-ratio field. Composer de-crowding, reference identity/prompt addressing and the premium interaction pass remain subsequent 7A work.",
    "- Next Phase 7A slice: **Composer Hierarchy / De-crowding**. Preserve the verified durable-media and geometry contracts while reducing default control density; reference identity/order/roles, prompt addressing and the premium interaction pass remain subsequent 7A work.",
    "project next gate",
)

# docs/ui/UI_MIGRATION.md
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Source-aware geometry:** for Edit/Animate with an attached source image, default to an understandable `Original`/source geometry behavior rather than an arbitrary preset ratio. Let the user explicitly override to another supported ratio. Audit exact worker normalization/crop/resize behavior before locking the product rule for each operation.",
    "- [x] **Source-aware geometry:** Edit/Animate now default to `Original` with a source and allow explicit supported-ratio override. PR #47 verified the operation-specific execution contract: FLUX Edit Original sends the durable source unchanged, FLUX explicit override uses an execution-only centered crop/high-quality resize of the primary image, and REDGraft Animate Original receives the source-derived W:H while preserving the durable source.",
    "migration source-aware geometry",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Aspect-ratio expansion:** audit common useful image/video ratios against current worker contracts and add only a curated verified set. Do not turn the selector into an exhaustive geometry console.",
    "- [x] **Aspect-ratio expansion:** the curated fixed Image/Video set is `1:1`, `4:5`, `3:4`, `2:3`, `9:16`, `5:4`, `4:3`, `3:2`, `16:10`, `16:9`, `21:9`; source-backed Edit/Animate additionally expose `Original`. The maintained Dropdown Menu selector keeps geometry compact rather than exposing arbitrary numeric controls.",
    "migration ratio expansion",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Source-aware geometry + explicit override and curated ratios are verified.",
    "- [x] Source-aware geometry + explicit override and curated ratios are verified on exact head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f`; live output-dimension evidence includes Generation `33258831654`, Video Generation `33258831636`, Create Lifecycle `33258831638` and final exact-head Library Lifecycle `33259411170`.",
    "migration geometry exit criterion",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** Phase 7A — Durable Create Upload Foundation is verified in PR #45; Phase 7A as a whole remains incomplete.\n**Current gate:** Continue Phase 7A with source-aware geometry + explicit ratio override from the verified durable media foundation.",
    "**Current product slice:** Phase 7A — Composer Hierarchy / De-crowding is next and has not started implementation. Durable Create uploads are verified/merged through PR #46 and source-aware geometry + curated ratios through PR #47; Phase 7A as a whole remains incomplete.\n**Current gate:** Continue Phase 7A with composer hierarchy / de-crowding from the verified durable-media + geometry foundation; do not advance reference identity/prompt addressing or premium-motion completion until those contracts are actually implemented and verified.",
    "migration current work",
)

# docs/architecture/PRODUCT_CAPABILITIES.md
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "The browser never submits R2 keys. Phase 7A PR #45 extracted one persistent browser upload transaction shared by Create and Library; feature-specific picker/drop behavior remains feature-owned.",
    "The browser never submits R2 keys. Phase 7A PR #46 extracted one persistent browser upload transaction shared by Create and Library; feature-specific picker/drop behavior remains feature-owned.",
    "capabilities durable upload PR",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "### Initial default/contextual values\n- Image/Video is the explicit main output choice.\n- Image aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`.\n- Video aspect ratios: `16:9`, `9:16`, `1:1`.\n- Video durations: 5, 10, 15, 20, 30 seconds.\n- Video audio generation: explicit on/off, default ON, carried as `output.audioEnabled`.\n- A compatible image input resolves Image → Edit and Video → Animate.",
    "### Initial default/contextual values\n- Image/Video is the explicit main output choice.\n- Curated fixed Image aspect ratios: `1:1`, `4:5`, `3:4`, `2:3`, `9:16`, `5:4`, `4:3`, `3:2`, `16:10`, `16:9`, `21:9`.\n- Curated fixed Video aspect ratios: `1:1`, `4:5`, `3:4`, `2:3`, `9:16`, `5:4`, `4:3`, `3:2`, `16:10`, `16:9`, `21:9`.\n- Source-backed Edit Image and Animate Image additionally support `Original`; requests without a source cannot select `Original`.\n- Video durations: 5, 10, 15, 20, 30 seconds.\n- Video audio generation: explicit on/off, default ON, carried as `output.audioEnabled`.\n- A compatible image input resolves Image → Edit and Video → Animate.\n\n### Phase 7A source-aware geometry — Verified in RenderLab\n- `Original` is persisted normalized product intent rather than being rewritten into an arbitrary preset ratio.\n- FLUX output geometry follows its first image input. Create Image therefore supplies a server-created neutral execution canvas at the selected fixed ratio; no user-visible reference is fabricated.\n- Edit Image + `Original` sends the owner-scoped source image unchanged to FLUX. Explicit Edit ratios center-crop and high-quality resize only an execution-time derivative of the primary image; the durable Library asset and any additional references are not modified.\n- Animate Image + `Original` derives the display-oriented source W:H and submits that ratio to REDGraft when it falls within the verified 0.4–2.5 runtime range. Explicit Animate ratios continue using REDGraft's verified worker-side center-crop behavior.\n- Exact implementation head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` live-verified Create Image 16:9 → Edit Original 16:9 → Edit override 4:5 in `33258831654`, and Create Video 16:9 → Animate Original from a 128×64 / 2:1 source in `33258831636`. Final same-head retriggered Generation `33259410952` and Video Generation `33259411008` also passed. PR #47 merged as `de50efe6ba462ec604ea2cace741e11904a62425`.",
    "capabilities geometry block",
)

# docs/ui/SCREEN_REGISTRY.md
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Phase 7 Create v2 extension:** durable Library persistence for newly uploaded Create references is now implemented/verified through PR #45 and configured Create Durable Upload run `33256497167`. Still planned/not yet implemented: de-crowded progressive composer; source-aware `Original` geometry with explicit ratio override; curated ratio expansion; named/ordered/role-aware references with prompt addressing; multi-reference FLUX/Qwen verification; audited Director Video; curated 480p/720p/1080p/2K Video quality; deliberate premium motion/interaction treatment under UI-043. Existing verified behavior remains authoritative for every unfinished item.",
    "**Phase 7 Create v2 extension:** durable Library persistence for newly uploaded Create references is implemented/verified through PR #46 and Create Durable Upload `33256497167`. Source-aware `Original` geometry, explicit overrides and the curated fixed ratio expansion are implemented/verified through PR #47 (`de50efe6ba462ec604ea2cace741e11904a62425`): Generation `33258831654` proved Create 16:9 → Edit Original → Edit 4:5 output geometry, Video Generation `33258831636` proved Animate Original from a 2:1 source, and final same-head Lifecycle/Shell regressions passed. Still planned/not yet implemented: de-crowded progressive composer; named/ordered/role-aware references with prompt addressing; multi-reference FLUX/Qwen verification; audited Director Video; curated 480p/720p/1080p/2K Video quality; deliberate premium motion/interaction treatment under UI-043. Existing verified behavior remains authoritative for every unfinished item.",
    "screen registry phase 7 extension",
)

# docs/ui/COMPONENT_CATALOG.md
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "**Dependencies:** RenderLab generation/media contracts, shared persistent browser media-upload client, capabilities, React client state, Lucide, maintained Button/Textarea/ToggleGroup/Alert/Spinner/Collapsible primitives.",
    "**Dependencies:** RenderLab generation/media contracts, shared persistent browser media-upload client, capabilities, React client state, Lucide, maintained Button/Textarea/ToggleGroup/DropdownMenu/Alert/Spinner/Collapsible primitives.",
    "component create dependencies",
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "**Notes:** All four native operations verified; complete configured browser lifecycle `33031817744`. Image/Video intent is an accessible required single-choice Radix radiogroup.",
    "**Notes:** All four native operations verified; complete configured browser lifecycle `33031817744`. Image/Video intent is an accessible required single-choice Radix radiogroup. Phase 7A PR #47 adds the maintained Dropdown Menu geometry selector, source-backed `Original` intent for Edit/Animate and curated fixed-ratio expansion; exact head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed responsive Create Lifecycle `33258831638` and live image/video geometry verification `33258831654` / `33258831636` before merge as `de50efe6ba462ec604ea2cace741e11904a62425`.",
    "component create notes",
)

# docs/architecture/FRONTEND_ARCHITECTURE.md
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- `radix-ui` `1.6.7`\n- `@supabase/ssr` `0.12.5`",
    "- `radix-ui` `1.6.7`\n- `sharp` `0.34.3` — server-side execution geometry preparation/inspection, never a browser media store\n- `@supabase/ssr` `0.12.5`",
    "frontend sharp stack",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration and the approved shared Supabase URL. GitHub remains the development/validation path; production deployment is an explicit operation.",
    "Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration and the approved shared Supabase URL. GitHub remains the development/validation path; production deployment is an explicit operation.\n\n### Phase 7A source-aware generation geometry boundary\n`src/server/generation/geometry.ts` owns execution-only image geometry preparation. It may create the neutral first-input canvas required to make FLUX Create ratios truthful, derive display-oriented source W:H for Animate `Original`, or create an explicit-ratio primary-image derivative for FLUX Edit. These transformations are server execution details: they do not mutate the durable `media_asset`, change opaque media identity or move geometry state into the browser. Normalized product intent retains `aspectRatio: \"original\"` for source-backed operations while server routing resolves the worker-specific execution geometry.",
    "frontend geometry boundary",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- `server/generation` — owner-scoped orchestration/worker boundaries. Native jobs and outputs persist the account owner. The optional external backend is active only with URL + server-only bearer token and must authenticate RenderLab before trusting `x-renderlab-owner-id`;",
    "- `server/generation` — owner-scoped orchestration/worker boundaries. Native jobs and outputs persist the account owner. Server-only `sharp` preprocessing may derive execution geometry without mutating durable media or exposing worker-specific geometry mechanics to the browser. The optional external backend is active only with URL + server-only bearer token and must authenticate RenderLab before trusting `x-renderlab-owner-id`;",
    "frontend server generation ownership",
)

# docs/architecture/INFRASTRUCTURE.md
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- Account Ownership final implementation coverage — exact head `49f08013dc428d8d390a1bd803b10886f853cd82` passed the complete 14-gate ownership/media/generation suite listed above after the earlier two-account foundation run `33115683962`.",
    "- Account Ownership final implementation coverage — exact head `49f08013dc428d8d390a1bd803b10886f853cd82` passed the complete 14-gate ownership/media/generation suite listed above after the earlier two-account foundation run `33115683962`.\n- Phase 7A source-aware geometry — exact head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed live image geometry `33258831654`, live video geometry `33258831636`, responsive Create Lifecycle `33258831638`, and after a pre-job concurrency cancellation, a same-head Library Lifecycle retrigger `33259411170`; the complete same-head 20-workflow retriggered suite passed before PR #47 merged as `de50efe6ba462ec604ea2cace741e11904a62425`. Geometry verification cleaned its generated media/jobs/reference/Auth fixtures.",
    "infrastructure geometry coverage",
)
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- `verify-generation-bridge.mjs` + `generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence and continuation\n- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership",
    "- `verify-generation-bridge.mjs` + `generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence and continuation plus actual output-dimension assertions for fixed Create geometry, Edit `Original` and explicit Edit override\n- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership; CI installs `ffmpeg`/`ffprobe` so real persisted MP4 dimensions verify fixed Video and source-derived Animate `Original` geometry",
    "infrastructure key geometry workflows",
)

print("Phase 7A geometry documentation patch applied.")
