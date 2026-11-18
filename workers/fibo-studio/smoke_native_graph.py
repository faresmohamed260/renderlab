"""Submit one synthetic native FIBO graph to an idle loopback ComfyUI."""
import argparse
import json
from pathlib import Path
from PIL import Image
import time
from urllib.request import Request, urlopen
from uuid import uuid4

from native_graph import build_graph


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8192)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--edit-input-dir", type=Path, help="Input directory of this local ComfyUI instance")
    args = parser.parse_args()
    base = f"http://127.0.0.1:{args.port}"

    def call(path, payload=None):
        request = Request(base + path, data=None if payload is None else json.dumps(payload).encode(),
                          headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=8) as response:
            return json.load(response)

    queue = call("/queue")
    if queue["queue_running"] or queue["queue_pending"]:
        raise RuntimeError("Use an idle development ComfyUI instance")
    trace = uuid4().hex
    source = None
    if args.edit_input_dir:
        source = args.edit_input_dir / (trace + ".png")
        with source.open("xb") as file:
            Image.new("RGB", (256, 256), (210, 50, 45)).save(file, format="PNG")
    graph = build_graph(prompt="Change the red image to blue." if source else "A red ceramic cube on a white table",
                        seed=42, width=256, height=256, steps=1, images=[source.name] if source else ())
    graph["output"]["inputs"]["filename_prefix"] = "renderlab-fibo-smoke-" + trace
    job_id = call("/prompt", {"prompt": graph, "client_id": trace})["prompt_id"]
    print(f"Submitted smoke job {job_id}", flush=True)
    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        entry = call(f"/history/{job_id}").get(job_id)
        if entry:
            if source:
                source.unlink(missing_ok=True)
            files = entry.get("outputs", {}).get("output", {}).get("images", [])
            if entry["status"]["status_str"] != "success" or len(files) != 1:
                errors = [detail.get("exception_type", kind) for kind, detail in entry["status"].get("messages", [])
                          if kind == "execution_error"]
                raise RuntimeError(f"Smoke render failed: {errors}")
            from urllib.parse import urlencode
            query = urlencode({key: files[0][key] for key in ("filename", "subfolder", "type")})
            with urlopen(base + "/view?" + query, timeout=8) as response:
                with Image.open(response) as image:
                    image.load()
                    if image.format != "PNG" or image.size != (256, 256):
                        raise RuntimeError("Unexpected smoke output")
            print("Decoded one 256 x 256 PNG")
            return
        time.sleep(2)
    raise TimeoutError(f"Smoke client timed out; inspect job {job_id} in this development instance")


if __name__ == "__main__":
    main()
