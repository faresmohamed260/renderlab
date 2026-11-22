"""Run only inside the exact run-owned Modal renderer container."""
import json
import os
import re
import select
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener
from uuid import UUID

COMFY_CWD = "/opt/ComfyUI"
QUEUE_URL = "http://127.0.0.1:8188/queue"
ARG_TAIL = [
    "--disable-all-custom-nodes", "--disable-api-nodes", "--disable-auto-launch",
    "--lowvram", "--reserve-vram", "1",
]


def exact_args(args, cwd, executable):
    if cwd != COMFY_CWD or len(args) != 20:
        return False
    if args[0] != executable and os.path.realpath(args[0]) != executable:
        return False
    if args[1:7] != ["main.py", "--listen", "127.0.0.1", "--port", "8188", "--input-directory"]:
        return False
    root = str(PurePosixPath(args[7]).parent)
    if not re.fullmatch(r"/tmp/renderlab-comfy-[a-z0-9_]+", root):
        return False
    return args[7:] == [
        root + "/input", "--output-directory", root + "/output",
        "--temp-directory", root + "/temp", "--extra-model-paths-config",
        root + "/models.yaml", *ARG_TAIL,
    ]


def processes():
    found = []
    for proc in Path("/proc").iterdir():
        if not proc.name.isdecimal() or int(proc.name) <= 1:
            continue
        try:
            cmdline = (proc / "cmdline").read_bytes()
            args = [os.fsdecode(arg) for arg in cmdline.removesuffix(b"\0").split(b"\0")]
            if exact_args(args, os.readlink(proc / "cwd"), os.readlink(proc / "exe")):
                fields = (proc / "stat").read_text().rsplit(")", 1)[1].split()
                if fields[0] != "Z":
                    found.append((int(proc.name), int(fields[19])))
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            continue
    return found


def run_prompt(run_id):
    return f"ADR-005 process exit {run_id}: a detailed cobalt mechanical sphere on a neutral studio background"


def inspect_queue(queue, run_id):
    pending, running = queue["queue_pending"], queue["queue_running"]
    if not isinstance(pending, list) or not isinstance(running, list):
        raise ValueError("Unexpected ComfyUI queue shape")
    if len(pending) + len(running) > 1:
        raise ValueError("ComfyUI has competing work")
    if not pending and not running:
        return None
    _, prompt_id, graph, *_ = (running or pending)[0]
    if str(UUID(prompt_id)) != prompt_id:
        raise ValueError("Unexpected ComfyUI prompt ID")
    encode, sample = graph.get("encode", {}), graph.get("sample", {})
    if (encode.get("class_type") != "TextEncodeFibo2"
            or encode.get("inputs", {}).get("prompt") != run_prompt(run_id)
            or sample.get("class_type") != "KSampler"
            or sample.get("inputs", {}).get("seed") != 42001
            or sample.get("inputs", {}).get("steps") != 8):
        raise ValueError("Active ComfyUI graph is not the exact Job A fixture")
    return prompt_id if running else None


def read_queue():
    with build_opener(ProxyHandler({})).open(QUEUE_URL, timeout=0.6) as response:
        return json.loads(response.read(2_000_001))


def emit(event, **fields):
    at = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    print(json.dumps({"event": event, "at": at, **fields}), flush=True)


def wait_for_ack(job, call, prompt, deadline):
    readable, _, _ = select.select([sys.stdin], [], [], max(0, deadline - time.time()))
    return bool(readable) and sys.stdin.readline().strip() == f"GO {job} {call} {prompt}"


def signal_exact(fd):
    signal.pidfd_send_signal(fd, signal.SIGKILL)


def watch_child(run_id, job, call, deadline, *, scan=processes, queue=read_queue,
                confirm=wait_for_ack, send=signal_exact):
    while time.time() < deadline:
        candidates = scan()
        if len(candidates) > 1:
            raise ValueError("Multiple exact ComfyUI children")
        if candidates:
            try:
                prompt = inspect_queue(queue(), run_id)
            except (URLError, TimeoutError):
                time.sleep(0.15)
                continue
            if prompt:
                pid, ticks = candidates[0]
                fd = os.pidfd_open(pid)
                try:
                    emit("REMOTE_READY", job=job, call=call, pid=pid, start_ticks=ticks, prompt_id=prompt)
                    if not confirm(job, call, prompt, deadline):
                        raise ValueError("No fresh local authorization arrived; no signal sent")
                    same_prompt = inspect_queue(queue(), run_id) == prompt
                    if not same_prompt or scan() != [(pid, ticks)] or time.time() >= deadline:
                        raise ValueError("Job A finished, identity changed, or deadline expired before signal")
                    emit("SIGKILL_BEFORE", job=job, call=call, pid=pid, start_ticks=ticks, prompt_id=prompt)
                    send(fd)
                    emit("SIGKILL_SENT", job=job, call=call, pid=pid, start_ticks=ticks, prompt_id=prompt)
                    return
                finally:
                    os.close(fd)
        time.sleep(0.15)
    raise ValueError("Job A no longer running or exact ComfyUI graph never became active before deadline")


if __name__ == "__main__":
    try:
        run, job_id, call_id, cutoff = sys.argv[1:]
        if (not re.fullmatch(r"[1-9][0-9]{7,14}", run) or str(UUID(job_id)) != job_id
                or not re.fullmatch(r"fc-[A-Z0-9]{14,35}", call_id)):
            raise ValueError("Unexpected run, job, or provider call identity")
        watch_child(run, job_id, call_id, float(cutoff))
    except (KeyError, OSError, TypeError, ValueError) as error:
        print(f"ADR005_REMOTE_ERROR {error}", file=sys.stderr, flush=True)
        raise SystemExit(42)
