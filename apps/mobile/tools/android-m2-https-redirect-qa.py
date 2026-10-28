#!/usr/bin/env python3
"""One-off Android 35 HTTPS redirect refusal proof; no real creds, no public TLS."""
from __future__ import annotations
import json
import os
import re
import ssl
import subprocess
import sys
import time
from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock, Thread
from xml.etree import ElementTree as ET

PACKAGE = "dev.renderlab.m2httpsqa"
HOST = "10.0.2.2"
SYNTHETIC = "Bearer M2-HTTPS-SYNTHETIC-NO-CREDENTIALS"
PORTS = (18765, 18766, 18767)
CA_XML = """<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/m2_https_qa_ca" />
    </trust-anchors>
  </base-config>
</network-security-config>
"""
ROUTES = {
    "/ok": "OK",
    "/same-302": "302 SAME",
    "/cross-302": "302 CROSS",
    "/cross-307": "307 CROSS",
    "/downgrade-302": "DOWNGRADE",
}
lock = Lock()
requests = {name: 0 for name in ROUTES.values()}
bearer = {name: False for name in ROUTES.values()}
destinations = {"same": 0, "cross": 0, "downgrade": 0}
destination_auth = {"same": False, "cross": False, "downgrade": False}

def openssl(*args):
    subprocess.run(["openssl", *args], check=True, capture_output=True, text=True, timeout=35)

def prepare(certdir: str, native: str):
    """Temporary ONLY: generate local CA and trust resource in generated Android tree."""
    cert = Path(certdir)
    cert.mkdir(parents=True, exist_ok=True)
    native_root = Path(native)
    manifest = native_root / "app/src/main/AndroidManifest.xml"
    if not manifest.is_file():
        raise AssertionError("Expo native prebuild must run before TLS QA prepare")
    openssl("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
            "-keyout", str(cert / "ca.key"), "-out", str(cert / "ca.crt"),
            "-subj", "/CN=RenderLab-disposable-HTTPS-QA-CA",
            "-addext", "basicConstraints=critical,CA:TRUE",
            "-addext", "keyUsage=critical,keyCertSign,cRLSign")
    openssl("req", "-new", "-newkey", "rsa:2048", "-nodes",
            "-keyout", str(cert / "server.key"), "-out", str(cert / "server.csr"),
            "-subj", "/CN=10.0.2.2", "-addext", "subjectAltName=IP:10.0.2.2")
    extensions = cert / "leaf.ext"
    extensions.write_text("basicConstraints=critical,CA:FALSE\n"
                          "keyUsage=critical,digitalSignature,keyEncipherment\n"
                          "extendedKeyUsage=serverAuth\n"
                          "subjectAltName=IP:10.0.2.2\n", encoding="ascii")
    openssl("x509", "-req", "-in", str(cert / "server.csr"),
            "-CA", str(cert / "ca.crt"), "-CAkey", str(cert / "ca.key"),
            "-CAcreateserial", "-out", str(cert / "server.crt"),
            "-days", "1", "-sha256", "-extfile", str(extensions))
    raw = native_root / "app/src/main/res/raw"
    xml = native_root / "app/src/main/res/xml"
    raw.mkdir(parents=True, exist_ok=True)
    xml.mkdir(parents=True, exist_ok=True)
    (raw / "m2_https_qa_ca.crt").write_bytes((cert / "ca.crt").read_bytes())
    (xml / "m2_https_qa_network_config.xml").write_text(CA_XML, encoding="utf-8")
    source = manifest.read_text(encoding="utf-8")
    if "networkSecurityConfig" in source:
        raise AssertionError("Unexpected existing native network security config")
    changed, count = re.subn(r"<application(\s)", 
        r'<application android:networkSecurityConfig="@xml/m2_https_qa_network_config"\1',
        source, count=1)
    if count != 1:
        raise AssertionError("Expected one generated <application> element")
    manifest.write_text(changed, encoding="utf-8")
    # Never write CA/cert/key into repository-owned source files or deploy.
    print("PASS local HTTPS QA-only CA injected into disposable native build", flush=True)

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        is_start = self.server.server_port == PORTS[0] and self.path in ROUTES
        if is_start:
            name = ROUTES[self.path]
            with lock:
                requests[name] += 1
                bearer[name] |= self.headers.get("Authorization") == SYNTHETIC
            if self.path == "/ok":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
                return
            if self.path == "/same-302":
                status, location = 302, "https://10.0.2.2:18765/same-target"
            elif self.path == "/cross-302":
                status, location = 302, "https://10.0.2.2:18766/cross-target"
            elif self.path == "/cross-307":
                status, location = 307, "https://10.0.2.2:18766/cross-target"
            else:
                status, location = 302, "http://10.0.2.2:18767/downgrade-target"
            self.send_response(status)
            self.send_header("Location", location)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        types = {(18765, "/same-target"): "same",
                 (18766, "/cross-target"): "cross",
                 (18767, "/downgrade-target"): "downgrade"}
        key = types.get((self.server.server_port, self.path))
        if key:
            with lock:
                destinations[key] += 1
                destination_auth[key] |= bool(self.headers.get("Authorization"))
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_error(404)

    def log_message(self, *_):
        # Explicitly suppress request logs including bearer header values.
        pass

def adb(*args, timeout=70):
    return subprocess.run(["adb", *args], check=True, capture_output=True,
                          text=True, timeout=timeout).stdout.strip()

def hierarchy():
    adb("shell", "uiautomator", "dump", "/sdcard/m2-https-qa.xml")
    raw = adb("exec-out", "cat", "/sdcard/m2-https-qa.xml")
    nodes = list(ET.fromstring(raw[raw.index("<hierarchy"):]).iter("node"))
    return nodes, " ".join(n.get("text", "") + " " + n.get("content-desc", "") for n in nodes)

def wait(marker, seconds=90):
    end = time.monotonic() + seconds
    last = ""
    while time.monotonic() < end:
        try:
            nodes, last = hierarchy()
            if marker in last:
                print("PASS UI marker:", marker, flush=True)
                return nodes
            if "M2 HTTPS QA TLS FAILED" in last or "M2 HTTPS QA FOLLOWED" in last:
                raise AssertionError("Native fetch followed redirect or did not accept HTTPS QA certificate")
        except AssertionError:
            raise
        except Exception as error:
            last = type(error).__name__
        time.sleep(1.7)
    raise AssertionError("Missing expected UI marker " + marker + ", last=" + last[:170])

def tap(nodes, label):
    targets = [node for node in nodes if node.get("text") == label
               or node.get("content-desc", "").split(",")[0] == label]
    if not targets:
        raise AssertionError("Missing HTTPS QA button: " + label)
    match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", targets[-1].get("bounds", ""))
    if not match:
        raise AssertionError("No tap coordinates for " + label)
    x1, y1, x2, y2 = map(int, match.groups())
    adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))

def run(apk: str, certdir: str):
    cert = Path(certdir)
    if not all((cert / x).is_file() for x in ("ca.crt", "server.crt", "server.key")):
        raise AssertionError("Missing ephemeral local TLS certificate")
    with ExitStack() as stack:
        for port in PORTS:
            server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
            if port != 18767:
                ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ctx.minimum_version = ssl.TLSVersion.TLSv1_2
                ctx.load_cert_chain(str(cert / "server.crt"), str(cert / "server.key"))
                server.socket = ctx.wrap_socket(server.socket, server_side=True)
            stack.callback(server.server_close)
            stack.callback(server.shutdown)
            Thread(target=server.serve_forever, daemon=True).start()
        adb("wait-for-device", timeout=140)
        adb("install", "-r", apk, timeout=145)
        adb("shell", "am", "start", "-n", PACKAGE + "/.MainActivity")
        nodes = wait("CREATIVE WORKSPACE", 150)
        tap(nodes, "Settings")
        wait("M2 HTTPS REDIRECT QA ONLY")
        for case, expected in [
            ("OK", "M2 HTTPS QA TLS 200"),
            ("302 SAME", "M2 HTTPS QA REFUSED 302 SAME"),
            ("302 CROSS", "M2 HTTPS QA REFUSED 302 CROSS"),
            ("307 CROSS", "M2 HTTPS QA REFUSED 307 CROSS"),
            ("DOWNGRADE", "M2 HTTPS QA REFUSED DOWNGRADE"),
        ]:
            tap(wait("Test HTTPS " + case), "Test HTTPS " + case)
            wait(expected, 60)
        with lock:
            report = {"requests": dict(requests), "verified_synthetic_bearer": dict(bearer),
                      "redirect_destinations": dict(destinations),
                      "destination_any_authorization": dict(destination_auth)}
        print("HTTPS-REDIRECT-EVIDENCE:", json.dumps(report, sort_keys=True), flush=True)
        if any(report["requests"][case] != 1 or not report["verified_synthetic_bearer"][case]
               for case in ROUTES.values()):
            raise AssertionError("HTTPS baseline/redirect source request or bearer was never received")
        if any(report["redirect_destinations"].values()) or any(report["destination_any_authorization"].values()):
            raise AssertionError("Native fetch followed HTTPS redirect, even with bearer stripped")
        print("PASS verified real Android TLS request and zero HTTP-layer redirect follows "
              "(302 same/cross HTTPS, 307 cross HTTPS, 302 HTTPS-to-HTTP)", flush=True)
        print("LIMITATION: disposable Android 35 x86_64 QA certificate, not production TLS/R2 or physical phone", flush=True)

def main():
    if len(sys.argv) == 4 and sys.argv[1] == "prepare":
        prepare(sys.argv[2], sys.argv[3])
    elif len(sys.argv) == 4 and sys.argv[1] == "run":
        run(sys.argv[2], sys.argv[3])
    else:
        raise SystemExit("Usage: android-m2-https-redirect-qa.py prepare <certdir> <native>"
                         " | run <apk> <certdir>")

if __name__ == "__main__":
    main()
