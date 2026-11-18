"""Private FIBO Studio validation on RenderLab's Modal workspace."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

import modal

APP = "renderlab-fibo-studio"
ROOT = "/opt/ComfyUI"
SOURCE = "dea870e1a36614b3614c0008a820734d0fecdf4f"
BASE = "http://127.0.0.1:8188"
MODELS = "/opt/fibo-models"
SNAPSHOT = Path(os.environ.get(
    "RENDERLAB_FIBO_SNAPSHOT", "C:/Tools/renderlab-fibo-studio-reference/reference"
))
ASSETS = (
    ("comfy_backend.py", "/opt/fibo-reference/comfy_backend.py",
     "306850a04b03d63437e764fe1400ddbae9a25919111eeb232ad7089b1a610f9b"),
    ("comfy/custom_nodes/fibo_vgl/__init__.py", f"{ROOT}/custom_nodes/fibo_vgl/__init__.py",
     "fec3020af9f86ac0dad65b771b4557e41d1ccc783376335844abc1a8276eb1ca"),
)
WEIGHTS = (
    "diffusion_models/fibo2_edit_turbo_int8_convrot.safetensors",
    "text_encoders/qwen3vl_4b_int8_convrot.safetensors",
    "vae/flux2-vae.safetensors",
)
NODES = ("TextEncodeFibo2", "FiboWriteVGL", "FiboGenerateVGL", "FiboVGLResult")
app = modal.App(APP)
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .run_commands(
        f"git init {ROOT} && git -C {ROOT} fetch --depth=1 https://github.com/Comfy-Org/ComfyUI.git {SOURCE} && git -C {ROOT} checkout --detach FETCH_HEAD",
        "python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch==2.10.0 torchvision==0.25.0",
        f"python -m pip install -r {ROOT}/requirements.txt bria-vgl==0.10.2 && python -m pip check",
    )
)
if modal.is_local():
    for relative, destination, expected in ASSETS:
        source = SNAPSHOT / relative
        if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise RuntimeError(f"FIBO Studio source mismatch: {relative}")
        image = image.add_local_file(source, destination)

# Dedicated volume for private noncommercial validation.
volume_name = "renderlab-fibo-models"
volumes = {MODELS: modal.Volume.from_name(volume_name, environment_name="main")}


@app.cls(image=image, gpu=["A10", "L4"], cpu=2, memory=16384, startup_timeout=180,
         timeout=960, min_containers=0, max_containers=1, scaledown_window=15,
         volumes=volumes)
class FiboStudio:
    @modal.enter()
    def start(self):
        for _, destination, expected in ASSETS:
            if hashlib.sha256(Path(destination).read_bytes()).hexdigest() != expected:
                raise RuntimeError(f"Mounted FIBO source mismatch: {destination}")
        self.runtime = Path("/tmp/fibo-runtime")
        self.runtime.mkdir(exist_ok=True)
        (self.runtime / "input").mkdir(exist_ok=True)
        (self.runtime / "output").mkdir(exist_ok=True)
        config = self.runtime / "models.yaml"
        config.write_text(
            f"fibo:\n    base_path: {MODELS}\n    diffusion_models: diffusion_models\n"
            "    text_encoders: text_encoders\n    vae: vae\n"
        )
        self.process = subprocess.Popen(
            [sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
             "--input-directory", str(self.runtime / "input"),
             "--output-directory", str(self.runtime / "output"),
             "--extra-model-paths-config", str(config),
             "--disable-all-custom-nodes", "--whitelist-custom-nodes", "fibo_vgl",
             "--disable-api-nodes", "--disable-auto-launch", "--lowvram",
             "--reserve-vram", "1", "--preview-method", "latent2rgb"],
            cwd=ROOT,
            env={**os.environ, "PYTHONUNBUFFERED": "1", "HF_HUB_OFFLINE": "1",
                 "TRANSFORMERS_OFFLINE": "1"},
        )
        try:
            deadline = time.monotonic() + 125
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError(f"ComfyUI exited: {self.process.returncode}")
                try:
                    self.get("/system_stats")
                    return
                except (URLError, TimeoutError):
                    time.sleep(1)
            raise TimeoutError("ComfyUI startup timed out")
        except BaseException:
            self.stop()
            raise

    def get(self, route):
        with urlopen(BASE + route, timeout=8) as response:
            return json.load(response)

    def missing_weights(self):
        return [name for name in WEIGHTS if not (Path(MODELS) / name).is_file()]

    @modal.method()
    def health(self):
        stats = self.get("/system_stats")
        devices = [d["name"] for d in stats["devices"] if d.get("type") == "cuda"]
        nodes = [name for name in NODES if name in self.get(f"/object_info/{name}")]
        if not devices or tuple(nodes) != NODES:
            raise RuntimeError(f"Missing CUDA device or FIBO nodes: {devices}, {nodes}")
        missing = self.missing_weights()
        return {"status": "awaiting_weights" if missing else "ready_for_inference_test",
                "cuda": devices, "nodes": nodes, "missing_weights": missing}

    def backend_for(self, instruction, seed, json_instruction="", negative_prompt=""):
        if len(negative_prompt) > 4000 or len(json_instruction) > 8192:
            raise ValueError("Advanced prompt exceeds preview limits")
        if json_instruction:
            vgl = json.loads(json_instruction)
            if not isinstance(vgl, dict) or not vgl:
                raise ValueError("Expected a non-empty VGL JSON object")
        missing = self.missing_weights()
        if missing:
            raise RuntimeError("FIBO weights not staged: " + ", ".join(missing))
        if (not instruction.strip() and not json_instruction) or len(instruction) > 4000 or not 0 <= seed < 2**64:
            raise ValueError("Invalid instruction or seed")
        sys.path.insert(0, "/opt/fibo-reference")
        import comfy_backend as reference
        reference.BASE = BASE
        reference.TURBO_WEIGHTS = Path(MODELS) / WEIGHTS[0]
        backend = reference.ComfyBackend()
        backend.start = lambda: self.get("/system_stats")
        backend.input = self.runtime / "input"
        backend.output = self.runtime / "output"
        return backend

    @staticmethod
    def read_output(result):
        path = result.pop("path")
        try:
            with io.BytesIO(path.read_bytes()) as output:
                result["png"] = output.getvalue()
            return result
        finally:
            path.unlink(missing_ok=True)

    @modal.method()
    def text_to_image(self, instruction: str, seed: int = 1):
        backend = self.backend_for(instruction, seed)
        return self.read_output(backend.generate("", seed, 4, 1024, 1024, instruction))

    @modal.method()
    def text_to_image_with_setup(self, instruction: str, seed: int, width: int, height: int,
                                 inspiration: bytes | None = None, steps: int = 4,
                                 negative_prompt: str = "", json_instruction: str = ""):
        from PIL import Image
        if type(steps) is not int or not 1 <= steps <= 8:
            raise ValueError("Unsupported step count")
        if (type(width) is not int or type(height) is not int
                or not all(256 <= side <= 1536 and side % 16 == 0 for side in (width, height))
                or width * height > 1536 * 1024):
            raise ValueError("Unsupported generation dimensions")
        guide = None
        if inspiration is not None and not json_instruction:
            if len(inspiration) > 16 * 1024 * 1024:
                raise ValueError("Inspiration exceeds the private worker byte limit")
            with Image.open(io.BytesIO(inspiration)) as image:
                if image.width * image.height > 16_777_216:
                    raise ValueError("Inspiration exceeds the private worker pixel limit")
                guide = image.convert("RGB")
        backend = self.backend_for(instruction, seed, json_instruction, negative_prompt)
        return self.read_output(backend.generate(json_instruction, seed, steps, width, height, instruction, inspiration=guide,
                                                 negative_prompt=negative_prompt))

    @modal.method()
    def edit_image(self, images: list[bytes], instruction: str, seed: int = 1, steps: int = 4,
                   negative_prompt: str = "", json_instruction: str = ""):
        from PIL import Image
        if type(steps) is not int or not 1 <= steps <= 8:
            raise ValueError("Unsupported step count")
        if not 1 <= len(images) <= 4:
            raise ValueError("Expected a source image and up to three references")
        decoded = []
        for payload in images:
            if len(payload) > 16 * 1024 * 1024:
                raise ValueError("Image exceeds the private worker byte limit")
            with Image.open(io.BytesIO(payload)) as image:
                if image.width * image.height > 16_777_216:
                    raise ValueError("Image exceeds the private worker pixel limit")
                decoded.append(image.convert("RGB"))
        backend = self.backend_for(instruction, seed, json_instruction, negative_prompt)
        return self.read_output(backend.render(decoded, json_instruction, seed, steps, None, instruction,
                                               negative_prompt=negative_prompt))

    @modal.exit()
    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
