from pathlib import Path

import pytest

from packages.generation_core.comfy_workspace import ComfyUIWorkspaceCatalog
from packages.generation_core.model_downloads import ModelDownloadManager


class FakeCredentials:
    def get(self, provider):
        return "secret"


class FakeResponse:
    status_code = 200
    url = "https://huggingface.co/owner/repo/resolve/main/model.safetensors"
    headers = {"content-length": "5"}

    def raise_for_status(self):
        return None

    def iter_content(self, chunk_size):
        yield b"model"

    def close(self):
        return None


def workspace(tmp_path: Path) -> ComfyUIWorkspaceCatalog:
    root = tmp_path / "ComfyUI"
    (root / "models").mkdir(parents=True)
    (root / "user").mkdir()
    return ComfyUIWorkspaceCatalog(root)


def test_downloads_are_allowlisted_sanitized_and_finalized(monkeypatch, tmp_path: Path) -> None:
    manager = ModelDownloadManager(workspace(tmp_path), FakeCredentials())
    job = manager.create({
        "provider": "huggingface",
        "source_url": "https://huggingface.co/owner/repo/blob/main/model.safetensors",
        "destination_kind": "loras",
    })
    monkeypatch.setattr("packages.generation_core.model_downloads.requests.get", lambda *args, **kwargs: FakeResponse())
    manager.process(job["id"])
    completed = manager.list()["jobs"][0]
    assert completed["status"] == "completed"
    assert (manager.workspace.model_root / "loras" / "model.safetensors").read_bytes() == b"model"
    assert not Path(f"{completed['target_path']}.part").exists()


@pytest.mark.parametrize("url", [
    "http://huggingface.co/owner/repo/blob/main/model.safetensors",
    "https://example.com/model.safetensors",
    "https://user:pass@huggingface.co/owner/repo/blob/main/model.safetensors",
])
def test_downloads_reject_non_allowlisted_sources(tmp_path: Path, url: str) -> None:
    manager = ModelDownloadManager(workspace(tmp_path), FakeCredentials())
    with pytest.raises(ValueError):
        manager.create({"provider": "huggingface", "source_url": url, "destination_kind": "checkpoints"})


def test_civitai_page_url_is_reduced_to_the_version_download_endpoint(tmp_path: Path) -> None:
    manager = ModelDownloadManager(workspace(tmp_path), FakeCredentials())
    job = manager.create({
        "provider": "civitai",
        "source_url": "https://civitai.com/models/123/example?modelVersionId=456",
        "destination_kind": "checkpoints",
        "filename": "example.safetensors",
    })
    assert job["source_url"] == "https://civitai.com/api/download/models/456"


def test_civitai_red_file_download_url_is_preserved(tmp_path: Path) -> None:
    manager = ModelDownloadManager(workspace(tmp_path), FakeCredentials())
    job = manager.create({
        "provider": "civitai",
        "source_url": "https://civitai.red/api/download/models/2740209?fileId=2626634",
        "destination_kind": "diffusion_models",
        "filename": "flux-klein.safetensors",
    })
    assert job["source_url"] == "https://civitai.red/api/download/models/2740209?fileId=2626634"


def test_download_metadata_is_sanitized_and_stored_with_job(tmp_path: Path) -> None:
    manager = ModelDownloadManager(workspace(tmp_path), FakeCredentials())
    job = manager.create({
        "provider": "civitai",
        "source_url": "https://civitai.red/api/download/models/2848299?fileId=2734400",
        "destination_kind": "loras",
        "filename": "ltx-video-reasoning.safetensors",
        "metadata": {
            "model_families": ["ltx-video", "unknown"],
            "trigger_words": ["cinematic", "", "cinematic"],
            "recommended_strength": 3,
            "notes": "Useful for video reasoning.",
        },
    })
    assert job["metadata"] == {
        "model_families": ["ltx-video"],
        "trigger_words": ["cinematic"],
        "recommended_strength": 2.0,
        "notes": "Useful for video reasoning.",
    }


def test_civitai_download_url_adds_token_query_for_gated_assets() -> None:
    url = ModelDownloadManager._authenticated_url(
        "https://civitai.red/api/download/models/2848299?fileId=2734400",
        "civitai",
        "secret-token",
    )

    assert "fileId=2734400" in url
    assert "token=secret-token" in url
