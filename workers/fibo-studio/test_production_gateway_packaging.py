import ast
import unittest
from pathlib import Path


DIRECTORY = Path(__file__).parent
RENDERER = "modal_native_renderer"
SMOKE = "modal_native_smoke"


def syntax(name):
    return ast.parse((DIRECTORY / (name + ".py")).read_text(encoding="utf-8"))


class GatewayPackagingTest(unittest.TestCase):
    def test_gateways_bundle_the_renderer_without_the_smoke_harness(self):
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
                self.assertIn(RENDERER, bundled)
                self.assertNotIn(SMOKE, bundled)
                for name in (gateway, *sorted(bundled)):
                    for statement in ast.walk(syntax(name)):
                        if not isinstance(statement, ast.ImportFrom) or not statement.module:
                            continue
                        module = statement.module.split(".")[0]
                        if not (DIRECTORY / (module + ".py")).is_file():
                            continue
                        # Imports inside render() are served by the separate GPU image.
                        if name == RENDERER and statement.col_offset:
                            continue
                        self.assertIn(module, bundled, f"{name} imports unbundled {module}")

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

    def test_cancel_marker_requires_process_exit_and_modal_cancellation(self):
        import subprocess
        from types import SimpleNamespace
        from unittest.mock import Mock

        class Cancelled(BaseException):
            pass

        fn = next(node for node in syntax(RENDERER).body if getattr(node, "name", None) == "render")
        # Run the actual render control/teardown block without Modal, GPU, or a subprocess.
        temp_scope = next(node for node in fn.body if isinstance(node, ast.With))
        start = next(i for i, node in enumerate(temp_scope.body) if isinstance(node, ast.Assign)
                     and any(isinstance(t, ast.Name) and t.id == "modal_cancelled" for t in node.targets))
        wrapper = ast.FunctionDef(
            name="run", args=ast.arguments(posonlyargs=[], args=[], kwonlyargs=[], kw_defaults=[], defaults=[]),
            body=temp_scope.body[start:], decorator_list=[],
        )
        code = compile(ast.fix_missing_locations(ast.Module(body=[wrapper], type_ignores=[])), "<render teardown>", "exec")

        for failure, force_kill in [(Cancelled, False), (Cancelled, True), (RuntimeError, False)]:
            with self.subTest(failure=failure, force_kill=force_kill):
                trace = []
                server = Mock(returncode=-15)
                server.poll.return_value = None
                server.terminate.side_effect = lambda: trace.append("terminate")
                server.kill.side_effect = lambda: trace.append("kill")

                def wait(timeout=None):
                    if force_kill and timeout is not None:
                        raise subprocess.TimeoutExpired("comfy", timeout)
                    trace.append("reaped")

                def request(path, payload=None):
                    if path.startswith("/object_info/"):
                        return {"TextEncodeFibo2": {}}
                    if path == "/prompt":
                        return {"prompt_id": "fixture-prompt"}
                    raise failure()

                server.wait.side_effect = wait
                namespace = {
                    "server": server, "request": request, "graph": {}, "TimeoutExpired": subprocess.TimeoutExpired,
                    "modal": SimpleNamespace(
                        exception=SimpleNamespace(InputCancellation=Cancelled), current_input_id=lambda: "fixture-input",
                    ),
                    "print": lambda message, **_: trace.append(message),
                }
                exec(code, namespace)
                with self.assertRaises(failure):
                    namespace["run"]()
                self.assertEqual(trace[0], "terminate")
                if force_kill:
                    self.assertEqual(trace[1], "kill")
                if failure is Cancelled:
                    self.assertEqual(trace[-2], "reaped")
                    self.assertIn("renderlab_fibo_cancel_process_reaped input_id=fixture-input prompt_id=fixture-prompt", trace[-1])
                else:
                    self.assertEqual(trace, ["terminate", "reaped"])
