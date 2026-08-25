from __future__ import annotations

import json
from pathlib import Path

import pytest

from packages.generation_core import GenerationRequest, ManifestValidationError, WorkflowRegistry
from packages.generation_core.comfyui_local import output_graph
from packages.generation_core.executor import _extract_image_bytes


MANIFEST_ROOT = Path(__file__).resolve().parents[1] / "integrations" / "comfyui" / "manifests"


def registry() -> WorkflowRegistry:
    result = WorkflowRegistry(MANIFEST_ROOT).load()
    assert result.errors == []
    return result


def test_registry_exposes_public_capabilities_without_node_mappings() -> None:
    payloads = registry().list_public()
    ids = [item["id"] for item in payloads]
    assert ids == ["flux2-klein-9b", "ltx-video", "qwen-image-edit", "z-image-turbo", "reactor-face-swap"]
    assert "character-consistent" in [item["id"] for item in registry().list_public(enabled_only=False)]
    z_image = next(item for item in payloads if item["id"] == "z-image-turbo")
    ltx = next(item for item in payloads if item["id"] == "ltx-video")
    assert z_image["defaults"]["aspect_ratio"] == "1:1"
    assert "reference_mentions" in ltx["capabilities"]
    assert ltx["inputs"][1]["multiplicity"]["maximum"] == 24
    assert ltx["defaults"]["resolution"] == "480p"
    assert ltx["defaults"]["audio_enabled"] is True
    assert "workflow" not in z_image
    assert "mapping" not in z_image["inputs"][0]
    assert "node" not in z_image["outputs"][0]


def test_request_defaults_and_mapping_are_applied_to_graph_copy() -> None:
    workflows = registry()
    request = GenerationRequest(workflow_id="z-image-turbo", prompt="A quiet observatory", parameters={"aspect_ratio": "16:9"})
    mapped = workflows.map_request(request)
    assert mapped["58:45"]["inputs"]["text"] == "A quiet observatory"
    assert mapped["58:41"]["inputs"]["width"] == 1344
    assert mapped["58:41"]["inputs"]["height"] == 768
    assert mapped["58:41"]["inputs"]["batch_size"] == 1
    assert int(mapped["58:44"]["inputs"]["seed"]) > 0


def test_invalid_parameter_and_disabled_workflow_are_rejected() -> None:
    workflows = registry()
    with pytest.raises(ManifestValidationError, match="aspect_ratio"):
        workflows.validate_request(GenerationRequest(workflow_id="z-image-turbo", prompt="x", parameters={"aspect_ratio": "2:1"}))
    with pytest.raises(ManifestValidationError, match="disabled"):
        workflows.validate_request(GenerationRequest(workflow_id="character-consistent", prompt="x"))


def test_negative_prompt_is_mapped() -> None:
    workflows = registry()
    request = GenerationRequest(workflow_id="z-image-turbo", prompt="A courier", negative_prompt="blurry")
    mapped = workflows.map_request(request)
    assert mapped["58:58"]["inputs"]["text"] == "blurry"


def test_qwen_dynamic_pose_and_appearance_references_are_mapped() -> None:
    workflows = registry()
    request = GenerationRequest.model_validate(
        {
            "workflow_id": "qwen-image-edit",
            "prompt": "turn the coat blue",
            "references": [
                {"asset_id": "asset-main", "role": "appearance"},
                {"asset_id": "asset-pose", "role": "pose"},
            ],
            "parameters": {"control_strength": 0.65},
        }
    )
    mapped = workflows.map_request(
        request,
        staged_assets={"asset-main": "renderlab/main.png", "asset-pose": "renderlab/pose.png"},
    )
    assert mapped["83"]["inputs"]["image"] == "renderlab/main.png"
    assert mapped["41"]["inputs"]["image"] == "renderlab/pose.png"
    assert mapped["113:101"]["inputs"]["strength"] == 0.65
    assert mapped["113:206"]["inputs"]["strength"] == 0.65
    executable = output_graph(mapped, {"9"})
    classes = {node["class_type"] for node in executable.values()}
    assert "PromptEnhanceAPI" not in classes
    assert "ReActorFaceSwap" not in classes
    assert "PiDUpscale" not in classes


def test_ltx_maps_uploaded_start_image_prompt_and_timing_into_director_timeline() -> None:
    workflows = registry()
    request = GenerationRequest.model_validate(
        {
            "workflow_id": "ltx-video",
            "prompt": "The camera slowly arcs around @Image 1 and then reveals @Image 2.",
            "references": [
                {"asset_id": "asset-start", "role": "start_image"},
                {"asset_id": "asset-style", "role": "start_image"},
            ],
            "parameters": {
                "resolution": "720p",
                "aspect_ratio": "auto",
                "width": 720,
                "height": 1280,
                "frame_rate": 30,
                "duration_seconds": 6,
                "audio_enabled": False,
                "lora": "ltx-video-reasoning.safetensors",
                "lora_strength": 0.75,
                "output_scale": 1.0,
            },
        }
    )

    mapped = workflows.map_request(
        request,
        staged_assets={"asset-start": "RenderLab/start image.png", "asset-style": "RenderLab/style.png"},
    )
    timeline = json.loads(mapped["131"]["inputs"]["timeline_data"])

    assert mapped["131"]["inputs"]["local_prompts"] == "The camera slowly arcs around Image 1 and then reveals Image 2."
    assert mapped["131"]["inputs"]["frame_rate"] == 30
    assert mapped["131"]["inputs"]["duration_frames"] == 180
    assert mapped["131"]["inputs"]["custom_width"] == 720
    assert mapped["131"]["inputs"]["custom_height"] == 1280
    assert mapped["131"]["inputs"]["use_custom_audio"] is False
    assert mapped["131"]["inputs"]["inpaint_audio"] is False
    assert mapped["131"]["inputs"]["override_audio"] is True
    assert mapped["133"]["inputs"]["ic_lora_name"] == "ltx-video-reasoning.safetensors"
    assert mapped["133"]["inputs"]["ic_lora_strength"] == 0.75
    assert mapped["133"]["inputs"]["scale_by"] == 1.0
    assert mapped["33"]["inputs"]["steps"] == 8
    assert timeline["normalDurationFrames"] == 180
    assert timeline["audioTrackEnabled"] is False
    assert timeline["segments"][0]["imageFile"] == "RenderLab/start image.png"
    assert timeline["segments"][1]["imageFile"] == "RenderLab/style.png"
    assert "filename=start%20image.png" in timeline["segments"][0]["imageB64"]
    assert timeline["segments"][2]["prompt"] == "The camera slowly arcs around Image 1 and then reveals Image 2."
    assert timeline["segments"][3]["imageFile"] == "RenderLab/start image.png"
    assert timeline["segments"][3]["isEndFrame"] is True
    assert timeline["segments"][3]["start"] + timeline["segments"][3]["length"] == 180


def test_flux_supports_general_generation_and_one_reference_editing() -> None:
    workflows = registry()
    text_graph = workflows.map_request(
        GenerationRequest(workflow_id="flux2-klein-9b", prompt="A glass cube", parameters={"width": 1024, "height": 1024})
    )
    assert text_graph["42"]["inputs"]["value"] is True
    edit_graph = workflows.map_request(
        GenerationRequest.model_validate(
            {
                "workflow_id": "flux2-klein-9b",
                "prompt": "Turn it blue",
                "references": [{"asset_id": "asset-edit", "role": "image"}],
                "parameters": {"width": 384, "height": 512},
            }
        ),
        staged_assets={"asset-edit": "RenderLab/edit.png"},
    )
    edit_classes = {node["class_type"] for node in output_graph(edit_graph, {"9"}).values()}

    assert edit_graph["42"]["inputs"]["value"] is False
    assert edit_graph["1"]["inputs"]["image"] == "RenderLab/edit.png"
    assert edit_graph["8:18"]["inputs"]["width"] == 384
    assert edit_graph["8:18"]["inputs"]["height"] == 512
    assert edit_graph["8:17"]["inputs"]["width"] == 384
    assert edit_graph["8:17"]["inputs"]["height"] == 512
    assert "LoadImage" in edit_classes
    assert "DWPreprocessor" not in edit_classes


def test_flux_chains_all_ordered_references_and_normalizes_prompt_mentions() -> None:
    workflows = registry()
    graph = workflows.map_request(
        GenerationRequest.model_validate(
            {
                "workflow_id": "flux2-klein-9b",
                "prompt": "Put the subject from @Image 1 beside the vehicle from @Image 2, styled like @Image 3",
                "references": [
                    {"asset_id": "asset-one", "role": "image"},
                    {"asset_id": "asset-two", "role": "image"},
                    {"asset_id": "asset-three", "role": "image"},
                ],
                "parameters": {"width": 1024, "height": 768},
            }
        ),
        staged_assets={"asset-one": "one.png", "asset-two": "two.png", "asset-three": "three.png"},
    )

    assert graph["6"]["inputs"]["text"] == "Put the subject from Image 1 beside the vehicle from Image 2, styled like Image 3"
    assert graph["studio:flux-reference:2:load"]["inputs"]["image"] == "two.png"
    assert graph["studio:flux-reference:3:load"]["inputs"]["image"] == "three.png"
    assert graph["47"]["inputs"]["on_false"] == ["studio:flux-reference:3:positive", 0]
    assert graph["48"]["inputs"]["on_false"] == ["studio:flux-reference:3:negative", 0]


def test_preflight_reports_missing_runtime_nodes_and_model_resources() -> None:
    workflows = registry()
    object_info = {}
    for workflow in workflows.list_public():
        graph = json.loads(workflows.workflow_path(workflow["id"]).read_text(encoding="utf-8-sig"))
        for node in graph.values():
            if isinstance(node, dict) and node.get("class_type"):
                object_info.setdefault(node["class_type"], {"input": {"required": {}, "optional": {}}})
    object_info["LoraLoaderModelOnly"] = {
        "input": {"required": {"lora_name": [["installed.safetensors"], {}]}, "optional": {}}
    }
    object_info.pop("ReActorFaceSwap")

    statuses = {item["workflow_id"]: item for item in workflows.preflight(object_info)}

    assert statuses["flux2-klein-9b"]["ready"] is True
    assert statuses["qwen-image-edit"]["ready"] is False
    assert statuses["qwen-image-edit"]["issues"][0]["kind"] == "LoRA"
    assert statuses["reactor-face-swap"]["ready"] is False
    assert statuses["reactor-face-swap"]["issues"][0]["code"] == "missing_node"


def test_provider_image_bytes_are_normalized_from_live_response_contract() -> None:
    assert _extract_image_bytes({"response": {"image_bytes": b"png"}}) == b"png"
    with pytest.raises(RuntimeError, match="without returning an image output"):
        _extract_image_bytes({"response": {}})
