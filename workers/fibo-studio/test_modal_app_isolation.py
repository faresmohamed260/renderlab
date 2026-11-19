import ast
from pathlib import Path
import unittest

from workload_environment import APP_NAMES


ROOT = Path(__file__).parent


class ModalAppIsolationTest(unittest.TestCase):
    def test_app_names_are_distinct(self):
        self.assertEqual(len(APP_NAMES), len(set(APP_NAMES.values())))

    def test_inactive_shells_have_no_gpu_secret_schedule_or_web_endpoint(self):
        for module in ("modal_video_generation", "modal_image_tools", "modal_video_tools"):
            with self.subTest(module=module):
                source = (ROOT / f"{module}.py").read_text(encoding="utf-8")
                tree = ast.parse(source)
                attributes = {node.attr for node in ast.walk(tree) if isinstance(node, ast.Attribute)}
                self.assertNotIn("asgi_app", attributes)
                self.assertNotIn("web_endpoint", attributes)
                self.assertNotIn("Secret", attributes)
                self.assertNotIn("Cron", attributes)
                for call in (node for node in ast.walk(tree) if isinstance(node, ast.Call)):
                    self.assertFalse(any(keyword.arg in {"gpu", "schedule", "secrets"} for keyword in call.keywords))

    def test_gateway_and_image_worker_are_independent_apps(self):
        gateway = (ROOT / "modal_native_production.py").read_text(encoding="utf-8")
        worker = (ROOT / "modal_native_renderer.py").read_text(encoding="utf-8")
        self.assertIn('modal.App(APP_NAMES["gateway"])', gateway)
        self.assertIn('modal.App("renderlab-image-generation")', worker)
        self.assertNotIn(".include(", gateway)


if __name__ == "__main__":
    unittest.main()
