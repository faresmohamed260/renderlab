"""Read-only discovery of the user's active local ComfyUI workspace."""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


MODEL_SUFFIXES = {".safetensors", ".gguf", ".ckpt", ".pt", ".pth", ".onnx", ".bin"}
MODEL_REFERENCE_RE = re.compile(r'[^"\\/]+\.(?:safetensors|gguf|ckpt|pt|pth|onnx|bin)', re.IGNORECASE)


def discover_workspace_root(explicit: str | Path | None = None) -> Path:
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit))
    configured = str(os.getenv("RENDERLAB_COMFYUI_WORKSPACE") or "").strip()
    if configured:
        candidates.append(Path(configured))
    appdata = str(os.getenv("APPDATA") or "").strip()
    if appdata:
        config_path = Path(appdata) / "ComfyUI" / "config.json"
        try:
            payload = json.loads(config_path.read_text(encoding="utf-8-sig"))
            if payload.get("basePath"):
                candidates.append(Path(str(payload["basePath"])))
        except (OSError, ValueError, TypeError):
            pass
    candidates.append(Path.home() / "Documents" / "ComfyUI")
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if (resolved / "models").is_dir() and (resolved / "user").is_dir():
            return resolved
    raise FileNotFoundError("No active ComfyUI workspace was found. Set RENDERLAB_COMFYUI_WORKSPACE in RenderLab settings.")


class ComfyUIWorkspaceCatalog:
    def __init__(self, root: str | Path | None = None) -> None:
        self.root = discover_workspace_root(root)
        self.workflow_root = self.root / "user" / "default" / "workflows"
        self.model_root = self.root / "models"
        self.custom_node_root = self.root / "custom_nodes"

    def summary(self) -> dict[str, Any]:
        workflows = self.list_workflows()
        models = self.list_models()
        reactor = self.reactor_status()
        return {
            "root": str(self.root),
            "workflow_count": len(workflows),
            "model_count": len(models),
            "partial_download_count": sum(1 for item in models if item["status"] == "partial"),
            "custom_nodes": sorted(item.name for item in self.custom_node_root.iterdir() if item.is_dir()),
            "reactor": reactor,
            "families": sorted({family for item in workflows for family in item["model_families"]}),
        }

    def list_workflows(self) -> list[dict[str, Any]]:
        if not self.workflow_root.is_dir():
            return []
        return [self._workflow_payload(path) for path in sorted(self.workflow_root.rglob("*.json"), key=lambda item: item.name.casefold())]

    def list_models(self, *, family: str = "", kind: str = "") -> list[dict[str, Any]]:
        normalized_family = family.strip().casefold()
        normalized_kind = kind.strip().casefold()
        results: list[dict[str, Any]] = []
        if not self.model_root.is_dir():
            return results
        for path in self.model_root.rglob("*"):
            if not path.is_file():
                continue
            suffix = path.suffix.casefold()
            partial = suffix in {".part", ".download"}
            model_suffix = Path(path.stem).suffix.casefold() if partial else suffix
            if model_suffix not in MODEL_SUFFIXES:
                continue
            relative = path.relative_to(self.root).as_posix()
            model_kind = path.relative_to(self.model_root).parts[0] if path.parent != self.model_root else "models"
            model_family = self._families_for_text(f"{path.name} {relative}")
            if normalized_family and normalized_family not in model_family:
                continue
            if normalized_kind and normalized_kind != model_kind.casefold():
                continue
            stat = path.stat()
            results.append({
                "name": path.name,
                "path": relative,
                "kind": model_kind,
                "model_families": sorted(model_family),
                "size_bytes": stat.st_size,
                "status": "partial" if partial else "installed",
                "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
            })
        return sorted(results, key=lambda item: (item["kind"], item["name"].casefold()))

    def reactor_status(self) -> dict[str, Any]:
        root = self.custom_node_root / "comfyui-reactor"
        if not root.is_dir():
            return {"installed": False, "path": "", "version": "", "fingerprints": {}}
        version = ""
        pyproject = root / "pyproject.toml"
        try:
            match = re.search(r'^version\s*=\s*["\']([^"\']+)', pyproject.read_text(encoding="utf-8-sig"), re.MULTILINE)
            version = match.group(1) if match else ""
        except OSError:
            pass
        fingerprints = {}
        for relative in ("nodes.py", "scripts/reactor_swapper.py"):
            path = root / relative
            if path.is_file():
                fingerprints[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        return {"installed": True, "path": str(root), "version": version, "fingerprints": fingerprints}

    def _workflow_payload(self, path: Path) -> dict[str, Any]:
        raw = path.read_text(encoding="utf-8-sig")
        try:
            graph = json.loads(raw)
        except json.JSONDecodeError as exc:
            return {"name": path.stem, "path": path.relative_to(self.root).as_posix(), "valid": False, "error": str(exc)}
        node_types = sorted(set(self._node_types(graph)))
        text = f"{path.stem} {' '.join(node_types)} {raw}"
        references = sorted(set(MODEL_REFERENCE_RE.findall(raw)), key=str.casefold)
        capabilities = {"text_to_image"}
        if any(value in text.casefold() for value in ("ltx", "createvideo", "savevideo", "vhs_videocombine")):
            capabilities = {"text_to_video"}
        if any(value in node_types for value in ("LoadImage", "Load Image From Folder")):
            capabilities.add("image_reference")
        if any("qwen" in value.casefold() and "edit" in value.casefold() for value in references) or "image edit" in path.stem.casefold():
            capabilities.add("image_edit")
        if any("controlnet" in value.casefold() or "preprocessor" in value.casefold() for value in node_types):
            capabilities.add("controlnet")
        if any("lora" in value.casefold() for value in node_types):
            capabilities.add("loras")
        if any("reactor" in value.casefold() for value in node_types):
            capabilities.add("face_swap")
        families = self._families_for_text(text)
        stat = path.stat()
        return {
            "name": path.stem,
            "path": path.relative_to(self.root).as_posix(),
            "valid": True,
            "node_types": node_types,
            "model_references": references,
            "model_families": sorted(families),
            "capabilities": sorted(capabilities),
            "modified_at": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        }

    @classmethod
    def _families_for_text(cls, value: str) -> set[str]:
        text = value.casefold()
        families = set()
        if "z_image" in text or "z-image" in text:
            families.add("z-image")
        if "qwen" in text and ("image" in text or "edit" in text):
            families.add("qwen-image-edit")
        if "klein" in text or "flux-2" in text or "flux 2" in text or "f2k" in text:
            families.add("flux-klein")
        if "ltx" in text:
            families.add("ltx-video")
        if "reactor" in text or "inswapper" in text:
            families.add("reactor")
        return families

    @classmethod
    def _node_types(cls, value: Any) -> Iterable[str]:
        if isinstance(value, dict):
            node_type = value.get("type") or value.get("class_type")
            if isinstance(node_type, str) and node_type:
                yield node_type
            for child in value.values():
                yield from cls._node_types(child)
        elif isinstance(value, list):
            for child in value:
                yield from cls._node_types(child)
