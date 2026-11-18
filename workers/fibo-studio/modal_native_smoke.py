"""Ephemeral Modal validation for the public-node FIBO graph, not a deployed API."""
import json
import sys
import tempfile
import time
from pathlib import Path
from subprocess import Popen, TimeoutExpired
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4

import modal

app = modal.App("renderlab-fibo-native-smoke")
COMFY = "/opt/ComfyUI"
REVISION = "dea870e1a36614b3614c0008a820734d0fecdf4f"
MODELS = "/opt/fibo-models"
ORIGIN = "http://127.0.0.1:8188"
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .run_commands(
        f"git init {COMFY} && git -C {COMFY} fetch --depth=1 https://github.com/Comfy-Org/ComfyUI.git {REVISION} && git -C {COMFY} checkout --detach FETCH_HEAD",
        "python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch==2.10.0 torchvision==0.25.0",
        f"python -m pip install -r {COMFY}/requirements.txt && python -m pip check",
    )
    .add_local_file(str(Path(__file__).with_name("native_graph.py")), "/opt/renderlab/native_graph.py")
)


def request(path, payload=None):
    with urlopen(Request(ORIGIN + path, data=None if payload is None else json.dumps(payload).encode(),
                         headers={"Content-Type": "application/json"}), timeout=8) as response:
        return json.load(response)


@app.function(image=image, gpu="A10", cpu=2, memory=16384, timeout=420, max_containers=1,
              volumes={MODELS: modal.Volume.from_name("renderlab-fibo-models", environment_name="main")})
def render(*, prompt, seed, sources=(), width=0, height=0, steps=4,
           negative_prompt="", vgl=""):
    """One isolated render. Do not send raw files from an unauthenticated client."""
    from PIL import Image

    sys.path.insert(0, "/opt/renderlab")
    from native_graph import build_graph
    import torch
    if not torch.cuda.is_available():
        raise RuntimeError("Expected a Modal CUDA GPU")

    if not isinstance(sources, (list, tuple)) or len(sources) > 4:
        raise ValueError("Expected zero to four source images")
    if any(type(item) is not bytes or not 0 < len(item) <= 16 * 1024 * 1024 for item in sources):
        raise ValueError("Invalid source image byte size")
    if sum(map(len, sources)) > 32 * 1024 * 1024:
        raise ValueError("Source images exceed the combined limit")
    names = [uuid4().hex + ".png" for _ in sources]
    graph = build_graph(prompt=prompt, seed=seed, steps=steps, width=width, height=height,
                        images=names, negative_prompt=negative_prompt, vgl=vgl)
    with tempfile.TemporaryDirectory(prefix="renderlab-fibo-") as temp:
        root = Path(temp)
        (root / "input").mkdir()
        (root / "output").mkdir()
        from io import BytesIO
        from PIL import ImageOps
        for name, payload in zip(names, sources):
            with Image.open(BytesIO(payload), formats=["PNG", "JPEG", "WEBP"]) as source:
                if source.width * source.height > 16_777_216 or getattr(source, "is_animated", False):
                    raise ValueError("Source image exceeds the pixel limit or is animated")
                ImageOps.exif_transpose(source).convert("RGB").save(root / "input" / name)
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
            result, = record["outputs"]["output"]["images"]
            output = (root / "output" / result["subfolder"] / result["filename"]).resolve()
            if not output.is_relative_to(root / "output") or output.stat().st_size > 16 * 1024 * 1024:
                raise RuntimeError("Unexpected FIBO output")
            with Image.open(output, formats=["PNG"]) as decoded:
                if decoded.width * decoded.height > 1536 * 1024 or (width and decoded.size != (width, height)):
                    raise RuntimeError("Unexpected FIBO output dimensions")
                decoded.load()
            return output.read_bytes()
        finally:
            server.terminate()
            try:
                server.wait(timeout=8)
            except TimeoutExpired:
                server.kill()
                server.wait()

@app.local_entrypoint()
def main():
    from io import BytesIO
    from PIL import Image

    source = BytesIO()
    Image.new("RGB", (256, 256), (210, 50, 45)).save(source, format="PNG")
    for mode, prompt, sources in (
        ("text", "A red ceramic cube on a white table.", ()),
        ("edit", "Change the red image to blue.", (source.getvalue(),)),
    ):
        call = render.spawn(prompt=prompt, seed=42, steps=1, width=256, height=256, sources=sources)
        with Image.open(BytesIO(call.get()), formats=["PNG"]) as decoded:
            decoded.load()
            if decoded.size != (256, 256):
                raise RuntimeError("Unexpected smoke dimensions")
        print(f"{mode}: decoded a 256x256 PNG from an asynchronous Modal job", flush=True)
