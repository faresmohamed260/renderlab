"""Offline launcher failure matrix: no real Modal calls or credentials."""
from contextlib import redirect_stdout, redirect_stderr
import io
import os
from pathlib import Path
import runpy
import subprocess
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "run-dispatcher-tls-canary.py"
program = runpy.run_path(str(SCRIPT), run_name="tls_launcher_test")
ENV = {
    "RENDERLAB_MODAL_ENVIRONMENT": "qualification",
    "RENDERLAB_MODAL_DISPATCHER_SECRET": "qa-dispatcher",
    "RENDERLAB_MODAL_GATEWAY_SECRET": "qa-gateway",
    "RENDERLAB_MODAL_MONITOR_SECRET": "qa-monitor",
}


class LauncherTest(unittest.TestCase):
    def invoke(self, result=None, error=None, env=None, cli="/fixture/modal"):
        out, err = io.StringIO(), io.StringIO()
        with patch.dict(os.environ, ENV if env is None else env, clear=True), \
             patch("shutil.which", return_value=cli), \
             patch("subprocess.run", return_value=result, side_effect=error) as run, \
             redirect_stdout(out), redirect_stderr(err):
            code = program["main"]()
        self.assertEqual("", err.getvalue())
        self.assertEqual(1, len(out.getvalue().splitlines()))
        self.assertNotIn("SENTINEL_SECRET", out.getvalue())
        return code, out.getvalue().strip(), run

    def result(self, status, stdout="", stderr=""):
        return subprocess.CompletedProcess([], status, stdout, stderr)

    def test_exact_app_selector_and_success(self):
        code, marker, run = self.invoke(self.result(0, "progress\n" + program["PASS"] + "\n", "SENTINEL_SECRET"))
        self.assertEqual((0, program["PASS"]), (code, marker))
        self.assertEqual(["/fixture/modal", "run", "--quiet", "--env", "qualification",
                          "dispatcher_tls_canary.py::app.main"], run.call_args.args[0])
        self.assertEqual("fibo-studio", run.call_args.kwargs["cwd"].name)
        self.assertEqual(600, run.call_args.kwargs["timeout"])
        self.assertEqual(subprocess.PIPE, run.call_args.kwargs["stdout"])
        self.assertEqual(subprocess.PIPE, run.call_args.kwargs["stderr"])
        self.assertNotIn("shell", run.call_args.kwargs)

    def test_startup_failure_before_entrypoint(self):
        for raw, reason in [
            ("ModuleNotFoundError: SENTINEL_SECRET", "modal_import_failed"),
            ("Usage: modal run SENTINEL_SECRET", "modal_invocation_failed"),
            ("Secret not found SENTINEL_SECRET", "modal_secret_unavailable"),
            ("Image build failed SENTINEL_SECRET", "modal_image_build_failed"),
            ("Not authenticated SENTINEL_SECRET", "modal_auth_or_permission_failed"),
            ("Environment not found SENTINEL_SECRET", "modal_environment_unavailable"),
            ("Environment 'fixture-secret' not found SENTINEL_SECRET", "modal_environment_unavailable"),
            ("Secret 'fixture-environment' does not exist in environment 'main' SENTINEL_SECRET", "modal_secret_unavailable"),
            ("Environment 'main' does not exist; secret attachment skipped SENTINEL_SECRET", "modal_environment_unavailable"),
            ("Secret permission denied SENTINEL_SECRET", "modal_secret_unavailable"),
            ("Unexpected traceback SENTINEL_SECRET not found", "modal_failed_before_marker"),
            ("Environment configuration loaded\nUnexpected file not found SENTINEL_SECRET", "modal_failed_before_marker"),
            ("Unexpected SDK traceback SENTINEL_SECRET", "modal_failed_before_marker"),
        ]:
            with self.subTest(reason=reason):
                code, marker, _ = self.invoke(self.result(1, stderr=raw))
                self.assertEqual((1, program["PREFIX"] + reason), (code, marker))

    def test_only_exact_marker_and_exit_zero_pass(self):
        for status, raw, reason in [
            (0, "", "modal_exit_without_proof"),
            (1, program["PASS"], "modal_marker_exit_mismatch"),
            (0, program["PASS"] + "\n" + program["PASS"], "modal_marker_exit_mismatch"),
            (0, "FAIL dispatcher_tls_remote_import_failed", "modal_marker_exit_mismatch"),
            (1, "FAIL dispatcher_tls_SENTINEL_SECRET", "modal_marker_exit_mismatch"),
            (1, "FAIL dispatcher_tls_tls_certificate_or_connection_rejected", "tls_certificate_or_connection_rejected"),
        ]:
            with self.subTest(reason=reason):
                code, marker, _ = self.invoke(self.result(status, raw))
                self.assertEqual((1, program["PREFIX"] + reason), (code, marker))

    def test_resource_preflight_never_invokes_modal(self):
        for name in ENV:
            with self.subTest(name=name):
                code, marker, run = self.invoke(env={**ENV, name: "SENTINEL_SECRET"})
                self.assertEqual((1, program["PREFIX"] + "invalid_resource_" + name.lower()), (code, marker))
                run.assert_not_called()

    def test_missing_cli_and_process_errors(self):
        code, marker, run = self.invoke(cli=None)
        self.assertEqual((1, program["PREFIX"] + "modal_cli_not_found"), (code, marker))
        run.assert_not_called()
        for error, reason in [
            (subprocess.TimeoutExpired("SENTINEL_SECRET", 600), "modal_invocation_timeout"),
            (OSError("SENTINEL_SECRET"), "modal_cli_launch_failed"),
            (RuntimeError("SENTINEL_SECRET"), "launcher_failed"),
            (KeyboardInterrupt(), "interrupted"),
        ]:
            with self.subTest(reason=reason):
                code, marker, _ = self.invoke(error=error)
                self.assertEqual((1, program["PREFIX"] + reason), (code, marker))


if __name__ == "__main__":
    unittest.main()
