from __future__ import annotations

import base64

import pytest

from integrations.comfyui.client import ModalComfyUIClient
from packages.generation_core.comfyui_local import LocalComfyUIClient, output_graph


class Response:
    def __init__(self, payload=None, *, content=b"", content_type="application/json"):
        self.payload = payload
        self.content = content
        self.status_code = 200
        self.headers = {"content-type": content_type}

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class Session:
    def __init__(self):
        self.posts = []
        self.history_calls = 0

    def post(self, url, **kwargs):
        self.posts.append((url, kwargs))
        if url.endswith("/upload/image"):
            return Response({"name": "reference.png", "subfolder": "RenderLab", "type": "input"})
        return Response({"prompt_id": "prompt-1", "node_errors": {}})

    def get(self, url, **kwargs):
        if "/history/" in url:
            self.history_calls += 1
            return Response(
                {
                    "prompt-1": {
                        "status": {"status_str": "success"},
                        "outputs": {"9": {"images": [{"filename": "out.png", "subfolder": "", "type": "output"}]}},
                    }
                }
            )
        if url.endswith("/view"):
            return Response(content=b"png-bytes", content_type="image/png")
        return Response({"devices": []})


def test_upload_and_execute_generic_api_graph() -> None:
    session = Session()
    client = LocalComfyUIClient("http://127.0.0.1:8100", session=session)

    remote = client.upload(filename="face.png", data=b"face", content_type="image/png")
    artifacts = client.execute({"9": {"class_type": "SaveImage", "inputs": {}}, "unused": {"class_type": "ExternalHelper", "inputs": {}}}, output_nodes=["9"])

    assert remote == "RenderLab/reference.png"
    assert artifacts[0].data == b"png-bytes"
    assert artifacts[0].content_type == "image/png"
    assert session.posts[-1][1]["json"]["prompt"]["9"]["class_type"] == "SaveImage"
    assert "unused" not in session.posts[-1][1]["json"]["prompt"]


def test_discovery_uses_a_short_probe_without_shortening_generation_timeout(monkeypatch) -> None:
    monkeypatch.setenv("RENDERLAB_COMFYUI_URL", "http://127.0.0.1:8100")
    monkeypatch.setenv("RENDERLAB_COMFYUI_TIMEOUT_SECONDS", "321")
    probes = []

    def healthy(self, *, timeout_seconds=None):
        probes.append(timeout_seconds)
        return {"devices": []}

    monkeypatch.setattr(LocalComfyUIClient, "system_stats", healthy)
    client = LocalComfyUIClient.discover(timeout_seconds=2)

    assert probes == [2]
    assert client.timeout_seconds == 321


def test_execute_interrupts_the_active_prompt_when_cancelled() -> None:
    session = Session()
    client = LocalComfyUIClient("http://127.0.0.1:8100", session=session)

    with pytest.raises(RuntimeError, match="was interrupted"):
        client.execute(
            {"9": {"class_type": "SaveImage", "inputs": {}}},
            output_nodes=["9"],
            cancel_requested=lambda: True,
        )

    interrupt_url, interrupt_request = session.posts[-1]
    assert interrupt_url.endswith("/interrupt")
    assert interrupt_request["json"] == {"prompt_id": "prompt-1"}


def test_output_graph_keeps_only_declared_output_ancestry() -> None:
    graph = {
        "save": {"class_type": "SaveImage", "inputs": {"images": ["decode", 0]}},
        "decode": {"class_type": "Decode", "inputs": {"samples": ["sample", 0]}},
        "sample": {"class_type": "Sampler", "inputs": {}},
        "external": {"class_type": "PromptEnhanceAPI", "inputs": {}},
    }

    result = output_graph(graph, {"save"})

    assert list(result) == ["save", "decode", "sample"]
    assert "external" not in result


def test_modal_studio_client_decodes_generic_artifacts(monkeypatch) -> None:
    response = Response(
        {
            "prompt_id": "modal-prompt",
            "artifacts": [
                {
                    "filename": "result.png",
                    "content_type": "image/png",
                    "node_id": "9",
                    "data_base64": base64.b64encode(b"modal-png").decode("ascii"),
                }
            ],
        }
    )
    calls = []

    def post(url, **kwargs):
        calls.append((url, kwargs))
        return response

    monkeypatch.setattr("integrations.comfyui.client.requests.post", post)
    result = ModalComfyUIClient("https://runtime.example/studio", timeout_seconds=45).execute_studio(
        {"graph": {"9": {"class_type": "SaveImage", "inputs": {}}}, "inputs": [], "output_nodes": ["9"]}
    )

    assert result["artifacts"][0]["data"] == b"modal-png"
    assert result["request_metrics"]["artifact_count"] == 1
    assert calls[0][0] == "https://runtime.example/studio"
    assert calls[0][1]["timeout"] == 45
