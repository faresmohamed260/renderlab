import ast
import unittest
from pathlib import Path


DIRECTORY = Path(__file__).parent
RENDERER = "modal_native_renderer"
SMOKE = "modal_native_smoke"


def syntax(name):
    return ast.parse((DIRECTORY / (name + ".py")).read_text(encoding="utf-8"))


class GatewayPackagingTest(unittest.TestCase):
    def test_gateways_do_not_bundle_the_gpu_renderer_or_smoke_harness(self):
        for gateway in ("modal_native_production", "modal_native_candidate"):
            with self.subTest(gateway=gateway):
                bundled = {
                    ast.literal_eval(arg)
                    for call in ast.walk(syntax(gateway))
                    if isinstance(call, ast.Call)
                    and isinstance(call.func, ast.Attribute)
                    and call.func.attr == "add_local_python_source"
                    for arg in call.args
                }
                self.assertNotIn(RENDERER, bundled)
                self.assertNotIn(SMOKE, bundled)
                for name in (gateway, *sorted(bundled)):
                    for statement in ast.walk(syntax(name)):
                        if not isinstance(statement, ast.ImportFrom) or not statement.module:
                            continue
                        module = statement.module.split(".")[0]
                        if not (DIRECTORY / (module + ".py")).is_file():
                            continue
                        self.assertIn(module, bundled, f"{name} imports unbundled {module}")

    def test_gateway_resolves_the_environment_local_image_worker(self):
        for gateway in ("modal_native_production", "modal_native_candidate"):
            source = (DIRECTORY / (gateway + ".py")).read_text(encoding="utf-8")
            self.assertIn('modal.Function.from_name(APP_NAMES["image"], "render", environment_name=environment)', source)
            self.assertNotIn(".include(", source)

    def test_smoke_runner_reuses_the_worker_and_owns_the_local_entrypoint(self):
        smoke = syntax(SMOKE)
        self.assertTrue(any(
            isinstance(node, ast.ImportFrom)
            and node.module == RENDERER
            and any(alias.name == "render" for alias in node.names)
            for node in smoke.body
        ))
        self.assertEqual(
            [node.name for node in smoke.body if isinstance(node, ast.FunctionDef)],
            ["main"],
        )
        self.assertFalse(any(
            isinstance(node, ast.Attribute) and node.attr == "local_entrypoint"
            for node in ast.walk(syntax(RENDERER))
        ))
