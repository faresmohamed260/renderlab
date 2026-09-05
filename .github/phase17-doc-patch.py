from pathlib import Path

project_path = Path("PROJECT.md")
migration_path = Path("docs/ui/UI_MIGRATION.md")
decisions_path = Path("docs/ui/UI_DECISIONS.md")

project = project_path.read_text()
migration = migration_path.read_text()
decisions = decisions_path.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


project = replace_once(
    project,
    "**Status: `IN PROGRESS — PHASE 16 COMPLETE / VERIFIED; PHASE 17 CONTRACT EXPANSION NEXT`.**",
    "**Status: `IN PROGRESS — PHASE 16 COMPLETE / MERGED; PHASE 17 CONTRACT ACCEPTED / IMPLEMENTATION NEXT`.**",
    "PROJECT Cycle 3 status",
)
project = replace_once(
    project,
    "- **Phase 17 — Observability & Engineering Quality: `ROADMAP`.** Add structured lifecycle/error/capacity visibility and cheaper conventional static/unit verification without weakening the existing configured end-to-end gates.",
    "- **Phase 17 — Observability & Engineering Quality: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.** Extend the existing privileged Admin Health and server lifecycle seams with privacy-safe structured diagnostics, truthful lifecycle/failure/failover/capacity/backlog aggregates and conventional cheap lint/typecheck/unit feedback, without weakening configured browser/live-provider gates or requiring a telemetry vendor/event store by default.",
    "PROJECT Phase 17 roadmap line",
)
project = replace_once(
    project,
    "Repository PR #99 exact-final-head validation/merge is the remaining closure operation.",
    "PR #99 has since completed exact-final-head validation and merged; authoritative Phase 16 post-merge closure is recorded below.",
    "PROJECT stale Phase 16 merge sentence",
)

handoff_start = project.index("## Immediate Handoff\n")
handoff_end = project.index("\n\n## Phase 14 Implementation Verification", handoff_start)
project = (
    project[:handoff_start]
    + "## Immediate Handoff\n"
      "Phase 16 is fully closed on merged `main`. PR #99 squash-merged exact final head `2352f150e0528f2ba3396afc46ccab80aec4e05e` as `ad3cf2a987b60098fdc361a7f8fc358ae706aeae` after the final 26-workflow affected matrix passed. The merge commit then passed all nine push-triggered workflows recorded in the Phase 16 post-merge closure below. The Phase 17 execution contract is now accepted from a fresh `ad3cf2a...` repository audit; Phase 17 implementation has not started. Continue from that contract only. Do not deploy the application, activate reconciliation/maintenance scheduling, add a telemetry vendor/event store, or begin Phase 18 capability work unless separately justified and authorized."
    + project[handoff_end:]
)

project_marker = "# Phase 17 Execution Contract — Observability & Engineering Quality"
if project_marker in project:
    raise SystemExit("PROJECT Phase 17 contract already exists")
project = project.rstrip() + "\n\n" + Path(".github/phase17-project-append.md").read_text().strip() + "\n"
project_path.write_text(project)

current_start = migration.index("## Current Work\n")
current_end = migration.index("\n## Session Handoff Rule", current_start)
new_current = """## Current Work
**Current cycle:** Cycle 3 — Reliability, Creative Iteration & Capability Growth is `IN PROGRESS`; Cycle 2 remains `COMPLETE / VERIFIED`.
**Current phase:** Phase 17 — Observability & Engineering Quality is `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-057. Phase 16 is `COMPLETE / VERIFIED / MERGED` on `main` `ad3cf2a987b60098fdc361a7f8fc358ae706aeae`.
**Next sequence:** implement Phase 17 only from the accepted execution contract in `PROJECT.md`, beginning with cheap engineering feedback and the existing server/Admin Health seams. Phase 18 remains roadmap-only until Phase 17 is complete and a fresh deployed-worker capability audit expands it.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Automatic Git deployment remains disabled.
**Deployment boundary:** Phase 16 merge and Phase 17 planning changed repository state only. They do not authorize or imply a production application rollout, reconciliation/maintenance scheduler activation, `pg_cron`/`pg_net`, telemetry-vendor configuration or production maintenance sweep.
**Broader-beta boundary:** Phase 13 owns production-capable invite/recovery delivery, sender-domain authentication, templates, rate limits and live mailbox evidence. Free-plan leaked-password protection remains separate.
**Next creative direction:** Phase 18 will re-audit deployed workers after Phase 17; current evaluation preference remains Upscale/Restore, then Inpainting/Outpainting, then LoRA/model adapters, with Director still blocked on structured deployed-worker semantics."""
migration = migration[:current_start] + new_current + migration[current_end:]

migration_marker = "## Cycle 3 — Phase 17 Observability & Engineering Quality"
if migration_marker in migration:
    raise SystemExit("UI_MIGRATION Phase 17 tracker already exists")
migration = migration.rstrip() + "\n\n" + Path(".github/phase17-migration-append.md").read_text().strip() + "\n"
migration_path.write_text(migration)

ui_marker = "### UI-057 — Operator observability extends privileged Admin Health"
if ui_marker in decisions:
    raise SystemExit("UI_DECISIONS UI-057 already exists")
decisions = decisions.rstrip() + "\n\n" + Path(".github/phase17-ui057.md").read_text().strip() + "\n"
decisions_path.write_text(decisions)
