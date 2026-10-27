"""Zero-dependency source gate for Android Library v0.3 design SVGs.

Usage from any checkout:
    python design/tools/android_v03_source_gate.py

This is NOT a native Android, screenshot, accessibility, or owner approval test.
It verifies declared mockup structure and prevents regressions in design samples.
"""
from __future__ import annotations

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DESIGNS = ROOT / "design" / "penpot"
NS = "{http://www.w3.org/2000/svg}"
NAMES = [
    "browse", "filters", "filters-generated", "filters-uploads",
    "collections", "collection", "generated-filter", "uploads-filter",
    "crop-stress", "long-caption", "empty-collection",
    "empty-library", "loading-library", "error-library", "keyboard-focus",
]
ROOT_BROWSE = {
    "browse", "filters", "filters-generated", "filters-uploads",
    "collections", "generated-filter", "uploads-filter", "crop-stress",
    "empty-library", "loading-library", "error-library", "keyboard-focus",
}
CONTEXTUAL = {"collection", "empty-collection"}
SHEET = {"filters", "filters-generated", "filters-uploads"}
COUNTS = {
    "browse": 12, "collections": 3, "collection": 12,
    "generated-filter": 9, "uploads-filter": 3,
    "empty-collection": 0, "empty-library": 0,
    "loading-library": 0, "error-library": 0,
}
BUTTONS = {
    "empty-library": (215, 916),
    "error-library": (217, 872),
    "empty-collection": (187, 936),
}


def dimensions(root: ET.Element) -> bool:
    return (
        root.tag == NS + "svg"
        and root.get("width") == "709"
        and root.get("height") == "1536"
        and root.get("viewBox") == "0 0 709 1536"
    )


def rects(root: ET.Element, x: float | None = None, y: float | None = None):
    for el in root.iter(NS + "rect"):
        if x is not None and float(el.get("x", 0)) != x:
            continue
        if y is not None and float(el.get("y", 0)) != y:
            continue
        yield el


def labels(root: ET.Element, text: str):
    return [el for el in root.iter(NS + "text") if "".join(el.itertext()) == text]


def assess(name: str) -> list[str]:
    path = DESIGNS / f"android-instagram-{name}-v03.svg"
    failures: list[str] = []
    try:
        root = ET.parse(path).getroot()
    except (FileNotFoundError, ET.ParseError) as exc:
        return [f"XML parse/asset missing: {exc}"]

    def check(condition: bool, message: str):
        if not condition:
            failures.append(message)

    check(dimensions(root), "wrong reference viewport")
    if name in COUNTS:
        actual = sum(1 for _ in root.iter(NS + "image"))
        check(actual == COUNTS[name], f"image fixtures {actual} != {COUNTS[name]}")
    if name in ROOT_BROWSE:
        for word in ("Items", "Collections"):
            found = labels(root, word)
            check(
                len(found) == 1 and float(found[0].get("font-size", 0)) >= 26,
                f"{word} text not readable in source design",
            )
        check(any(True for _ in rects(root, y=1356)), "missing root dock")
    if name in CONTEXTUAL:
        check(len(labels(root, "Items")) == 1, "missing contextual Items")
        check(not list(rects(root, y=1356)), "contextual screen has root dock")
    if name in SHEET:
        for y in (928, 1061):
            buttons = list(rects(root, y=y))
            check(len(buttons) == 3, f"expected 3 filter buttons at y={y}")
            check(all(float(el.get("height", 0)) >= 88 for el in buttons),
                  f"filter target height below 88 at y={y}")
    if name in ("generated-filter", "uploads-filter"):
        chips = [g for g in root.iter(NS + "g") if g.get("id") == "source-chip"]
        check(len(chips) == 1, "missing source chip")
        if chips:
            check(any(float(r.get("height", 0)) >= 88
                      for r in chips[0].iter(NS + "rect")),
                  "source chip clearance below 88")
    if name == "generated-filter":
        count = sum(el.get("aria-label") == "video concept poster"
                    for el in root.iter(NS + "g"))
        check(count == 2, f"expected 2 video concept posters, got {count}")
    if name == "uploads-filter":
        count = sum(el.get("aria-label") == "four-item media group"
                    for el in root.iter(NS + "g"))
        check(count == 1, f"expected 1 multi-item upload fixture, got {count}")
    if name in BUTTONS:
        x, y = BUTTONS[name]
        buttons = list(rects(root, x=x, y=y))
        check(len(buttons) == 1, "primary CTA background not found")
        check(bool(buttons) and float(buttons[0].get("height", 0)) >= 88,
              "primary CTA illustrated height is below 88")
    return failures


def main() -> int:
    bad = 0
    for name in NAMES:
        issues = assess(name)
        print(f"{'FAIL' if issues else 'PASS'}  {name}")
        for issue in issues:
            print("     " + issue)
        bad += bool(issues)
    print(f"{len(NAMES)-bad}/{len(NAMES)} SVG source cases passed")
    if bad:
        print("Structural source checks do not replace visual/native QA.")
        return 1
    print("Source checks passed; rendered and native verification remain separate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
