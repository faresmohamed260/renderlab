#!/usr/bin/env python3
"""Apply RenderLab PR #401's reviewed UI overlays to a locally running clone.

Keeps native APK unchanged. When a GitHub overlay file is updated, a trusted
development machine writes the corresponding source file to the local clone
checkout; Metro Fast Refresh sees that write. No outside credentials or
backend changes are made by this script.

Run on the SAME computer running Metro, not on the Android phone:
  python3 renderlab/.github/reference-tests/instagram-clone-live-sync.py \
    --renderlab renderlab --clone clone --interval 8
  # optional single sync for verification: --once

A `git fetch` uses the user's existing access to the RenderLab repository.
No webhook, push access, credential upload or public tunnel is required.
"""
from __future__ import annotations
import argparse
import hashlib
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys
import time

BRANCH = "experiment/instagram-clone-android-emulator-20261026"
PREFIX = ".github/reference-tests/instagram-clone-overrides"
ALLOWED = ("src/navigation/", "src/screens/", "src/components/", "src/constants/")
EXTENSIONS = {".jsx", ".js", ".tsx", ".ts", ".json"}

def git(cwd: Path, *args: str, input_data: bytes | None = None) -> bytes:
    return subprocess.run(
        ["git", "-C", str(cwd), *args], check=True, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, input=input_data, timeout=90,
    ).stdout

def approved_path(path: str) -> bool:
    pp = PurePosixPath(path)
    if path.startswith("/") or ".." in pp.parts or "\\" in path:
        return False
    return (
        path.startswith(ALLOWED)
        and pp.suffix.lower() in EXTENSIONS
    )

def sync(renderlab: Path, clone: Path, previous: str) -> str:
    git(renderlab, "fetch", "--quiet", "--depth=1", "origin", BRANCH)
    commit = git(renderlab, "rev-parse", "FETCH_HEAD").decode().strip()
    if commit == previous:
        return commit
    names = git(renderlab, "ls-tree", "-r", "--name-only", "FETCH_HEAD", "--", PREFIX).decode().splitlines()
    changed = 0
    for name in sorted(names):
        relative = name.removeprefix(PREFIX + "/")
        if not approved_path(relative):
            raise RuntimeError("Refusing non-UI overlay: " + name)
        src = git(renderlab, "show", "FETCH_HEAD:" + name)
        dst = clone.joinpath(*PurePosixPath(relative).parts)
        if clone not in dst.resolve().parents:
            raise RuntimeError("Unsafe overlay destination: " + str(dst))
        if not dst.is_file():
            raise RuntimeError("Expected existing upstream visual source: " + str(dst))
        if hashlib.sha256(dst.read_bytes()).digest() == hashlib.sha256(src).digest():
            continue
        tmp = dst.with_name(dst.name + ".renderlab-sync-tmp")
        tmp.write_bytes(src)
        os.replace(tmp, dst)
        print("LIVE_UI_UPDATED", relative, "commit", commit[:12], flush=True)
        changed += 1
    print("SYNC_CHECKED", commit[:12], "files_changed", changed, flush=True)
    return commit

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--renderlab", type=Path, required=True)
    p.add_argument("--clone", type=Path, required=True)
    p.add_argument("--interval", type=int, default=8)
    p.add_argument("--once", action="store_true")
    args = p.parse_args()
    if not (2 <= args.interval <= 300):
        p.error("--interval must be between 2 and 300 seconds")
    renderlab,clone=args.renderlab.resolve(),args.clone.resolve()
    if not (renderlab / ".git").exists() or not (clone / ".git").exists():
        p.error("Both --renderlab and --clone must be Git checkouts")
    if not (clone/"src/navigation/BottomTabs.jsx").is_file():
        p.error("The selected clone checkout is not the pinned Instagram UI source")
    prior=""
    while True:
        try:
            prior=sync(renderlab,clone,prior)
        except (OSError,subprocess.CalledProcessError,subprocess.TimeoutExpired,RuntimeError) as e:
            print("SYNC_ERROR",str(e),file=sys.stderr,flush=True)
            if args.once:
                raise SystemExit(1)
        if args.once:
            return
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
