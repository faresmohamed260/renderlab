import ast
import unittest
from pathlib import Path


class ProductionGatewayPackagingTest(unittest.TestCase):
    def test_gateway_image_bundles_local_imports(self):
        directory = Path(__file__).parent
        entrypoint = directory / "modal_native_production.py"
        backing = ast.parse(entrypoint.read_text(encoding="utf-8"))
        bundled = {
            ast.literal_eval(arg)
            for call in ast.walk(backing)
            if isinstance(call, ast.Call)
            and isinstance(call.func, ast.Attribute)
            and call.func.attr == "add_local_python_source"
            for arg in call.args
        }
        self.assertIn("modal_native_smoke", bundled)
        for path in [entrypoint, *(directory / (name + ".py") for name in bundled)]:
            for statement in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                if not isinstance(statement, ast.ImportFrom) or not statement.module:
                    continue
                module = statement.module.split(".")[0]
                if (directory / (module + ".py")).is_file():
                    # Nested render imports use the separate GPU image, not the gateway.
                    if path.stem == "modal_native_smoke" and statement.col_offset:
                        continue
                    self.assertIn(module, bundled, f"{path.name} imports unbundled {module}")
