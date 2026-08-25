"""Allowlisted, resumable model downloads into a local ComfyUI workspace."""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, unquote, urlsplit, urlunsplit

import requests

from .comfy_workspace import MODEL_SUFFIXES, ComfyUIWorkspaceCatalog
from .provider_credentials import ProviderCredentialStore


DESTINATION_KINDS = {
    "checkpoints", "diffusion_models", "unet", "loras", "controlnet", "model_patches",
    "text_encoders", "clip", "clip_vision", "vae", "audio_encoders", "upscale_models", "insightface",
}
MODEL_FAMILIES = {"ltx-video", "flux-klein", "qwen-image-edit", "z-image", "reactor"}
PROVIDER_HOSTS = {
    "huggingface": {"huggingface.co", "www.huggingface.co"},
    "civitai": {"civitai.com", "www.civitai.com", "civitai.red", "www.civitai.red"},
}
_state_lock = threading.RLock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ModelDownloadManager:
    def __init__(
        self,
        workspace: ComfyUIWorkspaceCatalog | None = None,
        credentials: ProviderCredentialStore | None = None,
        *,
        mode: str | None = None,
    ) -> None:
        explicit_workspace = workspace is not None
        self.workspace = workspace or ComfyUIWorkspaceCatalog()
        self.credentials = credentials or ProviderCredentialStore()
        self.mode = str(mode or ("local" if explicit_workspace else os.getenv("RENDERLAB_COMFYUI_PROVIDER") or "modal")).strip().lower()
        if self.mode == "auto":
            self.mode = "modal"
        if self.mode not in {"modal", "local"}:
            raise ValueError("Model download mode must be 'modal' or 'local'.")
        if self.mode == "modal":
            storage_root = Path(os.getenv("RENDERLAB_STORAGE_ROOT") or "analysis_outputs/renderlab_storage")
            self.state_path = storage_root / "model-downloads.json"
        else:
            self.state_path = self.workspace.root / ".RenderLab" / "model-downloads.json"

    def list(self) -> dict[str, Any]:
        jobs = list(self._load().values())
        jobs.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return {"jobs": jobs}

    def create(self, payload: dict[str, Any]) -> dict[str, Any]:
        provider = str(payload.get("provider") or "").strip().casefold()
        source_url = self._normalize_url(provider, str(payload.get("source_url") or ""))
        destination_kind = str(payload.get("destination_kind") or "").strip().casefold()
        if destination_kind not in DESTINATION_KINDS:
            raise ValueError(f"destination_kind must be one of {sorted(DESTINATION_KINDS)}")
        filename = self._safe_filename(str(payload.get("filename") or ""), optional=True)
        if self.mode == "modal" and not filename:
            raise ValueError("filename is required for downloads into the Modal model volume.")
        expected_sha256 = str(payload.get("expected_sha256") or "").strip().casefold()
        if expected_sha256 and not re.fullmatch(r"[0-9a-f]{64}", expected_sha256):
            raise ValueError("expected_sha256 must contain 64 hexadecimal characters.")
        metadata = self._metadata(payload.get("metadata") or {})
        job_id = f"model-download-{uuid.uuid4().hex}"
        job = {
            "id": job_id,
            "provider": provider,
            "source_url": source_url,
            "destination_kind": destination_kind,
            "filename": filename,
            "target_path": "",
            "runtime": self.mode,
            "expected_sha256": expected_sha256,
            "status": "queued",
            "bytes_downloaded": 0,
            "bytes_total": 0,
            "metadata": metadata,
            "error": "",
            "created_at": _now(),
            "updated_at": _now(),
        }
        state = self._load()
        state[job_id] = job
        self._save(state)
        return dict(job)

    def cancel(self, job_id: str) -> dict[str, Any]:
        state = self._load()
        job = state.get(job_id)
        if not job:
            raise KeyError(job_id)
        if self.mode == "modal" and job["status"] == "running":
            raise ValueError("A running Modal volume download cannot be cancelled; it will finish remotely.")
        if job["status"] not in {"completed", "failed", "cancelled"}:
            job["status"] = "cancelling"
            job["updated_at"] = _now()
            self._save(state)
        return dict(job)

    def retry(self, job_id: str) -> dict[str, Any]:
        state = self._load()
        job = state.get(job_id)
        if not job:
            raise KeyError(job_id)
        if job["status"] not in {"failed", "cancelled"}:
            raise ValueError("Only failed or cancelled downloads can be retried.")
        job.update({"status": "queued", "error": "", "updated_at": _now()})
        self._save(state)
        return dict(job)

    def process(self, job_id: str) -> None:
        state = self._load()
        job = state.get(job_id)
        if not job:
            return
        job.update({"status": "running", "error": "", "updated_at": _now()})
        self._save(state)
        if self.mode == "modal":
            self._process_modal(job)
            return
        response = None
        try:
            target_dir = (self.workspace.model_root / job["destination_kind"]).resolve()
            if not target_dir.is_relative_to(self.workspace.model_root.resolve()):
                raise ValueError("Model destination escapes the ComfyUI model directory.")
            target_dir.mkdir(parents=True, exist_ok=True)
            headers = {"User-Agent": "RenderLab/0.1"}
            token = self.credentials.get(job["provider"])
            if token:
                headers["Authorization"] = f"Bearer {token}"
            existing_part = Path(job["target_path"] + ".part") if job.get("target_path") else None
            resume_at = existing_part.stat().st_size if existing_part and existing_part.is_file() else 0
            if resume_at:
                headers["Range"] = f"bytes={resume_at}-"
            source_url = self._authenticated_url(job["source_url"], job["provider"], token)
            response = requests.get(source_url, headers=headers, stream=True, allow_redirects=True, timeout=(30, 300))
            response.raise_for_status()
            filename = job["filename"] or self._filename_from_response(response)
            filename = self._safe_filename(filename)
            target = (target_dir / filename).resolve()
            if not target.is_relative_to(target_dir):
                raise ValueError("Invalid model filename.")
            part = Path(f"{target}.part")
            if target.exists():
                raise FileExistsError(f"A model named '{filename}' already exists in {job['destination_kind']}.")
            if job.get("target_path") and Path(job["target_path"]).resolve() != target:
                raise ValueError("The resumed download resolved to a different filename.")
            resume_at = part.stat().st_size if part.is_file() else 0
            append = resume_at > 0 and response.status_code == 206
            if resume_at and not append:
                resume_at = 0
            content_length = int(response.headers.get("content-length") or 0)
            total = resume_at + content_length if content_length else 0
            job.update({"filename": filename, "target_path": str(target), "bytes_downloaded": resume_at, "bytes_total": total, "updated_at": _now()})
            self._store_job(job)
            next_flush = resume_at + 8 * 1024 * 1024
            with part.open("ab" if append else "wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if not chunk:
                        continue
                    if self._is_cancelling(job_id):
                        job.update({"status": "cancelled", "updated_at": _now()})
                        self._store_job(job)
                        return
                    handle.write(chunk)
                    job["bytes_downloaded"] += len(chunk)
                    if job["bytes_downloaded"] >= next_flush:
                        job["updated_at"] = _now()
                        self._store_job(job)
                        next_flush = job["bytes_downloaded"] + 8 * 1024 * 1024
            digest = self._sha256(part)
            if job["expected_sha256"] and digest != job["expected_sha256"]:
                raise ValueError("Downloaded model failed SHA-256 verification.")
            os.replace(part, target)
            job.update({"status": "completed", "sha256": digest, "bytes_downloaded": target.stat().st_size, "bytes_total": target.stat().st_size, "updated_at": _now()})
            self._store_job(job)
        except Exception as exc:  # noqa: BLE001
            job.update({"status": "failed", "error": str(exc), "updated_at": _now()})
            self._store_job(job)
        finally:
            if response is not None:
                response.close()

    def _process_modal(self, job: dict[str, Any]) -> None:
        try:
            from integrations.comfyui.workspace_client import invoke_download_studio_model
            from .executor import _provider_settings

            app_name, _hf_token, tokens, _source = _provider_settings()
            if not tokens:
                raise RuntimeError("No Modal account is configured for the Studio model volume.")
            provider_token = self.credentials.get(str(job.get("provider") or ""))
            result = invoke_download_studio_model(
                tokens[0],
                app_name,
                {
                    "provider": job["provider"],
                    "source_url": job["source_url"],
                    "destination_kind": job["destination_kind"],
                    "filename": job["filename"],
                    "expected_sha256": job.get("expected_sha256") or "",
                    "provider_token": provider_token,
                    "metadata": job.get("metadata") or {},
                },
            )
            job.update({
                "status": "completed",
                "target_path": str(result.get("target_path") or ""),
                "sha256": str(result.get("sha256") or ""),
                "bytes_downloaded": int(result.get("byte_length") or 0),
                "bytes_total": int(result.get("byte_length") or 0),
                "updated_at": _now(),
            })
            self._store_job(job)
        except Exception as exc:  # noqa: BLE001
            job.update({"status": "failed", "error": str(exc), "updated_at": _now()})
            self._store_job(job)

    def _store_job(self, job: dict[str, Any]) -> None:
        state = self._load()
        state[job["id"]] = dict(job)
        self._save(state)

    def _is_cancelling(self, job_id: str) -> bool:
        return self._load().get(job_id, {}).get("status") == "cancelling"

    def _load(self) -> dict[str, dict[str, Any]]:
        with _state_lock:
            try:
                payload = json.loads(self.state_path.read_text(encoding="utf-8"))
                return payload if isinstance(payload, dict) else {}
            except (OSError, json.JSONDecodeError):
                return {}

    def _save(self, state: dict[str, dict[str, Any]]) -> None:
        with _state_lock:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.state_path.with_suffix(".tmp")
            temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(temporary, self.state_path)

    @staticmethod
    def _normalize_url(provider: str, source_url: str) -> str:
        if provider not in PROVIDER_HOSTS:
            raise ValueError("provider must be 'huggingface' or 'civitai'.")
        parsed = urlsplit(source_url.strip())
        if parsed.scheme != "https" or parsed.hostname not in PROVIDER_HOSTS[provider] or parsed.username or parsed.password:
            raise ValueError(f"Only HTTPS {provider} URLs are accepted.")
        if provider == "huggingface":
            path = parsed.path.replace("/blob/", "/resolve/", 1)
            if "/resolve/" not in path:
                raise ValueError("Use a Hugging Face file URL containing /blob/ or /resolve/.")
            return urlunsplit(("https", "huggingface.co", path, parsed.query, ""))
        query = parse_qs(parsed.query)
        if parsed.hostname in {"civitai.red", "www.civitai.red"}:
            match = re.fullmatch(r"/api/download/models/(\d+)", parsed.path.rstrip("/"))
            file_id = (query.get("fileId") or [""])[0]
            if not match or (file_id and not re.fullmatch(r"\d+", file_id)):
                raise ValueError("Use a Civitai Red URL containing /api/download/models/{id} and an optional numeric fileId.")
            suffix = f"?fileId={file_id}" if file_id else ""
            return f"https://civitai.red/api/download/models/{match.group(1)}{suffix}"
        version_id = (query.get("modelVersionId") or [""])[0]
        match = re.search(r"/api/download/models/(\d+)", parsed.path)
        if match:
            version_id = match.group(1)
        if not re.fullmatch(r"\d+", version_id):
            raise ValueError("Use a Civitai URL containing modelVersionId or /api/download/models/{id}.")
        return f"https://civitai.com/api/download/models/{version_id}"

    @staticmethod
    def _safe_filename(value: str, *, optional: bool = False) -> str:
        normalized = Path(unquote(str(value or "").strip().replace("\\", "/"))).name
        normalized = re.sub(r"[^A-Za-z0-9._()\- +]", "_", normalized)[:220]
        if not normalized and optional:
            return ""
        if not normalized or Path(normalized).suffix.casefold() not in MODEL_SUFFIXES:
            raise ValueError("Model filename must use a supported model extension.")
        return normalized

    @staticmethod
    def _metadata(value: Any) -> dict[str, Any]:
        raw = value if isinstance(value, dict) else {}
        families = []
        for family in raw.get("model_families") or []:
            normalized = str(family or "").strip().casefold()
            if normalized in MODEL_FAMILIES and normalized not in families:
                families.append(normalized)
        trigger_words = []
        for word in raw.get("trigger_words") or []:
            normalized = str(word or "").strip()
            if normalized and len(normalized) <= 80 and normalized not in trigger_words:
                trigger_words.append(normalized)
        notes = str(raw.get("notes") or "").strip()[:500]
        try:
            recommended_strength = float(raw.get("recommended_strength"))
        except (TypeError, ValueError):
            recommended_strength = 1.0
        recommended_strength = max(-2.0, min(2.0, recommended_strength))
        return {
            "model_families": families,
            "trigger_words": trigger_words[:16],
            "notes": notes,
            "recommended_strength": recommended_strength,
        }

    @classmethod
    def _filename_from_response(cls, response: requests.Response) -> str:
        disposition = str(response.headers.get("content-disposition") or "")
        match = re.search(r"filename\*?=(?:UTF-8''|\")?([^\";]+)", disposition, re.IGNORECASE)
        if match:
            return unquote(match.group(1).strip())
        return unquote(Path(urlsplit(response.url).path).name)

    @staticmethod
    def _authenticated_url(source_url: str, provider: str, token: str) -> str:
        if str(provider or "").strip().casefold() != "civitai" or not str(token or "").strip():
            return source_url
        parts = urlsplit(source_url)
        query = parse_qs(parts.query, keep_blank_values=True)
        if "token" not in query:
            query["token"] = [str(token).strip()]
        return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query, doseq=True), parts.fragment))

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
