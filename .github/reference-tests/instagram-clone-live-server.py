#!/usr/bin/env python3
"""Prepare/start the exact isolated Instagram clone used by PR #401's debug APK.

Run from a RenderLab repository checkout:
    python3 .github/reference-tests/instagram-clone-live-server.py prepare
    python3 .github/reference-tests/instagram-clone-live-server.py start --host lan

Phone and host must share a reachable network. Alternative USB mode:
    adb reverse tcp:8081 tcp:8081
    python3 .github/reference-tests/instagram-clone-live-server.py start --host localhost

The generated debug APK is a Metro *development client*, not a standalone app.
Only run with synthetic local fixtures; never enter real passwords or connect a backend.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys

REPO = Path(__file__).resolve().parents[2]
UPSTREAM = "https://github.com/hernanhawryluk/instagram-clone-app.git"
SHA = "24777fc335530a9c4285c7ef5974053ba7b39104"
DEFAULT_WORKSPACE = Path.home() / ".renderlab-instagram-clone-lab"


def run(*args: str, cwd: Path | None = None) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def prepare(target: Path) -> None:
    if target.exists():
        if not (target / ".git").is_dir():
            raise SystemExit(f"Refusing to modify non-git directory: {target}")
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=target, text=True).strip()
        if sha != SHA:
            raise SystemExit(f"Existing clone is not pinned to expected SHA: {sha}")
        if (target / "src" / "offlineReferenceFixture.js").exists():
            print("Already prepared; preserving your local UI edits.")
            return
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        run("git", "clone", "--no-checkout", UPSTREAM, str(target))
        run("git", "checkout", "--detach", SHA, cwd=target)
    run("npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund", cwd=target)
    env = dict(os.environ)
    env["RENDERLAB_FIXTURE_SCRIPT"] = str(REPO / ".github/reference-tests/instagram-clone-offline-fixture.py")
    subprocess.run([sys.executable, str(REPO / ".github/reference-tests/instagram-clone-device-lab.py")],
                   cwd=target, env=env, check=True)
    run("npx", "expo", "install", "expo-dev-client", "--", "--ignore-scripts", "--no-audit", "--no-fund", cwd=target)
    run("npm", "install", "--save-exact", "expo@53.0.27", "expo-image@2.4.1",
        "expo-updates@0.28.18", "react-native@0.79.6",
        "--ignore-scripts", "--no-audit", "--no-fund", cwd=target)
    run("npx", "expo", "install", "--check", cwd=target)
    print(f"Prepared isolated live-editing clone: {target}")
    print("Do not sign in; this is an unaudited, synthetic-data development lab.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("prepare", "start"))
    parser.add_argument("--workspace", type=Path, default=DEFAULT_WORKSPACE)
    parser.add_argument("--host", choices=("lan", "localhost"), default="lan")
    args = parser.parse_args()
    target = args.workspace.expanduser().resolve()
    if args.command == "prepare":
        prepare(target)
        return
    if not (target / "src" / "offlineReferenceFixture.js").is_file():
        raise SystemExit("Clone is not prepared. Run the prepare command first.")
    if not (target / "node_modules" / "expo-dev-client").is_dir():
        raise SystemExit("Expo dev-client dependency missing. Run prepare.")
    env = dict(os.environ)
    env["EXPO_NO_TELEMETRY"] = "1"
    env.pop("CI", None)
    print("Keep this terminal running. Phone must reach the Metro host on port 8081.")
    print("This server serves only synthetic lab data. Do not expose it publicly.")
    subprocess.run(["npx", "expo", "start", "--dev-client", "--host", args.host, "--port", "8081"],
                   cwd=target, env=env, check=True)


if __name__ == "__main__":
    main()
