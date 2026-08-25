from __future__ import annotations

from io import BytesIO
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from PIL import Image

from apps.studio_api.app import app, runtime


def client(tmp_path, monkeypatch) -> TestClient:
    monkeypatch.setenv("RENDERLAB_DB_MODE", "test_harness")
    monkeypatch.setenv("RENDERLAB_STORAGE_ROOT", str(tmp_path / "studio"))
    monkeypatch.setenv("RENDERLAB_WORKER_ENABLED", "0")
    runtime.cache_clear()
    return TestClient(app)


def test_capability_contract_and_generation_lifecycle(tmp_path, monkeypatch) -> None:
    with client(tmp_path, monkeypatch) as studio:
        workflow_response = studio.get("/studio/workflows")
        assert workflow_response.status_code == 200
        workflows = workflow_response.json()["workflows"]
        workflow_ids = [item["id"] for item in workflows]
        assert workflow_ids == ["flux2-klein-9b", "ltx-video", "qwen-image-edit", "z-image-turbo", "reactor-face-swap"]
        assert all("mapping" not in item for workflow in workflows for item in workflow["inputs"])

        session = studio.post("/studio/sessions", json={"name": "API test"}).json()
        response = studio.post(
            "/studio/generations",
            json={
                "session_id": session["id"],
                "workflow_id": "z-image-turbo",
                "prompt": "A paper observatory",
                "negative_prompt": "blurry",
                "parameters": {"aspect_ratio": "16:9", "seed": -1},
            },
        )
        assert response.status_code == 202
        generation = response.json()
        assert generation["status"] == "queued"
        assert generation["negative_prompt"] == "blurry"
        assert generation["seed"] > 0
        assert studio.get("/studio/queue").json()["jobs"][0]["id"] == generation["id"]

        cancelled = studio.post(f"/studio/generations/{generation['id']}/cancel")
        assert cancelled.status_code == 202
        assert cancelled.json()["status"] == "cancelled"


def test_asset_upload_and_private_content_route(tmp_path, monkeypatch) -> None:
    image = Image.new("RGB", (17, 11), (255, 98, 86))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    content = buffer.getvalue()
    with client(tmp_path, monkeypatch) as studio:
        uploaded = studio.post(
            "/studio/assets?filename=reference.png",
            content=content,
            headers={"Content-Type": "image/png"},
        )
        assert uploaded.status_code == 201
        asset = uploaded.json()
        assert (asset["width"], asset["height"]) == (17, 11)
        assert asset["thumbnail_url"].endswith("/thumbnail")
        downloaded = studio.get(asset["content_url"])
        assert downloaded.status_code == 200
        assert downloaded.content == content
        thumbnail = studio.get(asset["thumbnail_url"])
        assert thumbnail.status_code == 200
        assert thumbnail.headers["content-type"].startswith("image/jpeg")
        thumb_image = Image.open(BytesIO(thumbnail.content))
        assert thumb_image.width <= 256
        assert thumb_image.height <= 256
        assert thumbnail.content != content


def test_flux_edit_automatically_preserves_uploaded_image_ratio(tmp_path, monkeypatch) -> None:
    image = Image.new("RGB", (1600, 900), (35, 40, 52))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    with client(tmp_path, monkeypatch) as studio:
        source = studio.post(
            "/studio/assets?filename=wide-edit.png",
            content=buffer.getvalue(),
            headers={"Content-Type": "image/png"},
        ).json()
        session = studio.post("/studio/sessions", json={"name": "Flux edit"}).json()
        generation = studio.post(
            "/studio/generations",
            json={
                "session_id": session["id"],
                "workflow_id": "flux2-klein-9b",
                "prompt": "Change the sky to dusk",
                "references": [{"asset_id": source["id"], "role": "image"}],
                "parameters": {"size_mode": "auto", "resolution": 1024},
            },
        )

        assert generation.status_code == 202
        assert generation.json()["parameters"]["width"] == 1024
        assert generation.json()["parameters"]["height"] == 576


def test_ltx_video_auto_size_uses_first_reference_image_ratio(tmp_path, monkeypatch) -> None:
    image = Image.new("RGB", (900, 1600), (35, 40, 52))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    with client(tmp_path, monkeypatch) as studio:
        source = studio.post(
            "/studio/assets?filename=vertical-start.png",
            content=buffer.getvalue(),
            headers={"Content-Type": "image/png"},
        ).json()
        session = studio.post("/studio/sessions", json={"name": "LTX video"}).json()
        generation = studio.post(
            "/studio/generations",
            json={
                "session_id": session["id"],
                "workflow_id": "ltx-video",
                "prompt": "Slow cinematic movement around @Image 1",
                "references": [{"asset_id": source["id"], "role": "start_image"}],
                "parameters": {"aspect_ratio": "auto", "resolution": "720p", "duration_seconds": 6, "audio_enabled": False},
            },
        )

        assert generation.status_code == 202
        assert generation.json()["parameters"]["width"] == 704
        assert generation.json()["parameters"]["height"] == 1248
        assert generation.json()["parameters"]["audio_enabled"] is False


def test_seedless_face_swap_does_not_receive_an_unknown_seed_parameter(tmp_path, monkeypatch) -> None:
    image = Image.new("RGB", (32, 32), (120, 90, 80))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    content = buffer.getvalue()
    with client(tmp_path, monkeypatch) as studio:
        source = studio.post("/studio/assets?filename=source.png", content=content, headers={"Content-Type": "image/png"}).json()
        target = studio.post("/studio/assets?filename=target.png", content=content, headers={"Content-Type": "image/png"}).json()
        session = studio.post("/studio/sessions", json={"name": "Face swap"}).json()
        generation = studio.post(
            "/studio/generations",
            json={
                "session_id": session["id"], "workflow_id": "reactor-face-swap",
                "references": [{"asset_id": target["id"], "role": "target"}, {"asset_id": source["id"], "role": "face"}],
            },
        )

        assert generation.status_code == 202
        assert "seed" not in generation.json()["parameters"]


def test_unconfigured_real_worker_fails_before_queueing(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("RENDERLAB_DB_MODE", "test_harness")
    monkeypatch.setenv("RENDERLAB_STORAGE_ROOT", str(tmp_path / "studio"))
    monkeypatch.setenv("RENDERLAB_WORKER_ENABLED", "1")
    monkeypatch.setenv("RENDERLAB_COMFYUI_PROVIDER", "modal")
    monkeypatch.delenv("RENDERLAB_MODAL_ALLOW_ENV_FALLBACK", raising=False)
    monkeypatch.delenv("RENDERLAB_MODAL_STATE_DB_URL", raising=False)
    monkeypatch.delenv("RENDERLAB_RUNTIME_DB_URL", raising=False)
    runtime.cache_clear()
    with TestClient(app) as studio:
        readiness = studio.get("/studio/runtime")
        assert readiness.status_code == 200
        assert readiness.json()["configured"] is False
        session = studio.post("/studio/sessions", json={"name": "Unavailable provider"}).json()
        response = studio.post(
            "/studio/generations",
            json={"session_id": session["id"], "workflow_id": "z-image-turbo", "prompt": "A paper lighthouse"},
        )
        assert response.status_code == 503
        assert response.json()["detail"]["code"] == "provider_not_configured"
        assert studio.get("/studio/queue").json()["jobs"] == []


def test_runtime_initialization_is_singleton_under_concurrent_first_requests(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("RENDERLAB_DB_MODE", "test_harness")
    monkeypatch.setenv("RENDERLAB_STORAGE_ROOT", str(tmp_path / "studio"))
    runtime.cache_clear()
    with ThreadPoolExecutor(max_workers=8) as pool:
        instances = list(pool.map(lambda _: runtime(), range(16)))
    assert len({id(instance) for instance in instances}) == 1
