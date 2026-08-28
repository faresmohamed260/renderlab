from pathlib import Path
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = root / relative_path
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{relative_path}: expected one match, found {count}: {old[:180]!r}")
    path.write_text(text.replace(old, new, 1))


# PROJECT.md — close UI-031 and leave no implicit next slice active.
replace_once(
    "PROJECT.md",
    """### Active product slice
- Library Favorites v0.1 / UI-031 is **VERIFIED FOR MERGE** as the first personal-organization slice after completed UI-030 ownership enforcement. PR #23 remains open until the final documentation-head configured suite passes.
- Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198`.
- Fresh desktop/mobile Library Favorites and Media Viewer screenshots were visually reviewed without hierarchy drift. The post-suite shared-Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser grants, four RLS-enabled core tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at`, and applied migration `20260828183102 renderlab_media_favorites` with its partial owner/favorite index intact.
- v0.1 scope remains intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle. Collections, Library-card/batch favorite actions, Delete/batch management, new top-level navigation and a global client media store remain out of scope.

### Latest completed product slice
- Core Account Ownership v0.1 / UI-030 is **APPROVED**.""",
    """### Active product slice
- None. Library Favorites v0.1 / UI-031 is complete and approved; no follow-up product slice has been selected automatically.
- Collections remains a separate RenderLab-owned organization contract to evaluate only as a future slice. Delete/batch remains blocked until storage/reference/recovery semantics are explicit.

### Latest completed product slice
- Library Favorites v0.1 / UI-031 is **APPROVED**. PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after final exact head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 applicable gates: Library Favorites `33205471360`, Account Ownership `33205471266`, UI Shell `33205471298`, Create Lifecycle `33205471299`, Library Search `33205471263`, Library History `33205471326`, Library Lifecycle `33205471335`, Library Drag Drop `33205471286`, Persistent Media Upload `33205471255`, Media Download `33205471419`, Media Rename `33205471361`, Generation Integration `33205471331`, and Video Generation `33205471358`.
- The implementation-head suite `85460b7920afe66eee7ff35da03d4f43c9f207fd` also passed all 13 applicable gates before documentation finalization. Four fresh desktop/mobile Library Favorites and Media Viewer screenshots were visually reviewed without hierarchy drift.
- The final pre-merge and post-merge Supabase audits both found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser grants, four RLS-enabled core tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at`, and applied migration `20260828183102 renderlab_media_favorites` with its partial owner/favorite index intact.
- Merged `main` push checks UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` all passed. Vercel listed zero RenderLab deployments created after the PR #23 merge; automatic Git deployment remains disabled and UI-031 was not deployed separately.
- Favorites v0.1 remains intentionally narrow: owner-scoped favorite metadata on existing durable `media_assets`, server-owned `favorite=true` Library filtering that composes with kind/search/sort/pagination, and one contextual Media Viewer toggle. Collections, Library-card/batch favorite actions, Delete/batch, new top-level navigation and a global client media store remain out of scope.

### Previous completed product slice — Core Account Ownership
- Core Account Ownership v0.1 / UI-030 is **APPROVED**.""",
)
replace_once(
    "PROJECT.md",
    "UI-030 ownership enforcement is complete in production. Favorites v0.1 / UI-031 is now the active personal-organization slice and stays owner-scoped on existing durable media; Collections remains a separate later contract. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.",
    "UI-030 ownership enforcement is complete in production and Favorites v0.1 / UI-031 is approved as the first owner-scoped personal-organization slice. Collections remains a separate future contract. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.",
)
replace_once(
    "PROJECT.md",
    """## Still Open in Phase 4
Library Favorites v0.1 / UI-031 is the active Phase 4 slice. Remaining follow-ups, in order:
- merge verified Favorites v0.1 through PR #23 after the final exact-head documentation validation;
- evaluate Collections only through a separate RenderLab-owned organization contract after Favorites evidence exists;
- delete and batch management only after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.
""",
    """## Still Open in Phase 4
No Phase 4 product slice is active. Remaining follow-ups, in order:
- evaluate Collections only through a separate RenderLab-owned organization contract if/when that slice is explicitly selected;
- delete and batch management only after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.
""",
)

# UI_MIGRATION.md — close the tracker and record exact final/merge evidence.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] Run the affected exact-head GitHub gates, review responsive artifacts, and audit shared Supabase cleanup/security state; exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates and cleanup/security verification is clean.",
    """- [x] Run the affected exact-head GitHub gates, review responsive artifacts, and audit shared Supabase cleanup/security state; exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable gates and cleanup/security verification is clean.
- [x] Finalize documentation and rerun the same 13-gate matrix on exact head `4bd41d55af27c7240d75862424039fc59027988e`; all passed before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`.
- [x] Verify merged `main` push checks and post-merge cleanup: UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` passed; shared Supabase returned to zero fixtures with ownership/RLS/Favorites schema intact; Vercel created no deployment from the merge.""",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Library Favorites v0.1 status: `VERIFIED FOR MERGE` on implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd`; final documentation-head 13-gate validation and PR #23 merge remain. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**",
    "**Library Favorites v0.1 status: `APPROVED`. PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after final documentation head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 applicable gates. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "Implementation-head evidence: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198` all passed. Configured Favorites verification covered signed-out denial, two-account own/foreign isolation, idempotent PUT/DELETE behavior, composed favorite/kind/search/sort filtering, real responsive Library/Viewer browser interaction and exact cleanup. Four fresh Favorites screenshots were visually reviewed clean. Final Supabase verification returned 0 core rows, 0 null owners, 0 fixture users, 0 browser grants, four RLS-enabled core tables, four non-null owner columns and all six UI-030 enforcement triggers; security advisors remain only the expected informational RLS-with-no-policy notices for deliberately server-owned tables, while performance advisors report unused-index INFO on empty/low-traffic tables including the newly added favorite index.",
    """Implementation-head evidence: Library Favorites `33200364267`, Account Ownership `33200364288`, UI Shell `33200364256`, Create Lifecycle `33200364185`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233`, and Video Generation `33200364198` all passed. Configured Favorites verification covered signed-out denial, two-account own/foreign isolation, idempotent PUT/DELETE behavior, composed favorite/kind/search/sort filtering, real responsive Library/Viewer browser interaction and exact cleanup. Four fresh Favorites screenshots were visually reviewed clean.

Final documentation-head evidence: Library Favorites `33205471360`, Account Ownership `33205471266`, UI Shell `33205471298`, Create Lifecycle `33205471299`, Library Search `33205471263`, Library History `33205471326`, Library Lifecycle `33205471335`, Library Drag Drop `33205471286`, Persistent Media Upload `33205471255`, Media Download `33205471419`, Media Rename `33205471361`, Generation Integration `33205471331`, and Video Generation `33205471358` all passed on unchanged product tree plus finalized documentation. Final pre-merge and post-merge Supabase verification returned 0 core rows, 0 null owners, 0 fixture users, 0 browser grants, four RLS-enabled core tables, four non-null owner columns and all six UI-030 enforcement triggers; `favorited_at` remains nullable, the partial favorite index remains present, and `0006` remains latest. Security advisors remain only the expected informational RLS-with-no-policy notices for deliberately server-owned tables, while performance advisors report unused-index INFO on empty/low-traffic tables including the favorite index.""",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** Library Favorites v0.1 / UI-031 — VERIFIED FOR MERGE. UI-030 is complete and provides the enforced account-private prerequisite.",
    "**Current product slice:** none. Library Favorites v0.1 / UI-031 is complete and approved.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, and Core Account Ownership PR #17 / UI-030 are merged and approved.",
    "**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, and Library Favorites PR #23 / UI-031 are merged and approved.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current gate:** run the final exact-head 13-gate suite on the documentation-finalized PR #23 head, then merge if unchanged and green. No production deployment is authorized by this development slice.",
    "**Current gate:** none for UI-031. PR #23 is merged, final and post-merge checks are green, cleanup is clean, and automatic Vercel Git deployment remained disabled.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next product slice:** none selected beyond active UI-031. Collections remains separate; Delete still requires durable storage/reference/recovery semantics.",
    "**Next product slice:** none selected. Collections remains a separate possible future organization contract; Delete still requires durable storage/reference/recovery semantics.",
)

# SCREEN_REGISTRY.md — approved screen/component state and merge evidence.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED base Library; Favorites v0.1 / UI-031 VERIFIED FOR MERGE",
    "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "- UI-031 exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Account Ownership `33200364288` and UI Shell `33200364256`; fresh desktop/mobile Favorites Library screenshots were visually reviewed clean and shared-resource cleanup returned to zero.",
    """- UI-031 exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Account Ownership `33200364288` and UI Shell `33200364256`; fresh desktop/mobile Favorites Library screenshots were visually reviewed clean and shared-resource cleanup returned to zero.
- Final UI-031 head `4bd41d55af27c7240d75862424039fc59027988e` passed the complete 13-gate affected suite, then PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`; merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation `33205766671`, and Video Generation `33205766691` passed, and the post-merge shared-resource audit returned to zero.""",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Verified extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is verified for merge as a small owner-scoped extension to the approved Library/Viewer model. Collections remains a separate later contract; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
    "**Approved extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is approved as a small owner-scoped extension to the Library/Viewer model. Collections remains a separate later contract; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1 + Rename v0.1; Favorites v0.1 / UI-031 VERIFIED FOR MERGE",
    "**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1 + Rename v0.1 + Favorites v0.1 / UI-031",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Favorites approval evidence:** exact UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Media Download `33200364193`, Media Rename `33200364178`, Library Lifecycle `33200364235`, Account Ownership `33200364288` and UI Shell `33200364256`. Configured Chromium verified favorite/unfavorite state, `aria-pressed`, owner isolation, idempotent persistence and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.",
    "**Favorites approval evidence:** exact UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Media Download `33200364193`, Media Rename `33200364178`, Library Lifecycle `33200364235`, Account Ownership `33200364288` and UI Shell `33200364256`. Final head `4bd41d55af27c7240d75862424039fc59027988e` passed the full 13-gate affected suite before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`. Configured Chromium verified favorite/unfavorite state, `aria-pressed`, owner isolation, idempotent persistence and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.",
)

# FRONTEND_ARCHITECTURE.md — final approved architecture state.
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Library Favorites v0.1 / UI-031 is verified for merge through PR #23; final documentation-head CI remains the current gate. Activity remains a placeholder.",
    "Library Favorites v0.1 / UI-031 is approved and merged through PR #23 as `45991e1d55b75dcc13eab162093fc1be1f5c2431`; no product slice is currently active. Activity remains a placeholder.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "## Library Favorites v0.1 Architecture — UI-031 (verified for merge)",
    "## Library Favorites v0.1 Architecture — UI-031 (approved)",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable configured gates, including Library Favorites `33200364267`, Account Ownership `33200364288`, Library Lifecycle `33200364235`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233` and Video Generation `33200364198`. Four fresh desktop/mobile Library/Viewer artifacts were visually reviewed clean. The post-suite Supabase audit returned zero shared RenderLab rows/fixture users/browser grants while preserving four RLS-enabled tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at` and the UI-031 partial index.",
    """Exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed all 13 applicable configured gates, including Library Favorites `33200364267`, Account Ownership `33200364288`, Library Lifecycle `33200364235`, Media Download `33200364193`, Media Rename `33200364178`, Generation Integration `33200364233` and Video Generation `33200364198`. Final documentation head `4bd41d55af27c7240d75862424039fc59027988e` passed the complete 13-gate affected matrix again before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`. Four fresh desktop/mobile Library/Viewer artifacts were visually reviewed clean. Final pre-merge and post-merge Supabase audits returned zero shared RenderLab rows/fixture users/browser grants while preserving four RLS-enabled tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at` and the UI-031 partial index. Merged-main UI Shell, Reference Upload, Generation and Video Generation checks all passed.""",
)

# INFRASTRUCTURE.md — post-merge schema/deployment reality.
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "Post-UI-031 Supabase security advisors report only the expected informational `rls_enabled_no_policy` notices for the deliberately server-owned core tables. Performance advisors report unused-index INFO findings on currently empty/low-traffic tables, including the new favorite index; no schema remediation is justified from those observations alone.",
    """Post-UI-031 Supabase security advisors report only the expected informational `rls_enabled_no_policy` notices for the deliberately server-owned core tables. Performance advisors report unused-index INFO findings on currently empty/low-traffic tables, including the new favorite index; no schema remediation is justified from those observations alone.

UI-031 / PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after exact final head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 affected gates. Merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` passed. Post-merge Supabase cleanup returned all four core tables and RenderLab fixture users to zero while preserving RLS, browser-grant revocation, six ownership triggers, four `NOT NULL` owners, nullable `favorited_at`, and the favorite index. Vercel reported zero RenderLab deployments created after the PR #23 merge, confirming automatic Git deployment remained disabled; UI-031 has not been separately deployed to production.""",
)
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites is the verified first organization slice, while Collections remains a separate future contract.",
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites is the approved first organization slice, while Collections remains a separate future contract.",
)

print("UI-031 post-merge documentation handoff prepared successfully.")
