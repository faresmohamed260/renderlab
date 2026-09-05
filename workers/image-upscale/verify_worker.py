from __future__ import annotations

import ast
from pathlib import Path

SOURCE = Path(__file__).with_name("modal_app.py")
text = SOURCE.read_text(encoding="utf-8")
compile(text, str(SOURCE), "exec")
tree = ast.parse(text, filename=str(SOURCE))


def constant_value(node: ast.AST):
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = constant_value(node.operand)
        return value if isinstance(node.op, ast.UAdd) else -value
    if isinstance(node, ast.BinOp):
        left = constant_value(node.left)
        right = constant_value(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.FloorDiv):
            return left // right
    raise AssertionError(f"unsupported constant expression: {ast.dump(node)}")


literal_names = {
    "SWINIR_COMMIT",
    "SWINIR_LICENSE",
    "SWINIR_WEIGHT_NAME",
    "SWINIR_WEIGHT_BYTES",
    "SWINIR_WEIGHT_SHA256",
    "UPSCALE_SCALE",
    "MAX_INPUT_BYTES",
    "MAX_INPUT_EDGE",
    "MAX_INPUT_PIXELS",
    "MAX_OUTPUT_EDGE",
    "MAX_OUTPUT_PIXELS",
    "TILE_SIZE",
    "TILE_OVERLAP",
    "WINDOW_SIZE",
}
values: dict[str, object] = {}
functions: dict[str, ast.FunctionDef] = {}
for node in tree.body:
    if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
        name = node.targets[0].id
        if name in literal_names:
            values[name] = constant_value(node.value)
    elif isinstance(node, ast.FunctionDef):
        functions[node.name] = node

expected = {
    "SWINIR_COMMIT": "33f616625268d08ba600f8db89388eec0328edb1",
    "SWINIR_LICENSE": "Apache-2.0",
    "SWINIR_WEIGHT_NAME": "001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth",
    "SWINIR_WEIGHT_BYTES": 67_277_475,
    "SWINIR_WEIGHT_SHA256": "2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac",
    "UPSCALE_SCALE": 2,
    "MAX_INPUT_BYTES": 25 * 1024 * 1024,
    "MAX_INPUT_EDGE": 4096,
    "MAX_INPUT_PIXELS": 4_194_304,
    "MAX_OUTPUT_EDGE": 8192,
    "MAX_OUTPUT_PIXELS": 16_777_216,
    "TILE_SIZE": 256,
    "TILE_OVERLAP": 32,
    "WINDOW_SIZE": 8,
}
assert values == expected, (values, expected)

# Keep the HTTP gateway light and the model/CUDA image isolated to inference.
assert "gateway_image = (" in text
assert "runtime_image = (" in text
assert "modal.Image.debian_slim" in text
assert text.count("Pillow==11.2.1") == 2
assert "nvidia/cuda:12.8.1-runtime-ubuntu22.04" in text
assert "app = modal.App(APP_NAME)" in text
assert "@app.cls(\n    image=runtime_image," in text
assert "@app.function(image=gateway_image, timeout=3600)" in text

# Preserve the accepted async worker contract and fixed 2x product boundary.
assert '"/health"' in text
assert '"/jobs/upscale"' in text
assert text.count('"/jobs/{call_id}"') == 2
assert '"upscale_scales": [UPSCALE_SCALE]' in text
assert 'media_type="image/png"' in text
assert 'Image.Resampling.LANCZOS' in text
assert '"WORKER_UNAVAILABLE"' in text
assert '"WORKER_CAPACITY_EXHAUSTED"' in text
assert '"WORKER_RUNTIME_FAILED"' in text
assert "except modal.exception.OutputExpiredError:" in text

# Execute only pure helpers from the AST; importing modal_app.py would construct Modal resources.
globals_for_helpers = dict(expected)
namespace: dict[str, object] = {}
for name in ("_tile_starts", "_validate_geometry", "_padding_mode", "_normalized_source_geometry"):
    node = functions.get(name)
    assert node is not None, name
    module = ast.Module(body=[node], type_ignores=[])
    exec(compile(module, str(SOURCE), "exec"), globals_for_helpers, namespace)

globals_for_helpers.update(namespace)
_tile_starts = namespace["_tile_starts"]
_validate_geometry = namespace["_validate_geometry"]
_padding_mode = namespace["_padding_mode"]
_normalized_source_geometry = namespace["_normalized_source_geometry"]

assert _tile_starts(1, 1, 0) == [0]
assert _tile_starts(256, 256, 32) == [0]
assert _tile_starts(257, 256, 32) == [0, 1]
assert _padding_mode(256, 256, 0, 0) == "reflect"
assert _padding_mode(7, 256, 1, 0) == "reflect"
assert _padding_mode(2, 256, 6, 0) == "replicate"
assert _padding_mode(256, 2, 0, 6) == "replicate"
assert _padding_mode(1, 1, 7, 7) == "replicate"
assert _normalized_source_geometry(3, 2, 1, 1) == (3, 2)
assert _normalized_source_geometry(3, 2, 6, 1) == (2, 3)
assert _normalized_source_geometry(3, 2, 8, 1) == (2, 3)
try:
    _normalized_source_geometry(2, 2, 1, 2)
except ValueError as exc:
    assert "animated or multi-frame" in str(exc)
else:
    raise AssertionError("multi-frame source should be rejected")
assert "ImageOps.exif_transpose(opened)" in text
assert "normalized source geometry mismatch" in text
starts = _tile_starts(4096, 256, 32)
assert starts[0] == 0 and starts[-1] == 3840 and len(starts) < 32

_validate_geometry(2048, 2048)
_validate_geometry(4096, 1024)
for bad in ((0, 1), (4097, 1), (2049, 2048), (4096, 1025)):
    try:
        _validate_geometry(*bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"geometry should be rejected: {bad}")

# Rectangular tiling must not collapse to the smaller edge for panoramas.
assert "tile_height = min(TILE_SIZE, height)" in text
assert "tile_width = min(TILE_SIZE, width)" in text
assert "top : top + tile_height" in text
assert "left : left + tile_width" in text
assert "tile = min(TILE_SIZE, height, width)" not in text

print("Phase 18 upscale worker offline contract verification passed.")
