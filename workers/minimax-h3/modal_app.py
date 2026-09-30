import hashlib
import io
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

import modal

APP_NAME = "renderlab-minimax-h3-gateway"
ECOSYSTEM_ID = "minimax-h3-dasiwa-4turbo"
WORKER_ID = os.environ.get("RENDERLAB_H3_WORKER_ID", "h3-dasiwa-primary-01")
STATE_DICT_NAME = os.environ.get("RENDERLAB_H3_STATE_DICT", "renderlab-minimax-h3-worker-state")
MODEL_VOLUME_NAME = "renderlab-minimax-h3-models"

COMFYUI_REPOSITORY = "https://github.com/comfyanonymous/ComfyUI.git"
COMFYUI_COMMIT = "33ee2b36d2d6e8f25cfc796b774ca387917b98de"
COMFYUI_DIR = "/opt/ComfyUI"
MODEL_ROOT = "/opt/ComfyUI/models"
HF_REVISION = "e5eb578a89295337b8ff433a035929ce0279e0b6"

MODEL_NAME = "DasiwaMinimaxH3_dasiwaHybrid4turboV1.safetensors"
MODEL_SHA256 = "56c52c7890c105308d28fe9c25c25fdb80e6cd6a54e2604d8af71732ba4ed74f"
MODEL_BYTES = 20_967_642_441
MODEL_URL = "https://civitai.red/api/download/models/3272675?fileId=3156813"

TEXT_ENCODER_NAME = "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors"
TEXT_ENCODER_SHA256 = "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6"
TEXT_ENCODER_BYTES = 15_687_142_551
VIDEO_VAE_NAME = "minimax_h3_video_vae_fp16.safetensors"
VIDEO_VAE_SHA256 = "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522"
VIDEO_VAE_BYTES = 5_207_808_496
AUDIO_VAE_NAME = "minimax_h3_audio_vae_fp32.safetensors"
AUDIO_VAE_SHA256 = "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48"
AUDIO_VAE_BYTES = 605_254_808

SUPPORTED_RESOLUTIONS = {"480p": 480, "720p": 720}
SUPPORTED_DURATIONS = {5, 10, 15}
SUPPORTED_FRAME_RATES = {24}
MAX_SOURCE_BYTES = 25 * 1024 * 1024

model_volume = modal.Volume.from_name(MODEL_VOLUME_NAME, create_if_missing=True)
worker_state = modal.Dict.from_name(STATE_DICT_NAME, create_if_missing=True)
app = modal.App(APP_NAME)

gateway_image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "modal==1.4.2",
    "fastapi[standard]==0.121.0",
    "Pillow==11.2.1",
)

runtime_image = (
    modal.Image.from_registry("nvidia/cuda:12.8.1-runtime-ubuntu22.04", add_python="3.11")
    .entrypoint([])
    .apt_install("git", "ffmpeg", "curl", "ca-certificates", "libgl1", "libglib2.0-0")
    .run_commands(
        f"git clone --filter=blob:none {COMFYUI_REPOSITORY} {COMFYUI_DIR}",
        f"git -C {COMFYUI_DIR} checkout --detach {COMFYUI_COMMIT}",
        f"pip install --no-cache-dir -r {COMFYUI_DIR}/requirements.txt",
        "pip install --no-cache-dir modal==1.4.2 requests==2.32.5",
    )
    .env({"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"})
)


def _log(event: str, **fields: Any) -> None:
    print({"event": event, **fields}, flush=True)


def _set_state(state: str, **fields: Any) -> None:
    payload = {
        "state": state,
        "worker_id": WORKER_ID,
        "ecosystem": ECOSYSTEM_ID,
        "updated_at": int(time.time()),
        **fields,
    }
    worker_state["worker"] = payload
    _log("worker_state", **payload)


def _current_state() -> dict[str, Any]:
    try:
        return worker_state.get("worker") or {"state": "sleeping", "worker_id": WORKER_ID}
    except Exception:
        return {"state": "unknown", "worker_id": WORKER_ID}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _download(url: str, destination: Path, size: int, sha256: str, token: str | None = None) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size == size and _sha256(destination) == sha256:
        _log("model_present", name=destination.name, bytes=size)
        return
    partial = destination.with_suffix(destination.suffix + ".partial")
    partial.unlink(missing_ok=True)
    headers = {"User-Agent": "RenderLab-MiniMax-H3/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as output:
        while chunk := response.read(8 * 1024 * 1024):
            output.write(chunk)
    if partial.stat().st_size != size:
        raise RuntimeError(f"Unexpected size for {destination.name}: {partial.stat().st_size}")
    digest = _sha256(partial)
    if digest != sha256:
        raise RuntimeError(f"Unexpected SHA256 for {destination.name}: {digest}")
    partial.replace(destination)
    _log("model_downloaded", name=destination.name, bytes=size, sha256=sha256)


def _hf_url(folder: str, name: str) -> str:
    return f"https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/{HF_REVISION}/{folder}/{name}"


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    volumes={MODEL_ROOT: model_volume},
    secrets=[modal.Secret.from_name("renderlab-civitai")],
    timeout=6 * 60 * 60,
)
def prefetch_models() -> dict[str, Any]:
    token = os.environ.get("CIVITAI_API_TOKEN")
    if not token:
        raise RuntimeError("CIVITAI_API_TOKEN is required")
    root = Path(MODEL_ROOT)
    files = [
        (MODEL_URL, root / "diffusion_models" / MODEL_NAME, MODEL_BYTES, MODEL_SHA256, token),
        (_hf_url("text_encoders", TEXT_ENCODER_NAME), root / "text_encoders" / TEXT_ENCODER_NAME, TEXT_ENCODER_BYTES, TEXT_ENCODER_SHA256, None),
        (_hf_url("vae", VIDEO_VAE_NAME), root / "vae" / VIDEO_VAE_NAME, VIDEO_VAE_BYTES, VIDEO_VAE_SHA256, None),
        (_hf_url("vae", AUDIO_VAE_NAME), root / "vae" / AUDIO_VAE_NAME, AUDIO_VAE_BYTES, AUDIO_VAE_SHA256, None),
    ]
    for url, destination, size, digest, auth in files:
        _download(url, destination, size, digest, auth)
    model_volume.commit()
    return {"ready": True, "files": [destination.name for _, destination, _, _, _ in files]}


def _aspect_dimensions(aspect_ratio: str, resolution: str) -> tuple[int, int]:
    if resolution not in SUPPORTED_RESOLUTIONS:
        raise ValueError("resolution must be 480p or 720p")
    if aspect_ratio == "original":
        aspect_ratio = "16:9"
    try:
        left, right = (int(part) for part in aspect_ratio.split(":"))
    except Exception as exc:
        raise ValueError("unsupported aspect ratio") from exc
    if left < 1 or right < 1:
        raise ValueError("unsupported aspect ratio")
    short = SUPPORTED_RESOLUTIONS[resolution]
    if left >= right:
        height = short
        width = round(short * left / right)
    else:
        width = short
        height = round(short * right / left)
    return max(32, round(width / 32) * 32), max(32, round(height / 32) * 32)


def _frame_count(duration_seconds: int, frame_rate: int) -> int:
    base = max(5, round(duration_seconds * frame_rate))
    return base + (5 - (base % 17)) % 17


def _workflow(
    *, prompt: str, width: int, height: int, frames: int, seed: int, frame_rate: int, source_name: str | None
) -> dict[str, Any]:
    video_inputs: dict[str, Any] = {
        "prompt": prompt,
        "width": width,
        "height": height,
        "length": frames,
        "clip": ["13", 0],
        "vae": ["11", 0],
    }
    graph: dict[str, Any] = {
        "6": {"class_type": "UNETLoader", "inputs": {"unet_name": MODEL_NAME, "weight_dtype": "default"}},
        "11": {"class_type": "VAELoader", "inputs": {"vae_name": VIDEO_VAE_NAME}},
        "13": {"class_type": "CLIPLoader", "inputs": {"clip_name": TEXT_ENCODER_NAME, "type": "minimax", "device": "default"}},
        "15": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "16": {"class_type": "BasicGuider", "inputs": {"model": ["6", 0], "conditioning": ["104", 0]}},
        "17": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "9": {"class_type": "BasicScheduler", "inputs": {"scheduler": "simple", "steps": 4, "denoise": 1, "model": ["6", 0]}},
        "104": {"class_type": "MiniMaxH3ImageToVideo", "inputs": video_inputs},
        "14": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["15", 0], "guider": ["16", 0], "sampler": ["17", 0], "sigmas": ["9", 0], "latent_image": ["104", 1]}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["14", 0], "vae": ["11", 0]}},
        "24": {"class_type": "VAELoader", "inputs": {"vae_name": AUDIO_VAE_NAME}},
        "23": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["14", 0], "vae": ["24", 0]}},
        "91": {"class_type": "CreateVideo", "inputs": {"fps": frame_rate, "bit_depth": 8, "images": ["10", 0], "audio": ["23", 0]}},
        "92": {"class_type": "SaveVideo", "inputs": {"filename_prefix": "renderlab/minimax_h3", "format": "auto", "codec": "auto", "video": ["91", 0]}},
    }
    if source_name:
        graph["114"] = {"class_type": "LoadImage", "inputs": {"image": source_name}}
        video_inputs["first_frame"] = ["114", 0]
    return graph


def _request_json(url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read())


def _result_descriptor(history: dict[str, Any]) -> dict[str, Any]:
    outputs = history.get("outputs") or {}
    for node in outputs.values():
        for value in node.values():
            if not isinstance(value, list):
                continue
            for item in value:
                if isinstance(item, dict) and item.get("filename"):
                    return item
    raise RuntimeError("ComfyUI completed without a saved video")


@app.cls(
    image=runtime_image,
    gpu="A100-80GB",
    memory=131072,
    timeout=3600,
    scaledown_window=300,
    min_containers=0,
    max_containers=1,
    volumes={MODEL_ROOT: model_volume},
)
@modal.concurrent(max_inputs=1)
class MiniMaxH3Worker:
    @modal.enter()
    def start(self) -> None:
        model_volume.reload()
        required = [
            Path(MODEL_ROOT) / "diffusion_models" / MODEL_NAME,
            Path(MODEL_ROOT) / "text_encoders" / TEXT_ENCODER_NAME,
            Path(MODEL_ROOT) / "vae" / VIDEO_VAE_NAME,
            Path(MODEL_ROOT) / "vae" / AUDIO_VAE_NAME,
        ]
        missing = [str(path) for path in required if not path.exists()]
        if missing:
            raise RuntimeError(f"Required models are not prefetched: {missing}")
        _set_state("loading", comfyui_commit=COMFYUI_COMMIT, model_sha256=MODEL_SHA256)
        self.process = subprocess.Popen(
            ["python", "main.py", "--listen", "127.0.0.1", "--port", "8188", "--disable-auto-launch"],
            cwd=COMFYUI_DIR,
        )
        for _ in range(180):
            if self.process.poll() is not None:
                raise RuntimeError("ComfyUI exited during startup")
            try:
                _request_json("http://127.0.0.1:8188/object_info")
                _set_state("sleeping", ready=True)
                return
            except Exception:
                time.sleep(1)
        raise RuntimeError("ComfyUI did not become ready")

    @modal.method()
    def warm(self) -> dict[str, Any]:
        return {"ready": True, "worker_id": WORKER_ID, "ecosystem": ECOSYSTEM_ID}

    @modal.method()
    def generate(
        self,
        *,
        prompt: str,
        aspect_ratio: str,
        resolution: str,
        duration_seconds: int,
        audio_enabled: bool,
        seed: int,
        frame_rate: int,
        source_bytes: bytes | None,
        source_content_type: str | None,
    ) -> dict[str, bytes]:
        if not prompt.strip():
            raise ValueError("prompt is required")
        if duration_seconds not in SUPPORTED_DURATIONS:
            raise ValueError("duration must be 5, 10, or 15 seconds")
        if frame_rate not in SUPPORTED_FRAME_RATES:
            raise ValueError("frame rate must be 24")
        if source_bytes and len(source_bytes) > MAX_SOURCE_BYTES:
            raise ValueError("source image is too large")
        width, height = _aspect_dimensions(aspect_ratio, resolution)
        source_name = None
        if source_bytes:
            extension = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(source_content_type or "")
            if not extension:
                raise ValueError("source must be PNG, JPEG, or WebP")
            source_name = f"renderlab-{uuid.uuid4().hex}{extension}"
            input_path = Path(COMFYUI_DIR) / "input" / source_name
            input_path.parent.mkdir(parents=True, exist_ok=True)
            input_path.write_bytes(source_bytes)
        frames = _frame_count(duration_seconds, frame_rate)
        _set_state("generating", width=width, height=height, frames=frames, resolution=resolution)
        started = time.perf_counter()
        prompt_id = _request_json(
            "http://127.0.0.1:8188/prompt",
            {"prompt": _workflow(prompt=prompt, width=width, height=height, frames=frames, seed=seed, frame_rate=frame_rate, source_name=source_name)},
        )["prompt_id"]
        try:
            for _ in range(3600):
                history = _request_json(f"http://127.0.0.1:8188/history/{prompt_id}").get(prompt_id)
                if history:
                    if history.get("status", {}).get("status_str") == "error":
                        raise RuntimeError(json.dumps(history.get("status", {}).get("messages", [])))
                    descriptor = _result_descriptor(history)
                    query = urllib.parse.urlencode({
                        "filename": descriptor["filename"],
                        "subfolder": descriptor.get("subfolder", ""),
                        "type": descriptor.get("type", "output"),
                    })
                    with urllib.request.urlopen(f"http://127.0.0.1:8188/view?{query}", timeout=180) as response:
                        video = response.read()
                    with tempfile.TemporaryDirectory() as temporary:
                        source = Path(temporary) / "output.mp4"
                        normalized = Path(temporary) / "normalized.mp4"
                        poster = Path(temporary) / "poster.jpg"
                        source.write_bytes(video)
                        command = ["ffmpeg", "-y", "-i", str(source), "-c:v", "copy"]
                        command += ["-c:a", "copy"] if audio_enabled else ["-an"]
                        command += ["-movflags", "+faststart", str(normalized)]
                        subprocess.run(command, check=True, capture_output=True)
                        subprocess.run(
                            ["ffmpeg", "-y", "-ss", "0", "-i", str(normalized), "-frames:v", "1", "-q:v", "2", str(poster)],
                            check=True,
                            capture_output=True,
                        )
                        result = {"video": normalized.read_bytes(), "poster": poster.read_bytes()}
                    _set_state("sleeping", ready=True, last_duration_ms=round((time.perf_counter() - started) * 1000))
                    return result
                time.sleep(1)
            raise TimeoutError("ComfyUI generation timed out")
        except Exception:
            _set_state("degraded")
            raise
        finally:
            if source_name:
                (Path(COMFYUI_DIR) / "input" / source_name).unlink(missing_ok=True)


def _failure(exc: BaseException) -> tuple[int, str, str]:
    message = f"{type(exc).__name__}: {exc}"
    lowered = message.lower()
    if "out of memory" in lowered or "resource exhausted" in lowered:
        return 503, "WORKER_CAPACITY_EXHAUSTED", message
    if isinstance(exc, ValueError):
        return 400, "INVALID_REQUEST", message
    return 502, "WORKER_RUNTIME_FAILED", message


@app.function(image=gateway_image, timeout=3900)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, File, Form, HTTPException, UploadFile
    from fastapi.responses import JSONResponse, Response

    api = FastAPI(title="RenderLab DaSiWa MiniMax H3 Worker", version="1.0.0")

    @api.get("/health")
    async def health():
        return {
            "ready": True,
            "async_jobs": True,
            "cancel_jobs": True,
            "poster_jobs": True,
            "worker_id": WORKER_ID,
            "ecosystem": ECOSYSTEM_ID,
            "model": {"name": MODEL_NAME, "sha256": MODEL_SHA256, "steps": 4, "base": "MiniMax H3"},
            "limits": {"resolutions": sorted(SUPPORTED_RESOLUTIONS), "durations": sorted(SUPPORTED_DURATIONS), "frame_rates": sorted(SUPPORTED_FRAME_RATES)},
            "worker": _current_state(),
        }

    @api.post("/jobs/video")
    async def submit_video(
        prompt: str = Form(...),
        aspect_ratio: str = Form("16:9"),
        resolution: str = Form("480p"),
        duration_seconds: int = Form(5),
        audio_enabled: bool = Form(True),
        seed: int = Form(42),
        frame_rate: int = Form(24),
        image_file: UploadFile | None = File(None),
    ):
        source_bytes = await image_file.read() if image_file else None
        try:
            _aspect_dimensions(aspect_ratio, resolution)
            if duration_seconds not in SUPPORTED_DURATIONS or frame_rate not in SUPPORTED_FRAME_RATES:
                raise ValueError("unsupported video settings")
            call = MiniMaxH3Worker().generate.spawn(
                prompt=prompt,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                duration_seconds=duration_seconds,
                audio_enabled=audio_enabled,
                seed=seed,
                frame_rate=frame_rate,
                source_bytes=source_bytes,
                source_content_type=image_file.content_type if image_file else None,
            )
            return {"status": "queued", "call_id": call.object_id, "worker_state": "waking", "worker_id": WORKER_ID, "ecosystem": ECOSYSTEM_ID}
        except Exception as exc:
            status, code, message = _failure(exc)
            return JSONResponse(status_code=status, content={"error": message, "errorCode": code, "workerState": "failed"})

    def result_for(call_id: str) -> dict[str, bytes] | JSONResponse:
        try:
            return modal.FunctionCall.from_id(call_id).get(timeout=0)
        except TimeoutError:
            return JSONResponse(status_code=202, content={"status": "running", "call_id": call_id, "worker_state": _current_state().get("state", "generating")})
        except modal.exception.OutputExpiredError as exc:
            raise HTTPException(status_code=410, detail="video job result expired") from exc
        except Exception as exc:
            status, code, message = _failure(exc)
            return JSONResponse(status_code=status, content={"error": message, "errorCode": code, "workerState": "failed"})

    @api.get("/jobs/{call_id}")
    async def poll_video(call_id: str):
        result = result_for(call_id)
        return result if isinstance(result, JSONResponse) else Response(content=result["video"], media_type="video/mp4")

    @api.get("/jobs/{call_id}/poster")
    async def video_poster(call_id: str):
        result = result_for(call_id)
        return result if isinstance(result, JSONResponse) else Response(content=result["poster"], media_type="image/jpeg")

    @api.delete("/jobs/{call_id}")
    async def cancel_video(call_id: str):
        try:
            modal.FunctionCall.from_id(call_id).cancel(terminate_containers=False)
        except modal.exception.OutputExpiredError:
            pass
        return {"status": "cancelled", "call_id": call_id, "worker_id": WORKER_ID, "ecosystem": ECOSYSTEM_ID}

    return api
