from pathlib import Path

sections = {
    Path('PROJECT.md'): r'''

### Phase 22 exact-head handoff — 2026-09-09
- Authoritative `main` remains `9b25ba9ec4adff5b6dd8a6bebd185e72cea9b25d`. Draft PR #130 remains open and merge-pending on `work/phase-22-system-cohesion`.
- Final fully validated pre-handoff head `287a3e26eda039cb034492cd8dc872e7731fcd01` passed **all 15 workflows GitHub attached to that exact PR head**: Release Candidate Matrix `34281812498`, Image Upscale `34281812430`, Creative Iteration `34281812537`, Generation Admission `34281812604`, Engineering Quality `34281812500`, Library Lifecycle `34281812524`, Account Identity `34281812399`, Account Ownership `34281812384`, Create Durable Upload `34281812577`, UI Shell `34281812425`, Account/Admin Operations `34281812369`, Brand / Launch `34281812398`, Activity `34281812436`, Activity Cancel `34281812467`, and Integrated Release `34281812664`.
- Release Candidate Matrix `34281812498` also passed candidate identity/whitespace, verifier syntax, UI purity, TypeScript, production build, stale-dispatch quiescence, the same-SHA PR shared-fixture wait, configured child dispatch, and exact-SHA child-success enforcement. Its manifest artifact is `10078464050` with digest `sha256:b1c20572a025e7a43a7a384eaa7d2762afb172d78021719267a0d65fb6d04cc2`.
- The shared Admin/Generation CI scheduling defect is fixed in repository state. Commit `c522cdc57ebbfcb41f542a10da401ec2317a7f71` introduced event-aware scheduling and the matching infrastructure contract; `287a3e26...` corrected two over-escaped jq filters. On the accepted head, attached Admin and Generation Admission both ran real jobs and succeeded instead of cancelling one another, and the release matrix waited for attached PR coverage before dispatching its serialized child fixture window.
- The Phase 22 product/UI implementation remains the previously human-accepted tree rooted at functional head `c081d53afecdd76f8c687cfc950d8f4bb0454a8a`; later commits through `287a3e26...` are documentation/CI-orchestration corrections and do not reopen the accepted Activity, Settings, Landing, Create, Library or Viewer pixels.
- This handoff documentation commit is expected to be a new documentation-only `GITHUB_TOKEN`-authored head. Do **not** merge merely from the older `287a3e26...` green set: create one user/connector-authored tree-identical retrigger (or otherwise obtain ordinary PR workflow execution on the unchanged documentation tree), require every workflow GitHub attaches to that final head to be terminal-success, then mark PR #130 ready and squash-merge with `expected_head_sha`.
- After merge, verify every workflow attached to the exact merged `main` commit and confirm production remains unchanged. Phase 22 and Cycle 4 become `COMPLETE / VERIFIED / MERGED` only after that merged-main verification. No production deployment is authorized by this handoff.
''',
    Path('docs/ui/UI_MIGRATION.md'): r'''

### Phase 22 exact-head handoff — 2026-09-09
- [x] Human implementation review accepted Activity, Settings, Landing and representative Create/Library/Viewer cohesion on desktop, 390px and reduced-motion evidence.
- [x] Pre-handoff exact head `287a3e26eda039cb034492cd8dc872e7731fcd01` passed all 15 workflows GitHub attached to that SHA, including real Account/Admin Operations `34281812369` and Generation Admission `34281812604` jobs.
- [x] Release Candidate Matrix `34281812498` passed its exact-SHA child gate after waiting for the same-SHA attached shared-fixture workflows; manifest artifact `10078464050`, `sha256:b1c20572a025e7a43a7a384eaa7d2762afb172d78021719267a0d65fb6d04cc2`.
- [x] Event-aware Admin/Generation CI scheduling is implemented in `c522cdc57ebbfcb41f542a10da401ec2317a7f71` and jq quoting corrected in `287a3e26...`; the prior pre-job cancellation blocker is resolved on that exact head.
- [ ] This handoff docs commit changes repository documentation after the green `287a3e26...` head. Before merge, obtain a user/connector-authored exact-head retrigger on the unchanged documentation tree and require every attached workflow to be green; do not borrow older-SHA success.
- [ ] Mark PR #130 ready only after that final exact-head gate; guarded squash-merge with `expected_head_sha`.
- [ ] Verify all workflows attached to the merged `main` commit, then update Phase 22 / Cycle 4 to `COMPLETE / VERIFIED / MERGED`.
- [ ] Production rollout remains separate and unauthorized.
''',
    Path('docs/ui/UI_DECISIONS.md'): r'''

#### UI-065 pre-merge exact-head closure — 2026-09-09
Exact pre-handoff PR head `287a3e26eda039cb034492cd8dc872e7731fcd01` passed every one of its 15 attached workflows, including Account/Admin Operations `34281812369`, Generation Admission `34281812604`, Activity `34281812436`, Brand / Launch `34281812398`, Account Identity `34281812399`, UI Shell `34281812425`, Creative Iteration `34281812537`, Integrated Release `34281812664` and Release Candidate Matrix `34281812498`. The matrix's exact-SHA child gate passed and published manifest artifact `10078464050` (`sha256:b1c20572a025e7a43a7a384eaa7d2762afb172d78021719267a0d65fb6d04cc2`). The earlier shared Admin/Generation pre-job cancellation was resolved through event-aware PR scheduling plus same-SHA fixture-window waits; this changes CI orchestration only, not UI-065's product/security semantics. UI-065 remains merge-pending until the documentation-finalized tree receives an ordinary exact-head green set and PR #130 is guarded-merged and verified on merged `main`.
''',
    Path('docs/architecture/INFRASTRUCTURE.md'): r'''

### Phase 22 admission-CI scheduling verification — 2026-09-09
The event-aware singleton-fixture scheduling contract is now verified on exact PR head `287a3e26eda039cb034492cd8dc872e7731fcd01`. `c522cdc57ebbfcb41f542a10da401ec2317a7f71` separated pull-request Admin and Generation Admission concurrency groups, made PR Generation Admission wait for same-SHA Admin success when attached, and made Release Candidate Matrix wait for both attached same-SHA PR fixture workflows before dispatching its still-serialized `workflow_dispatch` child pair. `287a3e26...` corrected the two jq empty-string filters used by those waits. On that head, attached Account/Admin Operations `34281812369` and Generation Admission `34281812604` both completed successfully as real jobs; Release Candidate Matrix `34281812498` passed its wait, dispatch and exact-SHA child-success steps and uploaded manifest artifact `10078464050` (`sha256:b1c20572a025e7a43a7a384eaa7d2762afb172d78021719267a0d65fb6d04cc2`). The earlier one-pending-run cancellation race is therefore closed without suppressing either path trigger or allowing PR and matrix singleton fixture windows to overlap.
''',
}

for path, section in sections.items():
    text = path.read_text()
    marker = section.strip().splitlines()[0]
    if marker in text:
        raise SystemExit(f'{path}: handoff marker already present')
    path.write_text(text.rstrip() + section + '\n')
