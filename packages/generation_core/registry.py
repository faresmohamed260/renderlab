"""Manifest discovery, validation, public capability exposure, and graph mapping."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import secrets
from pathlib import Path
from typing import Any
from urllib.parse import quote

from pydantic import ValidationError

from .contracts import GenerationRequest, ManifestParameter, WorkflowManifest
from .comfyui_local import output_graph


class ManifestValidationError(ValueError):
    pass


class WorkflowRegistry:
    ALLOWED_TRANSFORMS = {
        "aspect_to_dimensions", "broadcast", "random_if_negative",
        "ltx_prompt", "ltx_image_timeline", "ltx_duration", "ltx_resolution", "ltx_audio_enabled", "scale_dimensions", "flux_multi_reference",
    }

    def __init__(self, manifest_root: str | Path) -> None:
        self.manifest_root = Path(manifest_root).resolve()
        self._manifests: dict[str, WorkflowManifest] = {}
        self._workflow_paths: dict[str, Path] = {}
        self._errors: list[dict[str, str]] = []

    def load(self) -> "WorkflowRegistry":
        manifests: dict[str, WorkflowManifest] = {}
        workflow_paths: dict[str, Path] = {}
        errors: list[dict[str, str]] = []
        for path in sorted(self.manifest_root.glob("*.json")):
            try:
                raw = json.loads(path.read_text(encoding="utf-8-sig"))
                manifest = WorkflowManifest.model_validate(raw)
                if manifest.id in manifests:
                    raise ManifestValidationError(f"duplicate workflow id '{manifest.id}'")
                workflow_path = (path.parent / manifest.workflow.path).resolve()
                if not workflow_path.is_relative_to(self.manifest_root.parent.resolve()):
                    raise ManifestValidationError("workflow path escapes the ComfyUI integration directory")
                if not workflow_path.is_file():
                    raise ManifestValidationError(f"workflow file does not exist: {workflow_path}")
                graph_bytes = workflow_path.read_bytes()
                digest = hashlib.sha256(graph_bytes).hexdigest()
                if manifest.workflow.sha256 and digest != manifest.workflow.sha256:
                    raise ManifestValidationError(f"workflow hash mismatch for '{manifest.id}'")
                graph = json.loads(graph_bytes.decode("utf-8-sig"))
                self._validate_graph(manifest, graph)
                manifests[manifest.id] = manifest
                workflow_paths[manifest.id] = workflow_path
            except (OSError, json.JSONDecodeError, ValidationError, ManifestValidationError, UnicodeDecodeError) as exc:
                errors.append({"file": path.name, "error": str(exc)})
        self._manifests = manifests
        self._workflow_paths = workflow_paths
        self._errors = errors
        return self

    @property
    def errors(self) -> list[dict[str, str]]:
        return list(self._errors)

    def list_public(self, *, enabled_only: bool = True) -> list[dict[str, Any]]:
        manifests = [item for item in self._manifests.values() if item.enabled or not enabled_only]
        return [item.public_payload() for item in sorted(manifests, key=lambda row: (not row.ui.recommended, row.display_name.casefold()))]

    def preflight(self, object_info: dict[str, Any]) -> list[dict[str, Any]]:
        """Check exported graphs against the nodes and selectable resources exposed by ComfyUI."""
        results: list[dict[str, Any]] = []
        manifests = [item for item in self._manifests.values() if item.enabled]
        for manifest in sorted(manifests, key=lambda row: (not row.ui.recommended, row.display_name.casefold())):
            graph = json.loads(self._workflow_paths[manifest.id].read_text(encoding="utf-8-sig"))
            graph = copy.deepcopy(graph)
            dynamic_assets: set[tuple[str, str]] = set()
            for definition in manifest.inputs:
                if definition.type == "text":
                    self._apply_mapping(graph, definition.mapping, "")
                    continue
                if definition.type != "asset":
                    continue
                targets = definition.mapping.targets or [definition.mapping]
                dynamic_assets.update((str(target.node), str(target.input)) for target in targets)
            for parameter in manifest.parameters:
                if parameter.mapping is not None and parameter.default is not None:
                    self._apply_mapping(graph, parameter.mapping, parameter.default)
            graph = output_graph(graph, {str(item.node) for item in manifest.outputs})

            issues: list[dict[str, str]] = []
            seen: set[tuple[str, str, str]] = set()
            for node_id, node in graph.items():
                if not isinstance(node, dict):
                    continue
                if not node.get("class_type"):
                    issues.append({
                        "code": "invalid_node", "node_id": str(node_id), "node": "",
                        "message": f"Workflow node '{node_id}' has no ComfyUI class type.",
                    })
                    continue
                class_type = str(node["class_type"])
                definition = object_info.get(class_type)
                if not isinstance(definition, dict):
                    key = ("missing_node", class_type, "")
                    if key not in seen:
                        seen.add(key)
                        issues.append({
                            "code": "missing_node", "node_id": str(node_id), "node": class_type,
                            "message": f"Required ComfyUI node '{class_type}' is unavailable.",
                        })
                    continue
                input_schema = dict(definition.get("input") or {})
                declared = dict(input_schema.get("required") or {}) | dict(input_schema.get("optional") or {})
                for input_name, value in dict(node.get("inputs") or {}).items():
                    if (str(node_id), str(input_name)) in dynamic_assets or not isinstance(value, str):
                        continue
                    specification = declared.get(input_name)
                    if not isinstance(specification, list) or not specification:
                        continue
                    choices = specification[0]
                    if not isinstance(choices, list) or value in choices:
                        continue
                    key = ("missing_resource", str(input_name), value)
                    if key in seen:
                        continue
                    seen.add(key)
                    kind = _resource_kind(str(input_name))
                    issues.append({
                        "code": "missing_resource", "node_id": str(node_id), "node": class_type,
                        "input": str(input_name), "kind": kind, "value": value,
                        "message": f"{kind} '{value}' is not available in the active ComfyUI runtime.",
                    })
            results.append({"workflow_id": manifest.id, "ready": not issues, "issues": issues})
        return results

    def get(self, workflow_id: str) -> WorkflowManifest:
        manifest = self._manifests.get(str(workflow_id or "").strip())
        if manifest is None:
            raise KeyError(workflow_id)
        return manifest

    def validate_request(self, request: GenerationRequest) -> dict[str, Any]:
        manifest = self.get(request.workflow_id)
        if not manifest.enabled:
            raise ManifestValidationError(f"workflow '{manifest.id}' is disabled")
        semantic_inputs = {"prompt": request.prompt, "negative_prompt": request.negative_prompt}
        if manifest.id in {"flux2-klein-9b", "ltx-video"}:
            semantic_inputs["prompt"] = re.sub(r"@Image\s+(\d+)", r"Image \1", request.prompt, flags=re.IGNORECASE)
        references_by_role: dict[str, list[str]] = {}
        for reference in request.references:
            references_by_role.setdefault(reference.role, []).append(reference.asset_id)
        for definition in manifest.inputs:
            if definition.type == "text":
                value = semantic_inputs.get(definition.id, "")
                if definition.required and not str(value or "").strip():
                    raise ManifestValidationError(f"input '{definition.id}' is required")
            else:
                values = references_by_role.get(definition.role, [])
                if definition.required and len(values) < definition.multiplicity.minimum:
                    raise ManifestValidationError(f"reference role '{definition.role}' is required")
                if len(values) > definition.multiplicity.maximum:
                    raise ManifestValidationError(
                        f"reference role '{definition.role}' accepts at most {definition.multiplicity.maximum} file(s)"
                    )
        parameters = manifest.defaults() | dict(request.parameters or {})
        definitions = {item.id: item for item in manifest.parameters}
        unknown = sorted(set(parameters) - set(definitions))
        if unknown:
            raise ManifestValidationError(f"unknown parameter(s): {', '.join(unknown)}")
        for parameter_id, value in parameters.items():
            self._validate_parameter(definitions[parameter_id], value)
        return {"manifest": manifest, "parameters": parameters, "references_by_role": references_by_role}

    def map_request(self, request: GenerationRequest, *, staged_assets: dict[str, str] | None = None) -> dict[str, Any]:
        validated = self.validate_request(request)
        manifest: WorkflowManifest = validated["manifest"]
        graph = json.loads(self._workflow_paths[manifest.id].read_text(encoding="utf-8-sig"))
        mapped = copy.deepcopy(graph)
        staged = dict(staged_assets or {})
        semantic_inputs = {"prompt": request.prompt, "negative_prompt": request.negative_prompt}
        if manifest.id in {"flux2-klein-9b", "ltx-video"}:
            semantic_inputs["prompt"] = re.sub(r"@Image\s+(\d+)", r"Image \1", request.prompt, flags=re.IGNORECASE)
        references_by_role: dict[str, list[str]] = validated["references_by_role"]
        for parameter in manifest.parameters:
            if parameter.mapping is not None and parameter.id in validated["parameters"]:
                self._apply_mapping(mapped, parameter.mapping, validated["parameters"].get(parameter.id))
        for definition in manifest.inputs:
            if definition.type == "text":
                self._apply_mapping(mapped, definition.mapping, semantic_inputs.get(definition.id, ""))
                continue
            asset_ids = references_by_role.get(definition.role, [])
            if not asset_ids:
                for fallback_role in definition.fallback_roles:
                    if references_by_role.get(fallback_role):
                        asset_ids = references_by_role[fallback_role]
                        break
            if asset_ids:
                resolved = [staged.get(asset_id, asset_id) for asset_id in asset_ids]
                self._apply_mapping(mapped, definition.mapping, resolved[0] if definition.multiplicity.maximum == 1 else resolved)
                if definition.present_mapping is not None:
                    self._apply_mapping(mapped, definition.present_mapping, definition.present_value)
        return mapped

    def workflow_path(self, workflow_id: str) -> Path:
        self.get(workflow_id)
        return self._workflow_paths[workflow_id]

    def _validate_graph(self, manifest: WorkflowManifest, graph: dict[str, Any]) -> None:
        mappings = (
            [item.mapping for item in manifest.inputs]
            + [item.present_mapping for item in manifest.inputs if item.present_mapping]
            + [item.mapping for item in manifest.parameters if item.mapping]
        )
        for mapping in mappings:
            if mapping is None:
                continue
            if mapping.transform and mapping.transform not in self.ALLOWED_TRANSFORMS:
                raise ManifestValidationError(f"unknown transform '{mapping.transform}'")
            targets = mapping.targets or ([{"node": mapping.node, "input": mapping.input}] if mapping.node else [])
            for raw_target in targets:
                node_id = raw_target.node if hasattr(raw_target, "node") else raw_target["node"]
                input_name = raw_target.input if hasattr(raw_target, "input") else raw_target["input"]
                node = graph.get(str(node_id))
                if not isinstance(node, dict) or input_name not in dict(node.get("inputs") or {}):
                    raise ManifestValidationError(f"mapping target '{node_id}.{input_name}' does not exist")
        for output in manifest.outputs:
            node = graph.get(str(output.node))
            if not isinstance(node, dict):
                raise ManifestValidationError(f"output node '{output.node}' does not exist")

    @staticmethod
    def _validate_parameter(definition: ManifestParameter, value: Any) -> None:
        if definition.type in {"integer", "number"}:
            try:
                number = int(value) if definition.type == "integer" else float(value)
            except (TypeError, ValueError) as exc:
                raise ManifestValidationError(f"parameter '{definition.id}' must be numeric") from exc
            if definition.minimum is not None and number < definition.minimum:
                raise ManifestValidationError(f"parameter '{definition.id}' must be >= {definition.minimum:g}")
            if definition.maximum is not None and number > definition.maximum:
                raise ManifestValidationError(f"parameter '{definition.id}' must be <= {definition.maximum:g}")
        elif definition.type == "enum" and value not in definition.options:
            raise ManifestValidationError(f"parameter '{definition.id}' must be one of {definition.options}")
        elif definition.type == "boolean" and not isinstance(value, bool):
            raise ManifestValidationError(f"parameter '{definition.id}' must be boolean")

    def _apply_mapping(self, graph: dict[str, Any], mapping: Any, value: Any) -> None:
        if mapping.transform == "flux_multi_reference":
            references = list(value) if isinstance(value, list) else [value]
            references = [str(item) for item in references if str(item or "").strip()]
            if not references:
                return
            self._set(graph, "1", "image", references[0])
            positive_node = "20:12:76"
            negative_node = "20:12:77"
            for index, reference in enumerate(references[1:], start=2):
                prefix = f"studio:flux-reference:{index}"
                load_node = f"{prefix}:load"
                scale_node = f"{prefix}:scale"
                encode_node = f"{prefix}:encode"
                positive_reference = f"{prefix}:positive"
                negative_reference = f"{prefix}:negative"
                graph[load_node] = {"inputs": {"image": reference}, "class_type": "LoadImage", "_meta": {"title": f"Image {index}"}}
                graph[scale_node] = {"inputs": {"upscale_method": "nearest-exact", "megapixels": 1, "resolution_steps": 1, "image": [load_node, 0]}, "class_type": "ImageScaleToTotalPixels", "_meta": {"title": f"Scale Image {index}"}}
                graph[encode_node] = {"inputs": {"pixels": [scale_node, 0], "vae": ["4", 0]}, "class_type": "VAEEncode", "_meta": {"title": f"Encode Image {index}"}}
                graph[positive_reference] = {"inputs": {"conditioning": [positive_node, 0], "latent": [encode_node, 0]}, "class_type": "ReferenceLatent", "_meta": {"title": f"Positive Reference {index}"}}
                graph[negative_reference] = {"inputs": {"conditioning": [negative_node, 0], "latent": [encode_node, 0]}, "class_type": "ReferenceLatent", "_meta": {"title": f"Negative Reference {index}"}}
                positive_node = positive_reference
                negative_node = negative_reference
            self._set(graph, "47", "on_false", [positive_node, 0])
            self._set(graph, "48", "on_false", [negative_node, 0])
            return
        if mapping.transform == "random_if_negative":
            mapped_value = secrets.randbelow((1 << 63) - 1) + 1 if int(value) < 0 else int(value)
            self._set(graph, mapping.node, mapping.input, mapped_value)
            return
        if mapping.transform == "aspect_to_dimensions":
            width, height = self._dimensions_for_ratio(str(value))
            values = [width, height]
            for index, target in enumerate(mapping.targets):
                self._set(graph, target.node, target.input, values[index])
            return
        if mapping.transform == "broadcast":
            for target in mapping.targets:
                self._set(graph, target.node, target.input, value)
            return
        if mapping.transform == "scale_dimensions":
            if len(mapping.targets) != 2:
                raise ManifestValidationError("scale_dimensions requires width and height targets")
            width_target, height_target = mapping.targets
            width = int(graph[str(width_target.node)]["inputs"][width_target.input])
            height = int(graph[str(height_target.node)]["inputs"][height_target.input])
            longest = max(width, height)
            requested = int(value)
            scale = requested / longest
            scaled_width = max(64, round((width * scale) / 64) * 64)
            scaled_height = max(64, round((height * scale) / 64) * 64)
            self._set(graph, width_target.node, width_target.input, scaled_width)
            self._set(graph, height_target.node, height_target.input, scaled_height)
            return
        if mapping.transform == "ltx_prompt":
            self._set(graph, mapping.node, mapping.input, str(value or ""))
            timeline = self._timeline(graph, mapping.node)
            timeline["global_prompt"] = str(value or "")
            for segment in timeline.get("segments") or []:
                if segment.get("type") == "text":
                    segment["prompt"] = str(value or "")
            self._set(graph, mapping.node, "timeline_data", json.dumps(timeline, separators=(",", ":")))
            return
        if mapping.transform == "ltx_image_timeline":
            remotes = list(value) if isinstance(value, list) else [value]
            remotes = [str(item or "").replace("\\", "/").strip("/") for item in remotes if str(item or "").strip()]
            if not remotes:
                return
            timeline = self._timeline(graph, mapping.node)
            node = graph[str(mapping.node)]
            frames = int(node["inputs"].get("duration_frames") or timeline.get("normalDurationFrames") or 120)
            fps = int(node["inputs"].get("frame_rate") or 24)
            image_length = max(1, min(max(1, round(fps * 0.45)), max(1, frames - 1)))
            existing_text = next((item for item in timeline.get("segments") or [] if item.get("type") == "text"), None)
            prompt = str((existing_text or {}).get("prompt") or timeline.get("global_prompt") or node["inputs"].get("local_prompts") or "")
            image_segments = []
            cursor = 0
            for index, remote in enumerate(remotes):
                filename = remote.rsplit("/", 1)[-1]
                subfolder = remote.rsplit("/", 1)[0] if "/" in remote else ""
                length = image_length if index == 0 else 1
                image_segments.append({
                    "id": f"studio-reference-image-{index + 1}",
                    "start": cursor,
                    "length": length,
                    "prompt": "",
                    "type": "image",
                    "imageFile": remote,
                    "imageB64": f"/api/view?filename={quote(filename)}&type=input&subfolder={quote(subfolder)}",
                    "isEndFrame": False,
                })
                cursor += length
            end_anchor_length = max(1, min(max(1, round(fps * 0.5)), max(1, frames - cursor - 1)))
            text_length = max(1, frames - cursor - end_anchor_length)
            text_segment = {
                "id": "studio-motion-prompt",
                "start": cursor,
                "length": text_length,
                "prompt": prompt,
                "type": "text",
                "isEndFrame": False,
            }
            anchor_remote = remotes[0]
            anchor_filename = anchor_remote.rsplit("/", 1)[-1]
            anchor_subfolder = anchor_remote.rsplit("/", 1)[0] if "/" in anchor_remote else ""
            end_anchor = {
                "id": "studio-reference-end-frame",
                "start": cursor + text_length,
                "length": end_anchor_length,
                "prompt": "",
                "type": "image",
                "imageFile": anchor_remote,
                "imageB64": f"/api/view?filename={quote(anchor_filename)}&type=input&subfolder={quote(anchor_subfolder)}",
                "isEndFrame": True,
            }
            timeline["segments"] = image_segments + [text_segment, end_anchor]
            timeline["normalDurationFrames"] = frames
            node["inputs"]["segment_lengths"] = ",".join(str(int(item.get("length") or 1)) for item in timeline["segments"])
            self._set(graph, mapping.node, mapping.input, json.dumps(timeline, separators=(",", ":")))
            return
        if mapping.transform == "ltx_duration":
            seconds = int(value)
            node = graph[str(mapping.node)]
            fps = int(node["inputs"].get("frame_rate") or 24)
            frames = seconds * fps
            for input_name, input_value in (
                ("end_second", seconds), ("duration_seconds", seconds),
                ("end_frame", frames), ("duration_frames", frames),
            ):
                node["inputs"][input_name] = input_value
            timeline = self._timeline(graph, mapping.node)
            timeline["normalDurationFrames"] = frames
            segments = timeline.get("segments") or []
            consumed = 0
            for segment in segments:
                if segment.get("type") == "image":
                    segment["length"] = min(int(segment.get("length") or 1), max(1, frames - 1))
                    consumed += int(segment["length"])
            text_segments = [item for item in segments if item.get("type") == "text"]
            if text_segments:
                text_segments[-1]["length"] = max(1, frames - consumed)
            node["inputs"]["segment_lengths"] = ",".join(str(int(item.get("length") or 1)) for item in segments)
            node["inputs"]["timeline_data"] = json.dumps(timeline, separators=(",", ":"))
            return
        if mapping.transform == "ltx_resolution":
            canvas_size = int(value) * 2
            for target in mapping.targets:
                self._set(graph, target.node, target.input, canvas_size)
            return
        if mapping.transform == "ltx_audio_enabled":
            enabled = bool(value)
            for target in mapping.targets:
                self._set(graph, target.node, target.input, enabled if target.input != "override_audio" else not enabled)
            timeline = self._timeline(graph, mapping.node)
            timeline["audioTrackEnabled"] = enabled
            timeline["inpaint_audio"] = enabled
            timeline["overrideAudio"] = not enabled
            self._set(graph, mapping.node, "timeline_data", json.dumps(timeline, separators=(",", ":")))
            return
        self._set(graph, mapping.node, mapping.input, value)

    @staticmethod
    def _timeline(graph: dict[str, Any], node_id: str) -> dict[str, Any]:
        raw = graph[str(node_id)]["inputs"].get("timeline_data") or "{}"
        try:
            parsed = json.loads(raw) if isinstance(raw, str) else copy.deepcopy(raw)
        except json.JSONDecodeError as exc:
            raise ManifestValidationError("LTX Director timeline_data is invalid JSON") from exc
        return parsed if isinstance(parsed, dict) else {}

    @staticmethod
    def _set(graph: dict[str, Any], node_id: str, input_name: str, value: Any) -> None:
        graph[str(node_id)]["inputs"][input_name] = value

    @staticmethod
    def _dimensions_for_ratio(value: str) -> tuple[int, int]:
        ratios = {
            "1:1": (1024, 1024),
            "4:3": (1152, 864),
            "3:4": (864, 1152),
            "16:9": (1344, 768),
            "9:16": (768, 1344),
        }
        if value not in ratios:
            raise ManifestValidationError(f"unsupported aspect ratio '{value}'")
        return ratios[value]


def _resource_kind(input_name: str) -> str:
    normalized = input_name.casefold()
    for token, label in (
        ("lora", "LoRA"), ("control_net", "ControlNet model"), ("controlnet", "ControlNet model"),
        ("vae", "VAE"), ("clip", "text encoder"), ("unet", "model"), ("model", "model"),
    ):
        if token in normalized:
            return label
    return "resource"
