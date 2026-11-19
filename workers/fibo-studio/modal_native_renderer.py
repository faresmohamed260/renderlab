"""Shared GPU renderer for the native FIBO gateways and smoke test."""
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from subprocess import Popen, TimeoutExpired
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4

import modal

app = modal.App("renderlab-image-generation")
COMFY = "/opt/ComfyUI"
REVISION = "dea870e1a36614b3614c0008a820734d0fecdf4f"
MODELS = "/opt/fibo-models"
ORIGIN = "http://127.0.0.1:8188"
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install("psycopg[binary]==3.2.13")
    .run_commands(
        f"git init {COMFY} && git -C {COMFY} fetch --depth=1 https://github.com/Comfy-Org/ComfyUI.git {REVISION} && git -C {COMFY} checkout --detach FETCH_HEAD",
        "python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch==2.10.0 torchvision==0.25.0",
        f"python -m pip install -r {COMFY}/requirements.txt && python -m pip check",
    )
    .add_local_file(str(Path(__file__).with_name("native_graph.py")), "/opt/renderlab/native_graph.py")
    .add_local_file(str(Path(__file__).with_name("native_mask.py")), "/opt/renderlab/native_mask.py")
    .add_local_file(str(Path(__file__).with_name("native_generated_vgl.py")), "/opt/renderlab/native_generated_vgl.py")
    .add_local_file(str(Path(__file__).with_name("dispatch_core.py")), "/opt/renderlab/dispatch_core.py")
    .add_local_file(str(Path(__file__).with_name("dispatch_supabase.py")), "/opt/renderlab/dispatch_supabase.py")
)


def deployment_resource(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} must be set explicitly for a Modal deployment")
    return value


def request(path, payload=None):
    with urlopen(Request(ORIGIN + path, data=None if payload is None else json.dumps(payload).encode(),
                         headers={"Content-Type": "application/json"}), timeout=8) as response:
        return json.load(response)


@app.function(image=image, gpu="A10", cpu=2, memory=16384, timeout=420, max_containers=1,
              scaledown_window=60,
              secrets=[modal.Secret.from_name(
                  deployment_resource("RENDERLAB_MODAL_WORKER_SECRET"),
                  environment_name=deployment_resource("RENDERLAB_MODAL_ENVIRONMENT"),
              )],
              volumes={MODELS: modal.Volume.from_name(
                  deployment_resource("RENDERLAB_MODAL_MODEL_VOLUME"),
                  environment_name=deployment_resource("RENDERLAB_MODAL_ENVIRONMENT"),
              )})
def render(*, prompt, seed, sources=(), width=0, height=0, steps=4,
           negative_prompt="", vgl="", mask=None, generate_vgl=False,
           dispatch_attempt_id=None, admission_deadline=None):
    """One isolated render. Do not send raw files from an unauthenticated client."""
    from PIL import Image

    sys.path.insert(0, "/opt/renderlab")
    if dispatch_attempt_id is not None or admission_deadline is not None:
        if not dispatch_attempt_id or not admission_deadline:
            raise ValueError("Durable dispatch identity is incomplete")
        from dispatch_supabase import begin_generation_attempt
        begin_generation_attempt(dispatch_attempt_id, admission_deadline)
    from native_graph import build_graph
    from native_mask import normalize_mask_bytes
    from native_generated_vgl import validate_generated_vgl
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError("Expected a Modal CUDA GPU")

    if not isinstance(sources, (list, tuple)) or len(sources) > 4:
        raise ValueError("Expected zero to four source images")
    if any(type(item) is not bytes or not 0 < len(item) <= 16 * 1024 * 1024 for item in sources):
        raise ValueError("Invalid source image byte size")
    if sum(map(len, sources)) > 32 * 1024 * 1024:
        raise ValueError("Source images exceed the combined limit")
    if mask is not None and len(sources) != 1:
        raise ValueError("A mask requires exactly one source image")
    names = [uuid4().hex + ".png" for _ in sources]
    mask_name = uuid4().hex + ".png" if mask is not None else None
    with tempfile.TemporaryDirectory(prefix="renderlab-fibo-") as temp:
        root = Path(temp)
        (root / "input").mkdir()
        (root / "output").mkdir()
        from io import BytesIO
        from PIL import ImageOps
        first_source_size = None
        for name, payload in zip(names, sources):
            with Image.open(BytesIO(payload), formats=["PNG", "JPEG", "WEBP"]) as source:
                if source.width * source.height > 16_777_216 or getattr(source, "is_animated", False):
                    raise ValueError("Source image exceeds the pixel limit or is animated")
                normalized = ImageOps.exif_transpose(source).convert("RGB")
                if first_source_size is None:
                    first_source_size = normalized.size
                normalized.save(root / "input" / name)
        if mask_name is not None:
            normalized_mask = normalize_mask_bytes(mask, first_source_size)
            (root / "input" / mask_name).write_bytes(normalized_mask)
        graph = build_graph(prompt=prompt, seed=seed, steps=steps, width=width, height=height,
                            images=names, negative_prompt=negative_prompt, vgl=vgl,
                            mask=mask_name,
                            source_dimensions=first_source_size if mask_name is not None and (width, height) == (0, 0) else None,
                            generate_vgl=generate_vgl)
        config = root / "models.yaml"
        config.write_text(f"fibo:\n  base_path: {MODELS}\n  diffusion_models: diffusion_models\n"
                          "  text_encoders: text_encoders\n  vae: vae\n")
        server = Popen([sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
                        "--input-directory", str(root / "input"), "--output-directory", str(root / "output"),
                        "--extra-model-paths-config", str(config), "--disable-all-custom-nodes",
                        "--disable-api-nodes", "--disable-auto-launch", "--lowvram", "--reserve-vram", "1"], cwd=COMFY)
        try:
            for _ in range(90):
                if server.poll() is not None:
                    raise RuntimeError("ComfyUI exited during startup")
                try:
                    if "TextEncodeFibo2" in request("/object_info/TextEncodeFibo2"):
                        break
                except (URLError, TimeoutError):
                    pass
                time.sleep(1)
            else:
                raise TimeoutError("Native FIBO node did not become ready")

            job = request("/prompt", {"prompt": graph})["prompt_id"]
            for _ in range(130):
                record = request("/history/" + job).get(job)
                if record:
                    break
                time.sleep(2)
            else:
                raise TimeoutError("FIBO render did not finish")
            if record["status"]["status_str"] != "success":
                raise RuntimeError("FIBO execution failed")
            generated_vgl = None
            if generate_vgl:
                generated = record["outputs"].get("auto_vgl_result", {}).get("text")
                if not isinstance(generated, list) or len(generated) != 1:
                    raise ValueError("Generated VGL was not captured from native ComfyUI")
                generated_vgl = validate_generated_vgl(generated[0])
            result, = record["outputs"]["output"]["images"]
            output = (root / "output" / result["subfolder"] / result["filename"]).resolve()
            if not output.is_relative_to(root / "output") or output.stat().st_size > 16 * 1024 * 1024:
                raise RuntimeError("Unexpected FIBO output")
            with Image.open(output, formats=["PNG"]) as decoded:
                if decoded.width * decoded.height > 1536 * 1024 or (width and decoded.size != (width, height)):
                    raise RuntimeError("Unexpected FIBO output dimensions")
                decoded.load()
            image_bytes = output.read_bytes()
            # Existing image-only jobs preserve the exact historical PNG return.
            # Only explicit source-free auto-VGL jobs provide a typed sidecar.
            return {"image_png": image_bytes, "generated_vgl": generated_vgl} if generate_vgl else image_bytes
        finally:
            server.terminate()
            try:
                server.wait(timeout=8)
            except TimeoutExpired:
                server.kill()
                server.wait()
