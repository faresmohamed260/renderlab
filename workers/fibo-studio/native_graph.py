"""Build a bounded RenderLab FIBO graph using public ComfyUI nodes only.

Node wiring follows Comfy-Org/workflow_templates (MIT), revision
85984c2b1ee8c0aa39179bf122a7d01fa1b21c09, image_fibo2_edit_turbo_pe.
This graph does not implement Studio's VGL conversion or masked editing.
"""
import json
import re


def build_graph(*, prompt, seed, images=(), width=0, height=0, steps=4,
                negative_prompt="", vgl="", mask=None):
    if mask is not None:
        raise ValueError("The native candidate does not support masks")
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
        not isinstance(name, str) or not re.fullmatch(r"[a-f0-9]{32}\.png", name) for name in images
    ):
        raise ValueError("Expected up to four worker-assigned staged filenames")
    if any(type(side) is not int for side in (width, height)):
        raise ValueError("Dimensions must be integers")
    if (width, height) != (0, 0) and (
        not all(256 <= side <= 1536 and side % 16 == 0 for side in (width, height))
        or width * height > 1536 * 1024
    ):
        raise ValueError("Invalid dimensions")

    def node(kind, **inputs):
        return {"class_type": kind, "inputs": inputs}

    conditioning = {
        "clip": ["clip", 0], "vae": ["vae", 0], "prompt": vgl or prompt,
        "negative_prompt": negative_prompt, "width": width, "height": height, "batch_size": 1,
    }
    graph = {
        "model": node("UNETLoader", unet_name="fibo2_edit_turbo_int8_convrot.safetensors", weight_dtype="default"),
        "clip": node("CLIPLoader", clip_name="qwen3vl_4b_int8_convrot.safetensors", type="fibo2", device="default"),
        "vae": node("VAELoader", vae_name="flux2-vae.safetensors"),
        "encode": node("TextEncodeFibo2", **conditioning),
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
    return graph
