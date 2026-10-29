#!/usr/bin/env python3
"""Prepare pinned MIT Instagram clone for a disposable *device* UI editing lab.

Run from the root of the cloned upstream repository, after npm ci:
    python3 ../.github/reference-tests/instagram-clone-device-lab.py

This modifies only the disposable upstream clone checkout (never production RenderLab).
Requires the existing instagram-clone-offline-fixture.py to be provided as
RENDERLAB_FIXTURE_SCRIPT or at the sibling path below.
"""
from __future__ import annotations

import json
from pathlib import Path
import os
import subprocess
import sys

ROOT = Path.cwd().resolve()
assert (ROOT / "App.js").is_file() and (ROOT / "src/navigation/BottomTabs.jsx").is_file()
fixture = Path(os.environ.get("RENDERLAB_FIXTURE_SCRIPT", "../.github/reference-tests/instagram-clone-offline-fixture.py")).resolve()
assert fixture.is_file(), f"Offline fixture missing: {fixture}"
subprocess.run([sys.executable, str(fixture)], check=True)

# Undo CI-only Android simulated-touch troubleshooting layout. Preserve the
# upstream navigator and its original visual components for real phone testing.
tabs_file = ROOT / "src/navigation/BottomTabs.jsx"
tabs = tabs_file.read_text(encoding="utf-8")
for original, replacement in [
    ('      position: "relative",', '      position: "absolute",'),
    ('      bottom: 0,\n      marginBottom: Platform.OS === "android" ? 40 : 0,', '      bottom: 0,'),
    ('      elevation: 20,\n      zIndex: 20,', '      elevation: 0,'),
]:
    assert tabs.count(original) == 1, f"Expected one transient fixture patch: {original}"
    tabs = tabs.replace(original, replacement, 1)
tabs_file.write_text(tabs, encoding="utf-8")

cfg_path = ROOT / "app.json"
cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
expo = cfg["expo"]
expo["name"] = "RenderLab Clone Lab"
expo["slug"] = "renderlab-instagram-clone-lab"
expo["scheme"] = "renderlab-clone-lab"
expo["userInterfaceStyle"] = "dark"
expo.pop("extra", None)       # never reuse upstream EAS project
expo["updates"] = {"enabled": False}  # no OTA or third-party update channel
expo["android"]["package"] = "dev.renderlab.instagramclonelab"
expo["android"]["permissions"] = []  # no actual camera/media permissions in this UI-only lab
expo["android"]["blockedPermissions"] = [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.ACCESS_MEDIA_LOCATION",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.READ_CONTACTS",
]
# Do not invoke permission-requesting Expo camera/media config plugins.
# Autolinked native modules are unchanged; only Android permissions are blocked.
expo["plugins"] = [
    "expo-localization",
    "expo-video",
    "expo-splash-screen",
    "expo-asset",
]
cfg_path.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
assert "firebase" not in (ROOT / "src/services/firebase.js").read_text().lower() or (
    "db = null" in (ROOT / "src/services/firebase.js").read_text()
), "Firebase stub is not disabled"
assert "offlineReferenceFixture" in (ROOT / "src/hooks/useCurrentUser.js").read_text()
print("DEVICE_LAB_READY: original bottom tabs, fake offline data, no Firebase, no EAS, permission-denied Android debug identity")
