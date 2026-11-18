"""Build a bounded RenderLab FIBO graph using public ComfyUI nodes only.

The base FIBO workflow follows the MIT-licensed Comfy-Org/workflow_templates
revision 85984c2b1ee8c0aa39179bf122a7d01fa1b21c09.
Masked editing uses stock VAEEncode, SetLatentNoiseMask, ImageToMask,
ImageScale and ImageCompositeMasked nodes; it imports no private Studio code.
"""
import json
import math
import re

NAME = re.compile(r"[a-f0-9]{32}\.png")
MAX_PIXELS = 1536 * 1024


def original_fibo_size(width, height):
    """Match the public TextEncodeFibo2 default size for one source image.

    The FIBO trained-size selection algorithm is in the MIT-licensed ComfyUI
    Comfy Org node (comfy_extras/nodes_fibo2.py).
    """
    if any(type(side) is not int or side < 1 or side > 4096 for side in (width, height)):
        raise ValueError("Invalid original source dimensions")
    aspect = width / height
    area = 1024 * 1024
    candidates = (
        (w, h)
        for w in range(64, 2 * area // 64, 16)
        for h in range(max(64, 16 * math.ceil(0.9 * area / w / 16)),
                       16 * math.floor(1.1 * area / w / 16) + 1, 16)
    )
    chosen = min(candidates, key=lambda size: (
        round(1 - min(size[0] / size[1] / aspect, aspect * size[1] / size[0]), 9),
        abs(size[0] * size[1] - area),
        -size[0],
    ))
    if (not all(256 <= side <= 1536 for side in chosen)
            or chosen[0] * chosen[1] > MAX_PIXELS):
        raise ValueError("Original geometry is outside supported FIBO mask bounds")
    return chosen


def build_graph(*, prompt, seed, images=(), width=0, height=0, steps=4,
                negative_prompt="", vgl="", mask=None, source_dimensions=None):
    if type(seed) is not int or not 0 <= seed <= 2_147_483_647:
        raise ValueError("Invalid seed")
    if type(steps) is not int or not 1 <= steps <= 8:
        raise ValueError("Invalid step count")
    if type(prompt) is not str or len(prompt) > 4000 or type(negative_prompt) is not str or len(negative_prompt) > 4000:
        raise ValueError("Invalid prompt")
    if type(vgl) is not str or len(vgl) > 8192:
        raise ValueError("Invalid VGL")
    if vgl:
        caption = json.loads(vgl)
        if not isinstance(caption, dict) or not caption:
            raise ValueError("VGL must be a non-empty object")
    elif not prompt.strip():
        raise ValueError("Prompt required")
    if not isinstance(images, (tuple, list)) or len(images) > 4 or any(
        not isinstance(name, str) or not NAME.fullmatch(name) for name in images
    ):
        raise ValueError("Expected up to four worker-assigned staged filenames")
    if any(type(side) is not int for side in (width, height)):
        raise ValueError("Dimensions must be integers")
    if (width, height) != (0, 0) and (
        not all(256 <= side <= 1536 and side % 16 == 0 for side in (width, height))
        or width * height > MAX_PIXELS
    ):
        raise ValueError("Invalid dimensions")

    if mask is not None:
        if not isinstance(mask, str) or not NAME.fullmatch(mask) or len(images) != 1 or mask in images:
            raise ValueError("A mask requires exactly one source image and a separate staged PNG")
        if (width, height) == (0, 0):
            if not isinstance(source_dimensions, (tuple, list)) or len(source_dimensions) != 2:
                raise ValueError("Original masked geometry requires decoded source dimensions")
            width, height = original_fibo_size(*source_dimensions)
    elif source_dimensions is not None:
        raise ValueError("Decoded source dimensions are reserved for mask sizing")

    def node(kind, **inputs):
        return {"class_type": kind, "inputs": inputs}

    graph = {
        "model": node("UNETLoader", unet_name="fibo2_edit_turbo_int8_convrot.safetensors", weight_dtype="default"),
        "clip": node("CLIPLoader", clip_name="qwen3vl_4b_int8_convrot.safetensors", type="fibo2", device="default"),
        "vae": node("VAELoader", vae_name="flux2-vae.safetensors"),
        "encode": node("TextEncodeFibo2", clip=["clip", 0], vae=["vae", 0], prompt=vgl or prompt,
                       negative_prompt=negative_prompt, width=width, height=height, batch_size=1),
        "sample": node("KSampler", model=["model", 0], positive=["encode", 0], negative=["encode", 1],
                       latent_image=["encode", 2], seed=seed, steps=steps, cfg=1.0,
                       sampler_name="euler", scheduler="simple", denoise=1.0),
        "decode": node("VAEDecode", samples=["sample", 0], vae=["vae", 0]),
        "output": node("SaveImage", images=["decode", 0], filename_prefix="renderlab-fibo"),
    }
    for slot, name in enumerate(images, 1):
        key = f"image_{slot}"
        graph[key] = node("LoadImage", image=name)
        graph["encode"]["inputs"][f"images.{key}"] = [key, 0]

    if mask is not None:
        graph.update({
            "mask_image": node("LoadImage", image=mask),
            "mask_scaled": node("ImageScale", image=["mask_image", 0],
                                upscale_method="nearest-exact", width=width, height=height, crop="center"),
            "mask_channel": node("ImageToMask", image=["mask_scaled", 0], channel="red"),
            "source_scaled": node("ImageScale", image=["image_1", 0],
                                  upscale_method="lanczos", width=width, height=height, crop="center"),
            "source_encoded": node("VAEEncode", pixels=["source_scaled", 0], vae=["vae", 0]),
            "masked_latent": node("SetLatentNoiseMask", samples=["source_encoded", 0], mask=["mask_channel", 0]),
            "masked_composite": node("ImageCompositeMasked", destination=["source_scaled", 0],
                                     source=["decode", 0], x=0, y=0, resize_source=False, mask=["mask_channel", 0]),
        })
        graph["sample"]["inputs"]["latent_image"] = ["masked_latent", 0]
        graph["output"]["inputs"]["images"] = ["masked_composite", 0]

    return graph
