"""Offline, secret-free proof of Modal TLS canary wiring and failure hygiene."""
import ast
import os
from pathlib import Path
import runpy
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

HERE = Path(__file__).parent
CANARY = HERE / "dispatcher_tls_canary.py"


class _App:
    def __init__(self):
        self.function_options = None

    def function(self, **kwargs):
        self.function_options = kwargs
        return lambda function: function

    def local_entrypoint(self):
        return lambda function: function


class DispatcherTlsCanaryTest(unittest.TestCase):
    def _load(self, *, rows=None, error=None):
        app = _App()
        modal = types.ModuleType("modal")
        modal.App = lambda name: app
        prod = types.ModuleType("modal_native_production")
        prod.gateway_image = MagicMock()
        packaged_image = object()
        prod.gateway_image.add_local_python_source.return_value = packaged_image
        prod.dispatcher_secret = object()
        prod.runtime_env = {"RENDERLAB_MODAL_ENVIRONMENT": "qualification"}
        db = types.ModuleType("dispatch_supabase")
        calls = []

        class Store:
            def _query(self, sql, params):
                calls.append((sql, params))
                if error is not None:
                    raise error
                return [{"probe_ok": 1}] if rows is None else rows

        db.SupabaseDispatchStore = Store
        with patch.dict(sys.modules, {
            "modal": modal, "modal_native_production": prod, "dispatch_supabase": db,
        }):
            program = runpy.run_path(str(CANARY), run_name="dispatcher_tls_canary_test")
        original_probe = program["probe"]
        def probe_with_fake_db():
            # The remote function imports the store at call time, not at import.
            with patch.dict(sys.modules, {"dispatch_supabase": db}):
                return original_probe()
        program["probe"] = probe_with_fake_db
        prod.gateway_image.add_local_python_source.assert_called_once_with(
            "modal_native_production", "dispatcher_tls_canary"
        )
        self.assertIs(app.function_options["image"], packaged_image)
        self.assertEqual([prod.dispatcher_secret], app.function_options["secrets"])
        self.assertIs(app.function_options["env"], prod.runtime_env)
        self.assertEqual(0.25, app.function_options["cpu"])
        self.assertEqual(45, app.function_options["timeout"])
        self.assertNotIn("gpu", app.function_options)
        self.assertNotIn("schedule", app.function_options)
        return program, calls

    def test_probe_readonly_verified_path(self):
        program, calls = self._load()
        with patch.dict(os.environ, {"PGSSLROOTCERT": "/test/ca.pem"}, clear=True), \
             patch("pathlib.Path.is_file", return_value=True):
            self.assertEqual({"ok": True, "reason": "verify_full_select_1"}, program["probe"]())
        self.assertEqual([("select 1 as probe_ok", ())], calls)

    def test_no_ca_fails_before_connection_and_does_not_accept_require(self):
        program, calls = self._load()
        with patch.dict(os.environ, {"PGSSLROOTCERT": ""}, clear=True), \
             patch("pathlib.Path.is_file", return_value=False):
            self.assertEqual(
                {"ok": False, "reason": "ca_bundle_unavailable_no_verify_full"},
                program["probe"](),
            )
        self.assertEqual([], calls)

    def test_libpq_error_and_credentials_are_never_reported(self):
        cases = [
            (RuntimeError("Dispatcher PostgreSQL connection failed under sslmode=verify-full; secret@private-db"),
             "tls_certificate_or_connection_rejected"),
            (RuntimeError("Dispatcher PostgreSQL TLS trust root is unavailable"),
             "tls_trust_root_unavailable"),
            (ValueError("db password secret@private-db"),
             "dispatcher_readonly_query_failed"),
        ]
        for error, expected in cases:
            with self.subTest(expected=expected):
                program, calls = self._load(error=error)
                with patch.dict(os.environ, {"PGSSLROOTCERT": "/test/ca.pem"}, clear=True), \
                     patch("pathlib.Path.is_file", return_value=True):
                    result = program["probe"]()
                self.assertEqual({"ok": False, "reason": expected}, result)
                self.assertNotIn("secret", str(result))
                self.assertNotIn("private-db", str(result))
                self.assertEqual([("select 1 as probe_ok", ())], calls)

    def test_file_has_no_provider_calls_or_write_queries(self):
        tree = ast.parse(CANARY.read_text(encoding="utf8"))
        attrs = {node.attr for node in ast.walk(tree) if isinstance(node, ast.Attribute)}
        self.assertFalse({"spawn", "Cron", "asgi_app", "web_endpoint"} & attrs)
        source = CANARY.read_text(encoding="utf8")
        self.assertIn("from modal_native_production import gateway_image, dispatcher_secret, runtime_env", source)
        self.assertNotIn("insert into ", source.lower())
        self.assertNotIn("update public.", source.lower())
        self.assertNotIn("delete from ", source.lower())


if __name__ == "__main__":
    unittest.main()
