from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# PROJECT.md — make current state coherent and select the next ordered slice.
replace_once(
    "PROJECT.md",
    "### Latest completed product slice",
    "### Active product slice\n- Library Favorites v0.1 / UI-031 is **IN PROGRESS** as the first personal-organization slice after completed UI-030 ownership enforcement.\n- v0.1 scope is intentionally narrow: one owner-scoped favorite marker on existing durable `media_assets`, a URL/server-owned Favorites Library filter that composes with kind/search/sort/pagination, and one Media Viewer favorite toggle.\n- Collections, Library-card/batch favorite actions, Delete/batch management, new top-level navigation and a global client media store remain out of scope.\n\n### Latest completed product slice",
)
replace_once(
    "PROJECT.md",
    "- No new Phase 4 product slice is active. Favorites/Collections, Delete/batch, and other follow-ups remain unstarted until separately approved with their own RenderLab contracts.",
    "- UI-030 leaves the ownership prerequisite satisfied for the active Favorites v0.1 / UI-031 slice; Collections, Delete/batch and other organization/management follow-ups remain separate and unstarted.",
)
replace_once(
    "PROJECT.md",
    "UI-030 is now the active prerequisite for personal organization. Favorites/Collections remain deferred until its owner-scoped boundary is fully enforced; do not encode them as global durable-media flags. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.",
    "UI-030 ownership enforcement is complete in production. Favorites v0.1 / UI-031 is now the active personal-organization slice and stays owner-scoped on existing durable media; Collections remains a separate later contract. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.",
)
replace_once(
    "PROJECT.md",
    "- `http://localhost:3000`\n- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`",
    "- `http://localhost:3000`\n- `https://renderlab-lake.vercel.app`\n- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`",
)
old_open = """## Still Open in Phase 4
Core account ownership / UI-030 is the active Phase 4 slice and must finish before any other product slice is selected. Remaining work, in order:
- make the verified owner-aware application code live only through a separately authorized production rollout;
- recheck for unowned rows, then apply and verify corrected `0005_core_account_ownership_enforce.sql` (`NOT NULL`, owner immutability, table-specific same-owner relational guards);
- favorites/collections or another personal organization model only after UI-030 is fully enforced;
- delete and batch management after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.

Do not infer Saga organization/destructive-action schemas automatically. Do not reverse the ownership rollout order merely because the implementation and configured PR suite are green."""
new_open = """## Still Open in Phase 4
Library Favorites v0.1 / UI-031 is the active Phase 4 slice. Remaining follow-ups, in order:
- complete and verify Favorites v0.1 against the enforced account boundary;
- evaluate Collections only through a separate RenderLab-owned organization contract after Favorites evidence exists;
- delete and batch management only after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.

Do not infer Saga organization/destructive-action schemas automatically. UI-030 is complete; future personal organization must continue using the verified account-private product boundary rather than global flags or legacy `studio_*` state."""
replace_once("PROJECT.md", old_open, new_open)

# UI decisions — record the minimal product contract, not a full organization framework.
decisions = Path("docs/ui/UI_DECISIONS.md")
text = decisions.read_text().rstrip()
if "### UI-031 —" in text:
    raise SystemExit("UI-031 already exists")
text += """

### UI-031 — Favorites are lightweight owner-scoped durable-media organization
**Status:** Accepted  
**Decision:** Favorites v0.1 uses a nullable `media_assets.favorited_at` marker on the existing account-owned durable asset row. Library exposes an optional URL/server-owned `favorite=true` filter that composes with the existing kind/search/sort/pagination contract. Media Viewer exposes one idempotent favorite toggle through an owner-scoped product API. v0.1 does not add Collections, Library-card/batch favorite controls, a new top-level route, a parallel organization table or a global client media store.  
**Reason:** UI-030 now guarantees one immutable account owner per durable media asset, so a favorite is safely modeled as lightweight metadata on that owned asset. Starting with the smallest useful organization action improves retrieval without prematurely designing Collections or a generic organization framework.  
**Consequences:** Additive migration `0006_media_favorites.sql` introduces nullable `favorited_at` plus an owner/favorites browsing index without changing RLS or browser grants. Product serialization exposes only favorite state, not database/storage identity. Favorite mutations remain server-authorized by the verified account and foreign asset IDs resolve as ordinary not-found state. Collections and Delete/batch remain separate future slices with their own contracts and validation.
"""
decisions.write_text(text + "\n")

# UI migration tracker — select and define the active slice.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Favorites/collections or another organization model only as a separately approved follow-up; the owner-scoped data boundary is now fully enforced.",
    "- [x] Select Favorites v0.1 / UI-031 as the next approved personal-organization slice now that the owner-scoped data boundary is fully enforced; Collections remains a separate later contract.",
)
phase5 = "## Phase 5 — Operational & Secondary Experiences"
favorites_section = """### Library Favorites v0.1 — UI-031
Favorites is the first personal Library organization slice after completed UI-030 ownership enforcement. Keep it intentionally smaller than a Collections or batch-management system.

- [x] Establish the RenderLab-owned UI-031 contract: durable account-owned `media_assets` carry nullable favorite state; Library gets a URL/server-owned Favorites filter; Media Viewer gets one owner-scoped toggle.
- [ ] Commit and apply additive `0006_media_favorites.sql` with nullable `favorited_at` and an owner/favorites browse index; preserve RLS and zero browser grants.
- [ ] Extend the typed media contract and owner-scoped list service with favorite state plus `favorite=true` filtering that composes with kind/search/sort/pagination.
- [ ] Add an idempotent owner-scoped favorite mutation API with signed-out denial and foreign-ID not-found behavior.
- [ ] Integrate a compact Favorites filter into the approved Library toolbar without redesigning the media grid or adding a new top-level destination.
- [ ] Integrate one accessible favorite toggle into Media Viewer Actions while preserving Rename/Download behavior and continuation hierarchy.
- [ ] Add configured Favorites verification covering own/foreign accounts, signed-out denial, favorite/unfavorite idempotence, Library query composition, responsive Viewer/Library screenshots and exact DB/R2/Auth cleanup.
- [ ] Run the affected exact-head GitHub gates, review responsive artifacts, audit shared Supabase cleanup/security state, then update authoritative docs from verified implementation reality before merge.

**Library Favorites v0.1 status: `IN PROGRESS`. Collections, Library-card/batch favorite actions and Delete/batch remain out of scope.**

"""
replace_once("docs/ui/UI_MIGRATION.md", phase5, favorites_section + phase5)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current product slice:** none. Core account ownership v0.1 / UI-030 is complete and approved after production rollout plus enforced-schema verification.",
    "**Current product slice:** Library Favorites v0.1 / UI-031 — IN PROGRESS. UI-030 is complete and provides the enforced account-private prerequisite.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current gate:** none for UI-030. Production is live on the Next.js Vercel project, the environment preflight passes, corrected `0005` is enforced, post-enforcement account isolation is green, and the canonical production origin is included in the verified R2 browser-upload CORS rule.",
    "**Current gate:** implement and remotely verify UI-031 Favorites v0.1 against the enforced owner boundary; no production deployment is authorized by this development slice.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next product slice:** none selected. Start no new Phase 4 slice until explicitly approved; Favorites/Collections still needs its own product contract, and Delete still requires durable storage/reference/recovery semantics.",
    "**Next product slice:** none selected beyond active UI-031. Collections remains separate; Delete still requires durable storage/reference/recovery semantics.",
)

# Screen Registry — remove stale rollout blockers and record the active extension.
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED — Library v0.1 + persistent Upload + search v0.1 + history ordering v0.1 + drag/drop upload v0.1  ",
    "**Status:** APPROVED base Library; Favorites v0.1 / UI-031 IN PROGRESS  ",
)
stale_library = "**Still intentionally open:** UI-030 owner scoping is implemented, merged through PR #17 and verified on `main`, but its rollout remains incomplete until owner-aware code is actually live and corrected `0005` is applied/verified after a no-unowned-row audit. Favorites/Collections remain blocked until that enforcement is complete. Delete/batch management remains separately blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit."
current_library = "**Active extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is now in progress as a small owner-scoped extension to the approved Library/Viewer model. Collections remains a separate later contract; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit."
replace_once("docs/ui/SCREEN_REGISTRY.md", stale_library, current_library)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Still intentionally open:** UI-030 strict database enforcement remains a rollout prerequisite before personal Library organization. Other Settings sections remain requirement-driven.",
    "**Still intentionally open:** UI-030 strict database enforcement is complete. Personal Library organization remains owned by Library/Viewer rather than Settings; other Settings sections remain requirement-driven.",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "Current durable product decisions are in `docs/ui/UI_DECISIONS.md`, including UI-022 persistent uploaded-media identity, UI-023 Library search, UI-024 durable media Download, UI-025 durable display-name Rename, UI-026 maintained conventional control purity, UI-027 Library history ordering, UI-028 Library drag/drop upload, UI-029 account identity and UI-030 core account ownership.",
    "Current durable product decisions are in `docs/ui/UI_DECISIONS.md`, including UI-022 persistent uploaded-media identity, UI-023 Library search, UI-024 durable media Download, UI-025 durable display-name Rename, UI-026 maintained conventional control purity, UI-027 Library history ordering, UI-028 Library drag/drop upload, UI-029 account identity, UI-030 core account ownership and active UI-031 Favorites.",
)

# Frontend architecture — reconcile UI-030 state and describe active UI-031 distinctly from verified implementation.
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Approved product state includes Application Shell, Create, Library v0.1, persistent Upload, Library search v0.1, Library history ordering v0.1, Library drag/drop upload v0.1, Media Viewer v0.1, Download v0.1 and Rename v0.1. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`; PR #13 merged the foundation-only maintained-primitive refactor under UI-026; PR #14 merged Library chronological direction/UI-027 as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; PR #15 merged Library drag/drop upload/UI-028 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; PR #16 merged Account Identity Foundation/UI-029 as `bcb20365db102252db51263968de96fc795be518`. Core Account Ownership/UI-030 remains the active rollout slice after PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`: exact implementation and final documentation heads passed the complete configured suite, and merged `main` push checks are green. Production rollout and corrected `0005` enforcement remain outstanding. Activity remains a placeholder.",
    "Approved product state includes Application Shell, Create, Library v0.1, persistent Upload, Library search v0.1, Library history ordering v0.1, Library drag/drop upload v0.1, Media Viewer v0.1, Download v0.1, Rename v0.1, Account Identity/UI-029 and fully enforced Core Account Ownership/UI-030. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; exact owner-aware production SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` is live and migration `20260828174940 renderlab_core_account_ownership_enforce` is applied/verified. Library Favorites v0.1 / UI-031 is the active implementation slice. Activity remains a placeholder.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- Library `kind`, `q`, `sort`, `offset` are URL-owned shareable browsing/discovery/history state after account context is resolved.",
    "- Library `kind`, `q`, `sort`, `offset` are URL-owned shareable browsing/discovery/history state after account context is resolved. Active UI-031 will add optional `favorite=true` as another server-owned Library filter without changing route hierarchy.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 is the active prerequisite for personal Library organization; Favorites/Collections remain deferred until the prepared ownership model is fully enforced through corrected `0005` after safe rollout.",
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; active UI-031 adds Favorites directly to the existing owner-scoped durable-media contract while Collections remains deferred.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- UI-029 introduced identity without silently redesigning the approved product loop; UI-030 is the separate ownership/enforcement layer now in progress.",
    "- UI-029 introduced identity without silently redesigning the approved product loop; UI-030 is now the completed production ownership/enforcement layer used by later personal organization.",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "## Core Account Ownership Flow\nUI-030 (PR #17; implementation verified, rollout in progress):",
    "## Core Account Ownership Flow\nUI-030 (PR #17; production enforced):",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "- corrected `0005_core_account_ownership_enforce.sql` is staged, not applied. It makes all four owners non-null/immutable and enforces table-specific same-owner generation/media and upload/media links only after owner-aware code is safely live and a final no-unowned-row audit passes;",
    "- corrected `0005_core_account_ownership_enforce.sql` is applied as `20260828174940 renderlab_core_account_ownership_enforce`; all four owners are non-null/immutable and table-specific same-owner generation/media and upload/media guards are active;",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    "Corrected `0005` independently passes rollback-only live-schema same-owner/cross-owner/immutability/null-owner/Auth-delete and FK-cleanup compatibility simulations, with zero persistent rows/users/triggers afterward. It remains unapplied until the owner-aware runtime is actually live and a final no-unowned-row audit passes.",
    "Corrected `0005` first passed rollback-only live-schema same-owner/cross-owner/immutability/null-owner/Auth-delete and FK-cleanup compatibility simulations, then was applied only after the owner-aware runtime was live and the final no-unowned-row audit passed. Post-enforcement production Account Ownership verification remained green and cleanup returned shared RenderLab rows/users to zero.",
)
capability_heading = "## Capability Architecture"
favorites_arch = """## Library Favorites v0.1 Architecture — UI-031 (active)
Target contract while implementation is in progress:
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

"""
replace_once("docs/architecture/FRONTEND_ARCHITECTURE.md", capability_heading, favorites_arch + capability_heading)

# Infrastructure — committed migration is additive but not yet applied at this checkpoint.
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "- `0005_core_account_ownership_enforce.sql` — applied as `20260828174940 renderlab_core_account_ownership_enforce` after the owner-aware runtime was live, live two-account verification passed, and the final no-unowned-row audit was clean. It makes all four owners `NOT NULL`, makes `owner_id` immutable, and enforces same-owner links for generated media → generation job and upload session → promoted media asset. The migration was corrected at `7f0b74887ec8bb84a3fb17c4542d83f0ddc8177e` after rollback-only semantic testing exposed that one shared polymorphic trigger function could reference a field unavailable on `media_assets`; the applied migration uses separate media→job and upload→asset owner-link trigger functions.",
    "- `0005_core_account_ownership_enforce.sql` — applied as `20260828174940 renderlab_core_account_ownership_enforce` after the owner-aware runtime was live, live two-account verification passed, and the final no-unowned-row audit was clean. It makes all four owners `NOT NULL`, makes `owner_id` immutable, and enforces same-owner links for generated media → generation job and upload session → promoted media asset. The migration was corrected at `7f0b74887ec8bb84a3fb17c4542d83f0ddc8177e` after rollback-only semantic testing exposed that one shared polymorphic trigger function could reference a field unavailable on `media_assets`; the applied migration uses separate media→job and upload→asset owner-link trigger functions.\n- `0006_media_favorites.sql` — committed for active UI-031 but not yet applied at this checkpoint; additive nullable `media_assets.favorited_at` plus a partial owner/created-time browse index. It changes no ownership, RLS, browser grant or R2 contract.",
)

# Additive migration.
migration = Path("supabase/migrations/0006_media_favorites.sql")
if migration.exists():
    raise SystemExit("0006_media_favorites.sql already exists")
migration.write_text("""alter table public.media_assets
  add column if not exists favorited_at timestamptz null;

create index if not exists media_assets_owner_favorite_created_at_idx
  on public.media_assets (owner_id, created_at desc, id desc)
  where favorited_at is not null;

comment on column public.media_assets.favorited_at is
  'Nullable account-private favorite marker for an existing owner-scoped durable media asset. Null means not favorited.';
""")
