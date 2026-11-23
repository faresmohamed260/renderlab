"""Credential-free regression of poisonous FIBO dispatch payloads.

Load the real gateway validator without its ASGI imports, so Engineering Quality
does not need an installed Modal, FastAPI, Pillow or a provider credential.
"""
import ast
import base64
from datetime import datetime, timedelta, timezone
from io import BytesIO
import json
from pathlib import Path
import re
import struct
import sys
import types
import unittest
from unittest.mock import Mock, patch

from dispatch_core import DispatchIntent, Dispatcher, Lookup, LookupState
from native_graph import build_graph


gateway_ast = ast.parse(Path(__file__).with_name("native_gateway.py").read_text(encoding="utf8"))
validator = next(node for node in gateway_ast.body if isinstance(node, ast.FunctionDef) and node.name == "validate_payload")
gateway_scope = {
    "base64": base64, "BytesIO": BytesIO, "build_graph": build_graph,
    "FIELDS": {"prompt", "seed", "width", "height", "steps", "negative_prompt", "vgl", "images", "mask", "generate_vgl"},
    "MAX_MASK": 8 * 1024 * 1024, "MAX_IMAGES": 32 * 1024 * 1024,
    "PNG_HEADER": bytes.fromhex("89504e470d0a1a0a"),
}
exec(compile(ast.Module(body=[validator], type_ignores=[]), str(Path(__file__).with_name("native_gateway.py")), "exec"), gateway_scope)
gateway = types.ModuleType("native_gateway")
gateway.CALL_ID = re.compile(r"fc-[A-Za-z0-9]{16,64}")
gateway.validate_payload = gateway_scope["validate_payload"]
with patch.dict(sys.modules, {"native_gateway": gateway}):
    from modal_dispatch_backend import ModalImageBackend


NOW = datetime(2026, 11, 23, tzinfo=timezone.utc)
PNG = base64.b64encode(bytes.fromhex("89504e470d0a1a0a") + b"fixture").decode("ascii")


class FakeStore:
    def __init__(self, payload, operation="create-image"):
        self.item = DispatchIntent(
            "attempt-1", "job-1", "fibo", "fibo-2.0-turbo", "bria-fibo-2.0-turbo",
            operation, payload, 0, NOW + timedelta(minutes=5),
        )
        self.claimed = False
        self.send_reservations = 0
        self.events = []
        self.heartbeats = []

    def claim_due(self, **_):
        if self.claimed:
            return []
        self.claimed = True
        return [self.item]

    def lookup(self, _):
        return Lookup(LookupState.ABSENT)

    def reserve_send(self, _):
        self.send_reservations += 1
        return True

    def mark_failed(self, item, *, error):
        self.events.append(("failed", item.attempt_id, error))

    def mark_dispatched(self, item, handle):
        self.events.append(("dispatched", item.attempt_id, handle))

    def mark_unresolved(self, item, *, error):
        self.events.append(("unresolved", item.attempt_id, error))

    def record_heartbeat(self, *, summary):
        self.heartbeats.append(summary)


class FakeImage:
    width = height = 64
    is_animated = False

    def __init__(self, fault):
        self.fault = fault

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def load(self):
        raise self.fault


class PoisonPayloadTest(unittest.TestCase):
    def _tick(self, payload, *, operation="create-image", fault=None):
        store = FakeStore(payload, operation)
        render = Mock()
        backend = ModalImageBackend(store, render, lambda handle: "signed:" + handle)
        pillow = types.ModuleType("PIL")
        pillow.Image = types.SimpleNamespace(
            open=lambda *_args, **_kwargs: FakeImage(fault),
            DecompressionBombError=type("DecompressionBombError", (Exception,), {}),
        )
        with patch.dict(sys.modules, {"PIL": pillow}):
            summary = Dispatcher(store, {"fibo": backend}).tick(NOW)
        # Production records this only after tick returns: regressions used to skip it.
        store.record_heartbeat(summary=summary)
        self.assertEqual(summary.claimed, 1)
        self.assertEqual(summary.failed, 1)
        self.assertEqual(store.events[0][:2], ("failed", "attempt-1"))
        self.assertEqual(store.send_reservations, 0, "poison input must never reserve a Modal send")
        render.spawn.assert_not_called()
        self.assertEqual(len(store.heartbeats), 1)

    def test_deeply_nested_vgl_json_is_permanent_and_heartbeat_survives(self):
        vgl = '{"nested":' + '[' * 1100 + '0' + ']' * 1100 + '}'
        self.assertLess(len(vgl), 8192)
        # The parser\u0027s depth tolerance is interpreter-dependent; force the\n        # exact failure at the actual JSON parsing boundary deterministically.\n        with patch("native_graph.json.loads", side_effect=RecursionError("deep JSON nesting")):\n            self._tick({"prompt": "test", "seed": 1, "width": 512, "height": 512, "vgl": vgl})

    def test_pillow_decoder_faults_are_permanent_before_provider_reservation(self):
        for fault in (ZeroDivisionError("invalid image bounds"), struct.error("invalid packed image")):
            with self.subTest(fault=type(fault).__name__):
                self._tick({
                    "prompt": "edit", "seed": 1, "width": 512, "height": 512,
                    "images": [PNG],
                }, operation="edit-image", fault=fault)


if __name__ == "__main__":
    unittest.main()
