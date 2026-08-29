from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {text.count(old)}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary; Phase 7A Create Foundation is in progress with durable Create uploads, source-aware geometry/curated ratios, and composer hierarchy/de-crowding now verified and merged.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary. Phase 7 is in progress: the Phase 7A reference-addressing foundation is merged, contextual FLUX/Qwen evidence has locked the Phase 7B v0.1 boundary, and bounded two-reference Image Edit implementation is next.**",
)

replace_once(
    "PROJECT.md",
    "- Current product slice: **Phase 7A — Reference Identity / Order / Roles + Prompt Reference Foundation** is next and has not started implementation. Durable Create uploads are merged through PR #46, source-aware geometry + curated ratios through PR #47, and composer hierarchy/de-crowding through PR #49. The broader Phase 7A foundation remains incomplete.\n- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.",
    "- Current product slice: **Phase 7B — Multi-reference Image Editing v0.1 implementation**. Phase 7A reference identity/order/prompt addressing is merged through PR #51; the remaining Phase 7A premium-interaction pass stays an open Phase 7 exit item rather than a reason to re-open the deterministic reference contract.\n- PR #51 merged as `7afe257b069e74d322d8f83c1a0868a30acd3686` from exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a`. The head passed Account Ownership, UI Shell, Create Durable Upload, Create Lifecycle, Library Lifecycle, Media Delete, Activity, Generation Integration and Video Generation; desktop/narrow reference artifacts were reviewed clean. Stable `@imageN` aliases, unresolved-alias blocking, structured alias/source/role persistence and deterministic native alias→worker-position translation are implemented.\n- Phase 7B contextual audit run `33263044354` used run-owned synthetic adult references against merged application SHA `7afe257b069e74d322d8f83c1a0868a30acd3686`. Human review found FLUX preserved the edited subject strongly in the outfit-only case and represented both intended people with correct `@image1`/`@image2` left/right semantics even when physical request order was deliberately reversed. Fixtures were cleaned after artifact capture.\n- Qwen contract audit `33263338596` verified the deployed gateway is ready, reports `multiple_references=true`, and accepts repeated multipart `image_files` on `/jobs/edit`. Qwen contextual run `33263401453` completed the same bounded cases but showed materially more facial/stylistic drift than FLUX. Therefore v0.1 keeps **FLUX as the internal Image Edit route**, leaves Qwen internal/unselected, and does not add a model selector.\n- The accepted Phase 7B v0.1 product boundary is **at most two image references for Image output and at most one image reference for Video output**. For a two-image edit, request slot 1 is `primary-image` and slot 2 is `reference`; reordering may change those slot roles/order but must never change which durable asset an existing `@imageN` alias names. RenderLab guarantees mapping/validation, not deterministic model obedience.\n- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.",
)

replace_once(
    "PROJECT.md",
    "- Next Phase 7A slice: **Reference Identity / Order / Roles + Prompt Reference Foundation**. Lock stable `@image1`, `@image2`, … aliases tied to attached references, deterministic request order and structured alias→opaque-input mapping, plus a maintained thumbnail picker/autocomplete for inserting attached references. Reordering/removal must not silently retarget an existing prompt alias; unresolved aliases block generation until fixed. The premium interaction pass remains subsequent 7A work.",
    "- Next implementation slice: **Phase 7B two-reference Image Edit v0.1 exposure**. Extend the existing Create reference state to two Image references while keeping Video at one, centralize/enforce the bounded count + role contract server-side, preserve aliases through remove/replace/reorder, keep one-reference behavior simple, and validate the exact head with responsive artifacts plus configured generation/ownership coverage. The Phase 7A premium interaction pass remains an open Phase 7 exit item and should be completed through the same reference composition rather than a competing UI.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Reference identity/order/roles:** attach stable human-visible aliases beginning `@image1`, `@image2`, … to reference identities, preserve deterministic request order, support optional task-relevant semantic roles, and define reorder/removal behavior before multi-reference UI expands. Reordering or removing a reference must not silently retarget an alias already used in prompt text; unresolved aliases are surfaced and block generation until corrected.",
    "- [x] **Reference identity/order/roles:** PR #51 merged stable `@imageN` identities, structured alias/source/role persistence, unique-alias parsing, deterministic alias→worker-position translation and continuation-safe alias allocation. Removing/replacing/continuing does not silently retarget an old alias; unresolved prompt aliases block generation. Exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed all nine affected gates before merge as `7afe257b069e74d322d8f83c1a0868a30acd3686`.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Prompt reference foundation:** use the initial product grammar `@image1`, `@image2`, … and a maintained thumbnail picker/autocomplete that exposes only references attached to the current request. Typing/inserting a reference resolves through structured alias/order/role metadata persisted with normalized intent; prompt text itself is never authorization. Generic picker/popover/combobox mechanics must come from the approved maintained component source order in UI-013 / `COMPONENT_CATALOG.md`; do not build a bespoke generic autocomplete when an approved implementation is suitable.",
    "- [x] **Prompt reference foundation:** PR #51 uses the initial `@imageN` grammar and a Create-owned thumbnail mention menu composed from the approved maintained Button + Radix DropdownMenu layer. Typing `@...` or selecting the attached-reference alias inserts the structured alias; prompt text itself never authorizes media access, and server parsing rejects unresolved aliases.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Choose and enforce a deliberate bounded product maximum for reference count; worker permissiveness is not the product contract.",
    "- [x] Choose a deliberate bounded product maximum: **2 image references for Image output, 1 image reference for Video output**. UI-046 records the evidence-backed v0.1 boundary; server/UI enforcement is the active implementation task rather than relying on worker permissiveness.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Guarantee deterministic input ordering, alias/role mapping and prompt-reference resolution from RenderLab to the selected worker request.",
    "- [x] Guarantee deterministic input ordering, alias/role mapping and prompt-reference resolution from RenderLab to the selected worker request. PR #51 implements the mapping foundation, and FLUX audit run `33263044354` deliberately reversed physical request order while `@image1`/`@image2` still resolved to the intended people in the reviewed output.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Audit current FLUX and Qwen multi-input behavior with real contextual output artifacts, not only request acceptance: include subject/outfit/pose/style/background-like cases, a bounded synthetic-person outfit edit where recognizable subject appearance should remain coherent, a two-distinct-person composition where both intended people should be visibly represented, `@imageN`-directed mapping cases, output geometry and failure semantics. Route/model choice remains internal unless evidence shows a user-facing choice provides concrete value.",
    "- [x] Audit FLUX and Qwen with bounded real contextual artifacts. FLUX run `33263044354` passed human review for recognizable subject preservation in an outfit edit and a two-distinct-person composition with deliberate alias/request-order inversion. Qwen contract audit `33263338596` verified current multi-reference gateway support; Qwen contextual run `33263401453` completed the same cases but showed more facial/stylistic drift. v0.1 therefore keeps FLUX as the internal route and does not expose a model selector.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Reference identity/order/roles and prompt addressing are deterministic and server-validated.",
    "- [x] Reference identity/order/roles and prompt addressing are deterministic and server-validated through PR #51 / merge `7afe257b069e74d322d8f83c1a0868a30acd3686`; bounded multi-reference count/slot enforcement remains the Phase 7B implementation item below.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** Phase 7A — Reference Identity / Order / Roles + Prompt Reference Foundation is next and has not started implementation. Durable Create uploads are verified/merged through PR #46, source-aware geometry + curated ratios through PR #47, and composer hierarchy/de-crowding through PR #49; Phase 7A as a whole remains incomplete.\n**Current gate:** Continue Phase 7A by locking and implementing stable `@imageN` reference identity/order/role mapping plus a maintained thumbnail picker/autocomplete. Do not advance Phase 7B multi-reference exposure until aliases resolve deterministically through same-owner server validation and contextual output evidence has been defined; premium-motion completion remains subsequent 7A work.",
    "**Current product slice:** Phase 7B — Multi-reference Image Editing v0.1 implementation. PR #51 completed the stable `@imageN` reference-addressing foundation; contextual FLUX/Qwen evidence is captured and the v0.1 route/count boundary is locked by UI-046. The Phase 7A premium-interaction pass remains an open Phase 7 exit item.\n**Current gate:** Expose at most two Image references while Video remains one; enforce exact count/role/media/ownership rules server-side; preserve alias identity through remove/replace/reorder; keep FLUX as the internal v0.1 image-edit route; run exact-head configured + responsive validation before treating multi-reference UI as approved. Do not expose Qwen/model selection or increase the reference maximum without new evidence/decision.",
)

ui_decisions = Path("docs/ui/UI_DECISIONS.md")
text = ui_decisions.read_text()
if "### UI-046 — Multi-reference Image Edit v0.1 is a bounded two-reference FLUX path" not in text:
    ui_decisions.write_text(text.rstrip() + "\n\n### UI-046 — Multi-reference Image Edit v0.1 is a bounded two-reference FLUX path\n**Status:** Accepted\n**Decision:** The first user-facing Multi-reference Image Edit contract accepts at most two attached image inputs when Image is selected and at most one attached image input when Video is selected. For a two-image edit, current request slot 1 has role `primary-image` and slot 2 has role `reference`; an explicit reorder may change which attached asset occupies those roles, but each existing `@imageN` alias remains bound to its original opaque media identity. FLUX remains the internal v0.1 Image/Edit route. Qwen remains a verified available internal multi-reference ecosystem but is not selected for v0.1 and does not create a user-facing model selector.\n**Reason:** PR #51 proves deterministic alias persistence/translation. FLUX contextual audit `33263044354` preserved the synthetic subject strongly in the bounded outfit edit and visibly represented both intended people with correct alias-directed left/right placement despite deliberately reversed physical request order. Qwen contract audit `33263338596` verified a ready multi-reference `/jobs/edit` contract and contextual run `33263401453` completed the same tasks, but human review found materially more facial/stylistic drift than FLUX. Two inputs therefore have direct product evidence; higher worker-permitted counts do not.\n**Consequences:** Capability/server/UI limits must be centralized and authoritative: reject more than two Image inputs, more than one Video input, invalid role/order combinations, unavailable/non-image/foreign inputs and unresolved aliases. The Create UI may reveal a second reference only for Image; it must not silently discard a second reference when switching output type. Replacing/removing/reordering must preserve alias identity, and a removed referenced alias remains unresolved until fixed. RenderLab guarantees correct membership/order/role/alias mapping and ownership validation, not deterministic generative obedience or biometric identity preservation. Raising the maximum, selecting Qwen or exposing model choice requires new evidence and an explicit product decision.\n")

replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "### Verified Advanced product controls",
    "### Phase 7A reference addressing — Verified in RenderLab\n- PR #51 merged stable product aliases `@image1`, `@image2`, … as structured `GenerationInput.alias` values alongside opaque source identity and semantic role. Aliases are unique within a request and persist in normalized generation intent.\n- Prompt parsing detects `@imageN` mentions and blocks unresolved aliases both in Create and at the server request boundary. Alias text itself is never authorization.\n- Native execution translates each alias to the current worker input position immediately before submission, so prompt addressing is deterministic even when array order differs from alias numbering. Continuation allocates a new alias rather than retargeting an older prompt mention; replace/remove semantics preserve the existing alias identity until explicitly removed.\n- Durable media inputs are reloaded by authenticated owner and must be active image media before either native or authenticated external generation is attempted.\n- Exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed nine affected gates and responsive reference-menu review before PR #51 merged as `7afe257b069e74d322d8f83c1a0868a30acd3686`.\n\n### Phase 7B contextual model evidence and v0.1 boundary\n- FLUX semantic-output audit `33263044354` ran on merged product SHA `7afe257b069e74d322d8f83c1a0868a30acd3686` with run-owned synthetic adult portraits. Human review found the outfit-only edit preserved recognizable appearance strongly while changing clothing, and the two-person case visibly represented both intended people with `@image1` on the requested left and `@image2` on the requested right despite deliberately reversed physical request ordering. Exact Auth/Supabase/R2 fixtures were cleaned after artifact capture.\n- Qwen gateway audit `33263338596` verified `ready=true`, `multiple_references=true`, async `/jobs/edit` and repeated multipart `image_files`. Qwen semantic run `33263401453` completed the same bounded outfit/two-person cases, but human review found noticeably more facial/stylistic drift than FLUX while still following the broad edit/composition instruction.\n- Accepted v0.1 boundary under UI-046: Image may use at most **2** image references; Video remains at most **1** image input. With two Image inputs, slot 1 is `primary-image` and slot 2 is `reference`. Stable aliases remain attached to media identity when order changes.\n- FLUX remains the internal v0.1 Image/Edit route. Qwen remains verified/available internally but is not selected or exposed as a product model choice. This is an evidence-based routing choice, not a claim that FLUX will obey every semantic relation deterministically.\n- User-facing second-reference exposure and authoritative count/role enforcement are the active implementation slice; the contextual audit alone does not mark the multi-reference UI complete.\n\n### Verified Advanced product controls",
)

replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "## Accepted Cycle 2 Create v2 Direction — not yet implemented",
    "## Accepted Cycle 2 Create v2 Direction — implementation in progress",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- multi-reference inputs need stable aliases/order, task-relevant roles and prompt-level reference addressing plus strict server media-kind/count/ownership validation;",
    "- stable `@imageN` alias/order/role persistence and prompt-level reference addressing are implemented through PR #51; Phase 7B now adds the UI/server bounded two-reference slot contract from UI-046;",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- FLUX and Qwen multi-input behavior must be audited for real subject/outfit/pose/style/background-style tasks, while product guarantees remain limited to deterministic mapping rather than probabilistic model obedience;",
    "- FLUX/Qwen bounded contextual audits are complete (`33263044354`, `33263338596`, `33263401453`); FLUX is selected for v0.1 because it preserved the tested synthetic identities more strongly, while product guarantees remain limited to deterministic mapping rather than probabilistic model obedience;",
)

replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "The next reference-addressing slice must source thumbnail autocomplete/popover/combobox mechanics from this catalog's approved maintained source order before any custom generic picker is considered; record any adopted local primitive here when implementation actually exists.",
    "PR #51 adds stable `@imageN` reference identity/prompt addressing without a new generic primitive: `CreateReferenceMentionMenu` composes the existing maintained Button + Radix DropdownMenu mechanics and exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed the nine affected gates plus desktop/narrow artifact review before merge as `7afe257b069e74d322d8f83c1a0868a30acd3686`. Phase 7B extends this same Create-owned reference composition to the UI-046 two-image maximum; do not create a competing generic autocomplete or model picker.",
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "### CreateAdvancedPanel",
    "### CreateReferenceMentionMenu\n**Status:** APPROVED\n**Source:** `src/features/create/create-reference-mention-menu.tsx`  \n**Origin:** RenderLab Create composition using maintained Button + Radix DropdownMenu mechanics  \n**Purpose:** Thumbnail-backed prompt-reference picker for attached stable `@imageN` aliases without exposing storage/provider identity.  \n**Used by:** `CreateWorkspace`.  \n**Reuse rules:** Keep the menu Create-owned while reference addressing is a Create-specific task interaction; populate it only from references already attached to the current normalized request and return the selected alias to prompt insertion logic.  \n**Do not:** Treat alias text as authorization, add a parallel generic command/autocomplete system, renumber an existing alias because display order changes, or expose workflow/model/provider identity.  \n**Notes:** UI-044 / PR #51. Exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed Create Lifecycle, UI Shell, configured upload/ownership/generation regressions and responsive visual review before merge as `7afe257b069e74d322d8f83c1a0868a30acd3686`. UI-046 multi-reference expansion must extend this maintained mechanic rather than replacing it.\n\n### CreateAdvancedPanel",
)

replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "Still planned/not yet implemented: stable `@imageN` named/ordered/role-aware references with a maintained thumbnail picker/autocomplete and deterministic server mapping; contextual multi-reference FLUX/Qwen output verification; audited Director Video; curated 480p/720p/1080p/2K Video quality; deliberate premium motion/interaction treatment under UI-043. Existing verified behavior remains authoritative for every unfinished item.",
    "Stable `@imageN` named/ordered/role-aware reference addressing, maintained thumbnail mention mechanics and deterministic server/native mapping are implemented/verified through PR #51 (`7afe257b069e74d322d8f83c1a0868a30acd3686`). Contextual FLUX/Qwen evidence is also complete: FLUX run `33263044354` passed the bounded human artifact review, while Qwen audits `33263338596` / `33263401453` verified technical multi-reference support but showed more identity/style drift. UI-046 therefore locks the next Create extension to at most two Image references on the internal FLUX route while Video remains one source image. Still planned/not yet implemented: user-facing second-reference/reorder exposure with authoritative count/role enforcement, audited Director Video, curated 480p/720p/1080p/2K Video quality, and the deliberate premium motion/interaction pass under UI-043. Existing verified behavior remains authoritative for every unfinished item.",
)

replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "## Maintained Primitive Boundary — UI-026",
    "### Phase 7A reference-addressing boundary\nNormalized image inputs now carry stable product alias + opaque source + semantic role. Prompt `@imageN` mentions are parsed against attached aliases before submission; unresolved mentions are rejected in both the browser experience and server request contract. Alias text never authorizes access. Owner-scoped durable media is reloaded server-side and must be active image media before routing. Native generation translates aliases to the current request-array worker positions only at the adapter boundary, so aliases can remain stable while explicit reordering changes primary/reference execution order. PR #51 merged this foundation as `7afe257b069e74d322d8f83c1a0868a30acd3686`. UI-046 bounds the first multi-reference product exposure to two Image inputs / one Video input and keeps FLUX as the internal v0.1 Image/Edit route; Qwen remains internal/unselected.\n\n## Maintained Primitive Boundary — UI-026",
)

print("Phase 7B v0.1 documentation reconciliation applied.")
