# FIBO public-node VGL writer: source-free qualification and inspiration blocker

**Date:** 2026-11-18
**Execution:** Isolated WANDA local-GPU tests only; **not** a Modal/Vercel deployment or a production-enabled capability.
**Source:** public ComfyUI nodes at pinned commit `dea870e1a36614b3614c0008a820734d0fecdf4f`; RenderLab worker implementation candidate `workers/fibo-studio/native_generated_vgl.py` / `native_graph.py`.

## Exact source and licensing boundary

- Existing model: **Bria FIBO 2.0 Edit Turbo** with its Qwen3-VL-4B INT8 encoder; no FIBO Dev or separate LLM service.
- Built-in ComfyUI public nodes: `CLIPLoader(type=fibo2)`, `TextGenerate` (`comfy_extras/nodes_textgen.py`), `SaveText`, `TextEncodeFibo2`, `KSampler`, `VAEDecode` and `SaveImage`; the pinned ComfyUI source and existing MIT notice are the provenance baseline.
- The original RenderLab candidate uses a bounded, JSON-quoted scene instruction and validates returned structured JSON; it does **not** copy or import WANDA private `comfy_backend.py`, `fibo_vgl` custom nodes, or Bria private adaptation. Existing Bria model/weight noncommercial restrictions remain binding.

## Source-free candidate behavior — passed locally

Initial `TextGenerate` test generated a valid nonempty object with `short_description`, `background_setting`, and `lighting` without extra providers.

A manual public-node `TextGenerate → TextEncodeFibo2 → FIBO Edit Turbo` graph produced both JSON and a rendered PNG at 256×256, seed 42, one FIBO sampling step; ComfyUI job `14c0c0e9-1348-4c3f-8b6e-ae88c11b7ed1` succeeded.

The **exact updated RenderLab `build_graph(generate_vgl=True)` candidate**, using those stock nodes and no private source, was then executed on the same idle local FIBO ComfyUI:

- ComfyUI job: `ff637e95-3915-466c-a97a-4af63f664f01`; reported success with a valid 256×256 PNG.
- Seed 42, one sampler step, explicit 256×256 dimensions.
- Validated generated JSON contained `short_description`, `background_setting`, `lighting`, and `aesthetics` for the synthetic red-cube prompt.
- One measured run finished in about six seconds on warm local runtime; this **does not predict Modal latency or quality**.
- `workers/fibo-studio/test_native_generated_vgl.py` and gateway tests check source-free-only input shape, strict boolean opt-in, manual/generated VGL conflict, bounded prompt, JSON parsing, required nonempty `short_description`, rejected `edit_instruction` and unbounded output. The isolated Modal renderer validates the native text output before returning PNG success.

## Inspiration images — NOT qualified

An independent pair of image-input probes used the stock `TextGenerate` node's optional `image` input, the FIBO `CLIPLoader(type=fibo2)`, identical user question and deterministic mode:

- Fixture A: large blue **triangle** on **yellow**; returned `{"shape":"circle","shape_color":"blue","background_color":"white"}`.
- Fixture B: large red **square** on **black**; returned the **identical** incorrect JSON.
- ComfyUI jobs `8cd71dd7-c566-472d-a678-917187cf03c5` and `974c0919-07d9-4573-9b37-aeac6e27ba11` both returned successfully, but their outputs did not respond to image changes.

The stock optional `image` connector is **not established as visual input to the FIBO-specialized tokenizer**. The local pinned `Fibo2Tokenizer.tokenize_with_weights` takes an `images` list, whereas the stock node forwards a singular `image` keyword. Exact visual-conditioning route and provider/provenance safety need separate review and an executed image-sensitive test. **Do not map inspiration to a normal FIBO image edit slot, copy private WANDA VGL nodes, or expose the inspiration control as functional.**

## Remaining production gates

- A worker-only candidate is not a public API product capability: no new worker deployed, and no RenderLab generation submission, job/output provenance, or Create UI control yet requests this mode.
- Persist **manual vs generated VGL** provenance, including actual generated JSON (not just a boolean) across render, retry and recovery. The current gateway returns PNG bytes only; it does not return the generated JSON as durable job metadata.
- Confirm JSON validation against the full intended Bria dialect, multi-prompt reliability and instruction-injection boundaries, error recovery and GPU/Modal limits before exposing the feature.
- Worker deployment, credentials, app flags, shared resources and production cutover require their separate owner authorization and exact-head validation; **none was performed**.
