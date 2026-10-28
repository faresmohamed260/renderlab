#!/usr/bin/env python3
"""Owner-approved dev APK install proof on emulator; offline, no Metro or Auth."""
from __future__ import annotations
import re
import subprocess
import sys
import time
from xml.etree import ElementTree as ET
PACKAGE = "uk.faresuniform.renderlab.dev"
def adb(*args, timeout=110):
    return subprocess.run(["adb", *args], capture_output=True, text=True,
                          timeout=timeout, check=True).stdout.strip()
def screen():
    adb("shell", "uiautomator", "dump", "/sdcard/renderlab-dev-proof.xml")
    raw = adb("exec-out", "cat", "/sdcard/renderlab-dev-proof.xml")
    nodes = list(ET.fromstring(raw[raw.index("<hierarchy"):]).iter("node"))
    text = " ".join(n.get("text", "") + " " + n.get("content-desc", "") for n in nodes)
    return nodes, text
def wait(marker, seconds=95):
    deadline = time.monotonic() + seconds
    last = ""
    while time.monotonic() < deadline:
        try:
            nodes, last = screen()
            if marker in last:
                print("PASS Android dev UI:", marker[:90], flush=True)
                return nodes
        except Exception as exc:
            last = type(exc).__name__
        time.sleep(2)
    raise AssertionError("Missing expected RenderLab screen marker: " + marker + " / " + last[:220])
def tap(nodes, label):
    options = [n for n in nodes
               if n.get("text") == label or n.get("content-desc", "").split(",")[0] == label]
    if not options:
        raise AssertionError("Cannot find accessible Android tab " + label)
    bounds = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", options[-1].get("bounds", ""))
    if not bounds:
        raise AssertionError("Invalid Android touch bounds for " + label)
    x1, y1, x2, y2 = map(int, bounds.groups())
    adb("shell", "input", "tap", str((x1 + x2)//2), str((y1 + y2)//2))
def verify_preview():
    adb("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
    nodes = wait("CREATIVE WORKSPACE", 155)
    tap(nodes, "Settings")
    nodes = wait("RenderLab account")
    nodes = wait("Sign-in is unavailable in this build.")
    for blocked in ("Account password", "Account email", "Authenticator code", "Sign out"):
        if any(n.get("text") == blocked or n.get("content-desc") == blocked for n in nodes):
            raise AssertionError("Private native credential control appeared: " + blocked)
    print("PASS real native shell and disabled Auth; production backend not mutated", flush=True)
def main(preview, metro):
    adb("wait-for-device", timeout=150)
    adb("install", "-r", preview, timeout=170)
    adb("shell", "svc", "wifi", "disable")
    adb("shell", "svc", "data", "disable")
    verify_preview()
    adb("shell", "am", "force-stop", PACKAGE)
    verify_preview()
    print("PASS no-Metro standalone preview after cold restart", flush=True)
    # The APKs must have the same package ID and signing cert.
    # adb install -r must accept replacing release with development client.
    adb("shell", "am", "force-stop", PACKAGE)
    installed = adb("install", "-r", metro, timeout=170)
    if "Success" not in installed:
        raise AssertionError("Cannot upgrade offline preview to Fast Refresh client with same signer")
    path = adb("shell", "pm", "path", PACKAGE)
    if "base.apk" not in path:
        raise AssertionError("Stable development package was not installed")
    print("PASS same-signer in-place APK replacement; no uninstall required", flush=True)
    print("METRO NOT TESTED: device needs owner's reachable local Expo server", flush=True)
if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: android-dev-package-qa.py <signed-preview.apk> <signed-fast-refresh.apk>")
    main(sys.argv[1], sys.argv[2])
