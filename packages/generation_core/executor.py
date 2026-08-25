"""Durable queue adapter and real ComfyUI execution for Studio generations."""

from __future__ import annotations

import base64
import hashlib
import os
import traceback
import uuid
from pathlib import Path
from typing import Any

from integrations.comfyui.pool_manager import ModalComfyUIPoolManager
from integrations.comfyui.token_pool import ModalToken, load_tokens
from packages.modal_runtime import clear_modal_provider_config_cache, clear_runtime_state_cache, load_modal_provider_secret_config

from .comfyui_local import LocalComfyUIClient, output_graph
from .contracts import GenerationRequest
from .registry import WorkflowRegistry
from .store import StudioStore


class StudioProviderConfigurationError(RuntimeError):
    """Raised when the real generation provider is not safely configured."""


class StudioGenerationExecutor:
    def __init__(self, *, persistence: Any, store: StudioStore, registry: WorkflowRegistry) -> None:
        self.persistence = persistence
        self.queue = persistence.execution_queue
        self.store = store
        self.registry = registry
        self.queue_name = "studio-generation"
        self.worker_id = f"studio-api-{os.getpid()}"

    def enqueue(self, *, generation_id: str, job_id: str) -> dict[str, Any]:
        return self.queue.enqueue(
            f"studio-{job_id}", run_id=job_id, queue_name=self.queue_name,
            capabilities=["comfyui"], payload={"generation_id": generation_id}, max_attempts=1,
        )

    def readiness(self) -> dict[str, Any]:
        mode = str(os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal").strip().lower()
        if mode == "local":
            try:
                client = LocalComfyUIClient.discover()
                info = client.object_info()
                return {
                    "configured": True,
                    "provider": "local_comfyui",
                    "source": "local_workspace",
                    "base_url": client.base_url,
                    "node_count": len(info),
                    "reactor_available": "ReActorFaceSwap" in info,
                    "workflows": self.registry.preflight(info),
                }
            except Exception as exc:  # noqa: BLE001
                return {
                    "configured": False,
                    "provider": "local_comfyui",
                    "source": "unavailable",
                    "message": str(exc),
                }
        try:
            app_name, hf_token, tokens, source = _provider_settings()
            provider = ModalComfyUIPoolManager(
                app_name=app_name,
                hf_token=hf_token,
                tokens=tokens,
                request_timeout_seconds=max(60, int(os.getenv("RENDERLAB_MODAL_TIMEOUT_SECONDS") or "1800")),
                max_failover_attempts=max(1, int(os.getenv("RENDERLAB_IMAGE_FAILOVER_ATTEMPTS") or "3")),
                load_provider_config=False,
                studio_mode=True,
            )
            result = provider.studio_status()
            status = dict(result.get("response") or {})
            object_info = status.get("object_info") if isinstance(status.get("object_info"), dict) else {}
            return {
                "configured": True,
                "provider": "modal_comfyui",
                "source": source,
                "app_name": app_name,
                "account_count": len(tokens),
                "has_hf_token": bool(hf_token),
                "base_url": str(result.get("api_url") or ""),
                "gpu_type": str(status.get("gpu_type") or ""),
                "node_count": len(object_info),
                "reactor_available": "ReActorFaceSwap" in object_info,
                "workflows": self.registry.preflight(object_info),
                "runtime_scope": "production",
                "model_storage": "modal_volume",
            }
        except (StudioProviderConfigurationError, Exception) as exc:
            return {
                "configured": False,
                "provider": "modal_comfyui",
                "source": "unavailable",
                "app_name": "",
                "account_count": 0,
                "has_hf_token": False,
                "message": str(exc),
            }

    def request_cancel(self, job_id: str) -> dict[str, Any] | None:
        item = self.queue.get(f"studio-{job_id}")
        if item is None:
            return None
        result = self.queue.request_cancel(item["queue_id"], reason="User requested cancellation")
        generation = self.store.generation_for_job(job_id)
        if generation and generation["status"] == "queued":
            self.store.update_generation(generation["id"], status="cancelled", phase="Cancelled", error_code="cancelled", error_message="Generation cancelled before it started.")
            self.store.add_event(job_id, event_type="job.cancelled", status="cancelled", phase="Cancelled")
        elif generation:
            self.store.update_generation(generation["id"], status="cancelling", phase="Cancelling")
            self.store.add_event(job_id, event_type="job.cancellation_requested", status="cancelling", phase="Cancelling")
        return result

    def process_one(self) -> None:
        item = self.queue.claim(self.queue_name, worker_id=self.worker_id, lease_seconds=1800)
        if item is None:
            return
        generation_id = str((item.get("payload") or {}).get("generation_id") or "")
        generation = self.store.get_generation(generation_id)
        if generation is None:
            self.queue.fail(item["queue_id"], worker_id=self.worker_id, lease_token=item["lease_token"], error={"code": "generation_missing"}, retryable=False)
            return
        job_id = generation["job_id"]
        try:
            if item.get("cancellation_requested_at_ms"):
                raise _Cancelled()
            self._phase(generation_id, job_id, "preparing", "Preparing", "Validating workflow and inputs.")
            self._raise_if_cancelled(item["queue_id"])
            manifest = self.registry.get(generation["workflow_id"])
            parameters = dict(generation["parameters"])
            self._phase(generation_id, job_id, "running", "Loading model", "Connecting to the ComfyUI image runtime.")
            self._raise_if_cancelled(item["queue_id"])
            mode = str(os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal").strip().lower()
            local: LocalComfyUIClient | None = None
            if mode == "local":
                try:
                    local = LocalComfyUIClient.discover()
                except Exception:
                    if mode == "local":
                        raise
            if local is not None:
                self._run_local(
                    client=local,
                    generation=generation,
                    generation_id=generation_id,
                    job_id=job_id,
                    queue_id=item["queue_id"],
                    lease_token=item["lease_token"],
                    manifest=manifest,
                )
                return
            self._run_modal(
                generation=generation,
                generation_id=generation_id,
                job_id=job_id,
                queue_id=item["queue_id"],
                lease_token=item["lease_token"],
                manifest=manifest,
            )
            return
        except _Cancelled:
            self.store.update_generation(generation_id, status="cancelled", phase="Cancelled", error_code="cancelled", error_message="Generation was cancelled.")
            self.store.add_event(job_id, event_type="job.cancelled", status="cancelled", phase="Cancelled")
            self.queue.complete(item["queue_id"], worker_id=self.worker_id, lease_token=item["lease_token"], status="cancelled", payload={})
        except Exception as exc:  # noqa: BLE001
            current = self.queue.get(item["queue_id"])
            if current and current.get("cancellation_requested_at_ms"):
                self.store.update_generation(generation_id, status="cancelled", phase="Cancelled", error_code="cancelled", error_message="Generation was cancelled.")
                self.store.add_event(job_id, event_type="job.cancelled", status="cancelled", phase="Cancelled")
                self.queue.complete(item["queue_id"], worker_id=self.worker_id, lease_token=item["lease_token"], status="cancelled", payload={})
                return
            code, message = _friendly_error(exc)
            self.store.update_generation(
                generation_id, status="failed", phase="Failed", error_code=code, error_message=message,
                technical_error={"type": type(exc).__name__, "message": str(exc), "traceback": traceback.format_exc(limit=12)},
            )
            self.store.add_event(job_id, event_type="job.failed", status="failed", phase="Failed", message=message, payload={"code": code})
            self.queue.fail(item["queue_id"], worker_id=self.worker_id, lease_token=item["lease_token"], error={"code": code, "message": str(exc)}, retryable=False)

    def _run_local(
        self,
        *,
        client: LocalComfyUIClient,
        generation: dict[str, Any],
        generation_id: str,
        job_id: str,
        queue_id: str,
        lease_token: str,
        manifest: Any,
    ) -> None:
        self._phase(
            generation_id,
            job_id,
            "preparing",
            "Uploading references",
            "Staging references in the local ComfyUI input directory.",
        )
        staged: dict[str, str] = {}
        for reference in generation.get("references") or []:
            asset_id = str(reference.get("asset_id") or "")
            if not asset_id or asset_id in staged:
                continue
            metadata, data = self.store.asset_bytes(asset_id)
            staged[asset_id] = client.upload(
                filename=str(metadata.get("filename") or f"{asset_id}.png"),
                data=data,
                content_type=str(metadata.get("content_type") or "application/octet-stream"),
            )
        self._raise_if_cancelled(queue_id)
        request = GenerationRequest.model_validate(
            {
                "workflow_id": generation["workflow_id"],
                "prompt": generation.get("prompt") or "",
                "negative_prompt": generation.get("negative_prompt") or "",
                "references": generation.get("references") or [],
                "parameters": generation.get("parameters") or {},
                "session_id": generation.get("session_id") or "",
                "parent_generation_id": generation.get("parent_generation_id") or "",
                "operation": generation.get("operation") or "generate",
            }
        )
        graph = self.registry.map_request(request, staged_assets=staged)
        self._phase(
            generation_id,
            job_id,
            "running",
            "Generating",
            f"Running {manifest.display_name} in local ComfyUI.",
        )
        artifacts = client.execute(
            graph,
            output_nodes=[item.node for item in manifest.outputs],
            cancel_requested=lambda: bool(
                (self.queue.get(queue_id) or {}).get("cancellation_requested_at_ms")
            ),
        )
        self._raise_if_cancelled(queue_id)
        self._phase(
            generation_id,
            job_id,
            "saving",
            "Saving output",
            "Writing ComfyUI outputs to RenderLab storage.",
        )
        asset_ids: list[str] = []
        for ordinal, artifact in enumerate(artifacts):
            asset = self.store.create_asset(
                filename=artifact.filename,
                content_type=artifact.content_type,
                data=artifact.data,
                kind="output",
                source_generation_id=generation_id,
                metadata={
                    "workflow_id": manifest.id,
                    "workflow_version": manifest.version,
                    "model_family": manifest.model_family,
                    "seed": (generation.get("parameters") or {}).get("seed"),
                    "generation_id": generation_id,
                    "parent_generation_id": generation.get("parent_generation_id") or "",
                    "comfyui_node_id": artifact.node_id,
                    "comfyui_url": client.base_url,
                },
            )
            self.store.attach_output(
                generation_id,
                asset["id"],
                ordinal=ordinal,
                output_key="videos" if artifact.content_type.startswith("video/") else "images",
            )
            asset_ids.append(asset["id"])
        self.store.update_generation(generation_id, status="completed", phase="Completed")
        self.store.add_event(
            job_id,
            event_type="job.completed",
            status="completed",
            phase="Completed",
            payload={"asset_ids": asset_ids},
        )
        self.queue.complete(
            queue_id,
            worker_id=self.worker_id,
            lease_token=lease_token,
            status="succeeded",
            payload={"asset_ids": asset_ids},
        )

    def _run_modal(
        self,
        *,
        generation: dict[str, Any],
        generation_id: str,
        job_id: str,
        queue_id: str,
        lease_token: str,
        manifest: Any,
    ) -> None:
        self._phase(
            generation_id,
            job_id,
            "preparing",
            "Uploading references",
            "Sending references directly to the Modal ComfyUI workspace.",
        )
        staged: dict[str, str] = {}
        remote_inputs: list[dict[str, Any]] = []
        for reference in generation.get("references") or []:
            asset_id = str(reference.get("asset_id") or "")
            if not asset_id or asset_id in staged:
                continue
            metadata, data = self.store.asset_bytes(asset_id)
            filename = Path(str(metadata.get("filename") or f"{asset_id}.png")).name
            remote_name = f"RenderLab/{uuid.uuid4().hex}-{filename}"
            staged[asset_id] = remote_name
            remote_inputs.append({
                "name": remote_name,
                "content_type": str(metadata.get("content_type") or "application/octet-stream"),
                "data_base64": base64.b64encode(data).decode("ascii"),
            })
        self._raise_if_cancelled(queue_id)
        request = GenerationRequest.model_validate({
            "workflow_id": generation["workflow_id"],
            "prompt": generation.get("prompt") or "",
            "negative_prompt": generation.get("negative_prompt") or "",
            "references": generation.get("references") or [],
            "parameters": generation.get("parameters") or {},
            "session_id": generation.get("session_id") or "",
            "parent_generation_id": generation.get("parent_generation_id") or "",
            "operation": generation.get("operation") or "generate",
        })
        output_nodes = [item.node for item in manifest.outputs]
        graph = output_graph(self.registry.map_request(request, staged_assets=staged), set(output_nodes))
        app_name, hf_token, tokens, _ = _provider_settings()
        provider = ModalComfyUIPoolManager(
            app_name=app_name,
            hf_token=hf_token,
            tokens=tokens,
            request_timeout_seconds=max(60, int(os.getenv("RENDERLAB_MODAL_TIMEOUT_SECONDS") or "1800")),
            max_failover_attempts=max(1, int(os.getenv("RENDERLAB_IMAGE_FAILOVER_ATTEMPTS") or "3")),
            load_provider_config=False,
            studio_mode=True,
        )
        self._phase(generation_id, job_id, "running", "Generating on Modal", f"Running {manifest.display_name} in the production Modal workspace.")
        result = provider.execute_studio({"graph": graph, "inputs": remote_inputs, "output_nodes": output_nodes})
        self._raise_if_cancelled(queue_id)
        response = dict(result.get("response") or {})
        artifacts = response.get("artifacts") or []
        if not artifacts:
            raise RuntimeError("Modal ComfyUI completed without returning a declared output.")
        self._phase(generation_id, job_id, "saving", "Saving output", "Writing Modal outputs to RenderLab storage.")
        asset_ids: list[str] = []
        for ordinal, artifact in enumerate(artifacts):
            data = artifact.get("data")
            if not isinstance(data, (bytes, bytearray)) or not data:
                raise RuntimeError("Modal ComfyUI returned an empty output artifact.")
            content_type = str(artifact.get("content_type") or "application/octet-stream")
            asset = self.store.create_asset(
                filename=str(artifact.get("filename") or f"{generation_id}-{ordinal}.bin"),
                content_type=content_type,
                data=bytes(data),
                kind="output",
                source_generation_id=generation_id,
                metadata={
                    "workflow_id": manifest.id,
                    "workflow_version": manifest.version,
                    "model_family": manifest.model_family,
                    "seed": (generation.get("parameters") or {}).get("seed"),
                    "generation_id": generation_id,
                    "parent_generation_id": generation.get("parent_generation_id") or "",
                    "comfyui_node_id": str(artifact.get("node_id") or ""),
                    "comfyui_provider": "modal",
                    "modal_app_name": app_name,
                    "modal_token_name": str(result.get("token_name") or ""),
                },
            )
            self.store.attach_output(
                generation_id,
                asset["id"],
                ordinal=ordinal,
                output_key="videos" if content_type.startswith("video/") else "images",
            )
            asset_ids.append(asset["id"])
        self.store.update_generation(generation_id, status="completed", phase="Completed")
        self.store.add_event(job_id, event_type="job.completed", status="completed", phase="Completed", payload={"asset_ids": asset_ids})
        self.queue.complete(queue_id, worker_id=self.worker_id, lease_token=lease_token, status="succeeded", payload={"asset_ids": asset_ids})

    def _phase(self, generation_id: str, job_id: str, status: str, phase: str, message: str) -> None:
        self.store.update_generation(generation_id, status=status, phase=phase)
        self.store.add_event(job_id, event_type="job.phase", status=status, phase=phase, message=message)

    def _raise_if_cancelled(self, queue_id: str) -> None:
        current = self.queue.get(queue_id)
        if current and current.get("cancellation_requested_at_ms"):
            raise _Cancelled()


class _Cancelled(Exception):
    pass


def workflow_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _provider_settings() -> tuple[str, str, list[Any], str]:
    clear_modal_provider_config_cache()
    persisted_error: Exception | None = None
    try:
        config = load_modal_provider_secret_config("modal_comfyui")
        tokens = load_tokens()
        if config.app_name and config.hf_token and tokens:
            return config.app_name, config.hf_token, tokens, "persistence"
    except Exception as exc:  # noqa: BLE001
        persisted_error = exc

    allow_env = str(os.getenv("RENDERLAB_MODAL_ALLOW_ENV_FALLBACK") or "").strip().lower() in {"1", "true", "yes"}
    if allow_env:
        tokens = load_tokens()
        app_name = str(os.getenv("MODAL_COMFYUI_APP_NAME") or "renderlab-image-runtime").strip()
        hf_token = str(os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN") or "").strip()
        if tokens and hf_token:
            return app_name, hf_token, tokens, "environment_fallback"

    allow_cli = str(os.getenv("RENDERLAB_MODAL_ALLOW_CLI_PROFILE") or "").strip().lower() in {"1", "true", "yes"}
    if allow_cli:
        state_db = Path(os.getenv("RENDERLAB_STORAGE_ROOT") or "analysis_outputs/renderlab_storage") / "modal_runtime_state.db"
        state_db.parent.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("RENDERLAB_MODAL_STATE_DB_MODE", "test_harness")
        os.environ.setdefault("RENDERLAB_MODAL_STATE_DB_URL", f"sqlite:///{state_db.resolve().as_posix()}")
        clear_runtime_state_cache()
        app_name = str(os.getenv("MODAL_COMFYUI_APP_NAME") or "renderlab-image-runtime").strip()
        hf_token = str(os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN") or "").strip()
        return app_name, hf_token, [ModalToken(name="cli-profile", token_id="", token_secret="")], "modal_cli_profile"

    if persisted_error is not None:
        raise StudioProviderConfigurationError(
            "RenderLab cannot read the persisted Modal provider configuration. Configure the persistence runtime or explicitly enable a documented local fallback."
        ) from persisted_error
    raise StudioProviderConfigurationError(
        "The Modal ComfyUI provider is incomplete. Configure an app name, Hugging Face token, and at least one Modal account."
    )


def _extract_image_bytes(result: dict[str, Any]) -> bytes:
    direct = result.get("image_bytes")
    nested = (result.get("response") or {}).get("image_bytes") if isinstance(result.get("response"), dict) else None
    payload = direct or nested
    if not isinstance(payload, (bytes, bytearray)) or not payload:
        raise RuntimeError("ComfyUI completed without returning an image output.")
    return bytes(payload)


def _friendly_error(exc: Exception) -> tuple[str, str]:
    text = str(exc).lower()
    if isinstance(exc, StudioProviderConfigurationError):
        return "provider_not_configured", str(exc)
    if "out of memory" in text or "cuda oom" in text:
        return "out_of_memory", "The workflow ran out of GPU memory while loading or generating."
    if "workflow" in text and "not enabled" in text:
        return "workflow_disabled", "This workflow is not available for RenderLab generation yet."
    if isinstance(exc, TimeoutError):
        return "generation_timeout", "ComfyUI did not finish before the configured generation timeout."
    if "connection" in text or "modal" in text:
        return "comfyui_unavailable", "The ComfyUI generation service is unavailable. Try again when it is online."
    if "without returning an image output" in text:
        return "output_missing", "ComfyUI finished the workflow, but no image output was returned."
    return "generation_failed", "The generation could not be completed. Technical details were saved for debugging."
