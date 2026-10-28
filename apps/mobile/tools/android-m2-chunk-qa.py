#!/usr/bin/env python3
"""Standalone Android 35 chunked SecureStore proof; synthetic values only."""
from __future__ import annotations
from pathlib import Path
from xml.etree import ElementTree as ET
import re
import subprocess
import sys
import time

PKG = "dev.renderlab.m2chunkproof"
SYNTHETIC = b"M2-CHUNKS-SYNTHETIC-NEVER-A-CREDENTIAL"

def adb(*args, timeout=50, check=True):
    result = subprocess.run(["adb", *args], capture_output=True, text=True,
                            timeout=timeout, check=check)
    return result.stdout.strip()

def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/renderlab-m2-chunk.xml", timeout=50)
    raw = adb("exec-out", "cat", "/sdcard/renderlab-m2-chunk.xml")
    root = ET.fromstring(raw[raw.index("<hierarchy"):])
    nodes = list(root.iter("node"))
    text = " ".join(n.get("text", "") + " " + n.get("content-desc", "") for n in nodes)
    return nodes, text

def wait(marker, timeout=95):
    end = time.monotonic() + timeout
    last = ""
    while time.monotonic() < end:
        try:
            nodes, last = hierarchy()
            if marker in last:
                print("PASS device:", marker, flush=True)
                return nodes
        except Exception as e:
            last = type(e).__name__
        time.sleep(2)
    raise AssertionError("Missing " + marker + "; last UI=" + last[:450])

def tap(nodes, label):
    matching = [x for x in nodes if x.get("text") == label or
                x.get("content-desc", "").split(",")[0] == label]
    if not matching:
        raise AssertionError("Missing tap target " + label)
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]",
                         matching[-1].get("bounds", ""))
    if not match:
        raise AssertionError("Invalid bounds " + label)
    x1, y1, x2, y2 = map(int, match.groups())
    adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))

def launch():
    adb("shell", "am", "start", "-n", PKG + "/.MainActivity")
    nodes = wait("CREATIVE WORKSPACE", timeout=130)
    tap(nodes, "Settings")
    return wait("M2 CHUNK DEVICE QA")

def encrypted_preferences():
    root = subprocess.run(["adb", "root"], capture_output=True, text=True, timeout=35)
    if root.returncode != 0 or "cannot" in root.stdout.lower():
        raise AssertionError("AOSP emulator must permit rooted encrypted-at-rest inspection")
    adb("wait-for-device", timeout=85)
    res = subprocess.run(["adb", "exec-out", "sh", "-c",
        "cat /data/user/0/" + PKG + "/shared_prefs/SecureStore.xml"],
        capture_output=True, timeout=20, check=True)
    if not res.stdout or b"<map" not in res.stdout:
        raise AssertionError("Encrypted SecureStore preferences missing")
    if SYNTHETIC in res.stdout or b"QA-only-no-bearer" in res.stdout:
        raise AssertionError("Synthetic token payload appears in plaintext")
    print("PASS native preferences file exists and has no plaintext payload", flush=True)

def main(path):
    apk = Path(path)
    if not apk.is_file() or apk.stat().st_size < 10_000_000:
        raise AssertionError("Missing disposable standalone APK")
    adb("wait-for-device", timeout=120)
    adb("install", "-r", str(apk), timeout=125)
    nodes = launch()
    wait("M2 CHUNK QA EMPTY")
    tap(nodes, "Save synthetic chunks")
    nodes = wait("M2 CHUNK QA STORED")
    encrypted_preferences()
    adb("shell", "am", "force-stop", PKG)
    nodes = launch()
    nodes = wait("M2 CHUNK QA PRESENT")
    tap(nodes, "Clear synthetic chunks")
    nodes = wait("M2 CHUNK QA EMPTY")
    adb("shell", "am", "force-stop", PKG)
    nodes = launch()
    wait("M2 CHUNK QA EMPTY")
    tap(nodes, "Save synthetic chunks")
    wait("M2 CHUNK QA STORED")
    adb("uninstall", PKG, timeout=120)
    adb("install", str(apk), timeout=120)
    nodes = launch()
    wait("M2 CHUNK QA EMPTY")
    print("PASS synthetic multi-chunk store, restart, delete and uninstall/reinstall", flush=True)
    print("No production Auth, credentials, bearer requests, APK upload or Metro", flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Expected disposable APK argument")
    main(sys.argv[1])
