from __future__ import annotations

import asyncio
import json
import os
import secrets
import threading
import uuid
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse

from packages.generation_core import GenerationRequest, ManifestValidationError, WorkflowRegistry
from packages.generation_core.executor import StudioGenerationExecutor, workflow_hash, _provider_settings
from integrations.comfyui.workspace_client import invoke_studio_model_catalog
from packages.generation_core.comfy_workspace import ComfyUIWorkspaceCatalog
from packages.generation_core.provider_credentials import ProviderCredentialStore
from packages.generation_core.model_downloads import ModelDownloadManager
from packages.generation_core.schema import STUDIO_TABLES
from packages.generation_core.store import StudioStore
from packages.persistence_runtime import PersistenceProfile, PersistenceRuntimeConfig, create_persistence_client
from packages.persistence_runtime.database_url import build_database_url_from_env


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_ROOT = ROOT / "integrations" / "comfyui" / "manifests"
APP_HOST = str(os.getenv("RENDERLAB_HOST") or "127.0.0.1")
APP_PORT = int(os.getenv("RENDERLAB_PORT") or "8685")


def _resolve_flux_dimensions(request: GenerationRequest, store: StudioStore) -> None:
    if request.workflow_id != "flux2-klein-9b":
        return
    parameters = dict(request.parameters or {})
    longest_edge = int(parameters.get("resolution") or 1024)
    source_width = source_height = 0
    if str(parameters.get("size_mode") or "auto") == "auto":
        reference = next((item for item in request.references if item.role == "image"), None)
        asset = store.get_asset(reference.asset_id) if reference else None
        if asset:
            source_width = int(asset.get("width") or 0)
            source_height = int(asset.get("height") or 0)
    if source_width <= 0 or source_height <= 0:
        try:
            source_width, source_height = (int(value) for value in str(parameters.get("aspect_ratio") or "1:1").split(":", 1))
        except (TypeError, ValueError):
            source_width = source_height = 1
    scale = longest_edge / max(source_width, source_height)
    parameters["width"] = max(64, round((source_width * scale) / 16) * 16)
    parameters["height"] = max(64, round((source_height * scale) / 16) * 16)
    request.parameters = parameters


def _resolution_edge(value: object, default: int = 480) -> int:
    normalized = str(value or "").strip().lower()
    return {
        "480p": 480,
        "720p": 720,
        "1080p": 1080,
        "2k": 1440,
        "4k": 2160,
    }.get(normalized, default)


def _ratio_pair(value: object, fallback: tuple[int, int] = (16, 9)) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in str(value or "").split(":", 1))
    except (TypeError, ValueError):
        return fallback
    return (width, height) if width > 0 and height > 0 else fallback


def _round_video_dimension(value: float) -> int:
    return max(32, int(value // 32) * 32)


def _resolve_ltx_dimensions(request: GenerationRequest, store: StudioStore) -> None:
    if request.workflow_id != "ltx-video":
        return
    parameters = dict(request.parameters or {})
    longest_edge = _resolution_edge(parameters.get("resolution"), 480)
    source_width = source_height = 0
    if str(parameters.get("aspect_ratio") or "auto").casefold() == "auto":
        reference = next((item for item in request.references if item.role == "start_image"), None)
        asset = store.get_asset(reference.asset_id) if reference else None
        if asset:
            source_width = int(asset.get("width") or 0)
            source_height = int(asset.get("height") or 0)
    if source_width <= 0 or source_height <= 0:
        source_width, source_height = _ratio_pair(parameters.get("aspect_ratio"), (16, 9))
    short_edge = _round_video_dimension(longest_edge)
    if source_width <= source_height:
        parameters["width"] = short_edge
        parameters["height"] = _round_video_dimension(short_edge * source_height / source_width)
    else:
        parameters["height"] = short_edge
        parameters["width"] = _round_video_dimension(short_edge * source_width / source_height)
    request.parameters = parameters


_runtime_lock = threading.Lock()
_runtime_instance = None


def runtime():
    global _runtime_instance
    if _runtime_instance is not None:
        return _runtime_instance
    with _runtime_lock:
        if _runtime_instance is not None:
            return _runtime_instance
        _runtime_instance = _build_runtime()
        return _runtime_instance


def _build_runtime():
    mode = str(os.getenv("RENDERLAB_DB_MODE") or "test_harness").strip()
    default_storage_root = Path("/tmp/renderlab_storage") if os.getenv("VERCEL") else ROOT / "analysis_outputs" / "renderlab_storage"
    local_root = str(os.getenv("RENDERLAB_STORAGE_ROOT") or default_storage_root)
    Path(local_root).mkdir(parents=True, exist_ok=True)
    database_url = str(os.getenv("RENDERLAB_DB_URL") or "").strip()
    if not database_url:
        database_url = build_database_url_from_env() if mode != "test_harness" else f"sqlite:///{(Path(local_root) / 'studio.db').as_posix()}"
    profile = PersistenceProfile(
        name="RenderLab", provider="supabase", mode=mode, database_url=database_url,
        application_name="RenderLab", local_storage_root_dir=local_root,
    )
    client = create_persistence_client(profile=profile, config=PersistenceRuntimeConfig(profile=profile))
    client.initialize()
    if mode == "test_harness":
        from packages.persistence_runtime.schema import Base
        Base.metadata.create_all(client.engine, tables=STUDIO_TABLES)
    registry = WorkflowRegistry(MANIFEST_ROOT).load()
    store = StudioStore(session_factory=client.provider.session_factory, objects=client.objects)
    executor = StudioGenerationExecutor(persistence=client, store=store, registry=registry)
    return client, registry, store, executor


def _clear_runtime() -> None:
    global _runtime_instance
    with _runtime_lock:
        previous = _runtime_instance
        _runtime_instance = None
    if previous is not None:
        previous[0].engine.dispose()


runtime.cache_clear = _clear_runtime


app = FastAPI(title="RenderLab API")
origins = [item.strip() for item in str(os.getenv("RENDERLAB_CORS_ORIGINS") or "http://127.0.0.1:4185,http://localhost:4185").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/studio/health")
def health():
    _, registry, _, _ = runtime()
    return {"ok": True, "service": "RenderLab", "workflow_count": len(registry.list_public()), "registry_errors": registry.errors}


@app.get("/studio/runtime")
def provider_runtime():
    _, _, _, executor = runtime()
    return executor.readiness()


@app.get("/studio/comfyui/workspace")
def comfyui_workspace():
    if str(os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal").strip().lower() != "local":
        status = provider_runtime()
        return {
            "root": "modal://renderlab-comfyui-cache",
            "workflow_count": len(status.get("workflows") or []),
            "model_count": len(installed_models().get("items") or []),
            "partial_download_count": 0,
            "custom_nodes": [],
            "reactor": {"installed": bool(status.get("reactor_available")), "version": "modal" if status.get("reactor_available") else ""},
            "families": sorted({item["model_family"] for item in runtime()[1].list_public()}),
            "runtime_scope": "production",
        }
    try:
        return ComfyUIWorkspaceCatalog().summary()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail={"code": "comfyui_workspace_missing", "message": str(exc)}) from exc


@app.get("/studio/comfyui/workflows")
def comfyui_workflows():
    if str(os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal").strip().lower() != "local":
        return {"workflows": runtime()[1].list_public(), "source": "modal_manifest_registry"}
    try:
        return {"workflows": ComfyUIWorkspaceCatalog().list_workflows()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail={"code": "comfyui_workspace_missing", "message": str(exc)}) from exc


@app.get("/studio/models")
def installed_models(family: str = "", kind: str = ""):
    download_jobs = ModelDownloadManager().list().get("jobs") or []
    metadata_by_model = {
        (str(job.get("destination_kind") or "").casefold(), str(job.get("filename") or "").casefold()): dict(job.get("metadata") or {})
        for job in download_jobs
        if job.get("filename")
    }
    if str(os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal").strip().lower() != "local":
        try:
            app_name, _hf_token, tokens, _source = _provider_settings()
            payload = invoke_studio_model_catalog(tokens[0], app_name)
            normalized_family = family.strip().casefold()
            normalized_kind = kind.strip().casefold()
            items = []
            for model in payload.get("models") or []:
                model_kind = str(model.get("destination_kind") or "models")
                filename = str(model.get("filename") or "")
                metadata = metadata_by_model.get((model_kind.casefold(), filename.casefold()), {})
                families = sorted(
                    ComfyUIWorkspaceCatalog._families_for_text(f"{filename} {model_kind}")
                    | {str(item).casefold() for item in metadata.get("model_families") or [] if item}
                )
                if normalized_family and normalized_family not in families:
                    continue
                if normalized_kind and normalized_kind != model_kind.casefold():
                    continue
                items.append({
                    "name": filename,
                    "path": f"modal://renderlab-comfyui-cache/{model_kind}/{filename}",
                    "kind": model_kind,
                    "model_families": families,
                    "metadata": metadata,
                    "size_bytes": int(model.get("byte_length") or 0),
                    "status": str(model.get("status") or "installed"),
                    "modified_at": str(model.get("created_at") or payload.get("updated_at") or ""),
                })
            return {"items": items, "total": len(items), "runtime": "modal"}
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=503, detail={"code": "modal_model_catalog_unavailable", "message": str(exc)}) from exc
    try:
        items = []
        for model in ComfyUIWorkspaceCatalog().list_models(family="", kind=kind):
            metadata = metadata_by_model.get((str(model.get("kind") or "").casefold(), str(model.get("name") or "").casefold()), {})
            families = sorted(set(model.get("model_families") or []) | {str(item).casefold() for item in metadata.get("model_families") or [] if item})
            if family.strip().casefold() and family.strip().casefold() not in families:
                continue
            items.append({**model, "model_families": families, "metadata": metadata})
        return {"items": items, "total": len(items)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail={"code": "comfyui_workspace_missing", "message": str(exc)}) from exc


@app.get("/studio/settings/providers")
def provider_settings():
    try:
        return ProviderCredentialStore().statuses()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"code": "credential_vault_unavailable", "message": str(exc)}) from exc


@app.patch("/studio/settings/providers/{provider_id}")
def save_provider_setting(provider_id: str, payload: dict):
    try:
        return ProviderCredentialStore().save(provider_id, str(payload.get("api_key") or ""))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "provider_not_found", "message": "Model provider not found."}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_api_key", "message": str(exc)}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"code": "credential_vault_unavailable", "message": str(exc)}) from exc


@app.delete("/studio/settings/providers/{provider_id}")
def remove_provider_setting(provider_id: str):
    try:
        return ProviderCredentialStore().delete(provider_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "provider_not_found", "message": "Model provider not found."}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"code": "credential_vault_unavailable", "message": str(exc)}) from exc


@app.get("/studio/model-downloads")
def model_downloads():
    return ModelDownloadManager().list()


@app.post("/studio/model-downloads", status_code=202)
def create_model_download(payload: dict, background_tasks: BackgroundTasks):
    try:
        manager = ModelDownloadManager()
        job = manager.create(payload)
        background_tasks.add_task(manager.process, job["id"])
        return job
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_model_download", "message": str(exc)}) from exc


@app.post("/studio/model-downloads/{job_id}/cancel", status_code=202)
def cancel_model_download(job_id: str):
    try:
        return ModelDownloadManager().cancel(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "download_not_found", "message": "Model download not found."}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail={"code": "download_not_cancellable", "message": str(exc)}) from exc


@app.post("/studio/model-downloads/{job_id}/retry", status_code=202)
def retry_model_download(job_id: str, background_tasks: BackgroundTasks):
    try:
        manager = ModelDownloadManager()
        job = manager.retry(job_id)
        background_tasks.add_task(manager.process, job_id)
        return job
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "download_not_found", "message": "Model download not found."}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail={"code": "download_not_retryable", "message": str(exc)}) from exc


@app.get("/studio/workflows")
def workflows(include_disabled: bool = Query(False)):
    _, registry, _, _ = runtime()
    return {"workflows": registry.list_public(enabled_only=not include_disabled), "errors": registry.errors}


@app.get("/studio/workflows/{workflow_id}")
def workflow(workflow_id: str):
    _, registry, _, _ = runtime()
    try:
        return registry.get(workflow_id).public_payload()
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "workflow_not_found", "message": "Workflow not found."}) from exc


@app.get("/studio/sessions")
def sessions():
    _, _, store, _ = runtime()
    return {"sessions": store.list_sessions()}


@app.post("/studio/sessions", status_code=201)
def create_session(payload: dict):
    _, _, store, _ = runtime()
    return store.create_session(name=str(payload.get("name") or "Untitled exploration"), project_id=str(payload.get("project_id") or ""))


@app.get("/studio/sessions/{session_id}")
def session(session_id: str):
    _, _, store, _ = runtime()
    result = store.get_session(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "session_not_found", "message": "Session not found."})
    return result


@app.patch("/studio/sessions/{session_id}")
def rename_session(session_id: str, payload: dict):
    _, _, store, _ = runtime()
    result = store.rename_session(session_id, str(payload.get("name") or ""))
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "session_not_found", "message": "Session not found."})
    return result


@app.post("/studio/assets", status_code=201)
async def upload_asset(request: Request, filename: str = Query(..., min_length=1, max_length=320)):
    _, _, store, _ = runtime()
    content_type = str(request.headers.get("content-type") or "application/octet-stream").split(";", 1)[0]
    data = await request.body()
    if not data:
        raise HTTPException(status_code=400, detail={"code": "invalid_input", "message": "The uploaded file is empty."})
    if len(data) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"code": "unsupported_file", "message": "Files must be 100 MB or smaller."})
    try:
        return store.create_asset(filename=filename, content_type=content_type, data=data)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail={"code": "unsupported_file", "message": str(exc)}) from exc


@app.get("/studio/assets/{asset_id}")
def asset(asset_id: str):
    _, _, store, _ = runtime()
    result = store.get_asset(asset_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "asset_not_found", "message": "Asset not found."})
    return result


@app.get("/studio/assets/{asset_id}/content")
def asset_content(asset_id: str):
    _, _, store, _ = runtime()
    try:
        metadata, data = store.asset_bytes(asset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "asset_not_found", "message": "Asset not found."}) from exc
    return Response(content=data, media_type=metadata["content_type"], headers={"Cache-Control": "private, max-age=31536000, immutable"})


@app.get("/studio/assets/{asset_id}/thumbnail")
def asset_thumbnail(asset_id: str):
    _, _, store, _ = runtime()
    try:
        _metadata, data = store.thumbnail_bytes(asset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "asset_not_found", "message": "Image thumbnail not found."}) from exc
    return Response(content=data, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=31536000, immutable"})


@app.get("/studio/library")
def library(media_type: str = "", favorites: bool | None = None, workflow_id: str = "", limit: int = Query(60, ge=1, le=200), offset: int = Query(0, ge=0)):
    _, _, store, _ = runtime()
    return store.list_assets(media_type=media_type, favorite=favorites, workflow_id=workflow_id, limit=limit, offset=offset)


@app.patch("/studio/assets/{asset_id}")
def update_asset(asset_id: str, payload: dict):
    _, _, store, _ = runtime()
    result = store.set_favorite(asset_id, bool(payload.get("favorite")))
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "asset_not_found", "message": "Asset not found."})
    return result


@app.post("/studio/generations", status_code=202)
def create_generation(payload: dict, background_tasks: BackgroundTasks):
    _, registry, store, executor = runtime()
    try:
        request = GenerationRequest.model_validate(payload)
        _resolve_flux_dimensions(request, store)
        _resolve_ltx_dimensions(request, store)
        worker_enabled = str(os.getenv("RENDERLAB_WORKER_ENABLED") or "1").strip().lower() not in {"0", "false", "no"}
        provider = executor.readiness()
        if worker_enabled and not provider["configured"]:
            raise HTTPException(status_code=503, detail={"code": "provider_not_configured", "message": provider["message"]})
        validated = registry.validate_request(request)
        session_id = request.session_id
        if not session_id:
            session_id = store.create_session()["id"]
            request.session_id = session_id
        generation_id = f"generation-{uuid.uuid4().hex}"
        job_id = f"job-{uuid.uuid4().hex}"
        parameters = dict(validated["parameters"])
        if "seed" in parameters and int(parameters["seed"]) < 0:
            parameters["seed"] = secrets.randbelow((1 << 63) - 1) + 1
        result = store.create_generation(
            generation_id=generation_id, job_id=job_id, session_id=session_id,
            workflow=validated["manifest"], request=request, parameters=parameters,
            workflow_hash=workflow_hash(registry.workflow_path(request.workflow_id)),
        )
        executor.enqueue(generation_id=generation_id, job_id=job_id)
        if worker_enabled:
            background_tasks.add_task(executor.process_one)
        return result
    except KeyError as exc:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"Unknown resource '{exc.args[0]}'."}) from exc
    except (ManifestValidationError, ValueError) as exc:
        raise HTTPException(status_code=422, detail={"code": "invalid_generation", "message": str(exc)}) from exc


@app.get("/studio/generations/{generation_id}")
def generation(generation_id: str):
    _, _, store, _ = runtime()
    result = store.get_generation(generation_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "generation_not_found", "message": "Generation not found."})
    return result


@app.post("/studio/generations/{generation_id}/cancel", status_code=202)
def cancel_generation(generation_id: str):
    _, _, store, executor = runtime()
    result = store.get_generation(generation_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "generation_not_found", "message": "Generation not found."})
    if result["status"] in {"completed", "failed", "cancelled"}:
        raise HTTPException(status_code=409, detail={"code": "generation_terminal", "message": "This generation has already finished."})
    executor.request_cancel(result["job_id"])
    return store.get_generation(generation_id)


@app.get("/studio/generations/{generation_id}/events")
def generation_events(generation_id: str, after: int = Query(0, ge=0)):
    _, _, store, _ = runtime()
    result = store.get_generation(generation_id)
    if result is None:
        raise HTTPException(status_code=404, detail={"code": "generation_not_found", "message": "Generation not found."})
    return {"events": store.list_events(result["job_id"], after_sequence=after)}


@app.get("/studio/queue")
def queue():
    _, _, store, _ = runtime()
    return {"jobs": store.list_queue()}


@app.get("/studio/events")
async def events(request: Request):
    async def stream():
        last_payload = ""
        while not await request.is_disconnected():
            _, _, store, _ = runtime()
            payload = json.dumps({"jobs": store.list_queue()}, default=str)
            if payload != last_payload:
                yield f"event: queue\ndata: {payload}\n\n"
                last_payload = payload
            await asyncio.sleep(2)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def main() -> None:
    import uvicorn
    uvicorn.run(app, host=APP_HOST, port=APP_PORT, log_level="info")


if __name__ == "__main__":
    main()
