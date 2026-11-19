"""Opt-in Modal smoke test for native FIBO text generation and editing."""
import modal

from modal_native_renderer import app as render_app, render

app = modal.App("renderlab-fibo-native-smoke").include(render_app)


@app.local_entrypoint()
def main():
    from io import BytesIO
    from PIL import Image

    source = BytesIO()
    Image.new("RGB", (256, 256), (210, 50, 45)).save(source, format="PNG")
    for mode, prompt, sources in (
        ("text", "A red ceramic cube on a white table.", ()),
        ("edit", "Change the red image to blue.", (source.getvalue(),)),
    ):
        call = render.spawn(prompt=prompt, seed=42, steps=1, width=256, height=256, sources=sources)
        with Image.open(BytesIO(call.get()), formats=["PNG"]) as decoded:
            decoded.load()
            if decoded.size != (256, 256):
                raise RuntimeError("Unexpected smoke dimensions")
        print(f"{mode}: decoded a 256x256 PNG from an asynchronous Modal job", flush=True)
