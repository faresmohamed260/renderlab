#!/usr/bin/env python3
"""Isolated reference smoke fixture. Reuses original Instagram clone UI components.

Applied only inside an ephemeral CI checkout of an MIT-licensed public clone.
Never written to RenderLab app source or connected to any Firebase/EAS service.
"""
from __future__ import annotations
import base64
import json
import struct
import zlib
from pathlib import Path


def image_uri(seed: int) -> str:
    """Small distinctive, locally generated PNG; no external image URLs or licenses."""
    width = height = 112
    rgb = [
        (36, 103, 142), (172, 92, 61), (69, 131, 102),
        (98, 76, 157), (170, 132, 54), (53, 116, 167),
        (136, 65, 114), (47, 137, 133), (170, 102, 73),
        (95, 108, 155), (124, 144, 81), (131, 73, 95),
    ][seed % 12]
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            diagonal = ((x + 2 * y + 16 * seed) // 22) % 2
            shade = int(18 * diagonal + 14 * x / width - 8 * y / height)
            row.extend(min(255, max(0, c + shade)) for c in rgb)
        rows.append(bytes(row))
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"".join(rows), 8)) + chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(png).decode("ascii")


def put(path: str, content: str) -> None:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Original clone file missing: {path}")
    p.write_text(content, encoding="utf-8")


# The original author’s app config is never used to provision or connect an EAS account.
app_config_path = Path("app.json")
config = json.loads(app_config_path.read_text())
config["expo"].pop("extra", None)
app_config_path.write_text(json.dumps(config, indent=2) + "\n")

# Only entry-point selection changes. Original BottomTabs, Home, Search,
# Profile, Posts, stories and grid components remain verbatim.
app = Path("App.js")
old = 'import AuthNavigation from "./src/navigation/AuthNavigation";'
contents = app.read_text()
assert contents.count(old) == 1, "Clone App.js entry-point signature changed"
app.write_text(contents.replace(old, 'import AuthNavigation from "./src/navigation/SignedInStack";'))
# The original clone's full-screen Reanimated splash is layered above every
# screen during its exit animation. It must not intercept taps after fading.
# This changes hit testing only; the existing visual splash remains intact.
contents = app.read_text()
splash = '<Animated.View\n          exiting={FadeOut.duration(1500)}'
assert contents.count(splash) == 1, "Upstream App.js splash signature changed"
app.write_text(contents.replace(splash, '<Animated.View\n          pointerEvents="none"\n          exiting={FadeOut.duration(1500)}', 1))
print("Reference-only input guard: splash overlay cannot intercept React Native touches.")

# No real backend is initialized; accidental attempted reads/writes must fail closed.
put("src/services/firebase.js", "export const auth = null;\nexport const db = null;\n")

user = {
    "username": "renderlab_preview",
    "email": "preview@example.invalid",
    "name": "RenderLab Preview",
    "bio": "Offline component inspection only",
    "profile_picture": image_uri(0),
    "followers": [],
    "following": [],
    "following_request": [],
    "saved_posts": [],
    "event_notification": 0,
    "chat_notification": 0,
}
posts = [
    {
        "id": f"offline-{i}",
        "username": "renderlab_preview" if i % 2 == 0 else "sample_media",
        "owner_email": "preview@example.invalid",
        "imageUrl": image_uri(i),
        "profile_picture": image_uri((i + 3) % 12),
        "caption": f"Offline media fixture {i + 1} — existing clone feed/layout inspection.",
        "likes_by_users": [],
        "comments": [],
        "createdAt": {"seconds": 1792970000 - 3600 * i},
    }
    for i in range(12)
]
stories = [
    {
        "id": f"story-{i}",
        "username": "renderlab_preview" if i == 0 else f"sample_{i}",
        "owner_email": "preview@example.invalid",
        "imageUrl": image_uri(i),
        "profile_picture": image_uri((i + 4) % 12),
        "seen_by_users": [],
    }
    for i in range(4)
]
fixture = f"""// Temporary CI-only fixture; no real accounts, network, or Firebase.
export const CURRENT_USER = {json.dumps(user)};
export const POSTS = {json.dumps(posts)};
export const STORIES = {json.dumps(stories)};
"""
Path("src/offlineReferenceFixture.js").write_text(fixture, encoding="utf-8")

# Replace network-backed *data hooks* with deterministic fixture hooks.
# Do not reconstruct, alter, or replace the cloned visual components.
put("src/hooks/useCurrentUser.js",
    'import { CURRENT_USER } from "../offlineReferenceFixture";\n'
    'export const useCurrentUser = () => ({ currentUser: CURRENT_USER, isLoading: false });\n')
put("src/hooks/useFetchPosts.js",
    'import { POSTS } from "../offlineReferenceFixture";\n'
    'export default function useFetchPosts() { return { posts: POSTS, isLoading: false, fetchOlderPosts: () => {}, refreshPosts: () => {} }; }\n')
put("src/hooks/useFetchUserPosts.js",
    'import { POSTS } from "../offlineReferenceFixture";\n'
    'export default function useFetchUserPosts() { return { posts: POSTS, loader: false, fetchOlderPosts: () => {}, refreshPosts: () => {} }; }\n')
put("src/hooks/useFetchStories.js",
    'import { STORIES } from "../offlineReferenceFixture";\n'
    'export default function useFetchStories() { return { stories: STORIES, updatedStories: 0 }; }\n')
put("src/hooks/useFetchReels.js",
    'export default function useFetchReels() { return { videos: [] }; }\n')
put("src/hooks/useFindUsers.js",
    'export default function useFindUsers() { return { beginSearch: () => {}, users: [], searchResult: [] }; }\n')

# Controls are inspectable but cannot issue Firestore writes in the reference lab.
put("src/hooks/useHandleLike.js",
    'export default function useHandleLike() { return { handlePostLike: () => {}, handleStoryLike: () => {} }; }\n')
put("src/hooks/useSavePost.js",
    'export default function useSavePost() { return { savePost: () => {} }; }\n')
put("src/hooks/useHandleFollow.js",
    'export default function useHandleFollow() { return { handleFollow: () => {} }; }\n')
put("src/hooks/useSharePost.js",
    'export default function useSharePost() { return { sharePost: () => {}, shareStory: () => {}, shareUser: () => {} }; }\n')

# Test-only hit-test isolation: keep the *original clone* navigator, tab
# screens, icons, and onPress behavior, but lay out the tab bar in normal flow.
# This distinguishes a React Navigation problem from a View hit-test overlay.
tabs = Path("src/navigation/BottomTabs.jsx")
original_tabs = tabs.read_text()
assert original_tabs.count('      position: "absolute",') == 1
relative = original_tabs.replace('      position: "absolute",', '      position: "relative",', 1)
assert relative.count('      bottom: 0,') == 1
relative = relative.replace('      bottom: 0,', '      bottom: 0,\n      marginBottom: Platform.OS === "android" ? 40 : 0,', 1)
assert relative.count("      elevation: 0,") == 1
relative = relative.replace("      elevation: 0,", "      elevation: 20,\n      zIndex: 20,", 1)
tabs.write_text(relative)
print("Reference-only test: original tab bar in relative layout with 40dp system-nav inset.")
print("Offline fixture ready: 12 generated images, 4 stories, fake preview identity.")
print("Original Home, Search, Profile, BottomTabs and visual post/grid components unchanged.")
