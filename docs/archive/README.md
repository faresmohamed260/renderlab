# Historical Evidence

`docs/archive/**` contains historical repository records retained for provenance. Archive content is **not** current authority and must not be used to infer present product, deployment, architecture, backlog, or migration state when a current authority exists.

Use `docs/INDEX.md` to locate current authorities.

## Major handoff snapshots

- `PROJECT_PRE_CYCLE3_2026-09-03.md` — Project chronology through the pre-Cycle-3 handoff.
- `PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md` — Project journal snapshot immediately before governance hardening Checkpoint 6 separated current handoff from history.
- `UI_MIGRATION_PRE_HISTORY_SEPARATION_2026-10-10.md` — UI migration/phase journal snapshot immediately before Checkpoint 6 converted the tracker to current-only state.

Exact pre-separation originals remain in Git parent `06f587508f4803d1d45353e18fd1f51aee27f56c`: `PROJECT.md` blob `39c729d3c329ba80b7d150566765cd772f4dac4e`; `docs/ui/UI_MIGRATION.md` blob `9065af7bc7beae35dce19940cf52cee30f7abe6c`. The archived Markdown preserves content while normalizing repository-forbidden trailing-space artifacts.

## Archive rules

- Preserve historical wording and closure-time status as provenance; do not rewrite archives merely because current state changed later.
- Update the appropriate current authority when present state changes.
- Completed contracts and detailed exact-run evidence are historical after closure unless a current authority explicitly carries a constraint forward.
- Archived checklists are not backlog authority. An unchecked historical item does not become active work unless a current tracker/accepted contract explicitly promotes it.
