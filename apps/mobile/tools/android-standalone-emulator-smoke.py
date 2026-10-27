#!/usr/bin/env python3
"""Ephemeral emulator-only smoke for a standalone Expo SDK58 arm64/x86_64 APK.

This is not production release qualification, device acceptance, or real account
authentication. Only a disposable APK/test key is used. This script does not
perform a production API mutation, supply bearer credentials, or call Metro.
"""
from __future__ import annotations

import os
from pathlib import Path
import re
import subprocess
import sys
import time
from xml.etree import ElementTree as ET

PACKAGE = "dev.renderlab.standaloneproof"
EVIDENCE = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "renderlab-standalone-emulator"
EVIDENCE.mkdir(parents=True, exist_ok=True)


def adb(*args: str, timeout: int = 35, check: bool = True) -> str:
    result = subprocess.run(
        ["adb", *args], capture_output=True, text=True, encoding="utf-8",
        errors="replace", timeout=timeout, check=check,
    )
    return result.stdout.strip()


def snapshot(tag: str) -> tuple[list[ET.Element], str]:
    target = "/sdcard/renderlab-window.xml"
    adb("shell", "uiautomator", "dump", target, timeout=42)
    raw = adb("exec-out", "cat", target, timeout=12)
    if "<hierarchy" not in raw:
        (EVIDENCE / f"{tag}-ui-dump-empty.txt").write_text(
            "UIAutomator returned no hierarchy; raw dump:\n" + raw[:2000],
            encoding="utf-8",
        )
        raise AssertionError("Android UIAutomator hierarchy missing (startup may not have settled)")
    content = raw[raw.index("<hierarchy"):]
    (EVIDENCE / f"{tag}.xml").write_text(content, encoding="utf-8")
    root = ET.fromstring(content)
    values = [
        f"{n.get('text', '')} {n.get('content-desc', '')}" for n in root.iter("node")
    ]
    return list(root.iter("node")), " ".join(values)


def wait_for(expected: str, tag: str, *, timeout: int = 105) -> list[ET.Element]:
    end = time.monotonic() + timeout
    last = ""
    attempt = 0
    while time.monotonic() < end:
        attempt += 1
        try:
            nodes, text = snapshot(f"{tag}-{attempt:02d}")
            last = text
            if expected in text:
                print(f"PASS {tag}: on-device hierarchy contains {expected!r}", flush=True)
                return nodes
        except (AssertionError, subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError) as error:
            last = type(error).__name__
        time.sleep(2)
    raise AssertionError(f"Expected {expected!r} not visible in {tag}; last UI: {last[:1000]}")


def bounds(raw: str) -> tuple[int, int, int, int]:
    result = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", raw)
    if not result:
        raise AssertionError("Android UI element has no clickable bounds")
    return tuple(map(int, result.groups()))


def tap_accessible(label: str, nodes: list[ET.Element], height: int, *, bottom: bool = False) -> None:
    matches = []
    for node in nodes:
        text = node.get("text", "")
        desc = node.get("content-desc", "")
        if not (text == label or desc == label or desc.startswith(label + ",")):
            continue
        try:
            x1, y1, x2, y2 = bounds(node.get("bounds", ""))
        except AssertionError:
            continue
        if bottom and (y1 + y2) // 2 < int(height * 0.60):
            continue
        matches.append((y1, x1, y2, x2, node.get("clickable", "false")))
    if not matches:
        raise AssertionError(f"No accessible tap target for {label!r} in on-device UI tree")
    # Bottom tab labels can have nested child nodes: prefer the lowest item.
    y1, x1, y2, x2, clickable = sorted(matches, reverse=True)[0]
    x, y = (x1 + x2) // 2, (y1 + y2) // 2
    adb("shell", "input", "tap", str(x), str(y))
    print(f"ACTION physical emulator touch {label!r} at ({x},{y}), clickable={clickable}", flush=True)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Expected isolated signed APK argument")
    apk = Path(sys.argv[1])
    if not apk.is_file() or apk.stat().st_size < 10_000_000:
        raise AssertionError("Missing isolated standalone APK")
    adb("wait-for-device", timeout=120)
    adb("shell", "settings", "put", "global", "window_animation_scale", "0")
    adb("shell", "settings", "put", "global", "transition_animation_scale", "0")
    adb("shell", "settings", "put", "global", "animator_duration_scale", "0")
    adb("shell", "pm", "disable-user", "--user", "0", "com.android.launcher3", check=False)
    adb("install", "-r", str(apk), timeout=120)
    print("PASS disposable standalone APK installed into isolated Android emulator", flush=True)
    adb("shell", "input", "keyevent", "KEYCODE_WAKEUP")
    adb("shell", "input", "keyevent", "KEYCODE_MENU")
    start = adb("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
    print("LAUNCH", start[:300], flush=True)
    # Android UIAutomator can be blank immediately after a cold app start.
    time.sleep(5)
    out = adb("shell", "wm", "size")
    match = re.search(r"(\d+)x(\d+)", out)
    if not match:
        raise AssertionError("Could not determine emulator dimensions")
    _, height = map(int, match.groups())

    nodes = wait_for("CREATIVE WORKSPACE", "launch-create")
    adb("shell", "pidof", PACKAGE, timeout=10)
    # The initial screen must show the real SDK58 embedded scaffold (not Expo dev-client launcher).
    for tab, marker in [
        ("Library", "PRODUCTION CONNECTION"),
        ("Activity", "GENERATION HISTORY"),
        ("Settings", "DEVICE PREFERENCES"),
        ("Create", "CREATIVE WORKSPACE"),
    ]:
        tap_accessible(tab, nodes, height, bottom=True)
        nodes = wait_for(marker, "tab-" + tab.lower())
        adb("shell", "pidof", PACKAGE, timeout=10)
    tap_accessible("Open Library", nodes, height)
    wait_for("PRODUCTION CONNECTION", "create-button-library")
    print("PASS 4 bottom tabs + in-content navigation via ADB touch; no Metro", flush=True)
    adb("shell", "am", "force-stop", PACKAGE)
    start = adb("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
    wait_for("CREATIVE WORKSPACE", "cold-restart")
    print("PASS standalone cold restart uses bundled JavaScript without Metro", flush=True)
    (EVIDENCE / "acceptance.txt").write_text(
        "PASS: native launch, Library/Activity/Settings/Create tab touch, "
        "in-content Library button and cold restart.\n"
        "No credential/token/protected asset access or APK distribution.\n",
        encoding="utf-8",
    )
    print("PASS all isolated standalone-emulator checks", flush=True)


if __name__ == "__main__":
    try:
        main()
    except BaseException as exc:
        print(f"FAIL standalone emulator acceptance: {type(exc).__name__}: {exc}", flush=True)
        for name, argv in [
            ("android-errors.log", ("logcat", "-d", "-s", "ReactNativeJS:E", "AndroidRuntime:E")),
            ("window-focus.txt", ("shell", "dumpsys", "window")),
            ("activity-top.txt", ("shell", "dumpsys", "activity", "top")),
            ("android-package-pid.txt", ("shell", "pidof", PACKAGE)),
        ]:
            try:
                raw = adb(*argv, timeout=18, check=False)
                (EVIDENCE / name).write_text(raw[-25000:], encoding="utf-8")
            except Exception:
                pass
        try:
            shot = subprocess.run(
                ["adb", "exec-out", "screencap", "-p"], capture_output=True, timeout=15,
            )
            if shot.returncode == 0 and shot.stdout.startswith(b"\x89PNG"):
                (EVIDENCE / "failure-device-screen.png").write_bytes(shot.stdout)
        except Exception:
            pass
        raise
