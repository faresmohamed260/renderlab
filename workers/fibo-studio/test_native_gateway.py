import base64
import unittest

from fastapi.testclient import TestClient

from native_gateway import create_gateway


class GatewayTests(unittest.TestCase):
    def setUp(self):
        self.call_id = "fc-" + "a" * 26
        self.result = TimeoutError()
        self.spawns = []
        self.cancels = []
        self.reads = []

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
        ))

    def submit(self):
        response = self.client.post("/jobs/fibo", json={
            "prompt": "Example", "seed": 42, "images": [base64.b64encode(b"image").decode()],
        })
        self.assertEqual(response.status_code, 202)
        self.assertEqual(self.spawns[0]["sources"], [b"image"])
        return "/jobs/" + response.json()["call_id"]

    def test_async_poll_and_cancel(self):
        path = self.submit()
        response = self.client.get(path)
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.headers["cache-control"], "private, no-store")
        self.result = b"\x89PNG\r\n\x1a\npayload"
        response = self.client.get(path)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, self.result)
        self.assertEqual(self.client.delete(path).json(), {"status": "cancelled"})
        self.assertEqual(self.cancels, [self.call_id])

    def test_unknown_and_modified_ids_never_reach_modal(self):
        path = self.submit()
        for invalid in ("/jobs/" + self.call_id, path[:-1] + ("a" if path[-1] != "a" else "b")):
            self.assertEqual(self.client.get(invalid).status_code, 404)
            self.assertEqual(self.client.delete(invalid).status_code, 404)
        self.assertEqual((self.reads, self.cancels), ([], []))

    def test_invalid_payload_and_expired_result(self):
        for options in ({"mask": "unsupported"}, {"images": ["**"]}, {"width": 1280}):
            self.assertEqual(self.client.post("/jobs/fibo", json={
                "prompt": "Example", "seed": 42, **options,
            }).status_code, 422)
        self.assertEqual(self.spawns, [])
        path = self.submit()
        self.result = KeyError()
        self.assertEqual(self.client.get(path).status_code, 410)


if __name__ == "__main__":
    unittest.main()
