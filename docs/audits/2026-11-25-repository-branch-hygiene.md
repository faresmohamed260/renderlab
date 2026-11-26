# Repository branch hygiene — 2026-11-25

**Historical read-only audit; no deletion or closure authority.**

Snapshot UTC: 11/25/2026 8:00:35 PM; exact main: `29498e27d4a3dabc507b7d3c79846bb8d9af2de4`. Main matched at start/end. 418 refs, 761 PRs (all states), 1624 reachable main commits. Earlier 415-ref observation is superseded by this 418-ref snapshot.

Classification is exclusive, in order: an open PR for the ref name takes precedence; otherwise exact tip reachable from main, or exact current tip equals a merged PR head whose merge commit is reachable from main; otherwise closed PR history without that proof; otherwise no PR history. Squashed integration-source closures may be in the third class; closure alone is not proof of ancestry. The no-PR class includes two non-worker refs. No claim that a branch not in main contains disposable work.

| Class | Count | Recommended disposition |
| --- | ---: | --- |
| Merged into main | 306 | Eligible for owner cleanup review after reference/dependency check; retain protected main and named references. |
| Closed PR, not proven merged | 66 | Check provenance, patch identity and unique commits; archive or preserve until owner approves. |
| Open PR | 26 | Keep; never delete while referenced. |
| No PR | 20 | Inspect tip/unique commits and external references; owner decides whether to archive/delete. |

No-PR subdivision: 18 worker/Codex refs, 2 other refs. Merged class includes protected main.

## Explicit keep list

- `codex/p6-04-create-skeleton` — Open PR: retain
- `codex/p6-04-overflow-1440` — Open PR: retain
- `codex/p6-05-library-contract` — Admin/Library contract reference: retain
- `codex/p6-05-library-skeleton` — Open PR: retain
- `codex/p6-06-admin-contract` — Admin/Library contract reference: retain
- `codex/q-733` — Qualification reference: retain
- `codex/q-746` — Qualification reference: retain
- `codex/q-747` — Qualification reference: retain
- `codex/q-759` — Qualification reference: retain
- `codex/q-760` — Qualification reference: retain
- `dependabot/github_actions/actions-updates-0deb65474d` — Open PR: retain
- `dependabot/npm_and_yarn/development-dependencies-9f29494a86` — Open PR: retain
- `dependabot/npm_and_yarn/production-dependencies-4852028f3e` — Open PR: retain
- `dependabot/pip/workers/fibo-studio/pillow-13.0.0` — Open PR: retain
- `dependabot/pip/workers/fibo-studio/worker-test-dependencies-0c511dd1fa` — Open PR: retain
- `docs/p0-03a-cutover-evidence-pending-provider-time` — Open PR: retain
- `main` — Protected main: retain
- `test/qa003-gpu-cancel-evidence` — Open PR: retain
- `w1/registry-shell-shortcuts` — Open PR: retain
- `w2/p6-04-result-pager` — Open PR: retain
- `w2/p6-axe-phone-targets` — Open PR: retain
- `w2/p6-phone-shell-visible-names` — Open PR: retain
- `w3/library-accessible-names` — Open PR: retain
- `w3/p6-04-history-parity` — Open PR: retain
- `w3/p6-primitive-contrast-evidence` — Open PR: retain
- `w3/p6-steps-range-fit` — Open PR: retain
- `w3/settings-avatar-a11y` — Open PR: retain
- `w4/603-dispatcher-tls-canary` — Open PR: retain
- `w4/hygiene-runtime-trust-boundaries` — Open PR: retain
- `w4/landing-a11y-correction` — Open PR: retain
- `w4/landing-slow4g-scenarios` — Open PR: retain
- `w4/multi-output-ddl-proposal` — Open PR: retain
- `w4/round3-axe-sweep` — Open PR: retain
- `w4/slow4g-bundle-attribution` — Open PR: retain

## Open PR dispositions

| PR | Title | Branch | Recommendation |
| --- | --- | --- | --- |
| #465 | Instrument FIBO worker cancellation for QA-003 proof | `test/qa003-gpu-cancel-evidence` | Historical GPU cancellation QA; inspect evidence and supersession; no provider work authorized. |
| #550 | Draft: P0-03a deployed and healthy; exact Vercel alias cutover read-back pending | `docs/p0-03a-cutover-evidence-pending-provider-time` | Historical cutover evidence; reconcile against canonical record, archive/close only with owner approval. |
| #578 | build(deps): bump the production-dependencies group across 1 directory with 11 updates | `dependabot/npm_and_yarn/production-dependencies-4852028f3e` | Production dependency group: red/stale, split and review with owner. |
| #579 | build(deps-dev): bump the development-dependencies group across 1 directory with 6 updates | `dependabot/npm_and_yarn/development-dependencies-9f29494a86` | Dev dependency group: red/stale, split and review with owner. |
| #603 | security: constrain ComfyUI environment, PG TLS identity and Modal origin | `w4/hygiene-runtime-trust-boundaries` | Retain hold; reconcile with current trust-boundary code before owner disposition. |
| #625 | test(security): one-shot Modal dispatcher TLS verify-full canary, read only | `w4/603-dispatcher-tls-canary` | Retain hold; no Modal canary retry without authorization. |
| #646 | build(deps): bump the worker-test-dependencies group in /workers/fibo-studio with 3 updates | `dependabot/pip/workers/fibo-studio/worker-test-dependencies-0c511dd1fa` | Worker test dependencies: separate compatibility review and approval. |
| #647 | build(deps): bump the actions-updates group across 2 directories with 5 updates | `dependabot/github_actions/actions-updates-0deb65474d` | Dependency/workflow changes: separate approval and fresh compatibility qualification. |
| #648 | build(deps): bump pillow from 12.2.0 to 13.0.0 in /workers/fibo-studio | `dependabot/pip/workers/fibo-studio/pillow-13.0.0` | Major Pillow update: separate worker compatibility review and approval. |
| #740 | feat(history): reuse Activity recovery and existing job endpoints | `w3/p6-04-history-parity` | Retain until parity evidence and exact-head CI clear; Activity removal separate. |
| #746 | fix(create): P6 axe phone mode and reference hit targets | `w2/p6-axe-phone-targets` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #748 | test(ui): measure unresolved primitive contrast in rendered states | `w3/p6-primitive-contrast-evidence` | Retain hold; unresolved contrast evidence. |
| #753 | fix(ui): contain native Steps range in narrow grid | `w3/p6-steps-range-fit` | Retain until measured zero Steps overflow across required states, then review closure. |
| #759 | feat(create): P6-04 Create loading skeleton | `codex/p6-04-create-skeleton` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #760 | fix(create): wrap 1440px reference labels inside their tiles | `codex/p6-04-overflow-1440` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #788 | docs(ui): register merged phone navigation and Create shortcuts | `w1/registry-shell-shortcuts` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #789 | test: measure Landing desktop and phone under Slow-4G | `w4/landing-slow4g-scenarios` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #797 | P6 Create fidelity: truthful result index and phone pager | `w2/p6-04-result-pager` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #799 | docs: propose multi-output DDL and transaction proof (not authorized to apply) | `w4/multi-output-ddl-proposal` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #801 | test(performance): attribute cold JS bundles and layout shifts | `w4/slow4g-bundle-attribution` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #802 | test(a11y): extend Round 3 axe coverage for real surfaces | `w4/round3-axe-sweep` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #803 | fix(a11y): correct measured Landing contrast and visible accessible names | `w4/landing-a11y-correction` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #805 | P6-05: mount Library loading skeleton | `codex/p6-05-library-skeleton` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #806 | Fix phone shell visible-label accessible names | `w2/p6-phone-shell-visible-names` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #807 | Fix Settings avatar accessible role | `w3/settings-avatar-a11y` | Retain in active engineering queue; exact-head gates and scoped authorization required. |
| #808 | Fix Library visible-label accessible names | `w3/library-accessible-names` | Retain in active engineering queue; exact-head gates and scoped authorization required. |

## Complete branch inventory

| Branch | Exact tip SHA | Classification | PR history | Disposition |
| --- | --- | --- | --- | --- |
| `audit/fibo-wanda-source-parity-20261119` | `81b884a858df7099efe8b25ad43e22a7722ddbf9` | Closed PR, not proven merged | #428 CLOSED | Review closure/provenance; no automatic removal |
| `codex/fix-menu-focus-flake` | `fcc448f4ec0e4feee51fa3e63c15457ff84c219f` | Closed PR, not proven merged | #774 CLOSED | Review closure/provenance; no automatic removal |
| `codex/p6-05-library-contract` | `e2f2e194c12678c53274677d7ac9f041f539fcb2` | Closed PR, not proven merged | #751 CLOSED | Admin/Library contract reference: retain |
| `codex/p6-05-library-slice1` | `f5577abb77b96fe2799443b61f6805896274538b` | Closed PR, not proven merged | #752 CLOSED | Review closure/provenance; no automatic removal |
| `codex/p6-06-admin-observe-slice1` | `596fb20913153460d6861046c3802ce3b0ff2729` | Closed PR, not proven merged | #750 CLOSED | Review closure/provenance; no automatic removal |
| `codex/perf-quick-wins` | `b01626a6335eb404959844e95c0ef1e97290992c` | Closed PR, not proven merged | #761 CLOSED | Review closure/provenance; no automatic removal |
| `codex/primitives-nontext-contrast` | `df425039cfff06ed8ac5a421cb5edf527315ad33` | Closed PR, not proven merged | #758 CLOSED | Review closure/provenance; no automatic removal |
| `codex/release-readiness-refresh` | `822b95817438b5e2bc3347f2cb1440bdd61aed7a` | Closed PR, not proven merged | #770 CLOSED | Review closure/provenance; no automatic removal |
| `codex/unit-suite-sandbox-triage` | `272ed551038c119e59ec15a43949513bb6f7e4a5` | Closed PR, not proven merged | #771 CLOSED | Review closure/provenance; no automatic removal |
| `dependabot/github_actions/actions/checkout-7.0.1` | `caa9ff95b84228b92b8afa7275eeb60e8c09c5b1` | Closed PR, not proven merged | #409 CLOSED | Review closure/provenance; no automatic removal |
| `docs/fibo-mask-hosted-qualification` | `c0ecfe395c53bb91603a0f1228858683460cbf44` | Closed PR, not proven merged | #459 CLOSED | Review closure/provenance; no automatic removal |
| `docs/governance-hardening-checkpoint-1` | `23690452831f27b83c070c65d583324a4a07a862` | Closed PR, not proven merged | #370 CLOSED | Review closure/provenance; no automatic removal |
| `docs/modal-cutover-retry-checkpoint` | `72418200d780f3bd569d92ca38b7e02a70fa65a2` | Closed PR, not proven merged | #480 CLOSED | Review closure/provenance; no automatic removal |
| `docs/readme-media-pilot-2026-10-04` | `7ef97427fdd6091a266f2839efc47360eb6b8fa4` | Closed PR, not proven merged | #316 CLOSED | Review closure/provenance; no automatic removal |
| `docs/retire-fibo-direct-private` | `9f9ec6001a283af199b8040bc51ddbee629f30b6` | Closed PR, not proven merged | #466 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-batch-cancellation` | `3c337d16c29fc3c5b82e98c68c0ce36027f1b00a` | Closed PR, not proven merged | #436 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-batch-lifecycle` | `af670a422239c10c5cae00270733297b51618163` | Closed PR, not proven merged | #434 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-batch-orchestration` | `015698266dda311bc98a02d0e0e9311910a353f5` | Closed PR, not proven merged | #435 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-durable-batch-domain` | `b3f88dabe8f7820e13d1698fe74c6340a6004933` | Closed PR, not proven merged | #433 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-image-aware-vgl` | `64cf3d3086239430278c49d15580ca4c76a73bed` | Closed PR, not proven merged | #431 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-proven-vgl` | `29279fc56350498c550506e6671f3f99c201b29e` | Closed PR, not proven merged | #430 CLOSED | Review closure/provenance; no automatic removal |
| `feature/fibo-studio-image-vgl` | `04b0271de98259422578efc1c4494466bb78b8d0` | Closed PR, not proven merged | #432 CLOSED | Review closure/provenance; no automatic removal |
| `fix/fibo-mask-production-smoke` | `39655594c61571905a19d1a3ca06eafb5fc47a80` | Closed PR, not proven merged | #460 CLOSED | Review closure/provenance; no automatic removal |
| `fix/production-app-cutover-smoke-verifier` | `de714e63711ff605fb205616c0c6c914530d11b5` | Closed PR, not proven merged | #563 CLOSED | Review closure/provenance; no automatic removal |
| `w2/local-inter-font` | `80643235451e54728f09ee3c0c2c67e719879939` | Closed PR, not proven merged | #734 CLOSED | Review closure/provenance; no automatic removal |
| `w2/mounted-fixture-readiness-audit` | `6cbb6cd3dfe8e6a766b61bce7a20a94bac3ba0b9` | Closed PR, not proven merged | #795 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-03c-phone-sidebar` | `9a5df5e2cf4667327d326b7c9a8765e16f7e8008` | Closed PR, not proven merged | #724 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-03c-route-loading` | `e38304a36bc9dc52516ddf8e2f6ef6977af34172` | Closed PR, not proven merged | #726 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-04-advanced-polish` | `491d7e936df0f3b7319780b126c49232a557fbeb` | Closed PR, not proven merged | #775 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-04-create-contract` | `dbe9892276bec6d74a27869b78c953269dc47c48` | Closed PR, not proven merged | #721 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-04-keyboard-shortcuts` | `a8cd4d18cd4ca6cf879fd88e097c49ae88e73852` | Closed PR, not proven merged | #765 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-04-phone-composer` | `d164f6abf9716da4324cd5790854d80f1f37e1e5` | Closed PR, not proven merged | #736 CLOSED, #741 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-advanced-cold-open-diagnostic` | `d468a9bb4b83fa71cc57477d864231545b84a6c5` | Closed PR, not proven merged | #793 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p6-shell-loading-style-readiness` | `b15fb24006811de305f294658ada8790e098f0cd` | Closed PR, not proven merged | #794 CLOSED | Review closure/provenance; no automatic removal |
| `w2/p602a-create-compositions` | `4f819fbee02fb7700ea803aabd6a8aacb1d3a256` | Closed PR, not proven merged | #706 CLOSED | Review closure/provenance; no automatic removal |
| `w3/admin-full-hydration-reproduction` | `dbacaceb2216e53c17af0093a3144cabba68e9c8` | Closed PR, not proven merged | #585 CLOSED | Review closure/provenance; no automatic removal |
| `w3/deferred-mask-editor` | `fe135e7794500df934225b124fbe671c9971d8b5` | Closed PR, not proven merged | #722 CLOSED | Review closure/provenance; no automatic removal |
| `w3/landing-atmosphere-optimization` | `50973e4cb3028e1d0959c6ae1a379fb427c04d6c` | Closed PR, not proven merged | #723 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p1-02-fibo-provider-port` | `8da3cf8d21d04d247eedf978c2099943c3c4f727` | Closed PR, not proven merged | #626 MERGED | Review closure/provenance; no automatic removal |
| `w3/p1-02-fibo-submit-status-wiring` | `6e915e2fb351eff9518cfc0f39b437f89897b034` | Closed PR, not proven merged | #627 MERGED | Review closure/provenance; no automatic removal |
| `w3/p6-04-failed-reuse` | `70b98201c15c8f5c0083a34b0ddfa7a6b4837afb` | Closed PR, not proven merged | #732 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-04-history-panel` | `2dc4cd1359d046b13f4b5f1df742fc6dbb231a71` | Closed PR, not proven merged | #735 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-04-prompt-history-read` | `d76dff174f8319619d04933b932f7966c66f2709` | Closed PR, not proven merged | #730 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-library-phone-round3` | `0ac168f1db6ee04dd8aef0d568503d09336fb9c6` | Closed PR, not proven merged | #785 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-prompt-history-cursor` | `6066f99111a80ae2c9ac2965e044e9b286ee9482` | Closed PR, not proven merged | #754 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-queued-cancel-authority-note` | `70d6d0632ec56ede1e885112f794175bb1da855f` | Closed PR, not proven merged | #764 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-settings-round3` | `ae10c84d9aef1d74cd5945c50eb15a7f459149ea` | Closed PR, not proven merged | #780 CLOSED | Review closure/provenance; no automatic removal |
| `w3/p6-sheet-focus-isolation` | `0cd133de468aea6cf3b629749570875dbee2ad3d` | Closed PR, not proven merged | #743 CLOSED | Review closure/provenance; no automatic removal |
| `w4/advanced-sheet-stress-control` | `bd962c42754a4fb09f343e6047c8e260b5e727d3` | Closed PR, not proven merged | #766 CLOSED | Review closure/provenance; no automatic removal |
| `w4/contrast-boundary-pixel-truth` | `3f9a1c97a4b42d35a57f48e58c9ecbe348e4a9a7` | Closed PR, not proven merged | #769 CLOSED | Review closure/provenance; no automatic removal |
| `w4/library-manager-on-demand` | `5a1c680408b93b8585a9a4173ad943e355325644` | Closed PR, not proven merged | #804 CLOSED | Review closure/provenance; no automatic removal |
| `w4/multi-output-phase-contract` | `5927ef4d82a648562b38a41d42a7489e7b3d9c03` | Closed PR, not proven merged | #777 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p105-ent007-isolated-restore` | `105493392f67a10720b9d96f7bf57af2eadbea5d` | Closed PR, not proven merged | #617 MERGED | Review closure/provenance; no automatic removal |
| `w4/p6-axe-smoke` | `6656a2496ddacc4145313fc9878967e4644e841e` | Closed PR, not proven merged | #725 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-axe-triage` | `c18ead5db0215282e65742799f9bf7e1ad132ff3` | Closed PR, not proven merged | #728 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-expanded-contrast` | `4bc464a3592ecf3a7cb57bef54aca62855ef0c83` | Closed PR, not proven merged | #756 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-js-transfer-metric` | `44051010328bb190b87a9c6cfa24d706ba05a2fd` | Closed PR, not proven merged | #744 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-landing-measurement-lane` | `635b91042e3045563f887c0c24e7a8458c694010` | Closed PR, not proven merged | #742 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-round3-admin-observe` | `0aeaf4c02558ceb52446bcf7349dc7a6bcc639bb` | Closed PR, not proven merged | #782 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-round3-landing-hero` | `bb508b0f6a24f26420be0ef299a3302555b0d137` | Closed PR, not proven merged | #781 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-signed-out-release-checklist` | `589b5f382fda47d9695a58286f9be485dcd68746` | Closed PR, not proven merged | #755 CLOSED | Review closure/provenance; no automatic removal |
| `w4/p6-slow4g-perf` | `08a6e9f25ac727fbb56f075c57af796f68bd0f94` | Closed PR, not proven merged | #727 CLOSED | Review closure/provenance; no automatic removal |
| `w4/readiness-cold-diagnostic` | `a0506c4eac77712120020f9d75afa1c78dee1c6d` | Closed PR, not proven merged | #800 CLOSED | Review closure/provenance; no automatic removal |
| `w4/round3-admin-truthfulness-doc` | `ab132466cc176320a67bc2f2584884b6c056031f` | Closed PR, not proven merged | #784 CLOSED | Review closure/provenance; no automatic removal |
| `w4/round3-review-captures` | `67bdc1679838dbf2fc22ca07c6167ab8ab1bded5` | Closed PR, not proven merged | #786 CLOSED | Review closure/provenance; no automatic removal |
| `work/minimax-h3-video-model` | `a1e8731a9d2390fadc5783ddf573e3f5f8602e51` | Closed PR, not proven merged | #313 CLOSED | Review closure/provenance; no automatic removal |
| `audit/security-verifier-and-fibo-record` | `161869f9760d5c908d793d6ba4f1aed6bfb74e8f` | Merged into main | #455 MERGED | Exact head of merged PR; merge commit reachable |
| `chore/actions-inventory-cleanup` | `65abc8a75c2a591f926585fb5c1bdb2b9155066b` | Merged into main | #445 MERGED | Exact head of merged PR; merge commit reachable |
| `claude/design-round3-approved` | `ecbf4ce13f86475369f68cc6a405ee94d2ffd625` | Merged into main | #779 MERGED | Exact head of merged PR; merge commit reachable |
| `claude/renderlab-adr005-handoff-zsbdq7` | `c846bbcf2658139def328468088158b07a5eff22` | Merged into main | #512 MERGED, #513 MERGED, #514 MERGED, #515 MERGED, #516 MERGED, #517 MERGED, #518 MERGED, #519 MERGED, #708 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/adr005-dispatch-alert` | `d79486f283fa95029bd443c4634d6065e19eb79f` | Merged into main | #503 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/adr005-dispatch-alert-rollout` | `5ea269cffd1b9e04b282d3d1ec3711a67c067c6e` | Merged into main | #504 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/adr005-modal-usage-alert-evidence` | `83ae9754a2244a1a9f332a8a60c3b0aa01581335` | Merged into main | #507 MERGED | Exact tip reachable from main |
| `codex/adr005-process-exit-correction` | `1c05a88ae38c0679add1190d4567a551bb545c28` | Merged into main | #508 MERGED | Exact tip reachable from main |
| `codex/adr005-process-identification` | `0925150f371bd5c7080d0e2d2d71ab7351c20240` | Merged into main | #509 MERGED | Exact tip reachable from main |
| `codex/adr005-vercel-disabled-evidence` | `f427fa535989612c4876cbd6a0387e119a10e7af` | Merged into main | #510 MERGED | Exact tip reachable from main |
| `codex/adr005-vercel-pause-cause` | `86754b7afd9a79e7e34ba05ce7a6f98962535a7a` | Merged into main | #511 MERGED | Exact tip reachable from main |
| `codex/docs-p6-closure` | `0899204fc4f96f6d38688e5900d2304944a581ea` | Merged into main | #762 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/history-keyset-cursor-note` | `842712fe3599259004693b5b67bce1e30bf76b51` | Merged into main | #773 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/integration-2` | `0d1115be8056aeb9e61c76ebaaee9d0fa841872e` | Merged into main | #757 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/integration-5` | `5fd68e90ee6e7426653762514c00085982f96da7` | Merged into main | #776 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/integration-6` | `c6076bf302ffc1dd4ca61f83aa3b5d1d4588e387` | Merged into main | #778 MERGED | Exact head of merged PR; merge commit reachable |
| `codex/p6-06-admin-contract` | `f1b10c7f79eecbac527b15ce8befef47900ece21` | Merged into main | #749 MERGED | Admin/Library contract reference: retain |
| `codex/p6-06-admin-control-proposal` | `d0f6f099276b026a0a1c28c2f4c0457a6429b1ac` | Merged into main | #772 MERGED | Exact head of merged PR; merge commit reachable |
| `config/generation-gateway-url` | `2a503c5be9e0d895bd83537064dd842a9275eb96` | Merged into main | #467 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/adr005-closure` | `085e7917ca5abb26dda8dc6c3452f1358b6255c2` | Merged into main | #528 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/backend-professional-baseline-p0-contract` | `cd9cb55c7ba3803f56f3d2d8884c43f7723c4e18` | Merged into main | #543 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-a-e28b419-production-record` | `2300bd7cbd7cd87ac5e97a1e22cb6909d717139b` | Merged into main | #634 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-a-smoke-closeout-and-secret-runbook` | `d5dccd959ad9fc3105afe261c25c9c246761ee14` | Merged into main | #635 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-b-production-record` | `ae3ffb5c331803b29bb877ee03ea307930bbc548` | Merged into main | #636 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-b-smoke-closeout` | `c1aef3fafdb1d5f493802d39f7657a13b07fa2d0` | Merged into main | #637 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-c-production-record` | `5a8043a2a36c64411943791628355a714ed41b6e` | Merged into main | #661 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-c-smoke-closeout` | `55e3492580910aba169eb6aaf282a755531f09ff` | Merged into main | #662 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-d-production-record` | `467ca695d3deff10bdc1d59c5941576aadda384d` | Merged into main | #663 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/batch-d-smoke-closeout` | `34efd848d6440cd47ee92567b10b8913b6b70560` | Merged into main | #664 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/c1-late-return-closeout` | `76b128503aa6ca827999f8cc164800a3f19c5a19` | Merged into main | #656 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/c1-production-record-h1-fixture` | `f86de0709c609960310f15875a3779301796323a` | Merged into main | #650 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/create-production-cutover` | `975781f1553b512483cc5d9db654aa383420a841` | Merged into main | #444 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/draft-phase4-backend-p1-contract` | `7a7fc0d9a51c92c787c3815e309cd33f1b29da67` | Merged into main | #595 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-006-closeout` | `31cc88f1e0ee5281dd54738aa024ea157550e144` | Merged into main | #346 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-006-compiler-api-amendment` | `0d3c6e645734aef05564c363dc6f90b9cf56267c` | Merged into main | #343 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-006-parser-amendment` | `420e376f1bd5bd18a31e8a6b4654bfe7e37e0fb1` | Merged into main | #344 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-007-authorization` | `765ac03beb502ea5f6b5249d509b15ea575c4b14` | Merged into main | #350 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-007-closeout` | `3b7981b0065c73c7bb4db9254f0fb948c4ba7136` | Merged into main | #353 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-007-dr-contract` | `ee42545d9f31ce5d7caf9455b030c46ffa3f4834` | Merged into main | #349 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-007-management-export` | `42a5bb1d45729528634e43489d5702ee5f441367` | Merged into main | #351 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-008-closeout` | `8f608b948abbcfb947eeaed6ebec0a4358b52417` | Merged into main | #357 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-008-developer-portability-contract` | `0bd9ac290a4751090ece59c6024a958a32036307` | Merged into main | #355 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-009-coverage-contract` | `39c78e679e753849e44f385e87fbf529f9482cac` | Merged into main | #359 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/ent-010-ci-maintainability-contract` | `d18fa956f98bd125c12cfc89517598d7ce79954f` | Merged into main | #363 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/fibo-create-port-scope` | `c5371eda087b36632e09e2021918945452e6e2cc` | Merged into main | #414 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/generation-gateway-cutover` | `01cced8bd43b1b4ff32286d9b21681528fca017c` | Merged into main | #468 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-architecture-decisions` | `43049325bf12646c6bbbd7471913612f74cf6730` | Merged into main | #391 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-archive-catalog` | `414744605215f0a4ba6abe71674a25c9412f7585` | Merged into main | #389 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-component-source-registry` | `60a05472af35ee700e47bd26df6f9e80dd07323c` | Merged into main | #390 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-external-fact-freshness` | `39aea0ade939b1232a08b78282de1954df51ca1b` | Merged into main | #392 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-hardening-checkpoint-1-clean` | `4a52b51829164da9180659dce631d3236abb0aa6` | Merged into main | #371 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-hardening-checkpoint-2` | `7f0e50ab89035589408bf43b7ad1cbc4ae293dab` | Merged into main | #372 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-hardening-checkpoint-3` | `4140a7632227caf100f000fb2fa28ec6f5ba4434` | Merged into main | #373 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-account-roadmap` | `ac58d7df243e54440b3c356140791274acf687f9` | Merged into main | #383 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-enforcement` | `62ee5d850eebd44d6f259c6ec1a509ca762c933d` | Merged into main | #386 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-infrastructure` | `13b080315297c5d2ecf68fbd8698251d8dd78bf2` | Merged into main | #384 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-product-capabilities` | `a6fd768b186a93d6e941c5af005ebf0d544840b4` | Merged into main | #385 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-public-summary` | `3ef87f29fc75ae9a590c9dcf10094836e84c824f` | Merged into main | #387 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-status-screen-registry` | `84a8802d016273f955b2a70d8eba0416806aea4e` | Merged into main | #382 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/governance-remediation-ui-decisions-1` | `ea46d3d9431874c587103b3e09314e7a3f6d67d0` | Merged into main | #380 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/hosted-source-cutover` | `a8d9b34c60a838004c3f75113303b329c2121d1e` | Merged into main | #458 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/m1-public-boundary-enforcement` | `b7c56afae4d6a1a9b230ee4b453cf72db2e777d6` | Merged into main | #388 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-cutover-cold-start-approval` | `b4a6ca6a3eb22e12eeb6686c59a38d7aa4c15df7` | Merged into main | #482 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-cutover-recovery-20261120` | `c0f994959cdf9c77eb691752cf96e4d1c1c53a9e` | Merged into main | #479 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-db-login-cutover-approval` | `46e657330952bad2bad0a59b5805d98691d7acf3` | Merged into main | #478 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-enterprise-audit` | `28a1acc0c3b34a737f1e687a033c83bd297025c4` | Merged into main | #470 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-qualification-readiness-checkpoint` | `7efe5bb171be2f529f26dd6451f4b516c97330a8` | Merged into main | #489 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/modal-workload-foundation` | `0a20749791cf20cd65b72f02ac0642efee0556d0` | Merged into main | #471 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/p0-02-release-evidence-pending-timestamp` | `386cb66d1ccc5dbc511c84771e18cc567558c25f` | Merged into main | #546 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/p0-03-owner-isolation-threat-model` | `721bf3ffb46cd9e871367c48f095701e5444285b` | Merged into main | #547 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/p0-03a-deployment-url-provider-correction` | `2aa58555298e0d965c9e2e195a6a30e3aa2df519` | Merged into main | #552 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/p0-03a-production-record` | `fd979a5e679397276664451a742308324279235f` | Merged into main | #551 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/p0-unit1-truthful-readme-claims` | `95c636202ee289edab255739c661166dc56de962` | Merged into main | #544 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/phase1-closeout` | `fd8335cbe7af346f52713b3de06e946a270d6352` | Merged into main | #538 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/phase2-oldest-active-job-production-record` | `63ed578bf6774a428cfa4752bc2dfcd43dae7bab` | Merged into main | #540 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/phase2-operational-reliability-closeout` | `4f7b9b74cceec6023debd3b5cea0be273922acdf` | Merged into main | #541 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/phase2-operational-reliability-contract` | `307a6f8505a00280f419c1e2c3b42438fad0d65e` | Merged into main | #537 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/phase3-2026-11-23-post-p1-rescore` | `d17d914bc55b82772e44f16d2ab315c9fcdb5488` | Merged into main | #574 MERGED | Exact tip reachable from main |
| `docs/phase3-atomic-terminalization-design` | `c591da4d3e149df8637378f82e1f895bc9b667ed` | Merged into main | #559 MERGED | Exact tip reachable from main |
| `docs/phase3-backend-architecture-overview` | `266f030f3fedbf1265272c3c2c7fe1141d61929f` | Merged into main | #558 MERGED | Exact tip reachable from main |
| `docs/phase3-batched-runtime-release-plan` | `07998a0409bd85ce499f06bd1ca392e93333826a` | Merged into main | #572 MERGED | Exact tip reachable from main |
| `docs/phase3-observability-metrics-design` | `342abc8f7595ac389e150a8ab53823bcf29f35b9` | Merged into main | #570 MERGED | Exact tip reachable from main |
| `docs/phase3-p0-06-release-backed-gate-audit` | `c52062d92a7558528106ceea6c752ea77206d3c1` | Merged into main | #567 MERGED | Exact tip reachable from main |
| `docs/phase3-p0-final-closeout` | `faf44886ac7eb200dde7aa4e5bc511c4aece4f20` | Merged into main | #593 MERGED | Exact tip reachable from main |
| `docs/prod-p007-atomic-fixture-release-evidence` | `b11eba5e35c3972c8cbbd94146e6f7cdc51f5182` | Merged into main | #589 MERGED | Exact tip reachable from main |
| `docs/prod-p007-atomic-release-2026-11-23` | `e5124fcca740cfe30f7b900feb0b2fa2c988b0b6` | Merged into main | #586 MERGED | Exact tip reachable from main |
| `docs/prod-p007-qualification-timestamp-correction` | `94e1e79a1fdd9f5de3cc83a068d2b8a905979481` | Merged into main | #587 MERGED | Exact tip reachable from main |
| `docs/production-alias-time-e934814` | `87745e269c8762dc6b970da7e9f795da74ce5ddb` | Merged into main | #486 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-api-adapter-batch-release-2026-11-23` | `772126094005643720aa620ed2d331d97b9f87a1` | Merged into main | #581 MERGED | Exact tip reachable from main |
| `docs/production-beta-mask-flags` | `9920a3b975ea2c6adfb2e4522a2b7fbd0c81ac2e` | Merged into main | #533 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-gateway-auth-alert-release` | `b25498d1f3e92922dd543d2f84cfbe894a140623` | Merged into main | #530 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-manifest-v2` | `3a6fff55fcc2f176d3f96a0b485c4d6d1feb335c` | Merged into main | #449 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-masks-enabled` | `994461a6c3445dfdf8adf32e56c8eebb9e9fd9d9` | Merged into main | #461 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-owner-generation-settlement` | `c357347e384634aa1061d1c9453951caf60b5e67` | Merged into main | #535 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-proxy-auth-rollout` | `ff2249cc1da2ebacdc7c4f04ea518b72caaa4d48` | Merged into main | #525 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-record-decd2f6` | `c219eb7601d1ae322df0de868c1ed5b1888ac872` | Merged into main | #523 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-release-standards` | `dad9bd0f3f3b2edd1c4372cb7531bc44a153d951` | Merged into main | #524 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-security-cutover` | `58cc64e9d486e353d0c8006dbe69b0f310a10da6` | Merged into main | #450 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/production-submit-wake-release` | `5d333b348e3fdf858ea6db2a8776d6762f475ea6` | Merged into main | #527 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/qualification-nongpu-checkpoint` | `103253bda4cf4041016159f434abad568867d2ae` | Merged into main | #491 MERGED | Exact tip reachable from main |
| `docs/remove-legacy-brevo-secret-references` | `de4d76c8080f0cb10fd0386eabb20a5ff84809cf` | Merged into main | #532 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/renderlab-cutover-e934814` | `8913dac1323f232b5d32851b32cb4a994af99133` | Merged into main | #485 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/renderlab-portfolio-product-charter` | `2a0442857b2a7e845d58887b380d97300cf464ad` | Merged into main | #542 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/retire-fibo-gateway` | `b0abe8bdac90e002a3ffc0014fe8918432e09785` | Merged into main | #469 MERGED | Exact head of merged PR; merge commit reachable |
| `docs/retire-qualification-setup` | `08fd849b81b307f6687e568a5a4ff83fcf8739a5` | Merged into main | #492 MERGED | Exact tip reachable from main |
| `docs/revoke-legacy-modal-proxy` | `9f017e8a0ed2ac05e9f7cf2d7883a2b8430f30b1` | Merged into main | #531 MERGED | Exact head of merged PR; merge commit reachable |
| `feat/gateway-auth-alert` | `5fccc7b7ba3d29885e743a277c7fb248d848a8ed` | Merged into main | #529 MERGED | Exact head of merged PR; merge commit reachable |
| `feat/modal-worker-471-completion` | `7022e63567fb73fc71cee985651a1c4a3e9a3587` | Merged into main | #487 MERGED | Exact head of merged PR; merge commit reachable |
| `feat/p0-02-runtime-config` | `7524adf214b4de94b6957a75c77a0fb89a14c19e` | Merged into main | #545 MERGED | Exact head of merged PR; merge commit reachable |
| `feat/phase2-oldest-active-job` | `9d1851ef6678e76d2eb8a3cdada25018c29c22ef` | Merged into main | #539 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/fibo-generated-vgl-durable-sidecar-20261118` | `4c837148e6da6f307c8cc17c97338a31c6d9a1b5` | Merged into main | #427 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/fibo-mask-domain-api-20261118` | `7d8a353792a053d57e53b47bec487258d4dba9fd` | Merged into main | #425 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/fibo-native-masked-edit-20261118` | `c1a10a6a53914b3118d1eda40f5bf2f45c440cb7` | Merged into main | #424 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/fibo-public-node-generated-vgl-candidate-20261118` | `8323df84845ca1b6f4aa2b4881b6c0767047d3b6` | Merged into main | #426 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/fibo-workspace-manual-vgl-contract-20261118` | `9f4901524797e4a353a4f2389bb7b6931d3afd5c` | Merged into main | #423 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/modal-durable-dispatch` | `741c035a1d445f6749ec54d7b85b37e1ff13f82a` | Merged into main | #473 MERGED | Exact head of merged PR; merge commit reachable |
| `feature/modal-workload-rc1` | `43932014b5440e74170c13212ebb8aa494f4d481` | Merged into main | #472 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/adr005-process-exit-outcome` | `22d3a6385ba399606e8d81af777514c3ac4d644c` | Merged into main | #522 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/c1-fixture-cleanup-acl` | `e08429d1f7f4f26583eeb1de266575be2fb766e4` | Merged into main | #651 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/create-use-hosted-result` | `a07e8f06ad9d485386d901768846e79297faf413` | Merged into main | #456 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/fibo-dispatch-poll-binding` | `a4c798de4897dc5bfcb3368c5aea5265467029c0` | Merged into main | #483 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/fibo-production-gateway-packaging` | `f793eafdc323f369b5aa591ac58a699d8ae9a1e7` | Merged into main | #453 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/fibo-qualification-secret-readback` | `e7b0b484466aa950c3dbafa02dfcbcbc59574f3c` | Merged into main | #417 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/hosted-fibo-mask-vgl` | `9e5c995448a610313e044a3d0302e712248c7066` | Merged into main | #457 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/minimatch-dev-advisory` | `2432d85f36789af757819bfc36565acd6c083bc7` | Merged into main | #447 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-cutover-bind-e934814` | `feaa2443073916dc583915988ab51de5cbe8abee` | Merged into main | #484 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-db-role-credentials` | `c8f2ef1c416983d3f41f0d98ff9dbe54cd8ad0db` | Merged into main | #477 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-dormant-readiness-packaging` | `7210a2200611261384f6ca027568a7b139e63694` | Merged into main | #488 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-qualification-pair-only` | `c51725e2c62a728040c46beb50c9cdd3e41c2d37` | Merged into main | #475 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-runtime-resource-environment` | `4a88856841b1a2a88341386580a16fcf84405a16` | Merged into main | #481 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/modal-supabase-modern-api-key` | `a63a826a9d844c34059c1c2d96958fdd9ed3e94d` | Merged into main | #474 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/next-security-20261119` | `8fdd99fee19ba57854c6c3106337a7fdcbc16c44` | Merged into main | #446 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/owner-generation-settlement` | `d5aa983754b380e4b3ed3bc5d578f27fd2dfa03e` | Merged into main | #534 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/p0-03a-sanitized-privileged-errors` | `3fb298e4ae09f3720a48e073648b264cb29a73bb` | Merged into main | #549 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/p0-06-status-conditional-job-writes` | `df02f2a604deab0081292929d0a07e7bba810254` | Merged into main | #557 MERGED | Exact tip reachable from main |
| `fix/phase1-truthful-surfaces` | `d161be30051417f6270d9ddfa8fd8888e4b7808e` | Merged into main | #536 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/qa003-fibo-audit` | `d66e3eb1cfa609d3542c61a5bcfcf3d6b69f2ff8` | Merged into main | #462 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/submit-route-wake-after` | `549dfbdfdaf8cf7e0f07edda3d0377dd317a43b8` | Merged into main | #526 MERGED | Exact head of merged PR; merge commit reachable |
| `fix/supabase-modal-role-hardening` | `921de6d7a39569a7910e7b915ee170f9baa103ff` | Merged into main | #490 MERGED | Exact head of merged PR; merge commit reachable |
| `governance/branch-protection-enforcement` | `046cc05d1158c80fad15c04f6bdb907fd30bec2b` | Merged into main | #393 MERGED | Exact head of merged PR; merge commit reachable |
| `governance/cross-repo-modal-ownership` | `329a78e79d5a308feeeb04de461fdd612c1beee3` | Merged into main | #394 MERGED | Exact head of merged PR; merge commit reachable |
| `hardening/ent-006-server-boundaries` | `8b9d87b9ce70f63f5c755a10de19975d7acdc36a` | Merged into main | #342 MERGED | Exact head of merged PR; merge commit reachable |
| `main` | `29498e27d4a3dabc507b7d3c79846bb8d9af2de4` | Merged into main |  | Protected main: retain |
| `maintenance/retire-native-app` | `70d39f848292eb5d978178b73c15facacb3ba4dc` | Merged into main | #501 MERGED | Exact head of merged PR; merge commit reachable |
| `ops/dr-recovery-drill-cadence` | `702fb84051935e8d8743a351088b0b91595ef8aa` | Merged into main | #395 MERGED | Exact head of merged PR; merge commit reachable |
| `ops/github-actions-node24` | `ff8675cdf5c03ddbd9d9c6ad822912d0eea09631` | Merged into main | #396 MERGED | Exact head of merged PR; merge commit reachable |
| `plan/modal-direct-production-cutover` | `480885136f3f972e33dcb025817464401e97acb6` | Merged into main | #476 MERGED | Exact head of merged PR; merge commit reachable |
| `qa/fibo-production-smoke` | `90a080428a2cd5ab86b6b0bbee3084c5c4519fda` | Merged into main | #451 MERGED | Exact head of merged PR; merge commit reachable |
| `refactor/fibo-native-renderer` | `67ab19606bed7ff018525e26832ded8f3d5c06b5` | Merged into main | #454 MERGED | Exact head of merged PR; merge commit reachable |
| `release/phase3-p0-06-production-record-2026-11-23` | `1f588191339119bffac5e2a6b34eb3438a07cb3c` | Merged into main | #565 MERGED | Exact tip reachable from main |
| `test/fibo-reference-journey` | `c3c4e12b9b8a1b29885d5a331ffcf53f2ae22264` | Merged into main | #463 MERGED | Exact head of merged PR; merge commit reachable |
| `test/p0-03a-sentinel-regressions` | `8397faaece64ce94a35d74dc6d109d9beec01612` | Merged into main | #548 MERGED | Exact head of merged PR; merge commit reachable |
| `test/p0-03b-owner-isolation` | `d2166243970f78eedc2ee9967b137e851207d5d4` | Merged into main | #553 MERGED | Exact head of merged PR; merge commit reachable |
| `test/p0-04-generation-state-machine` | `3de217c38c0eec5469197f19bc3c85f17ae073d8` | Merged into main | #554 MERGED | Exact head of merged PR; merge commit reachable |
| `test/p0-05-deterministic-critical-path` | `8a7eba966b327959d94a32eba6b1c31cb476881e` | Merged into main | #555 MERGED | Exact tip reachable from main |
| `test/p0-06-status-cas-witness` | `ba2a50dce2c9ed23394631f23615dbf5fd567ac3` | Merged into main | #556 MERGED | Exact tip reachable from main |
| `test/p007-atomic-smoke-durable-proof` | `b6128b510c3ad329a11c16191deaf794dd126e72` | Merged into main | #588 MERGED | Exact tip reachable from main |
| `test/qa002-library-delete` | `d2e84e014e9e2470a96734d2a7f68881f6228858` | Merged into main | #464 MERGED | Exact head of merged PR; merge commit reachable |
| `verify/renderlab-readiness-e934814` | `e93481466806b3a88f986cd547f11ef62e9543fb` | Merged into main |  | Exact tip reachable from main |
| `w1/batch-e-release-record` | `7788d28717e52dc7fda653da72a49cebab7b06ae` | Merged into main | #690 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/batch-e-smoke-evidence` | `e07da4a92aa1093d1301b26d356c29f46be61c2e` | Merged into main | #691 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/batch-f-production-record` | `b659ac10af94e6fb1691ffb0035e0e65d407010a` | Merged into main | #695 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/batch-f-smoke-evidence` | `e8eed2c2a88167d460b5f07716302345ac0be049` | Merged into main | #696 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/batch-g-hostname-correction` | `72a1508d3ed6d14ef5fd37d5a924d09aeb91ed6c` | Merged into main | #701 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/batch-g-production-record` | `0c2571e58ac1163f6cc1fc8507ce1406733b87bf` | Merged into main | #700 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/frontend-qa-pass-2026-11-24` | `794b072f0aec0eb6c0afb4465c2d4c707c85c9e6` | Merged into main | #668 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/frontend-qa-targets-zoom-2026-11-24` | `cd081272fbf03ffa3e2791c74158543ed769eb10` | Merged into main | #684 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-10-landing-admin` | `3863c989bf1242890dd43e18312afeaee8ef6858` | Merged into main | #792 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-11-shell-readiness` | `72a0e0edd492a512cb7c1fdbcbd6c81ecfcdb7ef` | Merged into main | #796 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-12-round3-settings-library` | `c3091cc05d3bc78b15bc6e43c88830a3dfc5a228` | Merged into main | #798 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-7-docs-triage` | `182b048f4941acf5f1255ff44b866b66586c0c8b` | Merged into main | #783 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-721-728-729` | `249d5fc1e34376f9a2fffb00da45724211a35043` | Merged into main | #737 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-722-730-732-735` | `6478bf51ea64cda38126af2d9ba895ce322d5af4` | Merged into main | #745 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-725-727` | `d623e94d8b85f7a7498bd83734dd92c55a5f36a2` | Merged into main | #738 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-8-shell-shortcuts` | `c207ff2e8171d4acc5a243a42371864ff0990eee` | Merged into main | #787 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/integration-9-proposal-truthfulness` | `a9c1f74c0905367fda4e7d863fe3f87c50698d81` | Merged into main | #790 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/p6-integration-3` | `da4d3a58d0ad6f4a8947b2078d97378534713e32` | Merged into main | #763 MERGED | Exact head of merged PR; merge commit reachable |
| `w1/p6-integration-4` | `1ed8da3ac2fd7db5dc00782f85476a5f822df895` | Merged into main | #768 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/api-contract-corpus` | `5b14ae765e5516760b21b5587b46fdd07e209ff5` | Merged into main | #562 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/atomic-terminalize-app-switch` | `4c644254264551298d48fa6eb2a591213f3ff5c1` | Merged into main | #580 MERGED | Exact tip reachable from main |
| `w2/atomic-terminalize-migration` | `f318ace134330506bd12f17567b8a5040287fdb3` | Merged into main | #576 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/ci-p5-audit-only-trigger-savings` | `7827d003307651881fc8867864b72055545410ee` | Merged into main | #616 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/ci-workflow-cost-audit-2026-11-23` | `12da167c5e3a547aed0f64774337ee3713f7217d` | Merged into main | #594 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/disposable-database-conformance` | `740b25bd99b57f277cfbaf8482d6e9b8224302f2` | Merged into main | #568 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/external-review-disposition-refresh` | `8bafc363922a8872deaa294bffc7570129550cea` | Merged into main | #620 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/external-review-finding-dispositions` | `e83b712acef936f9cc977c6c5b253531e741a492` | Merged into main | #614 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/f7-runtime-trust-boundaries` | `c30f15afd94bc1231c58e62f32ce426c3739f927` | Merged into main | #669 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/f8-route-gate-result` | `7dab386d0ff6f70d6d0f4758aba2d71e2e887413` | Merged into main | #672 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/generation-api-contract` | `7621b2142cadcd86129f6d11c0f7b3a105dad19d` | Merged into main | #564 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/migration-0031-production-runbook` | `08ae8fa6d54f77c3424673c2a5b53be2ca9c7c51` | Merged into main | #582 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/offline-backend-demo` | `c1b0a73be36bba4978bd73c29d71260be4dc19ec` | Merged into main | #560 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p1-03-minimal-observability` | `9f3372812d5ca1b78ef4cf2528728c380c21265b` | Merged into main | #629 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p1-04-ci-quickpath-build` | `5a08408324980e273294b7133315a81237b85458` | Merged into main | #631 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p504-docs-drift` | `0789e7aad70cad514606a5a86e27f0436b0f82cc` | Merged into main | #688 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-03-contract` | `4071a8f6ba7022725c78beaebbf2435aa9ca1c08` | Merged into main | #711 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-03c-desktop-shell` | `407e4f5b3f6982f4c515a8e1d5feb27e7c1451a2` | Merged into main | #716 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-04-advanced-teardown` | `5254f7bb9f2f62ecbf06ba757233ecfc24857577` | Merged into main | #767 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-04-create-desktop-columns` | `ffa8fd26d59eeb3b279eec410692e9f775025be8` | Merged into main | #733 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-approved-design-language` | `269085b64fb591f61f5ef64dd565c08892afba6b` | Merged into main | #709 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p6-axe-shell-evidence` | `a07d9c23490e201b8db8ffd7818b7129697a2a80` | Merged into main | #747 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p601-design-language-v2` | `ab8768b3edf8fb7f335845d672db6b44ef11ed5b` | Merged into main | #687 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p601-ui-consistency-audit` | `7f485f0ce004ee4562840d4aa3bdf1a27e4b2cb5` | Merged into main | #686 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p602a-create-prototype-contract` | `a5c49763aea2d2d12105e9371a1683505624311e` | Merged into main | #692 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p602a-foundation` | `4186370068d9be649be5fc9347cffe07d9b38682` | Merged into main | #697 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/p602a-primitives` | `b09baf76059871185c5515ab44d6f2991298e94e` | Merged into main | #703 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/phase4-closeout` | `2f927cdd69a7cfef3c9135e80ab21c553cd39264` | Merged into main | #665 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/phase5-frontend-polish-contract` | `09038cca6a6c48dba81eaeb6310b83bf9805c633` | Merged into main | #677 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r10-confirmed-invitation-claim` | `bd0f09b016b2d97cc9803d7d0c2a9d2b0c7eda04` | Merged into main | #599 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r11-nonce-csp-design` | `977efb88846706555655cdc2d3eda37978be0852` | Merged into main | #601 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r12-active-account-writes` | `9be31009436c6ffd8c1ef2d132801a9273f141fc` | Merged into main | #608 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r12-internal-bearer` | `029110ab1d7698ace3e409e1e059661d37d62cf1` | Merged into main | #605 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r12-signed-media-redirects` | `d36ad0cba51e9b1f1b33496f81911e15b92ce4f6` | Merged into main | #606 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r13-doc-contract-corrections` | `0ea1844602d4a726f093e60993955893c9004557` | Merged into main | #612 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r13-p003-generation-access-truth` | `0e50167e7c0bb47eb5aab67a7fc9f2ac227a3a88` | Merged into main | #618 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r4-enforce-member-generation-auth` | `81789cf56c3ec47647b23e17b1684584089f73fe` | Merged into main | #604 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/r5-secure-integration-triggers` | `8ec4bfb4d4f3a89a3d11eeb7570c18a9b9557afc` | Merged into main | #598 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/review2-docs-retired-upscale` | `3dc53058091e6bc81a931141f0ead4e64986e4b4` | Merged into main | #645 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/review2-f1-f2-auth` | `e19abd26e057fe10b9dc7fd2e60f7e77798875f3` | Merged into main | #641 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/review2-f5-n4-n5-env` | `8f58a1aea8673528b2307133098c720b84b701c0` | Merged into main | #642 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/review2-n3-secret-workflows` | `d586be4ecbd7024dd88dd82c80235a201321dd07` | Merged into main | #644 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/review2-n6-n9-worker-ci` | `92f6bde726bfa3fe97c717f21d2078770ff9da70` | Merged into main | #643 MERGED | Exact head of merged PR; merge commit reachable |
| `w2/third-review-contract-corrections` | `abb55f6bcd0e67106d162dff6a77c62c54181ca6` | Merged into main | #674 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/activity-removal-impact-2026-11-25` | `e5b72d3c5f3c17d89db8ac26b9eecc313a256c86` | Merged into main | #712 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/admin-utc-hydration-fix` | `ea05c8a05783d857d84be788fb9180fdda8071a1` | Merged into main | #584 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/engineering-practices-front-door` | `5d9078be9ee82791f9fe4fe5af861931fe7dd56d` | Merged into main | #577 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/f3-persisting-hard-ceiling` | `c45079dca07c0489b32ce7e9092e794ae1b29bc8` | Merged into main | #676 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/f4-final-observation-request-budgets` | `b4547e71c3c4195a4954a6038a7451ec18526181` | Merged into main | #678 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/f4-reject-non-fibo-idempotency-key` | `f03911d90aa0364d4f7c5b9f2a58614596c5e3e5` | Merged into main | #639 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/f5-cancelling-reread-guard` | `2c6db0caafa2512a163766f896e23537719000f2` | Merged into main | #679 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/f6-deterministic-submission-errors` | `6723ecfd500a1ebc4232b0b2b47f3ee5fabb3921` | Merged into main | #680 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/fe01-production-create-continuation` | `db9621d3b5a4a549938c5ea531d7e1c6d4db2693` | Merged into main | #671 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/fibo-bounded-lifecycle-r2-r3` | `e71452447e00f92160d67074bba27d29caf4c811` | Merged into main | #613 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/fibo-input-rejection-r9` | `3c9ebbf7c50aec3fb09daef852d976a3ec27fa70` | Merged into main | #609 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/fibo-modal-terminal-exception-r1` | `c7e99719391618f1ee8601a3358e6302dc102dcd` | Merged into main | #602 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/fibo-unconfirmed-worker-errors-r7` | `72ecb9de745c881990a88c17e4242b4cfe8e8d09` | Merged into main | #610 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/frontend-code-audit-2026-11-24` | `dffc10f5ef78510d00494871321d058c3277cdf6` | Merged into main | #667 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/h1-expired-fibo-observe-first` | `6779f4f5bd68db410194ae4aefdb8319f03ac243` | Merged into main | #649 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n1-fibo-remote-render-timeout` | `d1a3867e521866bf93daedaee92ceee9128978cc` | Merged into main | #638 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n3-0036-terminal-outbox-asset-guard` | `9bd10d95dc51a7a9e7266759419ea8bb6b5fb153` | Merged into main | #654 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n4-bound-fibo-admission-deadline` | `2c81f4ab9d19c0c22f0b9999da7ef0752f7ad199` | Merged into main | #655 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n5-keyed-active-limit-settlement` | `26340ea4eab4a0c42bc5091dc103beb848adf5dc` | Merged into main | #657 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n6-atomic-default-key` | `fd93e50585631e7ead24644a421eca0071fd1c38` | Merged into main | #658 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/n7-lookup-before-inputs` | `4db492051967fbc1ea715ac15e9cc31aefc92d04` | Merged into main | #659 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-db-store-extraction` | `d2062c76da208d51ad5b75e09aafc8c5098bb9ac` | Merged into main | #622 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-job-store-characterization` | `de9ba9b4356846fa6813b2549df9ddb80ab3f8c0` | Merged into main | #591 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-job-store-extraction` | `86d19268d95670ed3860324c5971264152f0fdc8` | Merged into main | #592 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-legacy-workflows-extraction` | `82b968b5e19621deda7a4a3f9242b74457c5f8b1` | Merged into main | #597 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-lifecycle-orchestration-extraction` | `27c294aacfab0792d216d2427bdb649bd3b1a16d` | Merged into main | #624 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-lifecycle-split-design` | `603588b0dc93be4f6b1fb48f3bcf287fa447af24` | Merged into main | #590 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-output-persistence-extraction` | `d7ab0891a557beb5b7468a627246ffcf0149f7d6` | Merged into main | #623 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-worker-inputs-extraction` | `4e9d64e15a6a7719d43049829b7616a41eb04814` | Merged into main | #596 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/native-worker-transport-extraction` | `affb14edcba28c1a01b4abd12bb4f861848600eb` | Merged into main | #621 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p1-02-fibo-cancel-wiring` | `8e75bd3ddb10233f3c7f023d64f15c1c2fa89788` | Merged into main | #630 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p1-07-sanitized-independent-review-pack` | `2825cbd19d805746a428e65d0b0632ca11027a8d` | Merged into main | #632 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p501-create-capability-truth` | `0000e67565251a5a4577c654de86e655d565ca22` | Merged into main | #681 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p501-create-toolbar-popovers` | `f2b54e9859adde8a55c61cec61e4bc755bfcc6e8` | Merged into main | #683 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p502-create-extreme-reflow-targets` | `d35f7732d16611885b5320d13ec414e874289c1f` | Merged into main | #685 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p502-create-narrow-overflow` | `009804c1a0503eba9d8b76ae82f09345321ff6b0` | Merged into main | #694 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p502-keyboard-mask` | `58dc65ade0b1587af8a2ce5cfa43c7e28a066acc` | Merged into main | #693 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p506-shell-authority-proposal` | `2e900839f0bb53d327dbc5ae5181f31f206b075f` | Merged into main | #699 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p6-03a-semantic-foundation` | `58f14ae10a5b2e848d3017adee9f2dca8d32d192` | Merged into main | #714 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p6-03ab-docs-closure` | `17ea929bd473e3b786e1ffb7bd25c26bf5513b5c` | Merged into main | #720 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p6-03b-glass-primitives` | `489f1e0df135b3dd6a558838df81d9e8437ea5d9` | Merged into main | #717 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/p6-create-overflow-acceptance` | `1defe8af0505c086cf200f0ed489d38aa1339103` | Merged into main | #702 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/perceived-performance-audit` | `d8ab9f67f0ea1a64b83437db02c5848164b384e9` | Merged into main | #707 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/provider-adapter-boundary-design` | `7fcc5531ab12c6dd3046368008bcdba550d93835` | Merged into main | #566 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/provider-adapter-conformance` | `c5d63fbcc18679ceb08657748f659dccb0b84df8` | Merged into main | #569 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/reconciliation-fairness-sql` | `ab1563636e9ed2443c4d40de3dad8f16d1cdbcb7` | Merged into main | #619 MERGED | Exact head of merged PR; merge commit reachable |
| `w3/repository-contribution-hygiene` | `0c20baabbc4459262e070df870710a1552b258e3` | Merged into main | #573 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/f1-absent-dispatch-retry` | `9b9ee5a35f730f24581f8a01d84e7ad349ed8299` | Merged into main | #670 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/f2-attach-only-claim-0037` | `a849dde7f5ebd05f891decee92ca05ac0097dafa` | Merged into main | #673 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/f9-successful-tick-heartbeat` | `303e5cc2339ace979f8edcdd12d4ded45a8c08ff` | Merged into main | #675 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/fix-production-modal-origin` | `9357b56196d17fb20a0721996b9fa3eb6be3bf75` | Merged into main | #660 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/frontend-test-strategy` | `0445e62509ee905cb5a0b277930810023a57b753` | Merged into main | #666 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/hygiene-comfy-origin-only` | `5aefab026529e243c3b76cf560b74ddc2f236789` | Merged into main | #652 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/multi-output-proposal-2026-11-25` | `752e14b2759caeee88f8a601cdea01e8b368f2ed` | Merged into main | #710 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/n2-dispatch-isolation-delivery-cap` | `114e5064b85e281c4082a070e6bb247d2e193e6a` | Merged into main | #640 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p105-disposable-skew-and-restore` | `702387bb763c3d4a413842659ed755d8735081fb` | Merged into main | #615 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p505-library-dialog-characterization` | `d8cefb004cb77cac9ee7bc47822563879604d114` | Merged into main | #689 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p505-mounted-create-characterization` | `9ccc9006eb925579170048c662061daad0e4b1f7` | Merged into main | #682 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-activity-characterization` | `51ff8f443958977d07b4e1d77e1d08bdeb34eed0` | Merged into main | #729 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-axe-dependency-review` | `8934b93768bafbcf6520831007acdc4b2972ffbe` | Merged into main | #719 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-composited-contrast` | `38fa4106b5fcd71894e3203d0c15b1a7162fff19` | Merged into main | #718 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-real-component-review` | `66f387b7a2115d55b6e5da0c7a56cccc58b2bf0f` | Merged into main | #715 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-review-fidelity` | `e3f2e3c2f980fbadcfec1ace15406b3d369d2497` | Merged into main | #731 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/p6-signed-out-http` | `f9f98c5ab80ddcc1ea9d5863e32fb3e5448dc4a9` | Merged into main | #739 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/phase6-validation-lane` | `fa010696260fa88aa022a99924ec5ef282599123` | Merged into main | #713 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/pre-record-smoke-gate-implementation` | `b1c28341baf7fffbe4ce192dd661b57565fd9deb` | Merged into main | #704 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/pre-record-smoke-gate-proposal` | `7a19704cd4117df68816197113a80565dc5592b5` | Merged into main | #698 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/r6-retire-unsafe-upscale-worker` | `a7169567b5c192edc711792eeab49f3c70993166` | Merged into main | #607 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/r8-ambiguous-submit-idempotency-design` | `1556093d51e899e0f0add302fba58f5fb020f6ef` | Merged into main | #611 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/r8-idempotency-app-pr-b` | `e5e0188e286a77fd030aa6ee82101e36062a1825` | Merged into main | #633 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/r8-idempotent-sql-pr-a` | `e39a783040c1aa1be8c241be8ee37d1e2c6c68c3` | Merged into main | #628 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/r9-dispatch-preflight-permanent` | `6787e936c176395e4a62cb0ebc8819ae83c621ce` | Merged into main | #600 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/release-runbook-operator-clarifications` | `fb4971114e80b125e75246cec836545f0d1345f2` | Merged into main | #705 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/risk-boundary-batch-c` | `b5543cc2eec014ff98ab568049b46ffd0f490fb4` | Merged into main | #583 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/risk-boundary-tests` | `c280e93f5082970adfcea469c7790b6fdbceff90` | Merged into main | #571 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/stable-placeholder-pixels` | `c9aa44dc87d590857287f908aee72b0a74e01079` | Merged into main | #791 MERGED | Exact head of merged PR; merge commit reachable |
| `w4/tls-supabase-ca` | `e4a0e58c8c106da710bd5a118257f886c8a2e521` | Merged into main | #653 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-007-recovery-implementation` | `b6decaa6d895e616436861446cd8bfaaaef7e846` | Merged into main | #352 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-008-developer-portability` | `82bcf35d7d5ce3f5d3b8309f12457fae9a582d15` | Merged into main | #356 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-009-closure` | `1154385d84d9c1f95ea86e1df812ba159743c535` | Merged into main | #361 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-009-coverage-visibility` | `657522dfcd9dfcbdc92d710ec082a62d9fca040e` | Merged into main | #360 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-010-ci-maintainability` | `cfbffdb3725f2dd1d862e1a12bccda13d7124b4c` | Merged into main | #364 MERGED | Exact head of merged PR; merge commit reachable |
| `work/ent-010-closure` | `05dd7235d6fa3eba0099d1034d76dff558254c50` | Merged into main | #365 MERGED | Exact head of merged PR; merge commit reachable |
| `work/fibo-production-workspace-contract-20261118` | `8a13507615225bf7c785600089f0b42b2187b58a` | Merged into main | #422 MERGED | Exact head of merged PR; merge commit reachable |
| `automation/ent006-lifecycle-dispatch` | `b287c1c5b369be229d6fd7d92588e0fc70025b97` | No PR |  | No PR; inspect unique work/refs before any removal |
| `codex/create-comp-fidelity-audit` | `0192d91047ea2d2e629b91fca1d845e3c212bfa1` | No PR |  | No PR; inspect unique work/refs before any removal |
| `codex/q-733` | `8c58b996c2b5ae0d8030d00f086e9db5b4e56f45` | No PR |  | Qualification reference: retain |
| `codex/q-746` | `7ddc5d74070197a23f4e0f6f84a278ef57182132` | No PR |  | Qualification reference: retain |
| `codex/q-747` | `3653c7363d50e3861261d8c9175545726cafcb53` | No PR |  | Qualification reference: retain |
| `codex/q-759` | `fbf4ce2247a807a36b665b63587d5b65d162118f` | No PR |  | Qualification reference: retain |
| `codex/q-760` | `4ba26142ecb0490bf233dcbf038f54ad5a307c61` | No PR |  | Qualification reference: retain |
| `w2/p6-04-advanced-teardown-candidate` | `15ad44af3b60bc0e4d941f414a3487a7965c744e` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w3/create-scrollbar-diagnostic` | `e0cb39de2c1eaa232d4b2b9670a109dcf9fa0225` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w3/p6-history-create-mount` | `203e38006c5dec721750e3672ad3df804bd95bb9` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w3/p6-history-mount-c815ae78` | `9b7a695896e852e09a287aeda1c95a7d4fd4bfc4` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w3/p6-settings-replay-9853df33` | `ae10c84d9aef1d74cd5945c50eb15a7f459149ea` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w3/p6-settings-round3-replay-b5326a4d` | `66a04cee89a081eaf70ff2e2205b544ab7b3ac75` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/landing-header-replay-9812f8e9` | `42a785cae065cc6b2eb4161792bc4256d9b4adf0` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/landing-selected-interaction` | `59e0fa0923e62b790abfbc2a7b74fc336fb384dd` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/multi-output-phase-contract-replay-fc758ce3` | `5927ef4d82a648562b38a41d42a7489e7b3d9c03` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/p6-round3-landing-before` | `d3558ccd64a8d960476f708cc20ce7c0520e6129` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/production-route-graph-diagnostic` | `3cb65e9c4d8a0e6c5cdabef8babd6fd5bf53dce4` | No PR |  | No PR; inspect unique work/refs before any removal |
| `w4/r8-idempotency-pr-b` | `be60f8a25d8865a55880b9af508b53a8e060cf1c` | No PR |  | No PR; inspect unique work/refs before any removal |
| `work/ent-007-free-recovery` | `563568fa07aa2a69fffc78545b067715cfdd2c87` | No PR |  | No PR; inspect unique work/refs before any removal |
| `codex/p6-04-create-skeleton` | `aefd12068965d555825aef939cbd25b94ce11e8f` | Open PR | #759 OPEN | Open PR: retain |
| `codex/p6-04-overflow-1440` | `73d4ca18e4625fcf67529c1cdbdee7f867c5fb5e` | Open PR | #760 OPEN | Open PR: retain |
| `codex/p6-05-library-skeleton` | `87adf3e81e564a5e6ba7c81f360e73d1955498c3` | Open PR | #805 OPEN | Open PR: retain |
| `dependabot/github_actions/actions-updates-0deb65474d` | `808fcc22e3c1f10bbfee716369ceb442415d91fe` | Open PR | #647 OPEN | Open PR: retain |
| `dependabot/npm_and_yarn/development-dependencies-9f29494a86` | `11a2de2f38a9a137ef62ae919b06b42717c283f8` | Open PR | #579 OPEN | Open PR: retain |
| `dependabot/npm_and_yarn/production-dependencies-4852028f3e` | `c5c2a8df7d58e8493080bf5b9171498ad0aac6f8` | Open PR | #578 OPEN | Open PR: retain |
| `dependabot/pip/workers/fibo-studio/pillow-13.0.0` | `bcd4a9bf899ec72db101f971651b94a256d64ae6` | Open PR | #648 OPEN | Open PR: retain |
| `dependabot/pip/workers/fibo-studio/worker-test-dependencies-0c511dd1fa` | `3a18de3d0964bad1ae49fe6219c2bea35cb39830` | Open PR | #646 OPEN | Open PR: retain |
| `docs/p0-03a-cutover-evidence-pending-provider-time` | `db9ddb4bfc8c0f38e79a498f0dce497b80d53375` | Open PR | #550 OPEN | Open PR: retain |
| `test/qa003-gpu-cancel-evidence` | `59254f42a412ef35355a13ede648adb01cfaf66b` | Open PR | #465 OPEN | Open PR: retain |
| `w1/registry-shell-shortcuts` | `cf261714f2a7111f61088910508762f6315b5786` | Open PR | #788 OPEN | Open PR: retain |
| `w2/p6-04-result-pager` | `4f111b67d588cc9baa979e91cfb4923c80cd9133` | Open PR | #797 OPEN | Open PR: retain |
| `w2/p6-axe-phone-targets` | `3633105daa9f59c6e3a1bde45ea405b9eec83627` | Open PR | #746 OPEN | Open PR: retain |
| `w2/p6-phone-shell-visible-names` | `0d035d8298990cf0294db59c07a0d7f3870df1dc` | Open PR | #806 OPEN | Open PR: retain |
| `w3/library-accessible-names` | `e8d32b0834b9ea0ac66778f15d86c04c53055cd1` | Open PR | #808 OPEN | Open PR: retain |
| `w3/p6-04-history-parity` | `6b27d76c09204e3654085f37b99432092c2e0862` | Open PR | #740 OPEN | Open PR: retain |
| `w3/p6-primitive-contrast-evidence` | `33a5b3db56b824b69df8de8f51df5f490434ddb9` | Open PR | #748 OPEN | Open PR: retain |
| `w3/p6-steps-range-fit` | `d47ddf441489c9cedb832e91ab2e49c980f42baa` | Open PR | #753 OPEN | Open PR: retain |
| `w3/settings-avatar-a11y` | `493294a0586b42c0d00616f92588004958cc0685` | Open PR | #807 OPEN | Open PR: retain |
| `w4/603-dispatcher-tls-canary` | `7335a83b5c8ebe76a096cc34e5f40e75b4b70e75` | Open PR | #625 OPEN | Open PR: retain |
| `w4/hygiene-runtime-trust-boundaries` | `da781a0345c4683a7e1ab4c5f1fd147b0e54bd3c` | Open PR | #603 OPEN | Open PR: retain |
| `w4/landing-a11y-correction` | `9d7f17b5fae0072c0a0edca3e486720a969d5fb5` | Open PR | #803 OPEN | Open PR: retain |
| `w4/landing-slow4g-scenarios` | `533b433d540bdf26480474b8a19c1461476edd8e` | Open PR | #789 OPEN | Open PR: retain |
| `w4/multi-output-ddl-proposal` | `3de5b61977c6ff4d9e8382b71b43d78265bde7e1` | Open PR | #799 OPEN | Open PR: retain |
| `w4/round3-axe-sweep` | `131bb3a0658d00f4cf6bf2d05367c30e2e5a3687` | Open PR | #802 OPEN | Open PR: retain |
| `w4/slow4g-bundle-attribution` | `04cdad4ad0393c5ca337359343dafd26472e6962` | Open PR | #801 OPEN | Open PR: retain |

No branch deletion, PR closure, release, settings change or provider action was performed for this audit. Re-read refs and protection, check downstream references and obtain owner approval before any cleanup.
