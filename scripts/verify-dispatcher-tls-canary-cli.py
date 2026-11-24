"""Exercise the actual Modal CLI's import and local-entrypoint selection only.

Use the same SDK version as the failed invocation. Help is local: no App.run,
remote call, secret hydration or database access. Empty HOME/config and a
loopback server URL ensure a mistaken network path cannot reach Modal.
"""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / "workers" / "fibo-studio"
MODAL = Path(sys.executable).parent / "modal"


def main():
    with tempfile.TemporaryDirectory(prefix="renderlab-tls-cli-") as home:
        config = Path(home) / ".modal.toml"
        config.touch()
        env = {
            "HOME": home, "USERPROFILE": home, "MODAL_CONFIG_PATH": str(config),
            "MODAL_SERVER_URL": "http://127.0.0.1:1",
            "PATH": os.environ.get("PATH", ""),
            "RENDERLAB_MODAL_ENVIRONMENT": "qualification",
            "RENDERLAB_MODAL_DISPATCHER_SECRET": "fixture-dispatcher",
            "RENDERLAB_MODAL_GATEWAY_SECRET": "fixture-gateway",
            "RENDERLAB_MODAL_MONITOR_SECRET": "fixture-monitor",
        }
        completed = subprocess.run(
            [str(MODAL), "run", "--quiet", "--env", "qualification",
             "dispatcher_tls_canary.py::app.main", "--help"],
            cwd=WORKER, env=env, capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=30, check=False,
        )
        if completed.returncode or "--help" not in completed.stdout:
            # This process has only synthetic resource names and no real
            # credentials. The CI failure category is still intentionally fixed.
            raise SystemExit("FAIL offline Modal CLI entrypoint resolution")
        print("PASS offline Modal CLI 1.6.4 explicit canary entrypoint resolution")


if __name__ == "__main__":
    main()
