"""Private, model-free RenderLab ComfyUI baseline on Modal."""
import json
import os
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen

import modal

APP = "renderlab-comfyui-base"
SOURCE = "989d93d0d968e704c589ce0146bb18c77f6b50cc"
ROOT = "/opt/ComfyUI"
URL = "http://127.0.0.1:8188"
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .run_commands(
        f"git init {ROOT} && git -C {ROOT} fetch --depth=1 https://github.com/Comfy-Org/ComfyUI.git {SOURCE} && git -C {ROOT} checkout --detach FETCH_HEAD",
        "python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch==2.10.0 torchvision==0.25.0",
        f"python -m pip install -r {ROOT}/requirements.txt && python -m pip check",
    )
)
app = modal.App(APP)


@app.cls(
    image=image,
    gpu=["A10", "L4", "T4"],
    cpu=2,
    memory=8192,
    startup_timeout=180,
    timeout=30,
    min_containers=0,
    max_containers=1,
    scaledown_window=15,
)
class ComfyUI:
    @modal.enter()
    def start(self):
        self.process = subprocess.Popen(
            [
                sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
                "--disable-all-custom-nodes", "--disable-api-nodes",
                "--disable-auto-launch",
            ],
            cwd=ROOT,
            env={**os.environ, "PYTHONUNBUFFERED": "1"},
        )
        try:
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                if self.process.poll() is not None:
                    raise RuntimeError(f"ComfyUI process exited: {self.process.returncode}")
                try:
                    self.get_json("/system_stats")
                    return
                except (URLError, TimeoutError, OSError):
                    time.sleep(1)
            raise TimeoutError("ComfyUI did not return system stats")
        except BaseException:
            self.stop()
            raise

    def get_json(self, path):
        with urlopen(URL + path, timeout=5) as response:
            return json.load(response)

    @modal.method()
    def health(self):
        stats = self.get_json("/system_stats")
        weights = self.get_json("/models/checkpoints")
        queue = self.get_json("/queue")
        devices = [d["name"] for d in stats["devices"] if d.get("type") == "cuda"]
        if not devices or weights or queue["queue_running"] or queue["queue_pending"]:
            raise RuntimeError("Expected CUDA, no checkpoints and an empty queue")
        return {"status": "ok", "source": SOURCE, "devices": devices, "checkpoints": weights, "queue": queue}

    @modal.exit()
    def stop(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
