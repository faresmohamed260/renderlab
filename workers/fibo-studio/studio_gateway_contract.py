"""Bounded, transport-neutral contract for the proven private FIBO Studio worker.

This module intentionally contains no ComfyUI graph or VGL implementation.
The retained Studio adapter remains the only component that creates VGL from
images; this contract only prevents the gateway from dispatching unsupported
combinations to it.
"""
import json


def validate_studio_options(*, prompt, seed, width=0, height=0, steps=4,
                            negative_prompt="", vgl="", generate_vgl=False,
                            source_count=0, has_mask=False, has_inspiration=False):
    if type(prompt) is not str or len(prompt) > 4000:
        raise ValueError("Invalid FIBO prompt")
    if type(seed) is not int or not 0 <= seed <= 2_147_483_647:
        raise ValueError("Invalid FIBO seed")
    if type(steps) is not int or not 1 <= steps <= 8:
        raise ValueError("Invalid FIBO step count")
    if type(negative_prompt) is not str or len(negative_prompt) > 4000:
        raise ValueError("Invalid FIBO negative prompt")
    if type(vgl) is not str or len(vgl) > 8192:
        raise ValueError("Invalid FIBO VGL")
    if vgl:
        try:
            parsed = json.loads(vgl)
        except (TypeError, ValueError) as exc:
            raise ValueError("FIBO VGL must be JSON") from exc
        if not isinstance(parsed, dict) or not parsed:
            raise ValueError("FIBO VGL must be a non-empty object")
    elif not prompt.strip():
        raise ValueError("FIBO prompt required without manual VGL")
    if type(generate_vgl) is not bool:
        raise ValueError("Invalid generated-VGL mode")
    if generate_vgl and vgl:
        raise ValueError("Generated and manual VGL are mutually exclusive")
    if type(source_count) is not int or not 0 <= source_count <= 4:
        raise ValueError("Expected up to four source images")
    if type(has_mask) is not bool or type(has_inspiration) is not bool:
        raise ValueError("Invalid FIBO input mode")
    if has_mask and source_count != 1:
        raise ValueError("A mask requires exactly one edit source")
    if has_inspiration and (source_count or has_mask or vgl):
        raise ValueError("Inspiration is only supported for generated text-to-image")
    if any(type(side) is not int for side in (width, height)):
        raise ValueError("FIBO dimensions must be integers")
    if (width, height) != (0, 0) and (
        not all(256 <= side <= 1536 and side % 16 == 0 for side in (width, height))
        or width * height > 1536 * 1024
    ):
        raise ValueError("Invalid FIBO dimensions")
    if source_count == 0 and (width, height) == (0, 0) and not vgl:
        raise ValueError("Text-to-image needs explicit dimensions")
