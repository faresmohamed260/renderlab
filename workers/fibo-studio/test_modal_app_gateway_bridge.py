import importlib.util
import sys
import types
import unittest
from pathlib import Path


class _Image:
    def apt_install(self, *args): return self
    def run_commands(self, *args): return self
    def add_local_python_source(self, *args): return self
    def add_local_file(self, *args): return self


class _App:
    def cls(self, **kwargs): return lambda value: value
    def function(self, **kwargs): return lambda value: value


def _identity_decorator(*args, **kwargs):
    return lambda value: value


def load_modal_app():
    modal = types.SimpleNamespace(
        App=lambda *args, **kwargs: _App(),
        Image=types.SimpleNamespace(debian_slim=lambda **kwargs: _Image()),
        Volume=types.SimpleNamespace(from_name=lambda *args, **kwargs: object()),
        is_local=lambda: False,
        cls=_identity_decorator,
        concurrent=_identity_decorator,
        method=_identity_decorator,
        enter=_identity_decorator,
        exit=_identity_decorator,
    )
    previous = sys.modules.get("modal")
    sys.modules["modal"] = modal
    try:
        path = Path(__file__).with_name("modal_app.py")
        spec = importlib.util.spec_from_file_location("modal_app_bridge_test", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            del sys.modules["modal"]
        else:
            sys.modules["modal"] = previous


class FakeStudio:
    _edit_image = object()
    _text_to_image_with_setup = object()

    def __init__(self, result):
        self.result = result
        self.calls = []

    def _serialized_render(self, operation, *args):
        self.calls.append((operation, args))
        return self.result


class ModalAppGatewayBridgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_modal_app()

    def test_edit_forwards_ordered_sources_and_manual_vgl(self):
        studio = FakeStudio({"png": b"png"})
        sources = [b"source-1", b"source-2", b"source-3", b"source-4"]
        result = self.module.FiboStudio.render_gateway(
            studio, prompt="Swap @image1 and @image2", seed=9, sources=sources,
            width=0, height=0, steps=3, negative_prompt="no blur",
            vgl='{"edit_instruction":"Swap @image1 and @image2"}',
        )
        self.assertEqual(result, b"png")
        operation, args = studio.calls[0]
        self.assertIs(operation, studio._edit_image)
        self.assertEqual(args[0], sources)
        self.assertEqual(args[1:], ("Swap @image1 and @image2", 9, 3, "no blur",
                                     '{"edit_instruction":"Swap @image1 and @image2"}', None))

    def test_original_geometry_mask_is_forwarded_with_one_source(self):
        studio = FakeStudio({"png": b"png"})
        self.module.FiboStudio.render_gateway(
            studio, prompt="Tint the sky", seed=9, sources=[b"source"], width=0, height=0, mask=b"mask",
        )
        _, args = studio.calls[0]
        self.assertEqual(args, ([b"source"], "Tint the sky", 9, 4, "", "", b"mask"))

    def test_text_inspiration_and_generated_vgl_keep_distinct_bytes_and_sidecar(self):
        vgl = '{"short_description":"A sunlit garden"}'
        studio = FakeStudio({"png": b"png", "prompt": vgl})
        result = self.module.FiboStudio.render_gateway(
            studio, prompt="A new garden", seed=42, width=1024, height=1024,
            inspiration=b"inspiration", generate_vgl=True,
        )
        self.assertEqual(result, {"image_png": b"png", "generated_vgl": vgl})
        operation, args = studio.calls[0]
        self.assertIs(operation, studio._text_to_image_with_setup)
        self.assertEqual(args, ("A new garden", 42, 1024, 1024, b"inspiration", 4, "", ""))

    def test_cancellation_and_invalid_worker_outputs_fail_closed(self):
        cancelled = FakeStudio({"cancelled": True})
        self.assertEqual(self.module.FiboStudio.render_gateway(
            cancelled, prompt="A vase", seed=1, width=1024, height=1024,
        ), {"cancelled": True})
        for result in ({}, {"png": "not-bytes"}, {"png": b"png", "prompt": "not json"}):
            studio = FakeStudio(result)
            with self.subTest(result=result), self.assertRaises((RuntimeError, ValueError)):
                self.module.FiboStudio.render_gateway(
                    studio, prompt="A vase", seed=1, width=1024, height=1024, generate_vgl=True,
                )

    def test_malformed_inspiration_is_rejected_before_dispatch(self):
        studio = FakeStudio({"png": b"png"})
        with self.assertRaises(ValueError):
            self.module.FiboStudio.render_gateway(
                studio, prompt="A vase", seed=1, width=1024, height=1024,
                inspiration=b"guide", vgl='{"short_description":"manual"}',
            )
        self.assertEqual(studio.calls, [])


if __name__ == "__main__":
    unittest.main()
