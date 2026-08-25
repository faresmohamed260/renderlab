from __future__ import annotations

import copy
import base64
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import modal

try:
    from integrations.comfyui.runtime_helpers import load_workflow_json
    from integrations.comfyui.runtime_helpers import warmup_prompt_identity
except ImportError:  # pragma: no cover
    from runtime_helpers import load_workflow_json
    from runtime_helpers import warmup_prompt_identity


APP_NAME = os.environ.get("MODAL_COMFYUI_APP_NAME", "renderlab-image-runtime")
MODAL_VERSION = "1.4.2"
PYTHON_VERSION = "3.11"
COMFY_DIR = "/root/comfyui"
COMFY_PORT = 8188
CACHE_DIR = "/cache"
GPU_TYPE = os.environ.get("MODAL_COMFYUI_GPU", "A10")
CONTAINER_IDLE_SECONDS = int(os.environ.get("MODAL_COMFYUI_IDLE_SECONDS", "600"))
FUNCTION_TIMEOUT_SECONDS = int(os.environ.get("MODAL_COMFYUI_TIMEOUT_SECONDS", "1800"))
MODEL_DOWNLOAD_TIMEOUT_SECONDS = int(os.environ.get("MODAL_COMFYUI_MODEL_DOWNLOAD_TIMEOUT_SECONDS", "21600"))
WORKER_MIN_CONTAINERS = int(os.environ.get("MODAL_COMFYUI_WORKER_MIN_CONTAINERS", "0"))
ENABLE_WARMUP_RENDERS = str(os.environ.get("MODAL_COMFYUI_ENABLE_WARMUP_RENDERS") or "").strip().lower() in {"1", "true", "yes", "on"}
CHARACTER_SHEET_POSE_PATH = "/root/pose-sheet.png"
BUNDLED_CHARACTER_WORKFLOW_PATH = "/root/character_sheet_workflow.json"
BUNDLED_ENTITY_WORKFLOW_PATH = "/root/entity_generation_workflow.json"
PREFETCH_MANIFEST_PATH = Path(CACHE_DIR) / "weights" / "prefetch_manifest.json"
WORKFLOW_CACHE_DIR = Path(CACHE_DIR) / "workflows"
STUDIO_MODEL_ROOT = Path(CACHE_DIR) / "renderlab-models"
STUDIO_MODEL_MANIFEST_PATH = STUDIO_MODEL_ROOT / "manifest.json"

LOCAL_CHARACTER_WORKFLOW = Path(__file__).parent / "workflows" / "character_sheet_workflow.json"
LOCAL_ENTITY_WORKFLOW = Path(__file__).parent / "workflows" / "entity_generation_workflow.json"
LOCAL_CHARACTER_SHEET_POSE = Path(__file__).parent / "assets" / "pose-sheet.png"
LOCAL_RUNTIME_HELPERS = Path(__file__).parent / "runtime_helpers.py"
LOCAL_REACTOR_NODE = Path(os.environ.get("RENDERLAB_REACTOR_SOURCE_DIR") or r"B:\Documents\ComfyUI\custom_nodes\comfyui-reactor")

MODEL_SPECS = (
    {
        "repo_id": "Comfy-Org/z_image_turbo",
        "filename": "split_files/text_encoders/qwen_3_4b.safetensors",
        "target_subdir": "models/text_encoders",
        "target_name": "qwen_3_4b.safetensors",
    },
    {
        "repo_id": "Comfy-Org/z_image_turbo",
        "filename": "split_files/diffusion_models/z_image_turbo_bf16.safetensors",
        "target_subdir": "models/diffusion_models",
        "target_name": "z_image_turbo_bf16.safetensors",
    },
    {
        "repo_id": "Comfy-Org/z_image_turbo",
        "filename": "split_files/vae/ae.safetensors",
        "target_subdir": "models/vae",
        "target_name": "ae.safetensors",
    },
    {
        "repo_id": "alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union",
        "filename": "Z-Image-Turbo-Fun-Controlnet-Union.safetensors",
        "target_subdir": "models/model_patches",
        "target_name": "Z-Image-Turbo-Fun-Controlnet-Union.safetensors",
    },
)

CACHE_VOLUME_NAME = "renderlab-comfyui-cache"
cache_volume = modal.Volume.from_name(CACHE_VOLUME_NAME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version=PYTHON_VERSION)
    .apt_install("git", "ffmpeg", "libgl1", "libglib2.0-0", "libsm6", "libxrender1", "libxext6")
    .pip_install(
        f"modal=={MODAL_VERSION}",
        "aiohttp>=3.11.8",
        "fastapi[standard]==0.121.0",
        "huggingface_hub[hf_transfer]==0.36.0",
        "websocket-client==1.9.0",
    )
    .env(
        {
            "HF_HUB_ENABLE_HF_TRANSFER": "1",
            "HF_HUB_CACHE": CACHE_DIR,
            "HF_TOKEN": str(os.environ.get("HF_TOKEN") or "").strip(),
            "HUGGING_FACE_HUB_TOKEN": str(os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or "").strip(),
            "PIP_PREFER_BINARY": "1",
            "COMFYUI_DISABLE_TELEMETRY": "1",
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
        }
    )
    .run_commands(
        f"git clone --depth 1 https://github.com/Comfy-Org/ComfyUI.git {COMFY_DIR}",
        f"cd {COMFY_DIR} && pip install -r requirements.txt",
        f"git clone --depth 1 https://github.com/Fannovel16/comfyui_controlnet_aux.git {COMFY_DIR}/custom_nodes/comfyui_controlnet_aux",
        f"git clone --depth 1 https://github.com/kijai/ComfyUI-KJNodes.git {COMFY_DIR}/custom_nodes/comfyui-kjnodes",
        f"git clone --depth 1 https://github.com/city96/ComfyUI-GGUF.git {COMFY_DIR}/custom_nodes/ComfyUI-GGUF",
        f"git clone --depth 1 https://github.com/yolain/ComfyUI-Easy-Use.git {COMFY_DIR}/custom_nodes/comfyui-easy-use",
        f"git clone --depth 1 https://github.com/WhatDreamsCost/WhatDreamsCost-ComfyUI.git {COMFY_DIR}/custom_nodes/WhatDreamsCost-ComfyUI",
        f"for d in {COMFY_DIR}/custom_nodes/*; do if [ -f \"$d/requirements.txt\" ]; then pip install -r \"$d/requirements.txt\"; fi; done",
    )
    .add_local_file(LOCAL_RUNTIME_HELPERS, "/root/runtime_helpers.py", copy=True)
    .add_local_file(LOCAL_CHARACTER_WORKFLOW, BUNDLED_CHARACTER_WORKFLOW_PATH, copy=True)
    .add_local_file(LOCAL_ENTITY_WORKFLOW, BUNDLED_ENTITY_WORKFLOW_PATH, copy=True)
    .add_local_file(LOCAL_CHARACTER_SHEET_POSE, CHARACTER_SHEET_POSE_PATH, copy=True)
)

if LOCAL_REACTOR_NODE.is_dir():
    image = (
        image
        .add_local_dir(
            LOCAL_REACTOR_NODE,
            f"{COMFY_DIR}/custom_nodes/comfyui-reactor",
            copy=True,
            ignore=[
                "**/__pycache__/**", "**/*.pyc", "**/*.onnx", "**/*.pth", "**/*.pt",
                "**/*.safetensors", "**/*.ckpt", "**/*.bin",
            ],
        )
        .run_commands(
            f"pip install -r {COMFY_DIR}/custom_nodes/comfyui-reactor/requirements.txt",
            f"cd {COMFY_DIR}/custom_nodes/comfyui-reactor && python install.py",
        )
    )

app = modal.App(name=APP_NAME, image=image)
WORKFLOW_RUNTIME_FILENAMES = {
    "character_sheet": "character_sheet_workflow.json",
    "entity_generation": "entity_generation_workflow.json",
}


def _modal_log(event: str, **fields: Any) -> None:
    print({"event": event, **fields}, flush=True)


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_mode(workflow_mode: str) -> str:
    mode = str(workflow_mode or "").strip().lower()
    if mode not in {"character_sheet", "entity_generation"}:
        raise ValueError(f"Unsupported workflow_mode '{workflow_mode}'. Expected 'character_sheet' or 'entity_generation'.")
    return mode


def _runtime_workflow_path(mode: str) -> Path:
    normalized = _normalize_mode(mode)
    return WORKFLOW_CACHE_DIR / WORKFLOW_RUNTIME_FILENAMES[normalized]


def _bundled_workflow_path(mode: str) -> str:
    normalized = _normalize_mode(mode)
    if normalized == "character_sheet":
        return BUNDLED_CHARACTER_WORKFLOW_PATH
    return BUNDLED_ENTITY_WORKFLOW_PATH


def _runtime_workflow_manifest() -> dict[str, str]:
    return {mode: str(_runtime_workflow_path(mode)) for mode in WORKFLOW_RUNTIME_FILENAMES}


def _cache_summary() -> dict[str, Any]:
    links: list[dict[str, Any]] = []
    for spec in MODEL_SPECS:
        target = Path(COMFY_DIR) / spec["target_subdir"] / spec["target_name"]
        links.append(
            {
                "target": str(target),
                "present": target.exists(),
                "is_symlink": target.is_symlink(),
            }
        )
    return {
        "manifest_present": PREFETCH_MANIFEST_PATH.exists(),
        "model_links": links,
    }


def _read_prefetch_manifest() -> dict[str, Any]:
    if not PREFETCH_MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(PREFETCH_MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _manifest_models_ready(manifest: dict[str, Any] | None = None) -> bool:
    payload = manifest if isinstance(manifest, dict) else _read_prefetch_manifest()
    models = payload.get("models") or []
    if len(models) != len(MODEL_SPECS):
        return False
    for model in models:
        cached_path = str((model or {}).get("cached_path") or "").strip()
        if not cached_path or not Path(cached_path).exists():
            return False
    return True


def _base_status_payload(*, service: str) -> dict[str, Any]:
    return {
        "ready": True,
        "provider": "modal_comfyui",
        "runtime": "comfyui_server",
        "service": service,
        "app_name": APP_NAME,
        "gpu_type": GPU_TYPE,
        "container_idle_seconds": CONTAINER_IDLE_SECONDS,
        "cache": _cache_summary(),
        "prefetch_manifest": _read_prefetch_manifest(),
        "workflows": _runtime_workflow_manifest(),
    }


def _request_json(url: str, data: bytes | None = None) -> Any:
    request = urllib.request.Request(url, data=data)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body or exc.reason}") from None


def _request_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=120) as response:
        return response.read()


def _comfy_launch_command(*, port: int) -> list[str]:
    return [
        "python",
        "main.py",
        "--listen",
        "0.0.0.0",
        "--port",
        str(port),
        "--disable-auto-launch",
        "--preview-method",
        "none",
    ]


def _write_runtime_workflow(mode: str, workflow: dict[str, Any]) -> dict[str, Any]:
    normalized = _normalize_mode(mode)
    target = _runtime_workflow_path(normalized)
    target.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(workflow, ensure_ascii=False, indent=2)
    target.write_text(serialized, encoding="utf-8")
    return {
        "workflow_mode": normalized,
        "path": str(target),
        "size_bytes": len(serialized.encode("utf-8")),
        "updated_at": _now_utc(),
    }


def _default_workflow_templates() -> dict[str, dict[str, Any]]:
    return {
        "character_sheet": load_workflow_json(_bundled_workflow_path("character_sheet")),
        "entity_generation": load_workflow_json(_bundled_workflow_path("entity_generation")),
    }


def _seed_runtime_workflows() -> dict[str, Any]:
    WORKFLOW_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    seeded: list[dict[str, Any]] = []
    existing: list[dict[str, Any]] = []
    for mode, workflow in _default_workflow_templates().items():
        target = _runtime_workflow_path(mode)
        if target.exists():
            existing.append({"workflow_mode": mode, "path": str(target)})
            continue
        seeded.append(_write_runtime_workflow(mode, workflow))
    if seeded:
        cache_volume.commit()
    return {
        "seeded": seeded,
        "existing": existing,
        "workflows": _runtime_workflow_manifest(),
    }


def _read_runtime_workflow(mode: str) -> dict[str, Any]:
    normalized = _normalize_mode(mode)
    target = _runtime_workflow_path(normalized)
    if not target.exists():
        seed_payload = _seed_runtime_workflows()
        if not target.exists():
            raise FileNotFoundError(f"Runtime workflow for mode '{normalized}' is missing after seed attempt: {seed_payload!r}")
    return load_workflow_json(target)


def _link_model(downloaded_path: str, target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    if target_path.exists() or target_path.is_symlink():
        target_path.unlink()
    target_path.symlink_to(Path(downloaded_path))


def _prefetch_models_impl(*, force: bool = False) -> dict[str, Any]:
    from huggingface_hub import hf_hub_download

    started_at = time.perf_counter()
    timings: dict[str, float] = {}
    PREFETCH_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    should_prefetch = force or not PREFETCH_MANIFEST_PATH.exists()
    if not should_prefetch:
        manifest = _read_prefetch_manifest()
        if len(manifest.get("models") or []) != len(MODEL_SPECS):
            should_prefetch = True

    models: list[dict[str, Any]] = []
    for spec in MODEL_SPECS:
        phase_started = time.perf_counter()
        local_path = hf_hub_download(
            repo_id=spec["repo_id"],
            filename=spec["filename"],
            cache_dir=CACHE_DIR,
        )
        timings[spec["target_name"]] = round(time.perf_counter() - phase_started, 3)
        models.append(
            {
                "repo_id": spec["repo_id"],
                "filename": spec["filename"],
                "target_subdir": spec["target_subdir"],
                "target_name": spec["target_name"],
                "cached_path": local_path,
            }
        )
    if should_prefetch:
        manifest = {
            "created_at": _now_utc(),
            "models": models,
            "timings": timings,
            "cache": _cache_summary(),
        }
        PREFETCH_MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        cache_volume.commit()
    payload = {
        "prefetched": should_prefetch,
        "force": force,
        "timings": timings,
        "elapsed_seconds": round(time.perf_counter() - started_at, 3),
        "cache": _cache_summary(),
        "manifest_path": str(PREFETCH_MANIFEST_PATH),
    }
    _modal_log("prefetch_models_completed", **payload)
    return payload


def _workflow_catalog() -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for mode in WORKFLOW_RUNTIME_FILENAMES:
        path = _runtime_workflow_path(mode)
        exists = path.exists()
        size_bytes = path.stat().st_size if exists else 0
        rows.append(
            {
                "workflow_mode": mode,
                "path": str(path),
                "exists": exists,
                "size_bytes": size_bytes,
            }
        )
    return {
        "workflows": rows,
        "workflow_root": str(WORKFLOW_CACHE_DIR),
    }


def _ensure_models_linked() -> None:
    manifest = _read_prefetch_manifest()
    models = manifest.get("models") or []
    if len(models) != len(MODEL_SPECS):
        _prefetch_models_impl(force=False)
        manifest = _read_prefetch_manifest()
        models = manifest.get("models") or []
    for model in models:
        cached_path = str(model.get("cached_path") or "").strip()
        if not cached_path:
            continue
        target = Path(COMFY_DIR) / str(model["target_subdir"]) / str(model["target_name"])
        _link_model(cached_path, target)


def _read_studio_model_manifest() -> dict[str, Any]:
    try:
        payload = json.loads(STUDIO_MODEL_MANIFEST_PATH.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {"models": []}
    except (OSError, json.JSONDecodeError):
        return {"models": []}


def _link_studio_models() -> None:
    aliases = {"unet": "diffusion_models", "clip": "text_encoders"}
    for model in _read_studio_model_manifest().get("models") or []:
        cached_path = Path(str(model.get("cached_path") or ""))
        if not cached_path.is_file():
            continue
        kind = aliases.get(str(model.get("destination_kind") or ""), str(model.get("destination_kind") or ""))
        target = Path(COMFY_DIR) / "models" / kind / str(model.get("filename") or cached_path.name)
        _link_model(str(cached_path), target)


def _download_studio_model_impl(payload: dict[str, Any]) -> dict[str, Any]:
    source_url = str(payload.get("source_url") or "").strip()
    provider = str(payload.get("provider") or "").strip().casefold()
    destination_kind = str(payload.get("destination_kind") or "").strip().lower()
    filename = Path(str(payload.get("filename") or "")).name
    provider_token = str(payload.get("provider_token") or "").strip()
    expected_sha256 = str(payload.get("expected_sha256") or "").strip().lower()
    allowed_kinds = {
        "checkpoints", "diffusion_models", "unet", "loras", "controlnet", "model_patches",
        "text_encoders", "clip", "clip_vision", "vae", "audio_encoders", "upscale_models", "insightface",
    }
    if not source_url.startswith("https://") or destination_kind not in allowed_kinds or not filename:
        raise ValueError("A valid HTTPS source URL, destination kind, and filename are required.")
    target_dir = STUDIO_MODEL_ROOT / destination_kind
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / filename
    part = Path(f"{target}.part")
    if target.exists():
        raise FileExistsError(f"A Modal model named '{filename}' already exists in {destination_kind}.")
    resume_at = part.stat().st_size if part.exists() else 0
    headers = {"User-Agent": "RenderLab-Modal/0.2"}
    if provider_token:
        headers["Authorization"] = f"Bearer {provider_token}"
    if resume_at:
        headers["Range"] = f"bytes={resume_at}-"
    if provider == "civitai" and provider_token:
        parts = urllib.parse.urlsplit(source_url)
        query = urllib.parse.parse_qs(parts.query, keep_blank_values=True)
        if "token" not in query:
            query["token"] = [provider_token]
        source_url = urllib.parse.urlunsplit((
            parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query, doseq=True), parts.fragment,
        ))
    request = urllib.request.Request(source_url, headers=headers)
    try:
        response_context = urllib.request.urlopen(request, timeout=300)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Model download failed with HTTP {exc.code}.") from None
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Model download failed: {exc.reason}") from None
    with response_context as response:
        append = resume_at > 0 and int(getattr(response, "status", 200)) == 206
        if not append:
            resume_at = 0
        with part.open("ab" if append else "wb") as handle:
            while True:
                chunk = response.read(4 * 1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
    digest = hashlib.sha256()
    with part.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    sha256 = digest.hexdigest()
    if expected_sha256 and sha256 != expected_sha256:
        raise ValueError("Downloaded Modal model failed SHA-256 verification.")
    part.replace(target)
    manifest = _read_studio_model_manifest()
    models = [item for item in manifest.get("models") or [] if not (
        item.get("destination_kind") == destination_kind and item.get("filename") == filename
    )]
    record = {
        "provider": str(payload.get("provider") or ""),
        "source_url": source_url,
        "destination_kind": destination_kind,
        "filename": filename,
        "cached_path": str(target),
        "byte_length": target.stat().st_size,
        "sha256": sha256,
        "created_at": _now_utc(),
    }
    models.append(record)
    STUDIO_MODEL_MANIFEST_PATH.write_text(
        json.dumps({"models": models, "updated_at": _now_utc()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    cache_volume.commit()
    return {**record, "target_path": f"modal://{CACHE_VOLUME_NAME}/{destination_kind}/{filename}"}


def _set_if_present(workflow: dict[str, Any], node_id: str, input_key: str, value: Any) -> None:
    node = workflow.get(node_id)
    if not isinstance(node, dict):
        raise KeyError(node_id)
    inputs = node.get("inputs")
    if not isinstance(inputs, dict):
        raise KeyError(f"{node_id}.inputs")
    inputs[input_key] = value


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def prefetch_models(force: bool = False) -> dict[str, Any]:
    return _prefetch_models_impl(force=force)


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def sync_workflows(workflows: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = workflows if isinstance(workflows, dict) else {}
    updated: list[dict[str, Any]] = []
    if not payload:
        seed_payload = _seed_runtime_workflows()
        return {
            "updated": [],
            "seed": seed_payload,
            "catalog": _workflow_catalog(),
        }
    for mode in WORKFLOW_RUNTIME_FILENAMES:
        workflow_payload = payload.get(mode)
        if workflow_payload is None:
            continue
        if not isinstance(workflow_payload, dict):
            raise ValueError(f"Workflow payload for mode '{mode}' must be a JSON object.")
        updated.append(_write_runtime_workflow(mode, workflow_payload))
    if updated:
        cache_volume.commit()
    return {
        "updated": updated,
        "catalog": _workflow_catalog(),
    }


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def workflow_catalog() -> dict[str, Any]:
    _seed_runtime_workflows()
    return _workflow_catalog()


@app.function(
    image=image,
    timeout=MODEL_DOWNLOAD_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def download_studio_model(payload: dict[str, Any]) -> dict[str, Any]:
    return _download_studio_model_impl(dict(payload or {}))


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def studio_model_catalog() -> dict[str, Any]:
    dynamic = _read_studio_model_manifest().get("models") or []
    prefetched = []
    for item in _read_prefetch_manifest().get("models") or []:
        cached_path = Path(str(item.get("cached_path") or ""))
        prefetched.append({
            "provider": "huggingface",
            "destination_kind": str(item.get("target_subdir") or "").replace("models/", "", 1),
            "filename": str(item.get("target_name") or cached_path.name),
            "cached_path": str(cached_path),
            "byte_length": cached_path.stat().st_size if cached_path.is_file() else 0,
            "status": "installed" if cached_path.is_file() else "missing",
        })
    return {"models": prefetched + list(dynamic), "updated_at": _now_utc()}


@app.cls(
    image=image,
    gpu=GPU_TYPE,
    min_containers=WORKER_MIN_CONTAINERS,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    scaledown_window=CONTAINER_IDLE_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
@modal.concurrent(max_inputs=1)
class ComfyWorker:
    port: int = COMFY_PORT

    @modal.enter()
    def launch_comfy_background(self) -> None:
        started_at = time.perf_counter()
        manifest_ok = _manifest_models_ready()
        prefetch_seconds = 0.0
        if not _manifest_models_ready():
            prefetch_started_at = time.perf_counter()
            _prefetch_models_impl(force=False)
            prefetch_seconds = round(time.perf_counter() - prefetch_started_at, 3)
        link_started_at = time.perf_counter()
        _ensure_models_linked()
        _link_studio_models()
        link_seconds = round(time.perf_counter() - link_started_at, 3)
        workflow_seed_started_at = time.perf_counter()
        workflow_seed_payload = _seed_runtime_workflows()
        workflow_seed_seconds = round(time.perf_counter() - workflow_seed_started_at, 3)
        launch_started_at = time.perf_counter()
        self._process = subprocess.Popen(_comfy_launch_command(port=self.port), cwd=COMFY_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self._wait_until_ready()
        server_ready_seconds = round(time.perf_counter() - launch_started_at, 3)
        warmup_seconds = 0.0
        if ENABLE_WARMUP_RENDERS:
            warmup_started_at = time.perf_counter()
            self._run_warmup_renders()
            warmup_seconds = round(time.perf_counter() - warmup_started_at, 3)
        self._status_payload = {
            **_base_status_payload(service="worker"),
            "startup_seconds": round(time.perf_counter() - started_at, 3),
            "manifest_ready_at_boot": manifest_ok,
            "prefetch_seconds": prefetch_seconds,
            "link_seconds": link_seconds,
            "workflow_seed_seconds": workflow_seed_seconds,
            "workflow_seed": workflow_seed_payload,
            "server_ready_seconds": server_ready_seconds,
            "warmup_enabled": ENABLE_WARMUP_RENDERS,
            "warmup_seconds": warmup_seconds,
        }
        _modal_log("comfy_worker_ready", **self._status_payload)

    def _wait_until_ready(self) -> None:
        url = f"http://127.0.0.1:{self.port}/system_stats"
        deadline = time.time() + 240
        last_error: Exception | None = None
        while time.time() < deadline:
            try:
                _request_json(url)
                return
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                time.sleep(2)
        raise RuntimeError(f"ComfyUI server did not become ready: {last_error}")

    def _load_workflow(self, workflow_path: str) -> dict[str, Any]:
        return load_workflow_json(workflow_path)

    def _stage_input_image(self, source_path: str, target_name: str = "image1.png") -> None:
        target = Path(COMFY_DIR) / "input" / target_name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source_path, target)

    def _stage_studio_inputs(self, inputs: list[dict[str, Any]]) -> None:
        input_root = (Path(COMFY_DIR) / "input").resolve()
        for item in inputs:
            remote_name = str(item.get("name") or "").replace("\\", "/").strip("/")
            if not remote_name:
                raise ValueError("RenderLab input is missing a remote name.")
            target = (input_root / remote_name).resolve()
            if not target.is_relative_to(input_root):
                raise ValueError("RenderLab input path escapes the ComfyUI input directory.")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(base64.b64decode(str(item.get("data_base64") or ""), validate=True))

    def _apply_entity_inputs(
        self,
        workflow: dict[str, Any],
        *,
        prompt: str,
        negative_prompt: str,
        seed: int,
        steps: int,
        cfg: float,
        width: int,
        height: int,
        filename_prefix: str,
    ) -> dict[str, Any]:
        workflow = copy.deepcopy(workflow)
        _set_if_present(workflow, "6", "text", prompt)
        _set_if_present(workflow, "5", "text", negative_prompt)
        _set_if_present(workflow, "3", "seed", seed)
        _set_if_present(workflow, "3", "steps", steps)
        _set_if_present(workflow, "3", "cfg", cfg)
        _set_if_present(workflow, "15", "width", width)
        _set_if_present(workflow, "15", "height", height)
        _set_if_present(workflow, "16", "filename_prefix", filename_prefix)
        return workflow

    def _apply_character_sheet_inputs(
        self,
        workflow: dict[str, Any],
        *,
        prompt: str,
        negative_prompt: str,
        seed: int,
        steps: int,
        cfg: float,
        width: int,
        height: int,
        filename_prefix: str,
        pose_image_name: str,
    ) -> dict[str, Any]:
        workflow = self._apply_entity_inputs(
            workflow,
            prompt=prompt,
            negative_prompt=negative_prompt,
            seed=seed,
            steps=steps,
            cfg=cfg,
            width=width,
            height=height,
            filename_prefix=filename_prefix,
        )
        _set_if_present(workflow, "7", "image", pose_image_name)
        return workflow

    def _queue_prompt(self, workflow: dict[str, Any], prompt_id: str) -> None:
        payload = {"prompt": workflow, "prompt_id": prompt_id, "client_id": prompt_id}
        response = _request_json(
            f"http://127.0.0.1:{self.port}/prompt",
            data=json.dumps(payload).encode("utf-8"),
        )
        if not isinstance(response, dict):
            raise RuntimeError(f"ComfyUI /prompt returned an unexpected payload: {response!r}")
        if response.get("error") or response.get("node_errors"):
            raise RuntimeError(
                "ComfyUI prompt submission failed: "
                f"error={response.get('error')!r}, node_errors={response.get('node_errors')!r}"
            )
        if str(response.get("prompt_id") or "").strip() != prompt_id:
            raise RuntimeError(f"ComfyUI /prompt acknowledged an unexpected prompt_id: {response!r}")

    def _poll_history(self, prompt_id: str, timeout_seconds: int = 1200) -> dict[str, Any]:
        url = f"http://127.0.0.1:{self.port}/history/{prompt_id}"
        deadline = time.time() + timeout_seconds
        while time.time() < deadline:
            history = _request_json(url)
            item = history.get(prompt_id)
            if item:
                outputs = item.get("outputs")
                if outputs:
                    return item
                status = item.get("status") if isinstance(item.get("status"), dict) else {}
                status_text = str(
                    status.get("status_str")
                    or status.get("status")
                    or item.get("status_str")
                    or item.get("state")
                    or ""
                ).strip().lower()
                if status_text in {"error", "failed", "execution_error"}:
                    raise RuntimeError(f"ComfyUI workflow failed for prompt_id={prompt_id}: {item!r}")
                if status.get("completed") is True and not outputs:
                    raise RuntimeError(f"ComfyUI workflow completed without outputs for prompt_id={prompt_id}: {item!r}")
            time.sleep(1)
        raise TimeoutError(f"Timed out waiting for prompt {prompt_id} to finish.")

    def _fetch_first_image(self, history: dict[str, Any]) -> bytes:
        outputs = history.get("outputs", {})
        for node_output in outputs.values():
            for image in node_output.get("images", []):
                query = urllib.parse.urlencode(
                    {
                        "filename": image["filename"],
                        "subfolder": image["subfolder"],
                        "type": image["type"],
                    }
                )
                return _request_bytes(f"http://127.0.0.1:{self.port}/view?{query}")
        raise RuntimeError("Workflow completed but no image was produced.")

    def _fetch_declared_artifacts(self, history: dict[str, Any], output_nodes: list[str]) -> list[dict[str, Any]]:
        declared = {str(item) for item in output_nodes}
        artifacts: list[dict[str, Any]] = []
        for node_id, node_output in dict(history.get("outputs") or {}).items():
            if declared and str(node_id) not in declared:
                continue
            for field in ("images", "videos", "video", "audio"):
                items = node_output.get(field) or []
                if isinstance(items, dict):
                    items = [items]
                for item in items:
                    filename = str(item.get("filename") or "")
                    if not filename:
                        continue
                    query = urllib.parse.urlencode({
                        "filename": filename,
                        "subfolder": str(item.get("subfolder") or ""),
                        "type": str(item.get("type") or "output"),
                    })
                    data = _request_bytes(f"http://127.0.0.1:{self.port}/view?{query}")
                    artifacts.append({
                        "filename": filename,
                        "content_type": mimetypes.guess_type(filename)[0] or "application/octet-stream",
                        "node_id": str(node_id),
                        "data_base64": base64.b64encode(data).decode("ascii"),
                    })
        if not artifacts:
            raise RuntimeError("ComfyUI completed without returning a declared RenderLab output.")
        return artifacts

    def _run_workflow_once(
        self,
        *,
        workflow: dict[str, Any],
        prompt_id: str,
    ) -> bytes:
        self._queue_prompt(workflow, prompt_id)
        history = self._poll_history(prompt_id, timeout_seconds=600)
        return self._fetch_first_image(history)

    def _run_warmup_renders(self) -> None:
        try:
            entity_prompt_id, entity_prefix = warmup_prompt_identity("entity", uuid.uuid4())
            entity_workflow = self._apply_entity_inputs(
                workflow=_read_runtime_workflow("entity_generation"),
                prompt="Photorealistic isolated prop reference image of Sorting Hat, single subject, clean readable silhouette.",
                negative_prompt="people, hands, illustration, painting, cartoon, anime, CGI",
                seed=7,
                steps=4,
                cfg=1.0,
                width=512,
                height=512,
                filename_prefix=entity_prefix,
            )
            entity_bytes = self._run_workflow_once(workflow=entity_workflow, prompt_id=entity_prompt_id)
            _modal_log("warmup_render_completed", workflow_mode="entity_generation", prompt_id=entity_prompt_id, byte_length=len(entity_bytes))
        except Exception as exc:  # noqa: BLE001
            _modal_log("warmup_render_failed", workflow_mode="entity_generation", error=repr(exc))

        try:
            character_prompt_id, character_prefix = warmup_prompt_identity("character", uuid.uuid4())
            self._stage_input_image(CHARACTER_SHEET_POSE_PATH, "image1.png")
            character_workflow = self._apply_character_sheet_inputs(
                workflow=_read_runtime_workflow("character_sheet"),
                prompt="Photorealistic studio character-sheet photograph of a wizard, three-view layout, white seamless background.",
                negative_prompt="illustration, painterly style, anime, CGI, 3D render, extra characters",
                seed=11,
                steps=2,
                cfg=1.0,
                width=512,
                height=512,
                filename_prefix=character_prefix,
                pose_image_name="image1.png",
            )
            character_bytes = self._run_workflow_once(workflow=character_workflow, prompt_id=character_prompt_id)
            _modal_log("warmup_render_completed", workflow_mode="character_sheet", prompt_id=character_prompt_id, byte_length=len(character_bytes))
        except Exception as exc:  # noqa: BLE001
            _modal_log("warmup_render_failed", workflow_mode="character_sheet", error=repr(exc))

    @modal.method()
    def status(self) -> dict[str, Any]:
        return dict(self._status_payload)

    @modal.method()
    def render(
        self,
        *,
        prompt: str,
        negative_prompt: str = "blurry, low quality, distorted hands, artifacts",
        seed: int = 5,
        steps: int = 12,
        cfg: float = 1.0,
        width: int = 512,
        height: int = 512,
        workflow_mode: str = "character_sheet",
        filename_prefix: str = "",
        pose_image_path: str = CHARACTER_SHEET_POSE_PATH,
    ) -> bytes:
        self._wait_until_ready()
        mode = _normalize_mode(workflow_mode)
        prompt_id = str(uuid.uuid4())
        resolved_prefix = filename_prefix or f"modal-comfyui-{prompt_id[:8]}"
        if mode == "character_sheet":
            resolved_workflow = str(_runtime_workflow_path("character_sheet"))
            self._stage_input_image(pose_image_path, "image1.png")
            workflow = self._apply_character_sheet_inputs(
                workflow=_read_runtime_workflow("character_sheet"),
                prompt=prompt,
                negative_prompt=negative_prompt,
                seed=int(seed),
                steps=int(steps),
                cfg=float(cfg),
                width=int(width),
                height=int(height),
                filename_prefix=resolved_prefix,
                pose_image_name="image1.png",
            )
        else:
            resolved_workflow = str(_runtime_workflow_path("entity_generation"))
            workflow = self._apply_entity_inputs(
                workflow=_read_runtime_workflow("entity_generation"),
                prompt=prompt,
                negative_prompt=negative_prompt,
                seed=int(seed),
                steps=int(steps),
                cfg=float(cfg),
                width=int(width),
                height=int(height),
                filename_prefix=resolved_prefix,
            )
        _modal_log(
            "image_request_started",
            prompt_id=prompt_id,
            workflow_mode=mode,
            width=int(width),
            height=int(height),
            steps=int(steps),
            cfg=float(cfg),
            seed=int(seed),
        )
        started_at = time.perf_counter()
        self._queue_prompt(workflow, prompt_id)
        history = self._poll_history(prompt_id)
        image_bytes = self._fetch_first_image(history)
        _modal_log(
            "image_request_completed",
            prompt_id=prompt_id,
            workflow_mode=mode,
            elapsed_seconds=round(time.perf_counter() - started_at, 3),
            byte_length=len(image_bytes),
        )
        return image_bytes

    @modal.method()
    def execute_studio(
        self,
        *,
        graph: dict[str, Any],
        inputs: list[dict[str, Any]] | None = None,
        output_nodes: list[str] | None = None,
    ) -> dict[str, Any]:
        self._wait_until_ready()
        _link_studio_models()
        prompt_id = str(uuid.uuid4())
        self._stage_studio_inputs(list(inputs or []))
        started_at = time.perf_counter()
        self._queue_prompt(dict(graph or {}), prompt_id)
        history = self._poll_history(prompt_id, timeout_seconds=FUNCTION_TIMEOUT_SECONDS)
        artifacts = self._fetch_declared_artifacts(history, [str(item) for item in (output_nodes or [])])
        payload = {
            "prompt_id": prompt_id,
            "artifacts": artifacts,
            "elapsed_seconds": round(time.perf_counter() - started_at, 3),
            "provider": "modal_comfyui",
        }
        _modal_log(
            "studio_request_completed",
            prompt_id=prompt_id,
            elapsed_seconds=payload["elapsed_seconds"],
            artifact_count=len(artifacts),
        )
        return payload

    @modal.method()
    def studio_status(self) -> dict[str, Any]:
        self._wait_until_ready()
        object_info = _request_json(f"http://127.0.0.1:{self.port}/object_info")
        return {
            **dict(self._status_payload),
            "node_count": len(object_info) if isinstance(object_info, dict) else 0,
            "node_types": sorted(object_info) if isinstance(object_info, dict) else [],
            "object_info": object_info if isinstance(object_info, dict) else {},
            "models": _read_studio_model_manifest().get("models") or [],
        }

    @modal.fastapi_endpoint(method="GET", docs=True)
    def api(
        self,
        prompt: str,
        negative_prompt: str = "blurry, low quality, distorted hands, artifacts",
        seed: int = 5,
        steps: int = 12,
        cfg: float = 1.0,
        width: int = 512,
        height: int = 512,
        workflow_mode: str = "character_sheet",
    ):
        from fastapi import Response

        image_bytes = self.render.local(
            prompt=prompt,
            negative_prompt=negative_prompt,
            seed=seed,
            steps=steps,
            cfg=cfg,
            width=width,
            height=height,
            workflow_mode=workflow_mode,
        )
        return Response(content=image_bytes, media_type="image/png")

    @modal.fastapi_endpoint(method="POST", docs=True)
    def studio_api(self, payload: dict[str, Any]):
        action = str((payload or {}).get("action") or "execute").strip().lower()
        if action == "status":
            return self.studio_status.local()
        return self.execute_studio.local(
            graph=dict((payload or {}).get("graph") or {}),
            inputs=list((payload or {}).get("inputs") or []),
            output_nodes=[str(item) for item in ((payload or {}).get("output_nodes") or [])],
        )


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    scaledown_window=CONTAINER_IDLE_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
@modal.fastapi_endpoint(method="GET", docs=True)
def health():
    return {
        **_base_status_payload(service="control"),
        "warmup_enabled": ENABLE_WARMUP_RENDERS,
    }


@app.local_entrypoint()
def entrypoint(
    prompt: str = "",
    negative_prompt: str = "blurry, low quality, distorted hands, artifacts",
    seed: int = 5,
    steps: int = 12,
    cfg: float = 1.0,
    width: int = 512,
    height: int = 512,
    workflow_mode: str = "character_sheet",
    filename_prefix: str = "",
    pose_image_path: str = CHARACTER_SHEET_POSE_PATH,
) -> None:
    worker = ComfyWorker()
    image_bytes = worker.render.remote(
        prompt=prompt,
        negative_prompt=negative_prompt,
        seed=seed,
        steps=steps,
        cfg=cfg,
        width=width,
        height=height,
        workflow_mode=workflow_mode,
        filename_prefix=filename_prefix,
        pose_image_path=pose_image_path,
    )
    print(
        json.dumps(
            {
                "provider": "modal_comfyui",
                "workflow_mode": workflow_mode,
                "byte_length": len(image_bytes),
            },
            ensure_ascii=False,
        )
    )


@app.function(
    image=image,
    timeout=FUNCTION_TIMEOUT_SECONDS,
    volumes={CACHE_DIR: cache_volume},
)
def status() -> dict[str, Any]:
    return _base_status_payload(service="prefetch")
