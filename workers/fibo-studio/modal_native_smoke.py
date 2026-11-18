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
def verify():
    from PIL import Image
    import torch

    sys.path.insert(0, "/opt/renderlab")
    from native_graph import build_graph

    assert torch.cuda.is_available(), "Expected Modal CUDA GPU"
    with tempfile.TemporaryDirectory(prefix="renderlab-fibo-") as temp:
        root = Path(temp)
        (root / "input").mkdir()
        (root / "output").mkdir()
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

            results = {"gpu": torch.cuda.get_device_name(0)}
            source = uuid4().hex + ".png"
            Image.new("RGB", (256, 256), (210, 50, 45)).save(root / "input" / source)
            for mode, prompt, sources in (
                ("text", "A red ceramic cube on a white table.", ()),
                ("edit", "Change the red image to blue.", (source,)),
            ):
                graph = build_graph(prompt=prompt, seed=42, steps=1, width=256, height=256, images=sources)
                job = request("/prompt", {"prompt": graph})["prompt_id"]
                for _ in range(65):
                    record = request("/history/" + job).get(job)
                    if record:
                        break
                    time.sleep(2)
                else:
                    raise TimeoutError("FIBO " + mode + " did not finish")
                if record["status"]["status_str"] != "success":
                    raise RuntimeError(f"FIBO {mode} failed: {record['status']['messages']!r}")
                result, = record["outputs"]["output"]["images"]
                output = (root / "output" / result["subfolder"] / result["filename"]).resolve()
                if not output.is_relative_to(root / "output"):
                    raise RuntimeError("Unexpected output path")
                with Image.open(output) as decoded:
                    decoded.load()
                    if decoded.format != "PNG" or decoded.size != (256, 256):
                        raise RuntimeError("Unexpected smoke result")
                results[mode] = "256x256 PNG"
                print(mode, results[mode], flush=True)
            return results
        finally:
            server.terminate()
            try:
                server.wait(timeout=8)
            except TimeoutExpired:
                server.kill()
                server.wait()


@app.local_entrypoint()
def main():
    print(json.dumps(verify.remote(), sort_keys=True), flush=True)
