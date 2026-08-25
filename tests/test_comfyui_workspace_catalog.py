import json
from pathlib import Path

from packages.generation_core.comfy_workspace import ComfyUIWorkspaceCatalog, discover_workspace_root


def test_workspace_catalog_discovers_capabilities_models_and_reactor(tmp_path: Path) -> None:
    root = tmp_path / "ComfyUI"
    workflows = root / "user" / "default" / "workflows"
    models = root / "models" / "diffusion_models"
    reactor = root / "custom_nodes" / "comfyui-reactor"
    workflows.mkdir(parents=True)
    models.mkdir(parents=True)
    (reactor / "scripts").mkdir(parents=True)
    (workflows / "Qwen Edit.json").write_text(json.dumps({"nodes": [
        {"type": "LoadImage"}, {"type": "ControlNetLoader"}, {"type": "ReActorFaceSwap"}, {"type": "LoraLoaderModelOnly"},
    ], "model": "qwen_image_edit_fp8.safetensors"}), encoding="utf-8")
    (models / "qwen_image_edit_fp8.safetensors").write_bytes(b"model")
    (models / "ltx-video-Q5_K_M.gguf.part").write_bytes(b"partial")
    (reactor / "pyproject.toml").write_text('[project]\nversion = "0.7.0-local"\n', encoding="utf-8")
    (reactor / "nodes.py").write_text("# modified", encoding="utf-8")
    (reactor / "scripts" / "reactor_swapper.py").write_text("# modified", encoding="utf-8")

    catalog = ComfyUIWorkspaceCatalog(root)
    workflow = catalog.list_workflows()[0]
    assert {"image_edit", "image_reference", "controlnet", "face_swap", "loras"}.issubset(workflow["capabilities"])
    assert workflow["model_families"] == ["qwen-image-edit", "reactor"]
    assert {item["status"] for item in catalog.list_models()} == {"installed", "partial"}
    assert catalog.reactor_status()["version"] == "0.7.0-local"
    assert set(catalog.reactor_status()["fingerprints"]) == {"nodes.py", "scripts/reactor_swapper.py"}


def test_workspace_discovery_prefers_explicit_path(tmp_path: Path) -> None:
    root = tmp_path / "workspace"
    (root / "models").mkdir(parents=True)
    (root / "user").mkdir()
    assert discover_workspace_root(root) == root.resolve()
