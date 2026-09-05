from __future__ import annotations

import io
import os
import sys
import time
from typing import Any

import modal

APP_NAME = "renderlab-image-upscale"
RUNTIME_CLASS_NAME = "ImageUpscaleWorker"
ECOSYSTEM_ID = "image-upscale-v1"
WORKER_ID = os.environ.get("RENDERLAB_UPSCALE_WORKER_ID", "image-upscale-worker")
STATE_DICT_NAME = os.environ.get("RENDERLAB_UPSCALE_STATE_DICT", "renderlab-image-upscale-worker-state")

MODAL_VERSION = "1.4.2"
PYTHON_VERSION = "3.11"
GPU_TYPE = os.environ.get("RENDERLAB_UPSCALE_GPU", "A10")
WORKER_MEMORY_MB = int(os.environ.get("RENDERLAB_UPSCALE_MEMORY_MB", "32768"))
FUNCTION_TIMEOUT_SECONDS = int(os.environ.get("RENDERLAB_UPSCALE_TIMEOUT_SECONDS", "1800"))
CONTAINER_IDLE_SECONDS = int(os.environ.get("RENDERLAB_UPSCALE_IDLE_SECONDS", "300"))

SWINIR_REPOSITORY = "https://github.com/JingyunLiang/SwinIR.git"
SWINIR_TAG = "v0.0"
SWINIR_COMMIT = "33f616625268d08ba600f8db89388eec0328edb1"
SWINIR_LICENSE = "Apache-2.0"
SWINIR_SOURCE_DIR = "/opt/swinir"
SWINIR_WEIGHT_URL = (
    "https://github.com/JingyunLiang/SwinIR/releases/download/v0.0/"
    "001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth"
)
SWINIR_WEIGHT_NAME = "001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth"
SWINIR_WEIGHT_PATH = f"/opt/models/{SWINIR_WEIGHT_NAME}"
SWINIR_WEIGHT_BYTES = 67_277_475
SWINIR_WEIGHT_SHA256 = "2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac"

UPSCALE_SCALE = 2
MAX_INPUT_BYTES = 25 * 1024 * 1024
MAX_INPUT_EDGE = 4096
MAX_INPUT_PIXELS = 4_194_304
MAX_OUTPUT_EDGE = 8192
MAX_OUTPUT_PIXELS = 16_777_216
SUPPORTED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
TILE_SIZE = 256
TILE_OVERLAP = 32
WINDOW_SIZE = 8

worker_state = modal.Dict.from_name(STATE_DICT_NAME, create_if_missing=True)

gateway_image = (
    modal.Image.debian_slim(python_version=PYTHON_VERSION)
    .pip_install(
        f"modal=={MODAL_VERSION}",
        "fastapi[standard]==0.121.0",
        "Pillow==11.2.1",
    )
    .env(
        {
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
            "RENDERLAB_UPSCALE_WORKER_ID": WORKER_ID,
            "RENDERLAB_UPSCALE_STATE_DICT": STATE_DICT_NAME,
        }
    )
)

runtime_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-runtime-ubuntu22.04",
        add_python=PYTHON_VERSION,
    )
    .entrypoint([])
    .apt_install("git", "curl", "ca-certificates", "libgl1", "libglib2.0-0")
    .uv_pip_install(
        f"modal=={MODAL_VERSION}",
        "numpy==2.2.6",
        "Pillow==11.2.1",
        "timm==1.0.19",
        "torch==2.7.1",
        "torchvision==0.22.1",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .run_commands(
        f"git clone --filter=blob:none {SWINIR_REPOSITORY} {SWINIR_SOURCE_DIR}",
        f"git -C {SWINIR_SOURCE_DIR} checkout --detach {SWINIR_COMMIT}",
        "mkdir -p /opt/models",
        f"curl --fail --location --retry 4 --retry-all-errors --connect-timeout 30 --max-time 600 '{SWINIR_WEIGHT_URL}' -o '{SWINIR_WEIGHT_PATH}'",
        f"test \"$(stat -c '%s' '{SWINIR_WEIGHT_PATH}')\" = '{SWINIR_WEIGHT_BYTES}'",
        f"echo '{SWINIR_WEIGHT_SHA256}  {SWINIR_WEIGHT_PATH}' | sha256sum -c -",
    )
    .env(
        {
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
            "RENDERLAB_UPSCALE_WORKER_ID": WORKER_ID,
            "RENDERLAB_UPSCALE_STATE_DICT": STATE_DICT_NAME,
        }
    )
)

app = modal.App(APP_NAME)


def _log(event: str, **fields: Any) -> None:
    print({"event": event, **fields}, flush=True)


def _set_worker_state(state: str, **fields: Any) -> None:
    payload = {
        "state": state,
        "worker_id": WORKER_ID,
        "ecosystem": ECOSYSTEM_ID,
        "updated_at": int(time.time()),
        **fields,
    }
    worker_state["worker"] = payload
    _log("worker_state", **payload)


def _current_worker_state() -> dict[str, Any]:
    try:
        return worker_state.get("worker") or {
            "state": "sleeping",
            "worker_id": WORKER_ID,
            "ecosystem": ECOSYSTEM_ID,
        }
    except Exception:
        return {
            "state": "unknown",
            "worker_id": WORKER_ID,
            "ecosystem": ECOSYSTEM_ID,
        }


def _failure_payload(exc: BaseException) -> tuple[int, str, str, str]:
    text = f"{type(exc).__name__}: {exc}"
    lowered = text.lower()
    if any(token in lowered for token in ("workspace disabled", "workspace is disabled", "not found", "unavailable")):
        return 503, "WORKER_UNAVAILABLE", "unavailable", text
    if any(token in lowered for token in ("cuda out of memory", "out of memory", "resource exhausted")):
        return 503, "WORKER_CAPACITY_EXHAUSTED", "degraded", text
    return 502, "WORKER_RUNTIME_FAILED", "failed", text


def _validate_geometry(width: int, height: int) -> None:
    if width < 1 or height < 1:
        raise ValueError("input image geometry is invalid")
    if width > MAX_INPUT_EDGE or height > MAX_INPUT_EDGE:
        raise ValueError(f"input image edge exceeds {MAX_INPUT_EDGE}px")
    if width * height > MAX_INPUT_PIXELS:
        raise ValueError(f"input image exceeds {MAX_INPUT_PIXELS} pixels")
    output_width = width * UPSCALE_SCALE
    output_height = height * UPSCALE_SCALE
    if output_width > MAX_OUTPUT_EDGE or output_height > MAX_OUTPUT_EDGE:
        raise ValueError(f"output image edge exceeds {MAX_OUTPUT_EDGE}px")
    if output_width * output_height > MAX_OUTPUT_PIXELS:
        raise ValueError(f"output image exceeds {MAX_OUTPUT_PIXELS} pixels")


def _normalized_source_geometry(
    width: int,
    height: int,
    orientation: int,
    frame_count: int,
) -> tuple[int, int]:
    if frame_count != 1:
        raise ValueError("animated or multi-frame image sources are not supported")
    if orientation in {5, 6, 7, 8}:
        width, height = height, width
    _validate_geometry(width, height)
    return width, height


def _decode_image_metadata(image_bytes: bytes) -> tuple[int, int, bool]:
    from PIL import Image

    with Image.open(io.BytesIO(image_bytes)) as opened:
        opened.verify()
    with Image.open(io.BytesIO(image_bytes)) as opened:
        width, height = _normalized_source_geometry(
            opened.size[0],
            opened.size[1],
            int(opened.getexif().get(274, 1) or 1),
            int(getattr(opened, "n_frames", 1) or 1),
        )
        has_alpha = opened.mode in {"RGBA", "LA"} or "transparency" in opened.info
    return width, height, has_alpha


def _padding_mode(height: int, width: int, pad_height: int, pad_width: int) -> str:
    can_reflect_height = pad_height == 0 or (height > 1 and pad_height < height)
    can_reflect_width = pad_width == 0 or (width > 1 and pad_width < width)
    return "reflect" if can_reflect_height and can_reflect_width else "replicate"


def _pad_to_window(tensor: Any) -> tuple[Any, int, int]:
    import torch
    import torch.nn.functional as functional

    height, width = tensor.shape[-2:]
    pad_height = (WINDOW_SIZE - height % WINDOW_SIZE) % WINDOW_SIZE
    pad_width = (WINDOW_SIZE - width % WINDOW_SIZE) % WINDOW_SIZE
    if not pad_height and not pad_width:
        return tensor, height, width

    mode = _padding_mode(height, width, pad_height, pad_width)
    return functional.pad(tensor, (0, pad_width, 0, pad_height), mode=mode), height, width


def _tile_starts(length: int, tile: int, overlap: int) -> list[int]:
    if length <= tile:
        return [0]
    stride = tile - overlap
    starts = list(range(0, max(1, length - tile + 1), stride))
    final_start = length - tile
    if starts[-1] != final_start:
        starts.append(final_start)
    return starts


def _upscale_rgb_tensor(model: Any, tensor: Any) -> Any:
    import torch

    _, _, height, width = tensor.shape
    tile_height = min(TILE_SIZE, height)
    tile_width = min(TILE_SIZE, width)
    overlap_height = min(TILE_OVERLAP, max(0, tile_height // 4))
    overlap_width = min(TILE_OVERLAP, max(0, tile_width // 4))
    y_starts = _tile_starts(height, tile_height, overlap_height)
    x_starts = _tile_starts(width, tile_width, overlap_width)

    output = torch.zeros(
        (1, 3, height * UPSCALE_SCALE, width * UPSCALE_SCALE),
        device=tensor.device,
        dtype=tensor.dtype,
    )
    weight = torch.zeros_like(output)

    for top in y_starts:
        for left in x_starts:
            patch = tensor[:, :, top : top + tile_height, left : left + tile_width]
            padded, patch_height, patch_width = _pad_to_window(patch)
            with torch.inference_mode():
                result = model(padded)
            result = result[:, :, : patch_height * UPSCALE_SCALE, : patch_width * UPSCALE_SCALE]
            out_top = top * UPSCALE_SCALE
            out_left = left * UPSCALE_SCALE
            out_bottom = out_top + patch_height * UPSCALE_SCALE
            out_right = out_left + patch_width * UPSCALE_SCALE
            output[:, :, out_top:out_bottom, out_left:out_right] += result
            weight[:, :, out_top:out_bottom, out_left:out_right] += 1

    return (output / weight.clamp_min(1)).clamp_(0, 1)


@app.cls(
    image=runtime_image,
    gpu=GPU_TYPE,
    memory=WORKER_MEMORY_MB,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    scaledown_window=CONTAINER_IDLE_SECONDS,
    min_containers=0,
    max_containers=1,
)
@modal.concurrent(max_inputs=1)
class ImageUpscaleWorker:
    @modal.enter()
    def load(self) -> None:
        import torch

        sys.path.insert(0, SWINIR_SOURCE_DIR)
        from models.network_swinir import SwinIR

        _set_worker_state("loading", source_commit=SWINIR_COMMIT, weight_sha256=SWINIR_WEIGHT_SHA256)
        model = SwinIR(
            upscale=UPSCALE_SCALE,
            in_chans=3,
            img_size=64,
            window_size=WINDOW_SIZE,
            img_range=1.0,
            depths=[6, 6, 6, 6, 6, 6],
            embed_dim=180,
            num_heads=[6, 6, 6, 6, 6, 6],
            mlp_ratio=2,
            upsampler="pixelshuffle",
            resi_connection="1conv",
        )
        checkpoint = torch.load(SWINIR_WEIGHT_PATH, map_location="cpu", weights_only=True)
        model.load_state_dict(checkpoint["params"], strict=True)
        model.eval()
        self.device = torch.device("cuda")
        self.model = model.to(self.device)
        _set_worker_state("sleeping", ready=True, source_commit=SWINIR_COMMIT, weight_sha256=SWINIR_WEIGHT_SHA256)

    @modal.method()
    def warm(self) -> dict[str, Any]:
        return {
            "ready": True,
            "worker_id": WORKER_ID,
            "ecosystem": ECOSYSTEM_ID,
            "source_commit": SWINIR_COMMIT,
            "weight_sha256": SWINIR_WEIGHT_SHA256,
        }

    @modal.method()
    def upscale(self, *, image_bytes: bytes, content_type: str, scale: int = UPSCALE_SCALE) -> bytes:
        import numpy as np
        import torch
        from PIL import Image, ImageOps

        if scale != UPSCALE_SCALE:
            raise ValueError(f"only {UPSCALE_SCALE}x upscale is supported")
        if content_type not in SUPPORTED_CONTENT_TYPES:
            raise ValueError("unsupported image content type")
        if not image_bytes or len(image_bytes) > MAX_INPUT_BYTES:
            raise ValueError("input image size is invalid")

        width, height, has_alpha = _decode_image_metadata(image_bytes)
        _set_worker_state("generating", width=width, height=height, scale=scale)
        started = time.perf_counter()
        try:
            with Image.open(io.BytesIO(image_bytes)) as opened:
                expected_size = _normalized_source_geometry(
                    opened.size[0],
                    opened.size[1],
                    int(opened.getexif().get(274, 1) or 1),
                    int(getattr(opened, "n_frames", 1) or 1),
                )
                normalized = ImageOps.exif_transpose(opened)
                if normalized.size != expected_size:
                    raise RuntimeError(
                        f"normalized source geometry mismatch: got {normalized.size[0]}x{normalized.size[1]}, "
                        f"expected {expected_size[0]}x{expected_size[1]}"
                    )
                rgba = normalized.convert("RGBA") if has_alpha else None
                rgb = normalized.convert("RGB")

            array = np.asarray(rgb, dtype=np.float32) / 255.0
            tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0).to(self.device)
            result = _upscale_rgb_tensor(self.model, tensor)
            output_array = (
                result.squeeze(0).permute(1, 2, 0).detach().cpu().mul(255).round().byte().numpy()
            )
            output = Image.fromarray(output_array, mode="RGB")

            if rgba is not None:
                alpha = rgba.getchannel("A").resize(
                    (width * UPSCALE_SCALE, height * UPSCALE_SCALE),
                    Image.Resampling.LANCZOS,
                )
                output = output.convert("RGBA")
                output.putalpha(alpha)

            if output.size != (width * UPSCALE_SCALE, height * UPSCALE_SCALE):
                raise RuntimeError(
                    f"upscale geometry mismatch: got {output.size[0]}x{output.size[1]}, "
                    f"expected {width * UPSCALE_SCALE}x{height * UPSCALE_SCALE}"
                )

            buffer = io.BytesIO()
            output.save(buffer, format="PNG", optimize=False)
            payload = buffer.getvalue()
            _set_worker_state(
                "sleeping",
                ready=True,
                last_duration_ms=round((time.perf_counter() - started) * 1000),
                last_output_width=output.size[0],
                last_output_height=output.size[1],
                last_alpha=has_alpha,
            )
            return payload
        except Exception:
            _set_worker_state("degraded")
            raise


@app.function(image=gateway_image, timeout=3600)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, File, Form, HTTPException, UploadFile
    from fastapi.responses import JSONResponse, Response

    api = FastAPI(title="RenderLab Image Upscale Worker", version="1.0.0")

    @api.get("/health")
    async def health():
        return {
            "ready": True,
            "async_jobs": True,
            "cancel_jobs": True,
            "upscale_scales": [UPSCALE_SCALE],
            "output_content_types": ["image/png"],
            "ecosystem": ECOSYSTEM_ID,
            "worker_id": WORKER_ID,
            "source": {
                "repository": "JingyunLiang/SwinIR",
                "tag": SWINIR_TAG,
                "commit": SWINIR_COMMIT,
                "license": SWINIR_LICENSE,
            },
            "model": {
                "weight": SWINIR_WEIGHT_NAME,
                "bytes": SWINIR_WEIGHT_BYTES,
                "sha256": SWINIR_WEIGHT_SHA256,
                "native_scale": UPSCALE_SCALE,
            },
            "limits": {
                "max_input_bytes": MAX_INPUT_BYTES,
                "max_input_edge": MAX_INPUT_EDGE,
                "max_input_pixels": MAX_INPUT_PIXELS,
                "max_output_edge": MAX_OUTPUT_EDGE,
                "max_output_pixels": MAX_OUTPUT_PIXELS,
            },
            "worker": _current_worker_state(),
        }

    @api.post("/jobs/upscale")
    async def submit_upscale(
        image_file: UploadFile = File(...),
        scale: int = Form(UPSCALE_SCALE),
    ):
        content_type = (image_file.content_type or "").lower()
        if content_type not in SUPPORTED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="source must be PNG, JPEG, or WebP")
        if scale != UPSCALE_SCALE:
            raise HTTPException(status_code=400, detail=f"only {UPSCALE_SCALE}x upscale is supported")
        image_bytes = await image_file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="source image is empty")
        if len(image_bytes) > MAX_INPUT_BYTES:
            raise HTTPException(status_code=413, detail="source image must be 25 MB or smaller")
        try:
            width, height, has_alpha = _decode_image_metadata(image_bytes)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            call = ImageUpscaleWorker().upscale.spawn(
                image_bytes=image_bytes,
                content_type=content_type,
                scale=scale,
            )
            current = _current_worker_state()
            state = str(current.get("state") or "sleeping")
            worker_state_name = "queued" if state in {"generating", "loading"} else "waking"
            return {
                "status": "queued",
                "call_id": call.object_id,
                "worker_state": worker_state_name,
                "worker_id": WORKER_ID,
                "ecosystem": ECOSYSTEM_ID,
                "scale": UPSCALE_SCALE,
                "source_width": width,
                "source_height": height,
                "output_width": width * UPSCALE_SCALE,
                "output_height": height * UPSCALE_SCALE,
                "alpha": has_alpha,
            }
        except Exception as exc:
            status_code, error_code, state, detail = _failure_payload(exc)
            return JSONResponse(
                status_code=status_code,
                content={
                    "error": detail,
                    "errorCode": error_code,
                    "workerState": state,
                    "worker_id": WORKER_ID,
                    "ecosystem": ECOSYSTEM_ID,
                },
            )

    @api.get("/jobs/{call_id}")
    async def poll_upscale(call_id: str):
        try:
            call = modal.FunctionCall.from_id(call_id)
            result = call.get(timeout=0)
        except TimeoutError:
            current = _current_worker_state()
            return JSONResponse(
                status_code=202,
                content={
                    "status": "running",
                    "call_id": call_id,
                    "worker_state": current.get("state") or "generating",
                    "worker_id": WORKER_ID,
                    "ecosystem": ECOSYSTEM_ID,
                },
            )
        except modal.exception.OutputExpiredError as exc:
            raise HTTPException(status_code=410, detail="upscale job result expired") from exc
        except Exception as exc:
            status_code, error_code, state, detail = _failure_payload(exc)
            return JSONResponse(
                status_code=status_code,
                content={
                    "error": detail,
                    "errorCode": error_code,
                    "workerState": state,
                    "worker_id": WORKER_ID,
                    "ecosystem": ECOSYSTEM_ID,
                },
            )
        return Response(content=result, media_type="image/png")

    @api.delete("/jobs/{call_id}")
    async def cancel_upscale(call_id: str):
        try:
            call = modal.FunctionCall.from_id(call_id)
            call.cancel(terminate_containers=False)
            return {
                "status": "cancelled",
                "call_id": call_id,
                "worker_id": WORKER_ID,
                "ecosystem": ECOSYSTEM_ID,
            }
        except modal.exception.OutputExpiredError:
            return {
                "status": "cancelled",
                "call_id": call_id,
                "worker_id": WORKER_ID,
                "ecosystem": ECOSYSTEM_ID,
            }
        except Exception as exc:
            status_code, error_code, state, detail = _failure_payload(exc)
            return JSONResponse(
                status_code=status_code,
                content={
                    "error": detail,
                    "errorCode": error_code,
                    "workerState": state,
                    "worker_id": WORKER_ID,
                    "ecosystem": ECOSYSTEM_ID,
                },
            )

    return api
