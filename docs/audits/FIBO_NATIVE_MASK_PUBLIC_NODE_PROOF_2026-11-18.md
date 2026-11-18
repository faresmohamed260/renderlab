# FIBO Edit Turbo — public-node masked edit feasibility

**Date:** 2026-11-18
**Execution:** Local WANDA GPU proof only; **not** deployed, production API-enabled, or qualified for all geometry/output cases.
**Source:** RenderLab native worker candidate on `feature/fibo-native-masked-edit-20261118`.

## Implementation origin

The candidate uses only existing public ComfyUI nodes in the pinned Comfy-Org/ComfyUI revision `dea870e1a36614b3614c0008a820734d0fecdf4f` (MIT notice already retained in `workers/fibo-studio/COMFY_TEMPLATE_LICENSE.txt`):

- `TextEncodeFibo2` for the normal source and prompt conditioning;
- `ImageScale` to align source/mask with explicit output geometry;
- `ImageToMask` (red channel) to derive a pixel mask;
- `VAEEncode` + `SetLatentNoiseMask` so the supplied mask **affects sampling**, rather than merely overlaying a completed output;
- `KSampler` / `VAEDecode` via existing FIBO 2.0 Edit Turbo;
- `ImageCompositeMasked` to copy the unchanged source outside the mask before `SaveImage`.

The local test used the same ComfyUI repository commit pinned in `workers/fibo-studio/modal_native_smoke.py`. The checked-in `native_graph.py` implementation, not a handwritten alternate graph, was used for the final probe. No private FIBO Studio adapter or worker source was imported.

## Bounded fixture and evidence

- Machine: WANDA local NVIDIA RTX 3060 (12 GB); ComfyUI loopback port 8192 with zero queued/running jobs at test entry.
- Source: generated 256×256 PNG with contrasting left/right halves; mask: generated binary PNG selecting only the right half.
- Prompt: change the right half to a yellow-green garden while preserving the left half.
- Run: seed 42; FIBO one sampling step; 256×256 result; ComfyUI prompt ID `68d4b105-aecc-43a8-8d5e-33c1e0db4696`.
- Source-to-result mean absolute per-channel RGB difference: **0.00 outside mask**, **136.48 inside mask** (0–255 channel scale). Elapsed 4.06 seconds in this synthetic test.
- The source/mask input fixture files were removed by the probe after completion. This is one functional proof, not a model-quality, capacity, security, lifecycle, or latency-SLA test.

## Remaining qualification before production support

- Backend integration with owner-scoped RenderLab mask uploads, strict source ownership/readiness, size limits, job parameters, durable retry and cancellation;
- Exact mask geometry and resampling on real images, explicit ratios, `Original` and portrait/landscape geometry; high-resolution GPU qualification;
- Authenticated RenderLab API/browser mask-editor submission and persistence across refresh;
- Modal deployment compatibility and secrets/proxy-auth validation (requires separately authorized provider operation);
- No unverified private worker source or local relay in production.

The worker gateway candidate now validates and stages one bounded PNG mask with exactly one source image. Its tests prove request-shape rejection, graph wiring and mask-byte normalization; the real provider/persistence boundary remains unverified.
