"""Container-local ComfyUI process with an isolated workspace for each job."""
from contextlib import suppress
from dataclasses import dataclass
import json
from pathlib import Path
import shutil
from subprocess import DEVNULL, Popen, TimeoutExpired
import sys
from tempfile import TemporaryDirectory
from threading import Lock
from time import monotonic, sleep
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import UUID, uuid4


@dataclass(frozen=True)
class JobFiles:
    key: str
    input: Path
    output: Path


class UncleanComfyWorker(RuntimeError):
    """The container cannot safely accept another job."""


class ComfySession:
    def __init__(self, comfy: str, models: str):
        self.comfy = comfy
        self.models = models
        self._lock = Lock()
        self._workspace = None
        self._server = None
        self._session_id = None

    def _request(self, path, payload=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = Request("http://127.0.0.1:8188" + path, data=body,
                          headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=8) as response:
            raw = response.read()
        return json.loads(raw) if raw else None

    def _workspace_path(self):
        if self._workspace is None:
            self._workspace = TemporaryDirectory(prefix="renderlab-comfy-")
            root = Path(self._workspace.name)
            for name in ("input", "output", "temp"):
                (root / name).mkdir()
        return Path(self._workspace.name)

    def _start(self, root):
        if self._server is not None:
            if self._server.poll() is None:
                return False
            raise RuntimeError("The previous ComfyUI process exited")
        config = root / "models.yaml"
        config.write_text(
            f"renderlab:\n  base_path: {self.models}\n  diffusion_models: diffusion_models\n"
            "  text_encoders: text_encoders\n  vae: vae\n", encoding="utf-8",
        )
        self._server = Popen(
            [sys.executable, "main.py", "--listen", "127.0.0.1", "--port", "8188",
             "--input-directory", str(root / "input"), "--output-directory", str(root / "output"),
             "--temp-directory", str(root / "temp"), "--extra-model-paths-config", str(config),
             "--disable-all-custom-nodes", "--disable-api-nodes", "--disable-auto-launch",
             "--lowvram", "--reserve-vram", "1"],
            cwd=self.comfy, stdout=DEVNULL, stderr=DEVNULL,
        )
        deadline = monotonic() + 90
        while monotonic() < deadline:
            if self._server.poll() is not None:
                raise RuntimeError("ComfyUI exited during startup")
            try:
                if isinstance(self._request("/system_stats"), dict):
                    self._session_id = uuid4().hex
                    return True
            except (URLError, TimeoutError):
                pass
            sleep(1)
        raise TimeoutError("ComfyUI did not become ready")

    def _require_empty_queue(self):
        queue = self._request("/queue")
        if queue.get("queue_running") != [] or queue.get("queue_pending") != []:
            raise RuntimeError("ComfyUI has work outside the current job")

    def _collect_history(self, prompt_id):
        deadline = monotonic() + 260
        while monotonic() < deadline:
            if self._server.poll() is not None:
                raise RuntimeError("ComfyUI exited during the job")
            record = self._request("/history/" + prompt_id).get(prompt_id)
            if record:
                if record["status"]["status_str"] != "success":
                    raise RuntimeError("ComfyUI execution failed")
                return record
            sleep(2)
        raise TimeoutError("ComfyUI did not finish the job")

    def _reset(self):
        server = self._server
        try:
            if server is not None and server.poll() is None:
                with suppress(ProcessLookupError):
                    server.terminate()
                try:
                    server.wait(timeout=8)
                except TimeoutExpired:
                    with suppress(ProcessLookupError):
                        server.kill()
                    server.wait(timeout=4)
            if self._workspace is not None:
                self._workspace.cleanup()
        except (TimeoutExpired, OSError) as exc:
            raise UncleanComfyWorker("Could not reap the ComfyUI process or workspace") from exc
        self._server = None
        self._session_id = None
        self._workspace = None

    def run(self, stage, collect, attempt_id):
        with self._lock:
            start = monotonic()
            try:
                root = self._workspace_path()
                key = uuid4().hex
                files = JobFiles(key, root / "input" / key, root / "output" / key)
                files.input.mkdir()
                files.output.mkdir()
                graph = stage(files)
                cold = self._start(root)
                ready = monotonic()
                self._require_empty_queue()
                print(f"renderlab attempt={attempt_id} phase=started session={self._session_id}", flush=True)
                prompt_id = self._request("/prompt", {"prompt": graph})["prompt_id"]
                if not isinstance(prompt_id, str) or str(UUID(prompt_id)) != prompt_id:
                    raise RuntimeError("Unexpected ComfyUI prompt identifier")
                result = collect(files, self._collect_history(prompt_id))
                self._require_empty_queue()
                self._request("/history", {"delete": [prompt_id]})
                shutil.rmtree(files.input)
                shutil.rmtree(files.output)
                shutil.rmtree(root / "temp")
                (root / "temp" / "temp").mkdir(parents=True)
                print(f"renderlab attempt={attempt_id} phase=completed session={self._session_id} cold={cold} "
                      f"ready_seconds={ready-start:.3f} total_seconds={monotonic()-start:.3f}", flush=True)
                return result
            except BaseException:
                self._reset()
                print(f"renderlab attempt={attempt_id} phase=worker-reset", flush=True)
                raise
