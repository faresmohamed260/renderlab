"""Thin HTTP client for the deployed ComfyUI Modal service."""

from __future__ import annotations

import base64
from typing import Any
import time

import requests

from packages.modal_runtime.profiling import record_modal_timing


class ModalComfyUIClient:
    def __init__(self, api_url: str, *, timeout_seconds: int = 600) -> None:
        self.api_url = str(api_url or "").strip().rstrip("/")
        self.timeout_seconds = max(1, int(timeout_seconds))
        if not self.api_url:
            raise ValueError("api_url is required")

    def render(
        self,
        *,
        prompt: str,
        negative_prompt: str = "blurry, low quality, distorted hands, artifacts",
        seed: int = 5,
        steps: int = 20,
        cfg: float = 8.0,
        width: int = 512,
        height: int = 512,
        workflow_mode: str = "character_sheet",
    ) -> dict[str, Any]:
        mode = str(workflow_mode or "").strip().lower()
        if mode not in {"character_sheet", "entity_generation"}:
            raise ValueError(f"Unsupported workflow_mode '{workflow_mode}'. Expected 'character_sheet' or 'entity_generation'.")
        params = {
            "prompt": str(prompt or ""),
            "negative_prompt": str(negative_prompt or "blurry, low quality, distorted hands, artifacts"),
            "seed": int(seed),
            "steps": int(steps),
            "cfg": float(cfg),
            "width": int(width),
            "height": int(height),
            "workflow_mode": mode,
        }
        request_started_at = time.perf_counter()
        response = requests.get(self.api_url, params=params, timeout=self.timeout_seconds, stream=True)
        headers_elapsed = time.perf_counter() - request_started_at
        response.raise_for_status()
        content_started_at = time.perf_counter()
        body = response.content
        body_elapsed = time.perf_counter() - content_started_at
        total_elapsed = time.perf_counter() - request_started_at
        content_type = str(response.headers.get("Content-Type") or "").lower()
        record_modal_timing(
            "modal_render_http",
            total_elapsed,
            api_url=self.api_url,
            workflow_mode=mode,
            status_code=response.status_code,
            headers_elapsed_seconds=round(headers_elapsed, 6),
            body_elapsed_seconds=round(body_elapsed, 6),
            content_length=len(body),
        )
        if "image/png" not in content_type:
            preview = body[:400].decode("utf-8", errors="replace")
            raise RuntimeError(f"Modal ComfyUI API returned non-image content: {content_type} :: {preview}")
        return {
            "image_bytes": body,
            "media_type": content_type or "image/png",
            "api_url": self.api_url,
            "params": params,
            "request_metrics": {
                "headers_elapsed_seconds": round(headers_elapsed, 6),
                "body_elapsed_seconds": round(body_elapsed, 6),
                "total_elapsed_seconds": round(total_elapsed, 6),
                "status_code": int(response.status_code),
                "content_length": len(body),
            },
        }

    def execute_studio(self, payload: dict[str, Any]) -> dict[str, Any]:
        request_started_at = time.perf_counter()
        response = requests.post(self.api_url, json=payload, timeout=self.timeout_seconds)
        response.raise_for_status()
        result = response.json()
        if not isinstance(result, dict):
            raise RuntimeError("Modal RenderLab endpoint returned an invalid response.")
        artifacts = []
        for item in result.get("artifacts") or []:
            artifacts.append({
                "filename": str(item.get("filename") or "output.bin"),
                "content_type": str(item.get("content_type") or "application/octet-stream"),
                "node_id": str(item.get("node_id") or ""),
                "data": base64.b64decode(str(item.get("data_base64") or ""), validate=True),
            })
        result["artifacts"] = artifacts
        result["request_metrics"] = {
            "total_elapsed_seconds": round(time.perf_counter() - request_started_at, 6),
            "status_code": int(response.status_code),
            "artifact_count": len(artifacts),
        }
        return result

    def studio_status(self) -> dict[str, Any]:
        response = requests.post(
            self.api_url,
            json={"action": "status"},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise RuntimeError("Modal Studio status endpoint returned an invalid response.")
        return payload
