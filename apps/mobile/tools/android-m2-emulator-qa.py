#!/usr/bin/env python3
"""Standalone no-Metro Android 35 device-only proof; NO production credentials or images."""
from __future__ import annotations

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread, Lock
from xml.etree import ElementTree as ET
from contextlib import ExitStack
import json
import os
import re
import subprocess
import time

PACKAGE = "dev.renderlab.m2syntheticqa"
MARKER = b"M2-SYNTHETIC-DEVICE-PROOF-NO-CREDENTIALS"
SYNTHETIC_BEARER = "Bearer M2-SYNTHETIC-ONLY"
lock = Lock()
hits = {"start": 0, "target": 0, "start_had_synthetic_bearer": False,
        "target_had_any_authorization": False}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.server.server_port == 18765 and self.path == "/start":
            with lock:
                hits["start"] += 1
                hits["start_had_synthetic_bearer"] |= (
                    self.headers.get("Authorization") == SYNTHETIC_BEARER)
            self.send_response(302)
            self.send_header("Location", "http://10.0.2.2:18766/target")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        elif self.server.server_port == 18766 and self.path == "/target":
            with lock:
                hits["target"] += 1
                hits["target_had_any_authorization"] |= bool(
                    self.headers.get("Authorization"))
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"synthetic-redirect-target")
        else:
            self.send_error(404)
    def log_message(self, *_):
        pass  # NEVER log Authorization headers, even synthetic.

def adb(*args, timeout=45):
    r = subprocess.run(["adb", *args], check=True, capture_output=True,
                       text=True, timeout=timeout)
    return r.stdout.strip()

def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/m2-qa-hierarchy.xml")
    xml = adb("exec-out", "cat", "/sdcard/m2-qa-hierarchy.xml")
    root = ET.fromstring(xml[xml.find("<hierarchy"):])
    nodes = list(root.iter("node"))
    text = " ".join(
        n.get("text", "") + " " + n.get("content-desc", "") for n in nodes)
    return nodes, text

def wait(needle, seconds=75):
    end = time.monotonic() + seconds
    last = ""
    while time.monotonic() < end:
        try:
            nodes, last = hierarchy()
            if needle in last:
                print("PASS device marker:", needle, flush=True)
                return nodes
        except Exception as exc:
            last = type(exc).__name__
        time.sleep(1.8)
    raise AssertionError(f"missing marker {needle!r}; last={last[:350]}")

def tap(nodes, label):
    candidates = [n for n in nodes if n.get("text") == label
                  or n.get("content-desc", "").split(",")[0] == label]
    if not candidates:
        raise AssertionError("missing accessible target " + label)
    n = candidates[-1]
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", n.get("bounds", ""))
    if not match:
        raise AssertionError("no bounds for " + label)
    x1, y1, x2, y2 = map(int, match.groups())
    adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))

def launch_settings():
    adb("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
    nodes = wait("CREATIVE WORKSPACE", 120)
    tap(nodes, "Settings")
    return wait("M2 QA DEVICE PROOF")

def adb_read_encrypted_files():
    # AOSP system image may permit adb root. Never dump files to logs.
    root = subprocess.run(["adb", "root"], capture_output=True, text=True, timeout=30)
    if root.returncode != 0 or "cannot" in root.stdout.lower():
        return "unverified-adb-root-unavailable"
    adb("wait-for-device", timeout=75)
    cmd = ["adb", "exec-out", "sh", "-c",
           f"cat /data/user/0/{PACKAGE}/shared_prefs/SecureStore.xml 2>/dev/null"]
    r = subprocess.run(cmd, capture_output=True, timeout=20)
    if r.returncode != 0 or len(r.stdout) == 0:
        return "unverified-encrypted-preferences-not-readable"
    if MARKER in r.stdout:
        raise AssertionError("FAIL SecureStore preferences contain plaintext test marker")
    if b"<map" not in r.stdout:
        return "unverified-unexpected-shared-preferences"
    return "encrypted-shared-preferences-no-plaintext-marker"

def main(apk):
    with ExitStack() as stack:
        servers = []
        for port in (18765, 18766):
            server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            stack.callback(server.server_close)
            stack.callback(server.shutdown)
            Thread(target=server.serve_forever, daemon=True).start()
            servers.append(server)

        adb("wait-for-device", timeout=120)
        adb("install", "-r", apk, timeout=125)
        nodes = launch_settings()
        wait("M2 QA STORAGE EMPTY")
        tap(nodes, "Save synthetic")
        nodes = wait("M2 QA STORAGE STORED")
        at_rest = adb_read_encrypted_files()
        print("SECURESTORE-AT-REST:", at_rest, flush=True)
        adb("shell", "am", "force-stop", PACKAGE)
        nodes = launch_settings()
        nodes = wait("M2 QA STORAGE PRESENT")
        tap(nodes, "Test synthetic redirect")
        # Native fetch may return or throw; both are acceptable ONLY if
        # the second HTTP server was never requested.
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if "M2 QA REDIRECT TESTING" not in hierarchy()[1]:
                break
            time.sleep(2)
        with lock:
            evidence = dict(hits)
        print("REDIRECT-EVIDENCE:", json.dumps(evidence, sort_keys=True), flush=True)
        if evidence["start"] != 1 or not evidence["start_had_synthetic_bearer"]:
            raise AssertionError("Test did not send synthetic bearer to initial local server")
        if evidence["target"] != 0:
            # Fail the workflow; this fetch is NOT suitable for real bearer requests.
            print("FAIL: Native fetch followed a 302 (possibly stripping bearer),", flush=True)
            print("so this transport is NOT approved for production bearer traffic.", flush=True)
            raise AssertionError("native HTTP redirect refusal not proven")
        if evidence["target_had_any_authorization"]:
            raise AssertionError("cross-origin authorization forwarded by native fetch")
        tap(nodes, "Clear synthetic")
        wait("M2 QA STORAGE EMPTY")
        adb("shell", "am", "force-stop", PACKAGE)
        nodes = launch_settings()
        wait("M2 QA STORAGE EMPTY")
        print("PASS: native encrypted persistence, clear, restart and zero 302-follow", flush=True)
        print("No real sign-in, network credentials, media access, APK upload or Metro.", flush=True)

if __name__ == "__main__":
    if len(os.sys.argv) != 2:
        raise SystemExit("Expected temporary, CI-only APK path")
    main(os.sys.argv[1])
