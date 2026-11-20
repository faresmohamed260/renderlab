import base64
from io import BytesIO
from datetime import datetime, timezone
from types import SimpleNamespace
import unittest

from fastapi.testclient import TestClient

from dispatch_core import DispatchIntent
from modal_dispatch_backend import ModalImageBackend
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


if __name__ == "__main__":
    unittest.main()
