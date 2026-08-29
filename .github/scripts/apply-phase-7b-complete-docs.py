from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary. Phase 7 is in progress: the Phase 7A reference-addressing foundation is merged, contextual FLUX/Qwen evidence has locked the Phase 7B v0.1 boundary, and bounded two-reference Image Edit implementation is next.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary. Phase 7 is in progress: Phase 7B Multi-reference Image Editing v0.1 is verified and merged, the Phase 7A premium-interaction pass remains an open Phase 7 exit item, and Phase 7C Director Video is the next planned slice but has not started.**",
)

replace_once(
    "PROJECT.md",
    "- Current product slice: **Phase 7B — Multi-reference Image Editing v0.1 implementation**. Phase 7A reference identity/order/prompt addressing is merged through PR #51; the remaining Phase 7A premium-interaction pass stays an open Phase 7 exit item rather than a reason to re-open the deterministic reference contract.",
    "- Current product slice: **None — Phase 7B Multi-reference Image Editing v0.1 is complete.** The next planned slice is Phase 7C Director Video, which has not started. The remaining Phase 7A premium-interaction pass stays an open Phase 7 exit item and should compose with the approved reference UI rather than reopen its product contract.",
)

replace_once(
    "PROJECT.md",
    "- The accepted Phase 7B v0.1 product boundary is **at most two image references for Image output and at most one image reference for Video output**. For a two-image edit, request slot 1 is `primary-image` and slot 2 is `reference`; reordering may change those slot roles/order but must never change which durable asset an existing `@imageN` alias names. RenderLab guarantees mapping/validation, not deterministic model obedience.",
    "- The accepted Phase 7B v0.1 product boundary is **at most two image references for Image output and at most one image reference for Video output**. For a two-image edit, request slot 1 is `primary-image` and slot 2 is `reference`; reordering may change those slot roles/order but must never change which durable asset an existing `@imageN` alias names. RenderLab guarantees mapping/validation, not deterministic model obedience.\n- PR #53 implemented that boundary and merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. Polished product commit `360fa79ea85dd09ce90101518fedaca5645aaa71` and exact validation retrigger head `acf3f8e792c2b895a9999cca24060a1c33484463` have identical trees. The exact head passed Account Ownership `33266025758`, Create Durable Upload `33266025798`, Library Lifecycle `33266025756`, Activity `33266025837`, UI Shell `33266025763`, Media Delete `33266025759`, Video Generation `33266025764`, Create Lifecycle `33266025789`, and Generation Integration `33266025757`.\n- Configured Create Lifecycle `33266025789` verified a second durable owner-scoped upload, replacement without alias churn, two-reference mention selection, `Make primary` reorder with alias identity preserved, correct submitted slot roles/order, two-reference Video blocking, unresolved-alias recovery and exact fixture cleanup. Desktop/narrow artifacts were reviewed after the responsive polish; narrow `Primary image` / `Reference image` labels remain readable and actions wrap without overflow. No schema, route, provider/model selector, infrastructure or deployment change was introduced.",
)

replace_once(
    "PROJECT.md",
    "- Next implementation slice: **Phase 7B two-reference Image Edit v0.1 exposure**. Extend the existing Create reference state to two Image references while keeping Video at one, centralize/enforce the bounded count + role contract server-side, preserve aliases through remove/replace/reorder, keep one-reference behavior simple, and validate the exact head with responsive artifacts plus configured generation/ownership coverage. The Phase 7A premium interaction pass remains an open Phase 7 exit item and should be completed through the same reference composition rather than a competing UI.",
    "- Next planned slice: **Phase 7C Director Video capability audit/productization**. Before adding Director controls, re-audit the actual configured LTX/REDGraft workflow/gateway for frame/story/action/dialogue/sound semantics and current constraints; expose only verified task-oriented controls and do not surface ComfyUI/provider internals. This handoff does not start Phase 7C implementation. The Phase 7A premium-interaction pass remains an open Phase 7 exit item.",
)

replace_once(
    "PROJECT.md",
    "- Deployed FLUX primary live-accepted and completed a two-reference edit (`reference_count=2`) in a bounded probe. The worker/runtime code has no explicit reference-count ceiling, but RenderLab's current UI still submits at most one reference and the current request parser does not yet enforce media-kind compatibility, role multiplicity or a product maximum. Phase 7 must define those server-side input-slot rules before exposing multi-reference UI.",
    "- At the Phase 6 audit baseline, deployed FLUX primary live-accepted and completed a two-reference edit (`reference_count=2`) while the then-current RenderLab UI still submitted at most one reference and the request parser lacked product count/role enforcement. Phase 7B subsequently closed that gap through UI-046 / PR #53; this bullet remains historical Phase 6 evidence rather than the current product contract.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Add server-authoritative media-kind, role, multiplicity and same-owner validation for every input slot.",
    "- [x] Add server-authoritative media-kind, role, multiplicity and same-owner validation for every input slot. PR #53 centralizes the two-Image/one-Video maximum and ordered slot roles, rejects invalid count/role combinations at the request parser, and revalidates every source as available owner-scoped image media before native or external routing.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Be explicit that RenderLab can guarantee correct input mapping/validation but **cannot guarantee probabilistic model obedience** to every semantic relation in the prompt; validation must not imply deterministic generative compliance.",
    "- [x] Keep the guarantee boundary explicit through UI-045/UI-046 and capability documentation: RenderLab guarantees correct membership/order/role/alias/ownership validation but **cannot guarantee probabilistic model obedience** to every semantic relation in the prompt.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Preserve the simple one-reference case and avoid exposing a generic model/workflow form.",
    "- [x] Preserve the simple one-reference case and avoid exposing a generic model/workflow form. PR #53 extends the existing Create-owned reference composition progressively, reveals the second slot only for Image, keeps Video at one source, and adds no model/workflow selector.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] Reference identity/order/roles and prompt addressing are deterministic and server-validated through PR #51 / merge `7afe257b069e74d322d8f83c1a0868a30acd3686`; bounded multi-reference count/slot enforcement remains the Phase 7B implementation item below.",
    "- [x] Reference identity/order/roles and prompt addressing are deterministic and server-validated through PR #51 / merge `7afe257b069e74d322d8f83c1a0868a30acd3686`; PR #53 / merge `0286b18802fc3d766d9d09e2ba8ed9a494eabd08` adds the bounded count/slot/media/ownership enforcement.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Multi-reference image editing has bounded product semantics plus configured FLUX/Qwen contextual output evidence appropriate to the final routing contract; technical request success or correct dimensions alone are insufficient.",
    "- [x] Multi-reference image editing has bounded product semantics plus configured contextual evidence. FLUX/Qwen evidence is recorded in `33263044354`, `33263338596`, `33263401453`; PR #53 merged the two-Image/one-Video product UI/server contract after exact validation head `acf3f8e792c2b895a9999cca24060a1c33484463` passed all nine affected gates, including configured Create Lifecycle `33266025789` with durable two-reference attach/replace/reorder/alias/Video-limit coverage and exact cleanup. Desktop/narrow artifacts were reviewed clean after the narrow reference-row polish.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** Phase 7B — Multi-reference Image Editing v0.1 implementation. PR #51 completed the stable `@imageN` reference-addressing foundation; contextual FLUX/Qwen evidence is captured and the v0.1 route/count boundary is locked by UI-046. The Phase 7A premium-interaction pass remains an open Phase 7 exit item.\n**Current gate:** Expose at most two Image references while Video remains one; enforce exact count/role/media/ownership rules server-side; preserve alias identity through remove/replace/reorder; keep FLUX as the internal v0.1 image-edit route; run exact-head configured + responsive validation before treating multi-reference UI as approved. Do not expose Qwen/model selection or increase the reference maximum without new evidence/decision.",
    "**Current product slice:** None — Phase 7B Multi-reference Image Editing v0.1 is complete through PR #53 / merge `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. The next planned slice is Phase 7C Director Video; it has not started. The Phase 7A premium-interaction pass remains an open Phase 7 exit item.\n**Current gate:** Before Phase 7C product UI is implemented, re-audit the actual configured LTX/REDGraft Director-like frame/story/action/dialogue/sound contract and current constraints. Implement only verified task-oriented controls, reuse the durable/reference foundations, keep provider/ComfyUI identity internal, and retain the existing deployment authorization boundary.",
)

replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- User-facing second-reference exposure and authoritative count/role enforcement are the active implementation slice; the contextual audit alone does not mark the multi-reference UI complete.",
    "- PR #53 completed user-facing second-reference exposure and authoritative count/role/media/ownership enforcement. Image supports at most two attached image inputs; Video remains at most one. Create supports second durable upload, replacement without alias churn, explicit `Make primary` reordering, multi-item mention selection, and blocks a two-reference switch to Video instead of discarding an input.\n- Polished product commit `360fa79ea85dd09ce90101518fedaca5645aaa71` and exact validation retrigger head `acf3f8e792c2b895a9999cca24060a1c33484463` are tree-identical. The exact head passed all nine affected PR gates; configured Create Lifecycle `33266025789` exercised the durable two-reference interaction/submit contract and exact cleanup. PR #53 merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`.\n- Responsive review confirmed the two-reference composition remains readable on narrow layouts after the action cluster was allowed to wrap; desktop remains compact. No model selector, schema, route or infrastructure contract was added.",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- The approved Create UI still submits at most one reference. The current request parser validates input object shape but does **not** yet enforce media-kind compatibility, per-role multiplicity or a maximum input count. Multi-reference v0.1 must add those server-side input-slot constraints before exposing additional reference controls.",
    "- At the Phase 6 audit baseline, the approved Create UI still submitted at most one reference and the request parser did not yet enforce media-kind compatibility, per-role multiplicity or a product maximum. UI-046 / PR #53 later implemented those product constraints; this bullet is retained only as historical audit evidence.",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- Existing per-file reference limits remain image MIME types and at most 25 MB per input at the worker boundary. Phase 7 must preserve the simpler one-reference path and validate both temporary/durable input media compatibility server-side.",
    "- Existing per-file reference limits remain image MIME types and at most 25 MB per input at the worker boundary. Phase 7B preserves the simpler one-reference path and PR #53 validates temporary/durable input image availability and owner-scoped media compatibility server-side.",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "The following items are accepted product direction from closed-beta feedback, but remain **unimplemented until Phase 7 execution and verification**:",
    "The following items are accepted product direction from closed-beta feedback; implemented items are marked by their merged evidence while later Phase 7 slices remain pending:",
)
replace_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "- stable `@imageN` alias/order/role persistence and prompt-level reference addressing are implemented through PR #51; Phase 7B now adds the UI/server bounded two-reference slot contract from UI-046;",
    "- stable `@imageN` alias/order/role persistence and prompt-level reference addressing are implemented through PR #51; UI-046's bounded two-reference Image / one-reference Video slot contract is implemented and verified through PR #53;",
)

replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Normalized image inputs now carry stable product alias + opaque source + semantic role. Prompt `@imageN` mentions are parsed against attached aliases before submission; unresolved mentions are rejected in both the browser experience and server request contract. Alias text never authorizes access. Owner-scoped durable media is reloaded server-side and must be active image media before routing. Native generation translates aliases to the current request-array worker positions only at the adapter boundary, so aliases can remain stable while explicit reordering changes primary/reference execution order. PR #51 merged this foundation as `7afe257b069e74d322d8f83c1a0868a30acd3686`. UI-046 bounds the first multi-reference product exposure to two Image inputs / one Video input and keeps FLUX as the internal v0.1 Image/Edit route; Qwen remains internal/unselected.",
    "Normalized image inputs carry stable product alias + opaque source + semantic role. Prompt `@imageN` mentions are parsed against attached aliases before submission; unresolved mentions are rejected in both the browser experience and server request contract. Alias text never authorizes access. Owner-scoped durable media is reloaded server-side and must be active image media before routing. Native generation translates aliases to the current request-array worker positions only at the adapter boundary, so aliases remain stable while explicit reordering changes primary/reference execution order. PR #51 merged the addressing foundation as `7afe257b069e74d322d8f83c1a0868a30acd3686`; PR #53 / merge `0286b18802fc3d766d9d09e2ba8ed9a494eabd08` implements UI-046's bounded product exposure: at most two Image inputs and one Video input, ordered Image roles `primary-image` then `reference`, progressive second-reference UI, replacement without alias churn and explicit primary reordering. Request parsing centralizes count/role enforcement, and submission revalidates image kind/readiness/ownership before either native or external routing. FLUX remains the internal v0.1 Image/Edit route; Qwen remains internal/unselected.",
)

replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "Phase 7B extends this same Create-owned reference composition to the UI-046 two-image maximum; do not create a competing generic autocomplete or model picker.",
    "Phase 7B PR #53 extends this same Create-owned reference composition to UI-046's two-image maximum: second durable reference, stable replace/remove/reorder semantics, `Make primary`, multi-reference mention selection, and an explicit one-source Video limit. Exact validation head `acf3f8e792c2b895a9999cca24060a1c33484463` passed all nine affected gates including configured Create Lifecycle `33266025789`; desktop/narrow artifacts were reviewed after responsive action wrapping kept role labels readable. PR #53 merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. Do not create a competing generic autocomplete or model picker.",
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "**Notes:** UI-044 / PR #51. Exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed Create Lifecycle, UI Shell, configured upload/ownership/generation regressions and responsive visual review before merge as `7afe257b069e74d322d8f83c1a0868a30acd3686`. UI-046 multi-reference expansion must extend this maintained mechanic rather than replacing it.",
    "**Notes:** UI-044 / PR #51 established the mechanic. UI-046 / PR #53 extends it to all currently attached Image references without replacing the maintained Button + DropdownMenu composition; exact validation head `acf3f8e792c2b895a9999cca24060a1c33484463` passed configured lifecycle and responsive review before merge as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`.",
)

print("Phase 7B completion documentation reconciled.")
