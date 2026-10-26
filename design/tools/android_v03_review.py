"""Design-only SVG structural audit + raster contact sheets for Android v0.3.

Usage (at repository root):
  python -m pip install pillow cairosvg
  python design/tools/android_v03_review.py --out /tmp/renderlab-android-v03-review

No mobile source, APK, backend or connected account is touched. Source SVGs
remain unchanged; output PNGs and JSON are local review evidence only.
"""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw, ImageFont
import cairosvg

ROOT = Path(__file__).resolve().parents[2]
PENPOT = ROOT / "design" / "penpot"
SETS = {
    "navigation": [
        "browse-v02", "browse-v03", "collections-v03",
        "filters-v02", "filters-v03", "filters-generated-v03",
        "filters-uploads-v03",
    ],
    "sources": [
        "generated-filter-v03", "uploads-filter-v03",
        "crop-stress-v03",
    ],
    "context-and-type": [
        "collection-v02", "empty-collection-v03",
        "scrolled-feed-v02", "long-caption-v03",
    ],
    "states": [
        "empty-library-v03", "loading-library-v03",
        "error-library-v03", "keyboard-focus-v03",
        "signed-out-v02", "delete-confirmation-v02",
    ],
}
SVG_NS = "{http://www.w3.org/2000/svg}"
THUMB_WIDTH, THUMB_HEIGHT = 284, 615


def inspect(path: Path) -> dict:
    doc = ET.parse(path)
    root = doc.getroot()
    if root.tag != SVG_NS + "svg":
        raise ValueError(f"{path.name}: root is not SVG")
    if (root.get("viewBox"), root.get("width"), root.get("height")) != (
        "0 0 709 1536", "709", "1536"
    ):
        raise ValueError(f"{path.name}: unexpected geometry")
    images = root.findall(".//" + SVG_NS + "image")
    return {
        "file": path.name,
        "images": len(images),
        "video_fixture_badges": len([
            g for g in root.iter() if g.get("aria-label") == "video concept poster"
        ]),
        "width": 709,
        "height": 1536,
        "size_bytes": path.stat().st_size,
        "xml_valid": True,
    }


def render(path: Path) -> Image.Image:
    raster = cairosvg.svg2png(
        url=str(path),
        output_width=THUMB_WIDTH,
        output_height=THUMB_HEIGHT,
    )
    return Image.open(io.BytesIO(raster)).convert("RGB")


def sheet(group: str, files: list[str], out: Path) -> list[dict]:
    margin, label_height, gap, columns = 18, 58, 20, 3
    rows = (len(files) + columns - 1) // columns
    cell_w = THUMB_WIDTH + gap
    cell_h = THUMB_HEIGHT + label_height + gap
    canvas = Image.new(
        "RGB", (columns * cell_w + margin, rows * cell_h + margin),
        "#10141c",
    )
    draw = ImageDraw.Draw(canvas)
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font = ImageFont.truetype(font_path, 16) if Path(font_path).exists() else ImageFont.load_default()
    results = []
    for index, stem in enumerate(files):
        path = PENPOT / ("android-instagram-" + stem + ".svg")
        stats = inspect(path)
        results.append(stats)
        image = render(path)
        xx = margin + (index % columns) * cell_w
        yy = margin + (index // columns) * cell_h
        canvas.paste(image, (xx, yy + label_height))
        draw.text((xx, yy + 8), stem[:33], font=font, fill="#f0f3f8")
        draw.text((xx, yy + 30), f"{stats['images']} embedded media", fill="#bac6d8")
    canvas.save(out / (group + ".png"))
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    report = {"note": "Local SVG parse and CairoSVG rendering only; not native device QA", "sets": {}}
    for group, members in SETS.items():
        report["sets"][group] = sheet(group, members, args.out)
    (args.out / "manifest.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print("Created review contact sheets and manifest at", args.out)


if __name__ == "__main__":
    main()
