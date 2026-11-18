"""Bounded normalization of owner-validated FIBO edit masks before ComfyUI.

The source and mask files are staged only inside an isolated worker run.
White pixels indicate regions allowed to change; black pixels remain original.
"""
from io import BytesIO

from PIL import Image, ImageOps

MAX_MASK_BYTES = 8 * 1024 * 1024
MAX_MASK_PIXELS = 16_777_216
PNG_HEADER = b"\x89PNG\r\n\x1a\n"


def normalize_mask_bytes(raw, source_size):
    if type(raw) is not bytes or not 0 < len(raw) <= MAX_MASK_BYTES or not raw.startswith(PNG_HEADER):
        raise ValueError("Expected a bounded PNG mask")
    if not (isinstance(source_size, (tuple, list)) and len(source_size) == 2
            and all(type(n) is int and 1 <= n <= 4096 for n in source_size)):
        raise ValueError("Invalid source dimensions for mask")
    if source_size[0] * source_size[1] > MAX_MASK_PIXELS:
        raise ValueError("Source exceeds masked editing pixel limit")

    with Image.open(BytesIO(raw), formats=["PNG"]) as decoded:
        if decoded.width * decoded.height > MAX_MASK_PIXELS or getattr(decoded, "is_animated", False):
            raise ValueError("Mask exceeds bounds or contains frames")
        pixels = ImageOps.exif_transpose(decoded).convert("RGB").getchannel("R")
        # Match the WANDA editor's alpha > 8 binary brush semantics.
        pixels = pixels.point(lambda intensity: 255 if intensity > 8 else 0)
        if pixels.size != tuple(source_size):
            pixels = pixels.resize(source_size, Image.Resampling.NEAREST)
        if pixels.getbbox() is None:
            raise ValueError("Mask does not select any pixels")
        output = BytesIO()
        pixels.save(output, format="PNG")
        return output.getvalue()
