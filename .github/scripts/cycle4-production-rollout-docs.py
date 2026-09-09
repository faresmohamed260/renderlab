from pathlib import Path

DEPLOYMENT = "dpl_5hA4ihp644VcCzioY66hoTXaP18v"
DEPLOYMENT_URL = "https://renderlab-91pu92g5z-faresmohamed260-6733s-projects.vercel.app"
CANDIDATE = "cf3923097fce62edbee643df9b2883bd09210046"
RUN_ID = "34356155380"
ARTIFACT = "10105911082"
ARTIFACT_DIGEST = "sha256:049d143dab49881beb3ffa60ae2a0c104cd5d646d89b44d69c269098959469b8"
EVIDENCE_DIGEST = "0b8367f43f87a77ec8444f26c8a5b5fcce04b9bbada165ae61f3dca853f75782"
ROLLBACK = "dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} replacement count {count}")
    return text.replace(old, new, 1)


project_path = Path("PROJECT.md")
project = project_path.read_text()
project = replace_once(project, "## Current Verified Baseline — 2026-09-06", "## Current Verified Baseline — 2026-09-09", "PROJECT baseline date")
project = replace_once(
    project,
    "- Accepted production application is Post-Cycle 3 stabilization source `71a9034039a64beec66894cc4f79b1f62bfc7bf7` at READY deployment `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi`; `https://renderlab.faresuniform.uk` aliases that deployment. Prior Cycle 3 production deployment `dpl_6htPrpLMysfqZ7wQ5btwejXPA` remains the immediate rollback anchor.",
    f"- Accepted production application is Cycle 4 source `{CANDIDATE}` at READY deployment `{DEPLOYMENT}` / `{DEPLOYMENT_URL}`; `https://renderlab.faresuniform.uk` aliases that deployment. Pre-Cycle-4 deployment `{ROLLBACK}` remains the immediate rollback anchor after the successful rollout smoke.",
    "PROJECT production baseline",
)
project = replace_once(
    project,
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED / PRODUCTION LIVE`.**",
    "PROJECT Cycle 4 status",
)
project_marker = "## Cycle 4 production rollout closure — 2026-09-09"
if project_marker in project:
    raise SystemExit("PROJECT rollout closure already exists")
project += f"""

## Cycle 4 production rollout closure — 2026-09-09
**Status: `COMPLETE / VERIFIED / LIVE`.**

- [x] User-authorized rollout deployed exact current `main` `{CANDIDATE}` through guarded GitHub run `{RUN_ID}`. The rollout checked out the exact pristine SHA, verified required production environment-key metadata, built successfully on Vercel, and required Vercel to report the same Git SHA before acceptance.
- [x] New production deployment `{DEPLOYMENT}` is `READY` at `{DEPLOYMENT_URL}` and is aliased by `https://renderlab.faresuniform.uk`. The custom domain served the accepted Cycle 4 Landing copy (`Create with intent.` / `Keep what matters.`), explicit Closed Beta language and static-product-preview treatment; `/create`, `/library`, `/activity` and `/settings` also passed post-cutover HTTP smoke.
- [x] Exact-origin browser-upload R2 CORS passed for `https://renderlab.faresuniform.uk`. A real run-owned persistent image upload produced its durable media row and WebP thumbnail, appeared through the Library contract and then cleaned its exact fixture successfully.
- [x] Rollback to pre-Cycle-4 READY deployment `{ROLLBACK}` was armed but not required. Vercel reported no runtime errors in the bounded post-rollout window.
- [x] Rollout evidence artifact `{ARTIFACT}` has ZIP digest `{ARTIFACT_DIGEST}`; its `evidence.json` SHA-256 is `{EVIDENCE_DIGEST}`.
- [x] No Supabase schema change, R2 resource-contract change, worker deployment, provider/routing change, reconciliation/maintenance scheduler activation, `pg_cron` or `pg_net` change accompanied the application rollout. Automatic Git → Vercel deployment remains disabled; future production changes remain explicit operations.

Cycle 4 is now complete in both repository and production state. This rollout does not create or authorize Phase 23 / Cycle 5 work.
"""
project_path.write_text(project)

migration_path = Path("docs/ui/UI_MIGRATION.md")
migration = migration_path.read_text()
migration = replace_once(
    migration,
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED / PRODUCTION LIVE`.**",
    "UI_MIGRATION Cycle 4 status",
)
migration_marker = "### Cycle 4 production rollout — 2026-09-09"
if migration_marker in migration:
    raise SystemExit("UI_MIGRATION rollout closure already exists")
migration += f"""

### Cycle 4 production rollout — 2026-09-09
- [x] Explicit user authorization promoted exact repository source `{CANDIDATE}` to Vercel production through rollout run `{RUN_ID}`.
- [x] READY deployment `{DEPLOYMENT}` / `{DEPLOYMENT_URL}` now serves `https://renderlab.faresuniform.uk`; the accepted Phase 22 Landing plus `/create`, `/library`, `/activity` and `/settings` passed post-cutover smoke.
- [x] Production exact-origin R2 PUT CORS, one real durable image upload, generated WebP thumbnail, Library visibility and exact fixture cleanup all passed after cutover.
- [x] Evidence artifact `{ARTIFACT}`: `{ARTIFACT_DIGEST}`; `evidence.json` SHA-256 `{EVIDENCE_DIGEST}`. Rollback baseline `{ROLLBACK}` was retained and rollback was not required.
- [x] No schema/R2-resource/worker/provider/routing/scheduler change accompanied the rollout; automatic Git deployment remains disabled.

**Cycle 4 production status: `COMPLETE / VERIFIED / LIVE`.** No Phase 23 / Cycle 5 work is implied by rollout completion.
"""
migration_path.write_text(migration)

infra_path = Path("docs/architecture/INFRASTRUCTURE.md")
infra = infra_path.read_text()
infra_marker = "## Cycle 4 production rollout — 2026-09-09"
if infra_marker in infra:
    raise SystemExit("INFRASTRUCTURE rollout closure already exists")
infra += f"""

## Cycle 4 production rollout — 2026-09-09
The user explicitly authorized production rollout after Phase 22 / Cycle 4 repository closure. Guarded GitHub rollout run `{RUN_ID}` checked out exact current `main` `{CANDIDATE}`, required a pristine tree and required production Vercel environment-key metadata before invoking a forced production build/deploy with the established Vercel CLI path.

Vercel created deployment `{DEPLOYMENT}` at `{DEPLOYMENT_URL}` and reported it `READY` with Git SHA `{CANDIDATE}`. Active production aliases include `https://renderlab.faresuniform.uk` and `https://renderlab-lake.vercel.app`. The prior READY deployment `{ROLLBACK}` was retained as the immediate rollback target; rollback was armed for any post-deploy failure but was not required.

Post-cutover verification passed the accepted Cycle 4 Landing content plus `/create`, `/library`, `/activity` and `/settings`; exact-origin R2 browser-upload CORS returned the expected `204` for `https://renderlab.faresuniform.uk`; and a real run-owned persistent image upload verified durable promotion, WebP thumbnail creation, Library listing and exact fixture cleanup. A bounded Vercel runtime-error query after rollout returned no runtime errors.

Rollout evidence artifact `{ARTIFACT}` has ZIP digest `{ARTIFACT_DIGEST}` and the generated `evidence.json` has SHA-256 `{EVIDENCE_DIGEST}`. No Supabase migration/schema mutation, R2 resource-contract mutation, generation/upscale worker deployment, provider/routing change, reconciliation/maintenance scheduler activation, `pg_cron` or `pg_net` change accompanied this rollout. `vercel.json` still keeps `git.deploymentEnabled=false`; automatic Git → Vercel deployment remains disabled, so future production mutations continue to require an explicit operation.

This rollout makes the verified Cycle 4 application production-live. It does not authorize Phase 23 / Cycle 5 work.
"""
infra_path.write_text(infra)
