# Instagram clone live Android device handoff — PR #401

**Status (2026-10-27): DEBUG APK BUILT, DOWNLOADED AND HASH-VERIFIED; REAL PHONE INSTALLATION / METRO CONNECTIVITY NOT YET VERIFIED.** This is an isolated, synthetic-data development lab, **not** a RenderLab production client, approved UI migration, or release-ready app.

## Verified exact APK
- [Successful build run](https://github.com/faresmohamed260/renderlab/actions/runs/40448615214), `renderlab-instagram-lab-debug-apk` artifact ID `12710191458`, seven-day retention through 2026-11-03.
- Actual extracted artifact: `apk/renderlab-instagram-lab-debug.apk`, package `dev.renderlab.instagramclonelab`, min Android API 24, target 35.
- SHA-256: `ce910a9e0a8eb6f2d1505ac8d33d8eb90b32cd3f42ae803d2fd35ba981833027`. The downloaded APK bytes were independently hashed and matched the build's SHA256SUMS.txt.
- The APK includes an Expo **development client**; it **will not render the clone offline** without a running, reachable Metro server providing the matching JavaScript bundle.
- The pinned MIT upstream clone source remains `hernanhawryluk/instagram-clone-app@24777fc335530a9c4285c7ef5974053ba7b39104`. Fixture setup removes real Firebase/EAS integration, uses fake media and identity, blocks sensitive Android permissions, and leaves Expo OTA updates disabled.

## Local Metro server and Fast Refresh
On any trusted workstation with Git, Python 3, Node 24/npm and the RenderLab repository checked out on this draft branch:

```sh
python3 .github/reference-tests/instagram-clone-live-server.py prepare
python3 .github/reference-tests/instagram-clone-live-server.py start --host lan
```

The first command creates an **isolated clone checkout** in `~/.renderlab-instagram-clone-lab`, checks out the exact upstream SHA, applies the same synthetic-data device-lab fixture used by the APK build, installs the same Expo SDK 53 development-client package, and leaves the original UI components editable. Re-running `prepare` preserves local UI edits. The second starts Metro on port 8081 and must **stay running**. The phone and server need reachable local network connectivity. Open the installed development client and enter/scan the Metro development-server URL printed in the terminal. React Native Fast Refresh can apply most JS/TS/JSX text, layout and icon changes without rebuilding the APK.

For USB-only connectivity with Android platform-tools/ADB and USB debugging authorized on the device:

```sh
adb reverse tcp:8081 tcp:8081
python3 .github/reference-tests/instagram-clone-live-server.py start --host localhost
```

Use the development client URL shown by Expo; ADB port reversal is a connection technique, not a device installation step. Native dependencies, app manifest permissions, native resource changes and development-client upgrades still require an APK rebuild.

## Actual acceptance sequence
1. User installs the APK on their Android device (explicit action; no remote installation without device authorization).
2. Trusted computer starts the pinned local Metro server and exposes it to the phone over LAN or USB/ADB.
3. Device opens the clone, shows synthetic Home feed, switches Search/Profile tabs with **physical touch**, and scrolls the feed. Record these as passed only after a real-device check; previous GitHub CI ADB taps failed while keyboard navigation passed.
4. Change a visible JSX label/color in the isolated clone source; verify **Fast Refresh on the running device** without APK reinstall. Then proceed with user-directed individual UI modifications.
5. Never enter real passwords or use actual personal media, Firebase credentials, shared RenderLab backend, OTA production updates, or production Android identity in this lab.

## Security and authority
The third-party clone's production dependency audit remains **41 findings: 4 critical, 18 high, 18 moderate, 1 low**. This test APK is **not approved for public distribution, production, real account access, or privileged data**. It is acceptable only as an isolated personal-device visual experiment with explicit understanding of the risk. No PR #399/#400 merge, RenderLab production app source, shared provider or native Phase M0 gate is altered. PR #401 remains draft/unmerged.
