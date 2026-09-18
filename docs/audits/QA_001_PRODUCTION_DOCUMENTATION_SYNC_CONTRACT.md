# QA-001 Production Documentation Synchronization Contract

**Status:** EXECUTION CONTRACT / IMPLEMENTATION NOT YET MERGED  
**Tracker:** #278  
**Planning baseline:** repository `main` `301022db79660c788c9b41ec43d851e54e4cd272`  
**Current production application source:** `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`  
**Purpose:** make current-production documentation synchronization a required, machine-checkable post-cutover release closure step without rewriting historical phase records.

## Goal and user value

Prevent the repository from reporting a stale production SHA after a successful Vercel alias cutover. A future AI session or maintainer should be able to trust the four current-production authorities without reconstructing deployment history from chat or Actions logs.

QA-001 is release-governance work only. It does not deploy application code, change Vercel aliases, mutate Supabase/R2/provider state, or authorize any production rollout.

## Verified starting state

- Current production application source is `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` at READY deployment `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`.
- The 2026-09-17 production audit identified stale current-production repository pointers as RLQA-001 and synchronized them manually.
- The authoritative current-state records are:
  - `PROJECT.md`
  - `docs/ui/UI_MIGRATION.md`
  - `docs/ui/SCREEN_REGISTRY.md`
  - `docs/architecture/INFRASTRUCTURE.md`
- Historical phase-local deployment statements must remain historical. The checker must inspect only an explicitly marked current-production field, not reject older SHAs elsewhere in those documents.
- Automatic Git → Vercel deployment remains disabled. Production rollouts are explicit operations, so the synchronization guard must be a post-cutover release-closure check rather than an automatic deployment trigger.

## In scope

1. Add one exact machine-readable current-production SHA marker to each of the four authoritative files.
2. Add a repository verifier that:
   - requires an exact 40-character expected production SHA;
   - reads all four markers;
   - fails if any marker is missing, duplicated, malformed or differs from the expected SHA;
   - fails if the marked current-production section does not also contain the same SHA in its human-readable prose;
   - ignores historical deployment SHAs outside the marked current section.
3. Add a permanent GitHub Actions workflow that:
   - supports `workflow_dispatch` for an operator immediately after cutover;
   - supports `workflow_call` so a future guarded rollout workflow can compose the check directly;
   - performs no production mutation;
   - fails closed when the expected SHA is absent or malformed.
4. Update `AGENTS.md` so any future production rollout is not considered repository-closed until this check passes on the deployed SHA and the four docs match verified reality.
5. Add unit coverage for marker cardinality, exact-SHA agreement, historical-SHA tolerance and workflow trigger/input contract.

## Explicitly out of scope

- Deploying or rolling back RenderLab.
- Moving or inspecting Vercel aliases beyond supplying a previously verified SHA to the checker.
- Inferring the deployed SHA from chat context.
- Replacing historical deployment records with the current SHA.
- Updating application routes, UI, schema, Auth policy, R2 contracts, workers/providers or scheduler state.
- Automatically editing documentation after deployment. The check is intentionally fail-closed; the repository must be corrected and reviewed through an ordinary documentation PR.

## Marker contract

Each authority must contain exactly one marker:

`<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: <40-char-sha> -->`

The marker belongs inside that file's current-production/current-live block. Historical sections must not contain the marker.

The marker is a release-governance field, not a claim that repository `main` equals deployed application source. Documentation-only and audit-harness commits may legitimately advance `main` while production continues serving an earlier application source.

## Workflow contract

Permanent workflow:

`.github/workflows/production-documentation-sync.yml`

Required input:

`expected_production_sha`

The workflow must be non-mutating and needs only `contents: read`. It must never run automatically on `push` or `pull_request`, because a documentation change before an actual cutover could otherwise be mistaken for production truth.

A guarded rollout is repository-closed only after:

1. exact deployed source and custom-domain cutover are independently verified;
2. the four current-production docs are updated through reviewed repository changes if needed; and
3. Production Documentation Sync passes with the exact deployed SHA.

If the checker fails, the rollout may remain technically live, but documentation closure is incomplete and must be recorded as such until a sync PR passes.

## Validation matrix

| Case | Expected result |
| --- | --- |
| all four markers equal supplied exact SHA and prose agrees | pass |
| one marker missing | fail |
| one marker duplicated | fail |
| malformed supplied SHA | fail |
| one marker points to older deployment | fail |
| marker matches but nearby human-readable current block names another SHA | fail |
| historical section contains an older SHA | pass |
| repository `main` is newer than deployed application source due docs/test-only commits | pass |

## Documentation outputs

Implementation completion must update:

- `AGENTS.md` release-closure rules;
- the four authoritative current-production records with their markers;
- `PROJECT.md` and the production-audit report with QA-001 closure evidence;
- issue #278 QA-001 status.

No deployment or production resource documentation should claim a new application rollout from this work.

## Exit criteria

QA-001 is complete when:

- the contract is merged before implementation;
- the permanent verifier/workflow and marker fields are merged;
- exact implementation head and merged-main Engineering Quality pass;
- a Production Documentation Sync run passes against the currently verified production SHA `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`; and
- #278 and the production audit report accurately record the closure.

## Next-phase dependency

After QA-001 closes, QA-002 may be expanded from its existing partial permanent workflow into the exact #278 non-destructive production-journey contract. QA-004 production execution remains independently blocked only by its explicit manual dispatch gate.
