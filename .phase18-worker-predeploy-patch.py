from pathlib import Path

path = Path("workers/image-upscale/modal_app.py")
text = path.read_text()

old_image = '''image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-runtime-ubuntu22.04",
        add_python=PYTHON_VERSION,
    )
    .entrypoint([])
    .apt_install("git", "curl", "ca-certificates", "libgl1", "libglib2.0-0")
    .uv_pip_install(
        f"modal=={MODAL_VERSION}",
        "fastapi[standard]==0.121.0",
        "numpy==2.2.6",
        "Pillow==11.2.1",
        "timm==1.0.19",
        "torch==2.7.1",
        "torchvision==0.22.1",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .run_commands(
        f"git clone --filter=blob:none {SWINIR_REPOSITORY} {SWINIR_SOURCE_DIR}",
        f"git -C {SWINIR_SOURCE_DIR} checkout --detach {SWINIR_COMMIT}",
        "mkdir -p /opt/models",
        f"curl --fail --location --retry 4 --retry-all-errors --connect-timeout 30 --max-time 600 '{SWINIR_WEIGHT_URL}' -o '{SWINIR_WEIGHT_PATH}'",
        f"test \\\"$(stat -c '%s' '{SWINIR_WEIGHT_PATH}')\\\" = '{SWINIR_WEIGHT_BYTES}'",
        f"echo '{SWINIR_WEIGHT_SHA256}  {SWINIR_WEIGHT_PATH}' | sha256sum -c -",
    )
    .env(
        {
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
            "RENDERLAB_UPSCALE_WORKER_ID": WORKER_ID,
            "RENDERLAB_UPSCALE_STATE_DICT": STATE_DICT_NAME,
        }
    )
)

app = modal.App(APP_NAME, image=image)
'''
new_image = '''gateway_image = (
    modal.Image.debian_slim(python_version=PYTHON_VERSION)
    .pip_install(f"modal=={MODAL_VERSION}", "fastapi[standard]==0.121.0")
    .env(
        {
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
            "RENDERLAB_UPSCALE_WORKER_ID": WORKER_ID,
            "RENDERLAB_UPSCALE_STATE_DICT": STATE_DICT_NAME,
        }
    )
)

runtime_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-runtime-ubuntu22.04",
        add_python=PYTHON_VERSION,
    )
    .entrypoint([])
    .apt_install("git", "curl", "ca-certificates", "libgl1", "libglib2.0-0")
    .uv_pip_install(
        f"modal=={MODAL_VERSION}",
        "numpy==2.2.6",
        "Pillow==11.2.1",
        "timm==1.0.19",
        "torch==2.7.1",
        "torchvision==0.22.1",
        extra_index_url="https://download.pytorch.org/whl/cu128",
    )
    .run_commands(
        f"git clone --filter=blob:none {SWINIR_REPOSITORY} {SWINIR_SOURCE_DIR}",
        f"git -C {SWINIR_SOURCE_DIR} checkout --detach {SWINIR_COMMIT}",
        "mkdir -p /opt/models",
        f"curl --fail --location --retry 4 --retry-all-errors --connect-timeout 30 --max-time 600 '{SWINIR_WEIGHT_URL}' -o '{SWINIR_WEIGHT_PATH}'",
        f"test \\\"$(stat -c '%s' '{SWINIR_WEIGHT_PATH}')\\\" = '{SWINIR_WEIGHT_BYTES}'",
        f"echo '{SWINIR_WEIGHT_SHA256}  {SWINIR_WEIGHT_PATH}' | sha256sum -c -",
    )
    .env(
        {
            "PYTHONUTF8": "1",
            "PYTHONIOENCODING": "utf-8",
            "RENDERLAB_UPSCALE_WORKER_ID": WORKER_ID,
            "RENDERLAB_UPSCALE_STATE_DICT": STATE_DICT_NAME,
        }
    )
)

app = modal.App(APP_NAME)
'''
if text.count(old_image) != 1:
    raise SystemExit(f"expected exactly one worker image block, found {text.count(old_image)}")
text = text.replace(old_image, new_image, 1)

old_tiles = '''    tile = min(TILE_SIZE, height, width)
    overlap = min(TILE_OVERLAP, max(0, tile // 4))
    y_starts = _tile_starts(height, tile, overlap)
    x_starts = _tile_starts(width, tile, overlap)
'''
new_tiles = '''    tile_height = min(TILE_SIZE, height)
    tile_width = min(TILE_SIZE, width)
    overlap_height = min(TILE_OVERLAP, max(0, tile_height // 4))
    overlap_width = min(TILE_OVERLAP, max(0, tile_width // 4))
    y_starts = _tile_starts(height, tile_height, overlap_height)
    x_starts = _tile_starts(width, tile_width, overlap_width)
'''
if text.count(old_tiles) != 1:
    raise SystemExit("expected exactly one tiling block")
text = text.replace(old_tiles, new_tiles, 1)

old_patch = "            patch = tensor[:, :, top : top + tile, left : left + tile]\n"
new_patch = "            patch = tensor[:, :, top : top + tile_height, left : left + tile_width]\n"
if text.count(old_patch) != 1:
    raise SystemExit("expected exactly one tile slice")
text = text.replace(old_patch, new_patch, 1)

old_runtime = "@app.cls(\n    image=image,"
if text.count(old_runtime) != 1:
    raise SystemExit("expected exactly one runtime image decorator")
text = text.replace(old_runtime, "@app.cls(\n    image=runtime_image,", 1)

old_gateway = "@app.function(image=image, timeout=3600)"
if text.count(old_gateway) != 1:
    raise SystemExit("expected exactly one gateway image decorator")
text = text.replace(old_gateway, "@app.function(image=gateway_image, timeout=3600)", 1)

path.write_text(text)
