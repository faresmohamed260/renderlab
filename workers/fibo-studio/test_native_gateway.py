import base64
import os
import runpy
import sys
import unittest
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from subprocess import TimeoutExpired
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from dispatch_core import DispatchIntent
from modal_dispatch_backend import ModalImageBackend
from native_comfy_session import ComfySession
from native_gateway import JOB_HANDLE_HEADER, call_handle_signer, create_gateway
from workload_contract import FIBO_MODEL_KEY, FIBO_MODEL_VERSION


def make_png():
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", (256, 256), "white").save(buffer, format="PNG")
    return buffer.getvalue()


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.call_id = "fc-" + "a" * 26
        self.result = TimeoutError()
        self.spawns = []
        self.cancels = []
        self.reads = []
        self.wakes = []

        def spawn(**payload):
            self.spawns.append(payload)
            return self.call_id

        def poll(call_id):
            self.reads.append(call_id)
            if isinstance(self.result, Exception):
                raise self.result
            return self.result

        self.client = TestClient(create_gateway(
            spawn=spawn, poll=poll, cancel=self.cancels.append,
            signing_key=b"test-only-signing-key" * 2, expired_errors=(KeyError,),
            wake_dispatcher=lambda: self.wakes.append("wake"),
        ))

    def submit(self):
        response = self.client.post("/jobs/fibo", json={
            "prompt": "Example", "seed": 42, "images": [base64.b64encode(make_png()).decode()],
        })
        self.assertEqual(response.status_code, 202)
        self.assertEqual(self.spawns[0]["sources"], [make_png()])
        return response.json()["call_id"]

    def test_async_poll_and_cancel(self):
        handle = self.submit()
        response = self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle})
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.result = b"\x89PNG\r\n\x1a\npayload"
        response = self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle})
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, self.result)
        self.assertEqual(self.client.delete("/jobs", headers={JOB_HANDLE_HEADER: handle}).json(), {"status": "cancelled"})
        self.assertEqual(self.cancels, [self.call_id])

    def test_durable_dispatch_handle_can_poll_and_cancel_on_the_gateway(self):
        worker = SimpleNamespace(spawn=lambda **_: SimpleNamespace(object_id=self.call_id))
        backend = ModalImageBackend(SimpleNamespace(reserve_send=lambda _: True), worker, call_handle_signer(b"test-only-signing-key" * 2))
        intent = DispatchIntent(
            attempt_id="attempt", job_id="job", backend="fibo", model_key=FIBO_MODEL_KEY,
            model_version=FIBO_MODEL_VERSION, operation="create-image",
            payload={"prompt": "Example", "seed": 42}, attempt_count=1,
            admission_deadline=datetime.now(timezone.utc),
        )
        handle = backend.submit(intent)
        self.assertEqual(self.client.get("/jobs", headers={JOB_HANDLE_HEADER: self.call_id}).status_code, 404)
        self.assertEqual(self.client.get("/jobs").status_code, 404)
        self.assertEqual(self.client.get("/jobs/" + handle).status_code, 404)
        self.result = bytes.fromhex("89504e470d0a1a0a") + b"synthetic-image"
        response = self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, self.result)
        self.assertEqual(self.client.delete("/jobs", headers={JOB_HANDLE_HEADER: handle}).json(), {"status": "cancelled"})
        self.assertEqual(self.cancels, [self.call_id])


    def test_signed_routes_distinguish_process_exit_from_pending_and_other_errors(self):
        handle = self.submit()
        for result, status, body in (
            ({"outcome": "process_exited"}, 409, {"detail": "FIBO_PROCESS_EXITED"}),
            (TimeoutError(), 202, {"worker_state": "generating"}),
            (RuntimeError("private exception text"), 500, {"detail": "FIBO job failed or could not be read"}),
            (KeyError(), 410, {"detail": "FIBO result expired"}),
            (ValueError(), 422, {"detail": "FIBO rejected the render inputs"}),
            ({"outcome": "process_exited", "unexpected": True}, 502, None),
        ):
            self.result = result
            for route in ("/jobs", "/jobs/vgl"):
                with self.subTest(route=route, status=status):
                    response = self.client.get(route, headers={JOB_HANDLE_HEADER: handle})
                    self.assertEqual(response.status_code, status)
                    self.assertEqual(response.headers["cache-control"], "private, no-store")
                    if body is not None:
                        self.assertEqual(response.json(), body)

    def test_dispatch_wake_carries_no_render_payload(self):
        response = self.client.post("/dispatch/wake", content=b"")
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.json(), {"status": "accepted"})
        self.assertEqual(self.wakes, ["wake"])

    def test_durable_gateway_disables_direct_submission_but_keeps_poll_compatibility(self):
        client = TestClient(create_gateway(
            spawn=lambda **_: self.call_id, poll=lambda _: TimeoutError(), cancel=lambda _: None,
            signing_key=b"test-only-signing-key" * 2, expired_errors=(KeyError,),
            wake_dispatcher=lambda: None, allow_direct_submit=False,
        ))
        self.assertEqual(client.post("/jobs/fibo", json={"prompt": "x", "seed": 1}).status_code, 405)
        self.assertEqual(client.post("/dispatch/wake").status_code, 202)

    def test_generated_vgl_sidecar_retains_plain_png_results_and_signed_access(self):
        handle = self.submit()
        png = bytes.fromhex("89504e470d0a1a0a") + b"synthetic-image"
        self.result = png
        self.assertEqual(self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle}).content, png)
        self.assertEqual(self.client.get("/jobs/vgl", headers={JOB_HANDLE_HEADER: handle}).status_code, 404)

        caption = '{"short_description":"A sunlit garden","lighting":"soft"}'
        self.result = {"image_png": png, "generated_vgl": caption}
        image = self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle})
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.content, png)
        self.assertEqual(image.headers["content-type"], "image/png")
        sidecar = self.client.get("/jobs/vgl", headers={JOB_HANDLE_HEADER: handle})
        self.assertEqual(sidecar.status_code, 200)
        self.assertEqual(sidecar.json(), {"vgl": caption})
        self.assertEqual(sidecar.headers["cache-control"], "private, no-store")
        self.assertEqual(self.client.get("/jobs/vgl", headers={JOB_HANDLE_HEADER: handle[:-1] + "x"}).status_code, 404)
        self.assertEqual(self.reads[-1], self.call_id)

    def test_generated_vgl_sidecar_fails_closed_on_invalid_provider_output(self):
        handle = self.submit()
        png = bytes.fromhex("89504e470d0a1a0a") + b"synthetic-image"
        for invalid in (
            {"image_png": png, "generated_vgl": "not json"},
            {"image_png": png, "generated_vgl": '{"short_description":""}'},
            {"image_png": png, "generated_vgl": '{"short_description":"ok","edit_instruction":"bad"}'},
            {"image_png": b"not-png", "generated_vgl": '{"short_description":"ok"}'},
            {"image_png": png, "generated_vgl": '{"short_description":"ok"}', "unexpected": "field"},
        ):
            with self.subTest(invalid=str(invalid)[:100]):
                self.result = invalid
                self.assertEqual(self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle}).status_code, 502)
                self.assertEqual(self.client.get("/jobs/vgl", headers={JOB_HANDLE_HEADER: handle}).status_code, 502)

    def test_manual_vgl_is_worker_input_for_source_free_and_reference_edits(self):
        # FIBO Studio already uses Edit Turbo to generate with no references.
        # The production gateway must retain the JSON-caption path, not use
        # the plain prompt as a substitute or drop ordered image inputs.
        vgl = '{"caption":"A sunlit glass garden"}'
        response = self.client.post("/jobs/fibo", json={
            "prompt": "", "vgl": vgl, "seed": 7, "images": [],
        })
        self.assertEqual(response.status_code, 202)
        self.assertEqual(self.spawns[-1]["vgl"], vgl)
        self.assertEqual(self.spawns[-1]["prompt"], "")
        self.assertEqual(self.spawns[-1]["sources"], [])
        for bad in ("[]", "{}", "{invalid}"):
            invalid = self.client.post("/jobs/fibo", json={
                "prompt": "", "vgl": bad, "seed": 7, "images": [],
            })
            self.assertEqual(invalid.status_code, 422)

    def test_mask_bytes_are_bounded_and_passed_only_for_single_source_edit(self):
        png = make_png()
        data = {"prompt": "Edit selected area", "seed": 42,
                "images": [base64.b64encode(png).decode()],
                "mask": base64.b64encode(png).decode(), "width": 256, "height": 256}
        response = self.client.post("/jobs/fibo", json=data)
        self.assertEqual(response.status_code, 202)
        self.assertEqual(self.spawns[-1]["mask"], png)
        self.assertEqual(self.spawns[-1]["sources"], [png])

        original = self.client.post("/jobs/fibo", json={**data, "width": 0, "height": 0})
        self.assertEqual(original.status_code, 202)

        for payload in (
            {**data, "images": []},
            {**data, "images": [base64.b64encode(b"not-an-image").decode()]},
            {**data, "images": ["QQ==", "Qg=="]},
            {**data, "mask": "***"},
            {**data, "mask": base64.b64encode(b"not-png").decode()},
            {**data, "mask": None},
            {**data, "mask": 1},
        ):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/jobs/fibo", json=payload).status_code, 422)

    def test_source_free_generated_vgl_is_an_explicit_bounded_worker_mode(self):
        accepted = self.client.post("/jobs/fibo", json={
            "prompt": "A ceramic red cube", "seed": 42,
            "width": 256, "height": 256, "images": [], "generate_vgl": True,
        })
        self.assertEqual(accepted.status_code, 202)
        self.assertEqual(self.spawns[-1]["generate_vgl"], True)
        self.assertEqual(self.spawns[-1]["sources"], [])
        for invalid in (
            {"images": [base64.b64encode(b"source").decode()]},
            {"generate_vgl": 1},
            {"generate_vgl": "true"},
            {"vgl": '{"short_description":"manual"}'},
            {"width": 0, "height": 0},
            {"prompt": ""},
        ):
            payload = {"prompt": "A ceramic red cube", "seed": 42,
                       "width": 256, "height": 256, "images": [], "generate_vgl": True}
            with self.subTest(invalid=invalid):
                self.assertEqual(self.client.post("/jobs/fibo", json={**payload, **invalid}).status_code, 422)

    def test_unknown_and_modified_ids_never_reach_modal(self):
        handle = self.submit()
        for invalid in (self.call_id, handle[:-1] + ("a" if handle[-1] != "a" else "b")):
            headers = {JOB_HANDLE_HEADER: invalid}
            self.assertEqual(self.client.get("/jobs", headers=headers).status_code, 404)
            self.assertEqual(self.client.delete("/jobs", headers=headers).status_code, 404)
        self.assertEqual((self.reads, self.cancels), ([], []))

    def test_invalid_payload_and_expired_result(self):
        for options in ({"mask": "unsupported"}, {"images": ["**"]}, {"width": 1280}):
            self.assertEqual(self.client.post("/jobs/fibo", json={
                "prompt": "Example", "seed": 42, **options,
            }).status_code, 422)
        self.assertEqual(self.spawns, [])
        handle = self.submit()
        self.result = KeyError()
        self.assertEqual(self.client.get("/jobs", headers={JOB_HANDLE_HEADER: handle}).status_code, 410)



class RendererProcessExitTest(unittest.TestCase):
    def setUp(self):
        modal = MagicMock()
        modal.App.return_value.function.return_value = lambda function: function
        env = {
            "RENDERLAB_MODAL_ENVIRONMENT": "main",
            "RENDERLAB_MODAL_WORKER_SECRET": "test-worker",
            "RENDERLAB_MODAL_MODEL_VOLUME": "test-models",
        }
        torch = Mock()
        torch.cuda.is_available.return_value = True
        with patch.dict(sys.modules, {"modal": modal, "torch": torch}):
            with patch.dict(os.environ, env, clear=True):
                module = runpy.run_path(Path(__file__).with_name("modal_native_renderer.py"))
            self.render = module["render"]
            self.addCleanup(self.render.__globals__.pop, "_runner", None)

        # Patch only the runtime boundaries. The renderer, adapter, session,
        # workspace cleanup and recovery call all run their production code.
        self.enterContext(patch.dict(sys.modules, {"torch": torch}))
        self.enterContext(patch.object(sys, "path", sys.path.copy()))
        self.enterContext(patch("native_comfy_session._kill_port_occupant"))
        self.session = ComfySession("/opt/ComfyUI", "/opt/fibo-models")
        self.addCleanup(self.session._reset)
        self.children = [Mock(), Mock()]
        for child in self.children:
            child.poll.return_value = None
        self.start = self.enterContext(patch("native_comfy_session.Popen", side_effect=self.children))
        self.first_exit = False
        self.prompt_id = str(uuid4())
        self.workspaces = []
        self.png = make_png()
        self.enterContext(patch.object(self.session, "_request", side_effect=self.comfy_request))
        self.enterContext(patch("native_comfy_session.ComfySession", return_value=self.session))

    def comfy_request(self, path, payload=None):
        if path == "/system_stats":
            workspace = Path(self.session._workspace.name)
            self.workspaces.append(workspace)
            return {}
        if path == "/queue":
            return {"queue_running": [], "queue_pending": []}
        if path == "/prompt":
            self.graph = payload["prompt"]
            return {"prompt_id": self.prompt_id}
        if path == "/history/" + self.prompt_id:
            if self.first_exit:
                self.children[0].poll.return_value = -9
                raise ConnectionResetError("ComfyUI child exited")
            subfolder = self.graph["output"]["inputs"]["filename_prefix"].split("/")[0]
            (self.workspaces[-1] / "output" / subfolder / "result.png").write_bytes(self.png)
            return {self.prompt_id: {
                "status": {"status_str": "success"},
                "outputs": {
                    "output": {"images": [{"subfolder": subfolder, "filename": "result.png"}]},
                    "auto_vgl_result": {"text": ['{"short_description":"A red cube"}']},
                },
            }}
        if path == "/history":
            return None
        self.fail(f"Unexpected ComfyUI request: {path}")

    def test_process_exit_cleans_session_and_next_render_reuses_runner(self):
        self.first_exit = True
        exit_container = self.enterContext(patch("os._exit", side_effect=AssertionError("unexpected recycle")))
        result = self.render(prompt="Process exit", seed=1, width=256, height=256)
        self.assertEqual(result, {"outcome": "process_exited"})
        exit_container.assert_not_called()
        self.children[0].terminate.assert_not_called()
        self.assertIsNone(self.session._server)
        self.assertIsNone(self.session._workspace)
        self.assertIsNone(self.session._session_id)
        self.assertFalse(self.workspaces[0].exists())

        runner = self.render.__globals__["_runner"]
        self.first_exit = False
        self.assertEqual(self.render(prompt="Recovery", seed=2, width=256, height=256), self.png)
        self.assertIs(self.render.__globals__["_runner"], runner)
        self.assertIs(self.session._server, self.children[1])
        self.assertNotEqual(self.workspaces[0], self.workspaces[1])
        self.assertEqual(self.start.call_count, 2)
        self.assertEqual(list((self.workspaces[1] / "output").iterdir()), [])

        with_vgl = self.render(prompt="Recovery", seed=2, width=256, height=256, generate_vgl=True)
        self.assertEqual(with_vgl, {
            "image_png": self.png, "generated_vgl": '{"short_description":"A red cube"}',
        })
        self.assertEqual(self.start.call_count, 2)

    def test_reset_that_requires_sigkill_still_recycles_container(self):
        child = self.children[0]
        child.wait.side_effect = [TimeoutExpired("ComfyUI", 8), 0]
        interrupted = self.comfy_request

        def request(path, payload=None):
            if path.startswith("/history/"):
                raise ConnectionResetError("Unresponsive ComfyUI child")
            return interrupted(path, payload)

        self.session._request.side_effect = request
        exit_container = self.enterContext(patch("os._exit", side_effect=SystemExit(1)))
        with self.assertRaises(SystemExit):
            self.render(prompt="Unresponsive child", seed=1, width=256, height=256)
        child.terminate.assert_called_once()
        child.kill.assert_called_once()
        exit_container.assert_called_once_with(1)
        self.assertFalse(self.workspaces[0].exists())


class ModalDispatcherAdapterTests(unittest.TestCase):
    def test_modal_spawn_requires_a_durable_send_reservation(self):
        from dispatch_core import DispatchIntent, Lookup, LookupState, UnknownDispatchOutcome
        from modal_dispatch_backend import ModalImageBackend
        from native_gateway import call_handle_signer

        item = DispatchIntent("attempt-1", "job-1", "fibo", "fibo-2.0-turbo", "bria-fibo-2.0-turbo",
                              "create-image", {"prompt": "Fixture", "seed": 1}, 0, datetime.now(timezone.utc))
        store = Mock()
        store.reserve_send.return_value = False
        provider = Mock()
        sign = call_handle_signer(b"unit-test-only-key" * 2)
        backend = ModalImageBackend(store, provider, sign)
        with self.assertRaises(UnknownDispatchOutcome):
            backend.submit(item)
        store.reserve_send.assert_called_once_with(item.attempt_id)
        provider.spawn.assert_not_called()

        def spawn(**inputs):
            self.assertEqual(store.reserve_send.call_count, 2)
            self.assertEqual(inputs["model_binding"], (item.model_key, item.model_version, item.operation))
            raise TimeoutError()

        store.reserve_send.return_value = True
        provider.spawn.side_effect = spawn
        with self.assertRaises(UnknownDispatchOutcome):
            backend.submit(item)
        provider.spawn.assert_called_once()

        raw_call = "fc-0123456789abcdef"
        store.lookup.return_value = Lookup(LookupState.ACCEPTED, raw_call)
        self.assertEqual(backend.lookup(item.attempt_id), Lookup(LookupState.ACCEPTED, sign(raw_call)))
        provider.spawn.assert_called_once()


if __name__ == "__main__":
    unittest.main()
