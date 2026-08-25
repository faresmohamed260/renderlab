"""Small, workflow-agnostic client for a local ComfyUI HTTP server."""

from __future__ import annotations

import mimetypes
import os
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

import requests


@dataclass(frozen=True)
class ComfyUIArtifact:
    data: bytes
    filename: str
    content_type: str
    node_id: str


class LocalComfyUIClient:
    """Upload inputs, submit an API graph, and retrieve its declared outputs."""

    def __init__(self, base_url: str, *, timeout_seconds: int = 900, session: Any | None = None) -> None:
        self.base_url = str(base_url or "").strip().rstrip("/")
        if not self.base_url:
            raise ValueError("base_url is required")
        self.timeout_seconds = max(5, int(timeout_seconds))
        self.session = session or requests.Session()
        self.client_id = f"RenderLab-{uuid.uuid4().hex}"

    @classmethod
    def discover(
        cls, *, timeout_seconds: int = 3, execution_timeout_seconds: int | None = None
    ) -> "LocalComfyUIClient":
        configured = str(os.getenv("RENDERLAB_COMFYUI_URLS") or os.getenv("RENDERLAB_COMFYUI_URL") or "")
        candidates = [item.strip() for item in configured.split(",") if item.strip()]
        if not candidates:
            candidates = ["http://127.0.0.1:8100", "http://127.0.0.1:8188"]
        execution_timeout = execution_timeout_seconds or int(
            os.getenv("RENDERLAB_COMFYUI_TIMEOUT_SECONDS")
            or os.getenv("RENDERLAB_IMAGE_TIMEOUT_SECONDS")
            or "1800"
        )
        errors: list[str] = []
        for url in candidates:
            client = cls(url, timeout_seconds=max(5, timeout_seconds))
            try:
                client.system_stats(timeout_seconds=timeout_seconds)
                client.timeout_seconds = max(60, int(execution_timeout))
                return client
            except Exception as exc:  # noqa: BLE001 - discovery must try the next local endpoint
                errors.append(f"{url}: {exc}")
        raise RuntimeError("No local ComfyUI server is ready. " + " | ".join(errors))

    def system_stats(self, *, timeout_seconds: int | None = None) -> dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}/system_stats",
            timeout=timeout_seconds or min(self.timeout_seconds, 10),
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise RuntimeError("ComfyUI returned an invalid system status response")
        return payload

    def object_info(self) -> dict[str, Any]:
        response = self.session.get(f"{self.base_url}/object_info", timeout=min(self.timeout_seconds, 30))
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {}

    def upload(self, *, filename: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        safe_name = Path(filename).name or f"reference-{uuid.uuid4().hex}"
        remote_name = f"RenderLab/{uuid.uuid4().hex}-{safe_name}"
        response = self.session.post(
            f"{self.base_url}/upload/image",
            data={"type": "input", "subfolder": "RenderLab", "overwrite": "false"},
            files={"image": (Path(remote_name).name, data, content_type)},
            timeout=min(self.timeout_seconds, 120),
        )
        response.raise_for_status()
        payload = response.json()
        name = str(payload.get("name") or Path(remote_name).name)
        subfolder = str(payload.get("subfolder") or "RenderLab").strip("/\\")
        return f"{subfolder}/{name}" if subfolder else name

    def execute(
        self,
        graph: dict[str, Any],
        *,
        output_nodes: Iterable[str],
        poll_interval_seconds: float = 0.5,
        cancel_requested: Callable[[], bool] | None = None,
    ) -> list[ComfyUIArtifact]:
        declared = {str(item) for item in output_nodes}
        executable_graph = output_graph(graph, declared)
        response = self.session.post(
            f"{self.base_url}/prompt",
            json={"prompt": executable_graph, "client_id": self.client_id},
            timeout=min(self.timeout_seconds, 60),
        )
        response.raise_for_status()
        queued = response.json()
        prompt_id = str(queued.get("prompt_id") or "")
        if not prompt_id:
            node_errors = queued.get("node_errors") or {}
            raise RuntimeError(f"ComfyUI rejected the workflow: {node_errors}")

        deadline = time.monotonic() + self.timeout_seconds
        history: dict[str, Any] = {}
        while time.monotonic() < deadline:
            if cancel_requested is not None and cancel_requested():
                self.session.post(
                    f"{self.base_url}/interrupt",
                    json={"prompt_id": prompt_id},
                    timeout=min(self.timeout_seconds, 30),
                )
                raise RuntimeError(f"ComfyUI prompt {prompt_id} was interrupted")
            status = self.session.get(
                f"{self.base_url}/history/{prompt_id}", timeout=min(self.timeout_seconds, 30)
            )
            status.raise_for_status()
            payload = status.json()
            if isinstance(payload, dict) and prompt_id in payload:
                history = payload[prompt_id]
                break
            time.sleep(max(0.05, float(poll_interval_seconds)))
        if not history:
            raise TimeoutError(f"ComfyUI did not finish prompt {prompt_id} before the timeout")

        status_record = history.get("status") or {}
        if status_record.get("status_str") == "error":
            messages = status_record.get("messages") or []
            raise RuntimeError(f"ComfyUI workflow failed: {messages}")

        artifacts: list[ComfyUIArtifact] = []
        for node_id, output in dict(history.get("outputs") or {}).items():
            if declared and str(node_id) not in declared:
                continue
            for field in ("images", "videos", "video", "audio"):
                media_items = output.get(field) or []
                if isinstance(media_items, dict):
                    media_items = [media_items]
                for item in media_items:
                    filename = str(item.get("filename") or "")
                    if not filename:
                        continue
                    media = self.session.get(
                        f"{self.base_url}/view",
                        params={
                            "filename": filename,
                            "subfolder": str(item.get("subfolder") or ""),
                            "type": str(item.get("type") or "output"),
                        },
                        timeout=min(self.timeout_seconds, 180),
                    )
                    media.raise_for_status()
                    content_type = str(media.headers.get("content-type") or "").split(";", 1)[0]
                    if not content_type:
                        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
                    artifacts.append(
                        ComfyUIArtifact(bytes(media.content), filename, content_type, str(node_id))
                    )
        if not artifacts:
            raise RuntimeError("ComfyUI completed without returning a declared output")
        return artifacts


def output_graph(graph: dict[str, Any], output_nodes: set[str]) -> dict[str, Any]:
    """Drop disconnected UI/export helpers so only declared output ancestry executes."""
    graph = _collapse_static_conditionals(graph)
    if not output_nodes or not output_nodes.issubset({str(item) for item in graph}):
        return graph
    reachable: set[str] = set()
    pending = list(output_nodes)
    while pending:
        node_id = str(pending.pop())
        if node_id in reachable:
            continue
        node = graph.get(node_id)
        if not isinstance(node, dict):
            continue
        reachable.add(node_id)
        for value in dict(node.get("inputs") or {}).values():
            if (
                isinstance(value, list)
                and len(value) == 2
                and str(value[0]) in graph
                and isinstance(value[1], int)
            ):
                pending.append(str(value[0]))
    return {node_id: node for node_id, node in graph.items() if str(node_id) in reachable}


def _collapse_static_conditionals(graph: dict[str, Any]) -> dict[str, Any]:
    collapsed = {str(node_id): {**node, "inputs": dict(node.get("inputs") or {})} for node_id, node in graph.items()}
    replacements: dict[str, list[Any]] = {}
    for node_id, node in collapsed.items():
        if node.get("class_type") != "easy ifElse":
            continue
        boolean_link = node["inputs"].get("boolean")
        if not isinstance(boolean_link, list) or len(boolean_link) != 2:
            continue
        boolean_node = collapsed.get(str(boolean_link[0]))
        if not boolean_node or boolean_node.get("class_type") != "PrimitiveBoolean":
            continue
        branch = "on_true" if bool(boolean_node["inputs"].get("value")) else "on_false"
        selected = node["inputs"].get(branch)
        if isinstance(selected, list) and len(selected) == 2:
            replacements[node_id] = selected
    if not replacements:
        return collapsed
    for node in collapsed.values():
        for input_name, value in list(node["inputs"].items()):
            if isinstance(value, list) and len(value) == 2 and str(value[0]) in replacements:
                node["inputs"][input_name] = list(replacements[str(value[0])])
    return collapsed
