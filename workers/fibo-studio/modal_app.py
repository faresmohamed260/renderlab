"""Private FIBO Studio validation on RenderLab's Modal workspace."""
import asyncio
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import threading
import uuid
from urllib.error import URLError
from urllib.request import urlopen

import modal

APP = "renderlab-fibo-studio"
ROOT = "/opt/ComfyUI"
SOURCE = "dea870e1a36614b3614c0008a820734d0fecdf4f"
BASE = "http://127.0.0.1:8188"
MODELS = "/opt/fibo-models"
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
    .add_local_python_source("studio_gateway_contract", "native_generated_vgl")
)
if modal.is_local():
    snapshot_dir = os.environ.get("RENDERLAB_FIBO_SNAPSHOT", "").strip()
    if not snapshot_dir:
        raise RuntimeError("Set RENDERLAB_FIBO_SNAPSHOT to the licensed private source directory.")
    snapshot = Path(snapshot_dir)
    for relative, destination, expected in ASSETS:
        source = snapshot / relative
        if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise RuntimeError(f"FIBO Studio source mismatch: {relative}")
        image = image.add_local_file(source, destination)

# Dedicated volume for private noncommercial validation.
volume_name = "renderlab-fibo-models"
volumes = {MODELS: modal.Volume.from_name(volume_name, environment_name="main")}


@app.cls(image=image, gpu=["A10", "L4"], cpu=2, memory=16384, startup_timeout=180,
         timeout=960, min_containers=0, max_containers=1, scaledown_window=15,
         volumes=volumes)
@modal.concurrent(max_inputs=2)
class FiboStudio:
    @modal.enter()
    def start(self):
        for _, destination, expected in ASSETS:
            if hashlib.sha256(Path(destination).read_bytes()).hexdigest() != expected:
                raise RuntimeError(f"Mounted FIBO source mismatch: {destination}")
        self.render_lock = threading.Lock()
        self.cancel_lock = threading.Lock()
        self.active_render = None
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
        return self._serialized_render(self._text_to_image_with_setup, instruction, seed, 1024, 1024)

    @modal.method()
    def text_to_image_with_setup(self, instruction: str, seed: int, width: int, height: int,
                                 inspiration: bytes | None = None, steps: int = 4,
                                 negative_prompt: str = "", json_instruction: str = ""):
        return self._serialized_render(self._text_to_image_with_setup, instruction, seed, width, height, inspiration,
                                              steps, negative_prompt, json_instruction)

    def _text_to_image_with_setup(self, instruction: str, seed: int, width: int, height: int,
                                 inspiration: bytes | None = None, steps: int = 4,
                                 negative_prompt: str = "", json_instruction: str = "", preview_id=None, cancel=None):
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
        return self.read_output(backend.generate(json_instruction, seed, steps, width, height, instruction, inspiration=guide, preview_id=preview_id,
                                                 negative_prompt=negative_prompt, cancel=cancel))

    @modal.method()
    def edit_image(self, images: list[bytes], instruction: str, seed: int = 1, steps: int = 4,
                   negative_prompt: str = "", json_instruction: str = "", mask: bytes | None = None):
        return self._serialized_render(self._edit_image, images, instruction, seed, steps, negative_prompt, json_instruction, mask)

    @modal.method()
    def render_gateway(self, *, prompt, seed, sources=(), width=0, height=0, steps=4,
                       negative_prompt="", vgl="", mask=None, inspiration=None, generate_vgl=False):
        """Execute the existing Studio path for the authenticated RenderLab gateway.

        VGL generation stays inside the retained FIBO Studio container and uses
        its already-loaded Qwen3-VL encoder. It is not exposed as another
        RenderLab model or network service.
        """
        from studio_gateway_contract import validate_studio_options
        validate_studio_options(
            prompt=prompt, seed=seed, width=width, height=height, steps=steps,
            negative_prompt=negative_prompt, vgl=vgl, generate_vgl=generate_vgl,
            source_count=len(sources) if isinstance(sources, (list, tuple)) else -1,
            has_mask=mask is not None, has_inspiration=inspiration is not None,
        )
        if sources:
            result = self._serialized_render(
                self._edit_image, list(sources), prompt, seed, steps, negative_prompt, vgl, mask,
            )
        else:
            result = self._serialized_render(
                self._text_to_image_with_setup, prompt, seed, width, height, inspiration,
                steps, negative_prompt, vgl,
            )
        if result.get("cancelled"):
            return result
        png = result.get("png")
        if type(png) is not bytes:
            raise RuntimeError("Studio render did not return PNG bytes")
        if generate_vgl:
            generated = result.get("prompt")
            if type(generated) is not str:
                raise RuntimeError("Studio render did not return VGL")
            from native_generated_vgl import validate_generated_vgl
            return {"image_png": png, "generated_vgl": validate_generated_vgl(generated)}
        return png

    def _edit_image(self, images: list[bytes], instruction: str, seed: int = 1, steps: int = 4,
                   negative_prompt: str = "", json_instruction: str = "", mask: bytes | None = None, preview_id=None, cancel=None):
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
        region = None
        if mask is not None:
            if len(decoded) != 1 or len(mask) > 16 * 1024 * 1024:
                raise ValueError("A mask requires exactly one source image")
            with Image.open(io.BytesIO(mask)) as image:
                if image.width * image.height > 16_777_216:
                    raise ValueError("Mask exceeds the worker pixel limit")
                region = image.convert("L").point(lambda value: 255 if value > 8 else 0)
            region = region.resize(decoded[0].size, Image.Resampling.NEAREST)
            if not region.getbbox():
                raise ValueError("Mask must select an area")
        return self.read_output(backend.render(decoded, json_instruction, seed, steps, region, instruction, preview_id=preview_id,
                                               negative_prompt=negative_prompt, cancel=cancel))

    @staticmethod
    def preview_jpeg(message):
        from PIL import Image
        if len(message) <= 8 or len(message) > 4 * 1024 * 1024:
            return None
        if int.from_bytes(message[:4], "big") != 1:
            return None
        kind = int.from_bytes(message[4:8], "big")
        if kind not in (1, 2):
            return None
        try:
            with Image.open(io.BytesIO(message[8:]), formats=["JPEG" if kind == 1 else "PNG"]) as frame:
                if frame.width * frame.height > 4_194_304:
                    return None
                frame.thumbnail((512, 512))
                output = io.BytesIO()
                frame.convert("RGB").save(output, format="JPEG", quality=75)
                return output.getvalue()
        except (OSError, ValueError):
            return None

    @staticmethod
    def preview_progress(message):
        try:
            event = json.loads(message)
        except (ValueError, TypeError):
            return None
        if not isinstance(event, dict) or not isinstance(event.get("data"), dict):
            return None
        data = event["data"]
        node = str(data.get("node"))
        if event.get("type") == "executing":
            phase = {"vgl": "vgl", "5": "prepare", "6": "denoise", "7": "finish", "8": "finish"}.get(node)
            return (phase, None) if phase else None
        if event.get("type") != "progress" or node != "6":
            return None
        value, maximum = data.get("value"), data.get("max")
        if type(value) is not int or type(maximum) is not int or not 1 <= maximum <= 8 or not 0 <= value <= maximum:
            return None
        fraction = value / maximum
        blur_fraction = 1 if maximum == 1 else max(0, min(1, (value - 1) / (maximum - 1)))
        phase = "shapes" if fraction <= .34 else "details" if fraction < .75 else "refine"
        return phase, round(90 - 60 * blur_fraction)

    def _serialized_render(self, render, *args, cancel_token=None, **options):
        with self.render_lock:
            if cancel_token is None:
                return render(*args, **options)
            cancel = threading.Event()
            with self.cancel_lock:
                self.active_render = (cancel_token, cancel)
            try:
                return render(*args, cancel=cancel, **options)
            except Exception as error:
                from comfy_backend import RenderCancelled
                if cancel.is_set() and isinstance(error, RenderCancelled):
                    return {"cancelled": True}
                raise
            finally:
                with self.cancel_lock:
                    self.active_render = None

    @modal.method()
    def cancel_render(self, token: str):
        with self.cancel_lock:
            if self.active_render is None or self.active_render[0] != token:
                return {"accepted": False}
            self.active_render[1].set()
            return {"accepted": True}

    @modal.method(is_generator=True)
    async def render_with_preview(self, mode: str, options: dict):
        from aiohttp import ClientError, ClientSession, ClientTimeout, WSMsgType
        render = {"edit": self._edit_image, "generate": self._text_to_image_with_setup}[mode]
        identifier = uuid.uuid4().hex
        token = options.pop("cancel_token", None)
        if token is not None and (not isinstance(token, str) or len(token) != 32 or any(c not in "0123456789abcdef" for c in token)):
            raise ValueError("Invalid cancellation token")
        async with ClientSession(timeout=ClientTimeout(total=5)) as session:
            try:
                socket = await session.ws_connect(BASE + "/ws", params={"clientId": identifier},
                                                  max_msg_size=4 * 1024 * 1024)
            except (ClientError, asyncio.TimeoutError):
                yield {"kind": "result", "result": await asyncio.to_thread(self._serialized_render, render, cancel_token=token, **options)}
                return
            async with socket:
                task = asyncio.create_task(asyncio.to_thread(self._serialized_render, render, preview_id=identifier, cancel_token=token, **options))
                sent = 0
                progress_sent = 0
                last_progress = None
                blur = 90
                try:
                    while not task.done():
                        try:
                            event = await socket.receive(timeout=.25)
                        except asyncio.TimeoutError:
                            continue
                        except ClientError:
                            break
                        if event.type in (WSMsgType.CLOSE, WSMsgType.CLOSED, WSMsgType.ERROR):
                            break
                        if event.type == WSMsgType.TEXT and progress_sent < 16:
                            progress = self.preview_progress(event.data)
                            if progress and progress != last_progress:
                                phase, next_blur = progress
                                if next_blur is not None:
                                    blur = next_blur
                                last_progress = progress
                                progress_sent += 1
                                yield {"kind": "progress", "phase": phase}
                        if event.type == WSMsgType.BINARY and sent < 12:
                            frame = self.preview_jpeg(event.data)
                            if frame and len(frame) <= 192 * 1024:
                                sent += 1
                                yield {"kind": "frame", "jpeg": frame, "blur": blur}
                    yield {"kind": "result", "result": await task}
                finally:
                    # Do not leave an inference thread racing the next RPC on this container.
                    if not task.done():
                        await task

    @modal.exit()
    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
