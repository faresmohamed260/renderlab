from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one target, found {count}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "**Status: `IN PROGRESS — PHASE 18 IMAGE UPSCALE CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**",
    "**Status: `IN PROGRESS — PHASE 18A PREDEPLOY PREPARATION VERIFIED / WORKER DEPLOYMENT + LIVE PROOF PENDING`.**",
)

replace_once(
    "PROJECT.md",
    "- **Phase 18 — Image Upscale v0.1: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.** Fresh read-only deployed-worker audit `33995223659` / artifact `9977854297` (`sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`) selected one coherent next capability: fixed 2× durable-image Upscale. Restore, Inpainting/Outpainting, LoRA/model adapters and Director remain deferred. The audit also found registered FLUX and REDGraft primary workspaces disabled while their standbys remain healthy; fleet-registry reconciliation plus a real async upscale worker contract are Phase 18 prerequisites before product exposure.",
    "- **Phase 18 — Image Upscale v0.1: `IMPLEMENTATION IN PROGRESS — 18A PREDEPLOY PREPARATION VERIFIED / UNDEPLOYED`.** Fresh read-only deployed-worker audit `33995223659` / artifact `9977854297` (`sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`) selected fixed 2× durable-image Upscale. Repository preparation now excludes the verified-disabled FLUX/REDGraft primaries from new routing while preserving historical lookup, pins an undeployed RenderLab-owned SwinIR 2× worker candidate, and adds a permanent offline worker-contract gate. 18A is not complete: no new worker has been deployed, live geometry/alpha behavior has not been proved, and no Upscale product/schema/UI coupling has started. Restore, Inpainting/Outpainting, LoRA/model adapters and Director remain deferred.",
)

replace_once(
    "PROJECT.md",
    "Phase 17 is fully closed on repository `main` through implementation merge `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd` and post-merge handoff `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e`. The next execution boundary is the accepted Phase 18 Image Upscale v0.1 contract below. Implementation has not started. Begin with the Phase 18A fleet/worker prerequisite only; do not expose an Upscale product action until the worker contract is live-verified and the known disabled-primary registry drift is reconciled. Contract acceptance does not authorize a production application deployment, a worker deployment, scheduler activation or any deferred Phase 18 capability.",
    "Phase 17 is fully closed on repository `main` through implementation merge `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd` and post-merge handoff `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e`. Phase 18A is now in progress on `work/phase-18-image-upscale`: dead-primary routing has been made truthful for new submissions, the exact SwinIR 2× runtime candidate is pinned, and the undeployed RenderLab worker source/offline validation gate are prepared. Stop at the deployment boundary unless explicit authorization is present. 18A remains incomplete until a real worker is deployed and live geometry/alpha plus lifecycle behavior pass; no Upscale product/schema/UI action may be exposed before that evidence. Production application deployment, scheduler activation and deferred Phase 18 capabilities remain unauthorized.",
)

project_anchor = "A worker deployment is an infrastructure operation and is **not authorized merely by merging this contract**. If the implementation session lacks explicit deployment authorization, it may build/test the adapter against a local deterministic worker double but cannot mark 18A or Phase 18 complete.\n\n### 18B — Product/domain and schema contract"
project_block = """A worker deployment is an infrastructure operation and is **not authorized merely by merging this contract**. If the implementation session lacks explicit deployment authorization, it may build/test the adapter against a local deterministic worker double but cannot mark 18A or Phase 18 complete.

#### 18A predeployment preparation — `VERIFIED / UNDEPLOYED`
Repository preparation is verified on the Phase 18 work branch before any Modal deployment:
- `src/server/generation/worker-fleet.ts` now keeps `flux-primary-01` and `ltx-primary-01` resolvable for historical job metadata but marks them disabled for new routing; healthy standbys are the only new-submission routes for those ecosystems. Focused `worker-fleet` unit coverage is included.
- Runtime research rejected Real-ESRGAN x2plus as the production candidate because upstream pretrained-weight commercial licensing remains unresolved. The current predeployment candidate is official SwinIR native 2×: repository/tag `JingyunLiang/SwinIR` `v0.0`, source commit `33f616625268d08ba600f8db89388eec0328edb1`, project license Apache-2.0, release asset `001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth`, exact size `67,277,475` bytes and independently measured `sha256:2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac`.
- Read-only/runtime audit `33997212864` passed Engineering Quality and exact official-asset size/hash verification. Artifact `9978418889` has GitHub digest `sha256:5d6d7ace3384a260bf2e9f59dacea85dfa3fa4e6026af46a825eaca74208dc53`.
- `workers/image-upscale/modal_app.py` defines the undeployed RenderLab-owned fixed-2× async contract with a lightweight gateway image separated from the CUDA/model image, exact source/weight pinning, PNG output, source/output geometry guards, rectangular tiled inference, alpha preservation path and typed worker failures/cancellation.
- Permanent `Upscale Worker Validation` run `33997784521` passed source syntax, pinned constants, route/cancellation contract, geometry limits and the rectangular-tiling regression check without Modal credentials or provider spend.

This evidence **does not complete 18A**. No new Modal worker/gateway has been deployed, no live `/health` or `/jobs/upscale` endpoint exists, and the required live synthetic RGB/alpha exact-2× lifecycle proof has not run. No `upscale-image` schema/product/API/UI coupling has started. The next hard gate is explicit worker-deployment authorization followed by live contract proof.

### 18B — Product/domain and schema contract"""
replace_once("PROJECT.md", project_anchor, project_block)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current phase:** Phase 18 — Image Upscale v0.1 is `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-058 from repository baseline `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e`. Phase 17 remains `COMPLETE / VERIFIED / MERGED` and is fully closed.",
    "**Current phase:** Phase 18A — Image Upscale worker prerequisite is `PREDEPLOY PREPARATION VERIFIED / WORKER DEPLOYMENT + LIVE PROOF PENDING` under UI-058. Phase 17 remains `COMPLETE / VERIFIED / MERGED` and fully closed; no Upscale product/schema/UI coupling has started.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next sequence:** begin Phase 18A fleet/worker prerequisite only from the accepted Image Upscale v0.1 contract. Reconcile the known disabled FLUX/REDGraft primary registrations and prove a real async `/jobs/upscale` worker contract before exposing any product Upscale action. Contract acceptance does not authorize a worker or application deployment.",
    "**Next sequence:** remain inside Phase 18A. The repository-side routing/runtime/worker preparation is verified; the next hard gate is an explicitly authorized worker deployment followed by live `/health` + `/jobs/upscale` geometry/alpha/lifecycle proof. Do not begin 18B or expose any product Upscale action before that evidence. Application deployment remains separate and unauthorized.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Post-Phase-17 governance:** completed by read-only worker audit `33995223659` and the accepted Phase 18 Image Upscale v0.1 contract below. Phase 18 implementation remains not started and deployment remains separately authorized.",
    "**Post-Phase-17 governance:** completed by read-only worker audit `33995223659` and the accepted Phase 18 Image Upscale v0.1 contract below. Phase 18A repository preparation has now started and is verified offline; worker/application deployment remains separately authorized.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED` under UI-058.**",
    "**Status: `IMPLEMENTATION IN PROGRESS — 18A PREDEPLOY PREPARATION VERIFIED / UNDEPLOYED` under UI-058.**",
)

sequence_anchor = "### Locked implementation sequence\n- [ ] **18A Fleet/worker prerequisite:** reconcile known dead-primary registry entries; select/pin model/runtime provenance; establish live async `/jobs/upscale` + GET/DELETE lifecycle and exact 2× PNG geometry. Any worker deployment requires separate explicit authorization."
sequence_new = """### 18A predeployment preparation — verified / deployment pending
- [x] Preserve disabled FLUX/REDGraft primary registrations for historical lookup while excluding them from new submission routing; focused unit coverage added.
- [x] Pin the undeployed SwinIR 2× candidate to source commit `33f616625268d08ba600f8db89388eec0328edb1`, Apache-2.0 project license, exact official 67,277,475-byte weight and `sha256:2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac`.
- [x] Runtime audit `33997212864` passed Engineering Quality + official weight size/hash verification; artifact `9978418889` digest is `sha256:5d6d7ace3384a260bf2e9f59dacea85dfa3fa4e6026af46a825eaca74208dc53`.
- [x] Prepare undeployed RenderLab-owned `workers/image-upscale/modal_app.py` with lightweight gateway/heavy runtime separation, fixed 2× async lifecycle, exact limits, rectangular tiling and alpha path.
- [x] Permanent offline `Upscale Worker Validation` run `33997784521` passed.
- [ ] Deploy the worker only after explicit authorization, then prove live RGB + alpha exact-2× geometry, PNG output, polling/cancellation and cleanup before 18A can complete.

### Locked implementation sequence
- [ ] **18A Fleet/worker prerequisite:** repository-side reconciliation/runtime/worker preparation is verified; live deployment + contract proof remain. Any worker deployment requires separate explicit authorization."""
replace_once("docs/ui/UI_MIGRATION.md", sequence_anchor, sequence_new)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Phase 18 implementation must not begin outside the accepted 18A→18F sequence above.**",
    "**Phase 18 implementation is in progress and must remain inside the accepted 18A→18F sequence above. 18B must not begin until 18A live worker proof is complete.**",
)

infra_anchor = "Production application routing to that worker remains a later explicit rollout decision."
infra_new = """Production application routing to that worker remains a later explicit rollout decision.

#### Phase 18A predeployment repository state — verified / no worker deployment
The Phase 18 work branch now records the repository-side prerequisite without pretending the infrastructure is live:
- fleet registry entries gained explicit active/disabled routing state. `flux-primary-01` and `ltx-primary-01` remain addressable by ID for historical job reconciliation but are excluded from `workersForEcosystem()` new-submission selection; their verified healthy standbys remain routable. Qwen primary/standby order is unchanged. `tests/unit/worker-fleet.test.mjs` guards this behavior.
- Real-ESRGAN x2plus was evaluated but not pinned because upstream issue #677 still has no authorized clarification for pretrained-checkpoint commercial terms. This is a dependency-risk rejection, not a quality judgment.
- The current predeployment runtime candidate is official SwinIR classical-SR native 2× from `JingyunLiang/SwinIR` tag `v0.0`, exact source commit `33f616625268d08ba600f8db89388eec0328edb1`, repository Apache-2.0 license, official `001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth` release asset, exact `67,277,475` bytes and independently measured `sha256:2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac`. The model file is downloaded only into the future Modal runtime image and hash-checked at image build; it is not committed to this repository.
- Runtime audit `33997212864` downloaded the official release asset remotely, verified the expected size/hash and passed Engineering Quality. Artifact `9978418889` has GitHub digest `sha256:5d6d7ace3384a260bf2e9f59dacea85dfa3fa4e6026af46a825eaca74208dc53`.
- `workers/image-upscale/modal_app.py` is RenderLab-owned undeployed worker source. It uses Modal Python SDK `1.4.2`; a lightweight Debian/FastAPI gateway image is separate from the CUDA 12.8 / PyTorch 2.7.1 / torchvision 0.22.1 / timm 1.0.19 / Pillow 11.2.1 / NumPy 2.2.6 inference image. The runtime clones the exact SwinIR commit, downloads/hash-checks the exact release weight, exposes fixed scale 2 only, enforces the accepted byte/geometry ceilings, returns PNG, uses rectangular 256px tiled inference with 32px bounded overlap, and preserves alpha through a separately resized channel pending live proof.
- `workers/image-upscale/verify_worker.py` plus `.github/workflows/upscale-worker-validation.yml` provide credential-free syntax/contract/geometry/tiling checks. Run `33997784521` passed. This workflow is cancellation-safe and touches no Supabase, R2, Modal worker or shared mutable fixture.

**Hard boundary:** none of the above is a Modal deployment or live-worker verification. There is no deployed RenderLab Upscale endpoint yet. 18A remains incomplete until an explicitly authorized deployment is followed by live `/health`, fixed `POST /jobs/upscale`, GET/DELETE lifecycle, exact RGB/alpha 2× geometry, PNG and cleanup proof. No production application deployment, scheduler activation, schema change or product routing follows from this repository preparation."""
replace_once("docs/architecture/INFRASTRUCTURE.md", infra_anchor, infra_new)
