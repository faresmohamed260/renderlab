from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = root / relative_path
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{relative_path}: expected one match, found {count}: {old[:160]!r}")
    path.write_text(text.replace(old, new, 1))


# PROJECT.md — record verified implementation evidence while keeping merge as the remaining gate.
replace_once(
    "PROJECT.md",
    """### Active product slice
- Library Favorites v0.1 / UI-031 is **IN PROGRESS** as the first personal-organization slice after completed UI-030 ownership enforcement.
- v0.1 scope is intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle. Additive migration `20260828183102 renderlab_media_favorites` is applied with RLS/ownership/browser-grant boundaries unchanged.
- Collections, Library-card/batch favorite actions, Delete/batch management, new top-level navigation and a global client media store remain out of scope.
""",
    """### Active product slice
- Library Favorites v0.1 / UI-031 is **VERIFIED FOR MERGE** as the first personal-organization slice after completed UI-030 ownership enforcement. PR #23 remains open until the final documentation-head configured suite passes.
- Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198`.
- Fresh desktop/mobile Library Favorites and Media Viewer screenshots were visually reviewed without hierarchy drift. The post-suite shared-Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser grants, four RLS-enabled core tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at`, and applied migration `20260828183102 renderlab_media_favorites` with its partial owner/favorite index intact.
- v0.1 scope remains intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle. Collections, Library-card/batch favorite actions, Delete/batch management, new top-level navigation and a global client media store remain out of scope.
""",
)
replace_once(
    "PROJECT.md",
    "- complete and verify Favorites v0.1 against the enforced account boundary;",
    "- merge verified Favorites v0.1 through PR #23 after the final exact-head documentation validation;",
)

# UI_MIGRATION.md — mark implementation/audit work complete, leaving only final docs-head CI + merge.
for old, new in [
    ("- [ ] Extend the typed media contract and owner-scoped list service with favorite state plus `favorite=true` filtering that composes with kind/search/sort/pagination.", "- [x] Extend the typed media contract and owner-scoped list service with favorite state plus `favorite=true` filtering that composes with kind/search/sort/pagination."),
    ("- [ ] Add an idempotent owner-scoped favorite mutation API with signed-out denial and foreign-ID not-found behavior.", "- [x] Add an idempotent owner-scoped favorite mutation API with signed-out denial and foreign-ID not-found behavior."),
    ("- [ ] Integrate a compact Favorites filter into the approved Library toolbar without redesigning the media grid or adding a new top-level destination.", "- [x] Integrate a compact Favorites filter into the approved Library toolbar without redesigning the media grid or adding a new top-level destination."),
    ("- [ ] Integrate one accessible favorite toggle into Media Viewer Actions while preserving Rename/Download behavior and continuation hierarchy.", "- [x] Integrate one accessible favorite toggle into Media Viewer Actions while preserving Rename/Download behavior and continuation hierarchy."),
    ("- [ ] Add configured Favorites verification covering own/foreign accounts, signed-out denial, favorite/unfavorite idempotence, Library query composition, responsive Viewer/Library screenshots and exact DB/R2/Auth cleanup.", "- [x] Add configured Favorites verification covering own/foreign accounts, signed-out denial, favorite/unfavorite idempotence, Library query composition, responsive Viewer/Library screenshots and exact DB/R2/Auth cleanup."),
    ("- [ ] Run the affected exact-head GitHub gates, review responsive artifacts, audit shared Supabase cleanup/security state, then update authoritative docs from verified implementation reality before merge.", "- [x] Run the affected exact-head GitHub gates, review responsive artifacts, and audit shared Supabase cleanup/security state; exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates and cleanup/security verification is clean."),
]:
    replace_once("docs/ui/UI_MIGRATION.md", old, new)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Library Favorites v0.1 status: `IN PROGRESS`. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**",
    """**Library Favorites v0.1 status: `VERIFIED FOR MERGE` on implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd`; final documentation-head 13-gate validation and PR #23 merge remain. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**

Implementation-head evidence: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198` all passed. Configured Favorites verification covered signed-out denial, two-account own/foreign isolation, idempotent PUT/DELETE behavior, composed favorite/kind/search/sort filtering, real responsive Library/Viewer browser interaction and exact cleanup. Four fresh Favorites screenshots were visually reviewed clean. Final Supabase verification returned 0 core rows, 0 null owners, 0 fixture users, 0 browser grants, four RLS-enabled core tables, four non-null owner columns and all six UI-030 enforcement triggers; security advisors remain only the expected informational RLS-with-no-policy notices for deliberately server-owned tables, while performance advisors report unused-index INFO on empty/low-traffic tables including the newly added favorite index.""",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** Library Favorites v0.1 / UI-031 — IN PROGRESS. UI-030 is complete and provides the enforced account-private prerequisite.",
    "**Current product slice:** Library Favorites v0.1 / UI-031 — VERIFIED FOR MERGE. UI-030 is complete and provides the enforced account-private prerequisite.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current gate:** implement and remotely verify UI-031 Favorites v0.1 against the enforced owner boundary; no production deployment is authorized by this development slice.",
    "**Current gate:** run the final exact-head 13-gate suite on the documentation-finalized PR #23 head, then merge if unchanged and green. No production deployment is authorized by this development slice.",
)

# SCREEN_REGISTRY.md — update Library and Viewer from active implementation to verified extension.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED base Library; Favorites v0.1 / UI-031 IN PROGRESS",
    "**Status:** APPROVED base Library; Favorites v0.1 / UI-031 VERIFIED FOR MERGE",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "- UI-030 makes Library private to the verified account: signed-out users see an explicit sign-in state rather than media/search/upload controls, while signed-in list/search/history/upload queries are owner-scoped.",
    """- UI-030 makes Library private to the verified account: signed-out users see an explicit sign-in state rather than media/search/upload controls, while signed-in list/search/history/upload queries are owner-scoped.
- UI-031 adds URL-owned `favorite=true` as a server-side owner-scoped Favorites view that composes with kind/search/sort/pagination and preserves clean URL state when Favorites is inactive.
- Favorites remains a compact Library toolbar filter, not a new top-level destination or client-only card filter.""",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265` and Account Ownership `33131090207`; signed-out desktop/mobile and signed-in Library artifacts were reviewed clean.",
    """- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265` and Account Ownership `33131090207`; signed-out desktop/mobile and signed-in Library artifacts were reviewed clean.
- UI-031 exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Account Ownership `33200364288` and UI Shell `33200364256`; fresh desktop/mobile Favorites Library screenshots were visually reviewed clean and shared-resource cleanup returned to zero.""",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Active extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is now in progress as a small owner-scoped extension to the approved Library/Viewer model. Collections remains a separate later contract; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
    "**Verified extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is verified for merge as a small owner-scoped extension to the approved Library/Viewer model. Collections remains a separate later contract; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1 + Rename v0.1  ",
    "**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1 + Rename v0.1; Favorites v0.1 / UI-031 VERIFIED FOR MERGE  ",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`  ",
    "**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts`, `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`  ",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "- Rename and Download remain side-by-side while the inline edit form expands beneath them on desktop/mobile;",
    """- Rename and Download remain side-by-side while the inline edit form expands beneath them on desktop/mobile;
- UI-031 adds one full-width accessible `Favorite` / `Favorited` Viewer action above Rename/Download; it exposes `aria-pressed`, local saving/error feedback and an idempotent owner-scoped product mutation without changing continuation hierarchy;""",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Download/Rename remain contextual product actions; do not expose raw R2 keys/signed URLs as durable product links or add Library-card/batch/delete/collection actions without a separate contract.",
    """**Favorites approval evidence:** exact UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Media Download `33200364193`, Media Rename `33200364178`, Library Lifecycle `33200364235`, Account Ownership `33200364288` and UI Shell `33200364256`. Configured Chromium verified favorite/unfavorite state, `aria-pressed`, owner isolation, idempotent persistence and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Favorite/Download/Rename remain contextual product actions; do not expose raw R2 keys/signed URLs as durable product links or add Library-card/batch/delete/collection actions without a separate contract.""",
)

# COMPONENT_CATALOG.md — align the authoritative component descriptions with verified UI-031 behavior.
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    "**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/empty state, Media Viewer and Viewer Rename/Download actions.  ",
    "**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/Favorites/empty state, Media Viewer and Viewer Favorite/Rename/Download actions.  ",
)
for old, new in [
    ("**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop slices  ", "**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop behavior and verified UI-031 Favorites  "),
    ("**Purpose:** Durable-media Library with URL-owned literal search, kind filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry and Viewer deep links.  ", "**Purpose:** Durable-media Library with URL-owned literal search, kind filtering, Favorites filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry and Viewer deep links.  "),
    ("**Variants:** All/Images/Videos; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; transient desktop drag-active upload state; desktop/mobile.  ", "**Variants:** All/Images/Videos; Favorites on/off; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; transient desktop drag-active upload state; desktop/mobile.  "),
    ("**Dependencies:** Next.js Link, maintained Button/Input/DropdownMenu/Alert/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort contracts, feature-owned `LibraryUploadButton`, `LibraryDropUploadSurface` and `LibrarySortMenu`.  ", "**Dependencies:** Next.js Link, maintained Button/Input/DropdownMenu/Alert/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort/favorite contracts, feature-owned `LibraryUploadButton`, `LibraryDropUploadSurface` and `LibrarySortMenu`.  "),
    ("**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history ordering URL/server-owned and persistent upload paths on the shared feature-owned transaction.  ", "**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history/Favorites URL/server-owned and persistent upload paths on the shared feature-owned transaction.  "),
    ("**Do not:** Couple to legacy `studio_*`, expose storage identity, use page-only client filtering or add fake organization controls.  ", "**Do not:** Couple to legacy `studio_*`, expose storage identity, move Favorites/search/history into page-only client filtering, or infer Collections/batch management from the Favorites control.  "),
    ("**Notes:** Base Library `33034606323`/`33034606396`; persistent Upload merged PR #9; search merged PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; history ordering v0.1 approved under UI-027. UI-028 adds drag/drop without a generic Dropzone primitive because the browser drag surface is a Library-specific composition over an existing product upload contract, not a reusable conventional control.", "**Notes:** Base Library `33034606323`/`33034606396`; persistent Upload merged PR #9; search merged PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; history ordering v0.1 approved under UI-027. UI-028 adds drag/drop without a generic Dropzone primitive because the browser drag surface is a Library-specific composition over an existing product upload contract. UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267` plus the affected Library/account regressions; responsive Favorites views were reviewed clean."),
    ("**Do not:** Expand it into a Saga-style filter framework, add unsupported model/date/favorites filters, or persist organization state client-side.  ", "**Do not:** Expand it into a Saga-style filter framework, add unsupported model/date/collection filters, or persist organization state client-side.  "),
    ("**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Download and Rename.  ", "**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Favorite, Download and Rename.  "),
    ("**Purpose:** Viewer-owned secondary action group for durable Rename + Download, including the small inline Rename editor and local error/saving state.  ", "**Purpose:** Viewer-owned secondary action group for durable Favorite + Rename + Download, including the small inline Rename editor and local favorite/rename error/saving state.  "),
    ("**Dependencies:** `PATCH /api/media/assets/[assetId]`, `/api/media/assets/[assetId]/download`, `MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH`, Next.js router refresh.  ", "**Dependencies:** `PUT`/`DELETE /api/media/assets/[assetId]/favorite`, `PATCH /api/media/assets/[assetId]`, `/api/media/assets/[assetId]/download`, `MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH`, Next.js router refresh.  "),
    ("**Notes:** Rename and Download stay side-by-side while the edit form expands beneath them. Configured Rename run `33074480356` verified generated/uploaded rename, responsive editing/renamed states, search discovery, Download preservation and cleanup.", "**Notes:** Favorite is a full-width pressed-state action above the existing Rename/Download pair; Rename and Download stay side-by-side while the edit form expands beneath them. Configured Favorites run `33200364267` verified owner-scoped idempotent favorite/unfavorite, responsive Library/Viewer state and cleanup; configured Rename run `33074480356` continues to cover generated/uploaded rename and Download preservation."),
]:
    replace_once("docs/ui/COMPONENT_CATALOG.md", old, new)

# FRONTEND_ARCHITECTURE.md — switch UI-031 from target to verified implementation contract.
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Library Favorites v0.1 / UI-031 is the active implementation slice. Activity remains a placeholder.",
    "Library Favorites v0.1 / UI-031 is verified for merge through PR #23; final documentation-head CI remains the current gate. Activity remains a placeholder.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "## Library Favorites v0.1 Architecture — UI-031 (active)\nTarget contract while implementation is in progress:",
    "## Library Favorites v0.1 Architecture — UI-031 (verified for merge)\nVerified contract:",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- Collections remain a separate future relation/model rather than being inferred from Favorites.\n\n## Capability Architecture",
    """- Collections remain a separate future relation/model rather than being inferred from Favorites.

Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable configured gates, including Library Favorites `33200364267`, Account Ownership `33200364288`, Library Lifecycle `33200364235`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233` and Video Generation `33200364198`. Four fresh desktop/mobile Library/Viewer artifacts were visually reviewed clean. The post-suite Supabase audit returned zero shared RenderLab rows/fixture users/browser grants while preserving four RLS-enabled tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at` and the UI-031 partial index.

## Capability Architecture""",
)

# INFRASTRUCTURE.md — make migration/apply and advisor state explicit.
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "Do not reapply migrations 0003, 0004 or 0005. The required 0005 sequencing was satisfied: exact owner-aware application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production, live account isolation passed, and a final zero-unowned-row audit completed before enforcement.",
    """Do not reapply migrations 0003, 0004, 0005 or 0006. The required 0005 sequencing was satisfied: exact owner-aware application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production, live account isolation passed, and a final zero-unowned-row audit completed before enforcement. UI-031 implementation-head verification left all four core tables empty, zero RenderLab fixture Auth users, zero browser core-table grants, four RLS-enabled core tables, four `NOT NULL` owner columns and all six UI-030 enforcement triggers intact; `favorited_at` remains nullable and `media_assets_owner_favorite_created_at_idx` remains present.

Post-UI-031 Supabase security advisors report only the expected informational `rls_enabled_no_policy` notices for the deliberately server-owned core tables. Performance advisors report unused-index INFO findings on currently empty/low-traffic tables, including the new favorite index; no schema remediation is justified from those observations alone.""",
)
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- UI-030 now satisfies the ownership-isolation prerequisite for future personal organization; Favorites/Collections remain a separate unapproved product slice.",
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites is the verified first organization slice, while Collections remains a separate future contract.",
)

# media-assets.ts — useful inline contract note and common final-head retrigger for all 13 gates.
replace_once(
    "src/server/media/media-assets.ts",
    "export async function setMediaAssetFavorite(ownerId: string, assetId: string, favorite: boolean) {",
    """// Favorite state is metadata on the already owner-scoped durable asset. Keep the
// mutation idempotent so repeated PUT/DELETE preserves the original favorite timestamp.
export async function setMediaAssetFavorite(ownerId: string, assetId: string, favorite: boolean) {""",
)

print("UI-031 final documentation sync prepared successfully.")
