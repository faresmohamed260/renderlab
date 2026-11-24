import ast
import os
import runpy
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


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

    def test_each_function_can_cold_import_with_its_declared_environment(self):
        deployment_env = {
            "RENDERLAB_MODAL_ENVIRONMENT": "qualification",
            "RENDERLAB_MODAL_GATEWAY_SECRET": "qa-gateway",
            "RENDERLAB_MODAL_DISPATCHER_SECRET": "qa-dispatcher",
            "RENDERLAB_MODAL_MONITOR_SECRET": "qa-monitor",
            "RENDERLAB_MODAL_WORKER_SECRET": "qa-worker",
            "RENDERLAB_MODAL_MODEL_VOLUME": "qa-models",
            "RENDERLAB_DISPATCH_DATABASE_URL": "must-not-be-forwarded",
        }
        gateway_keys = {
            "RENDERLAB_MODAL_GATEWAY_SECRET", "RENDERLAB_MODAL_DISPATCHER_SECRET",
            "RENDERLAB_MODAL_MONITOR_SECRET",
        }
        worker_keys = {"RENDERLAB_MODAL_WORKER_SECRET", "RENDERLAB_MODAL_MODEL_VOLUME"}
        for module, resource_keys in (
            ("modal_native_production", gateway_keys),
            ("modal_native_candidate", gateway_keys),
            (RENDERER, worker_keys),
        ):
            with self.subTest(module=module):
                sdk = MagicMock()
                function = sdk.App.return_value.function
                path = str(DIRECTORY / (module + ".py"))
                with patch.dict(sys.modules, {"modal": sdk}):
                    with patch.dict(os.environ, deployment_env, clear=True):
                        runpy.run_path(path, run_name=module)
                    expected = {
                        name: deployment_env[name]
                        for name in resource_keys | {"RENDERLAB_MODAL_ENVIRONMENT"}
                    }
                    self.assertEqual(1 if module == RENDERER else 3, function.call_count)
                    for declaration in tuple(function.call_args_list):
                        self.assertEqual(expected, declaration.kwargs["env"])
                        remote_env = {
                            **declaration.kwargs["env"],
                            "MODAL_IS_REMOTE": "1",
                            "MODAL_ENVIRONMENT": "qualification",
                        }
                        with patch.dict(os.environ, remote_env, clear=True):
                            runpy.run_path(path, run_name=module)
                        with patch.dict(os.environ, {**remote_env, "MODAL_ENVIRONMENT": "main"}, clear=True):
                            with self.assertRaisesRegex(RuntimeError, "does not match"):
                                runpy.run_path(path, run_name=module)

    def test_dispatch_heartbeat_attempted_on_tick_and_setup_failure(self):
        import types
        from unittest.mock import Mock
        env = {
            "RENDERLAB_MODAL_ENVIRONMENT": "qualification",
            "RENDERLAB_MODAL_GATEWAY_SECRET": "fixture-gateway",
            "RENDERLAB_MODAL_DISPATCHER_SECRET": "fixture-dispatcher",
            "RENDERLAB_MODAL_MONITOR_SECRET": "fixture-monitor",
        }
        for module in ("modal_native_production", "modal_native_candidate"):
            for fail_at in ("tick", "setup", "heartbeat", "none"):
                with self.subTest(module=module, fail_at=fail_at):
                    sdk = MagicMock()
                    sdk.App.return_value.function.side_effect = lambda **_: lambda fn: fn
                    sdk.asgi_app.side_effect = lambda **_: lambda fn: fn
                    store = Mock()
                    tick = Mock()
                    from dispatch_core import DispatchSummary
                    summary = DispatchSummary(claimed=2, dispatched=1, unresolved=1)
                    tick.tick.return_value = summary
                    if fail_at == "tick":
                        tick.tick.side_effect = RuntimeError("tick fixture")
                    if fail_at == "heartbeat":
                        store.record_heartbeat.side_effect = RuntimeError("heartbeat fixture")
                    factory = Mock(return_value=object())
                    if fail_at == "setup":
                        factory.side_effect = RuntimeError("setup fixture")
                    with patch.dict(sys.modules, {"modal": sdk}), patch.dict(os.environ, env, clear=True):
                        program = runpy.run_path(str(DIRECTORY / (module + ".py")), run_name=module)
                    db = types.ModuleType("dispatch_supabase")
                    db.SupabaseDispatchStore = lambda: store
                    adapter = types.ModuleType("modal_dispatch_backend")
                    adapter.ModalImageBackend = factory
                    gateway = types.ModuleType("native_gateway")
                    gateway.call_handle_signer = lambda _: object()
                    with patch.dict(sys.modules, {"dispatch_supabase": db, "modal_dispatch_backend": adapter,
                                                  "native_gateway": gateway}), \
                         patch("dispatch_core.Dispatcher", return_value=tick):
                        if fail_at == "none":
                            self.assertEqual(summary.__dict__, program["dispatch_tick"]("wake"))
                        else:
                            with self.assertRaisesRegex(RuntimeError, fail_at + " fixture"):
                                program["dispatch_tick"]("wake")
                    expected = summary.__dict__ if fail_at in ("none", "heartbeat") else DispatchSummary().__dict__
                    store.record_heartbeat.assert_called_once_with(environment="qualification", trigger="wake", summary=expected)

    def test_gateway_and_worker_images_pin_the_postgres_driver(self):
        for module in ("modal_native_production", "modal_native_candidate", RENDERER):
            with self.subTest(module=module):
                source = (DIRECTORY / (module + ".py")).read_text(encoding="utf-8")
                self.assertIn('"psycopg[binary]==3.2.13"', source)

        store = (DIRECTORY / "dispatch_supabase.py").read_text(encoding="utf-8")
        self.assertIn('"RENDERLAB_DISPATCH_DATABASE_URL"', store)
        self.assertNotIn("RENDERLAB_DISPATCH_SUPABASE_API_KEY", store)
        self.assertNotIn("RENDERLAB_DISPATCH_SUPABASE_URL", store)

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
