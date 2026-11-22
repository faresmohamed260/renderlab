"""Timing-only rehearsal. This script never connects to Modal or sends a signal."""
import argparse
import asyncio
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import comfy_child
import watch_adr005 as watcher

RUN = "45999999863"
JOB = "1eec1084-0eba-4d01-92a2-7c5bd965dcfc"
CALL = "fc-SYNTHETICHANDOFF26397"
CONTAINER = "ta-SYNTHETICRENDERER26397"
PROMPT = "6385c524-31be-4d5d-af71-60cb9f9e33fc"


class SyntheticProvider:
    def __init__(self, lookup_ms, transport_ms):
        self.lookup_seconds = lookup_ms / 1000
        self.transport_seconds = transport_ms / 1000
        self.binds = 0
        self.fake_signals = 0
        self.signal_at = None

    async def bind(self, call):
        if call != CALL:
            raise ValueError("Synthetic call mismatch")
        self.binds += 1
        await asyncio.sleep(self.lookup_seconds)
        return CONTAINER

    async def exec(self, container, program, *identity, acknowledge):
        run, job, call, cutoff = identity
        if (container, run, job, call) != (CONTAINER, RUN, JOB, CALL):
            raise ValueError("Synthetic renderer identity mismatch")
        loop = asyncio.get_running_loop()
        await asyncio.sleep(self.transport_seconds)
        events = []
        graph = {
            "encode": {"class_type": "TextEncodeFibo2",
                       "inputs": {"prompt": comfy_child.run_prompt(run)}},
            "sample": {"class_type": "KSampler", "inputs": {"seed": 42001, "steps": 8}},
        }

        def emit(event, **fields):
            seen = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
            events.append({"event": event, "at": seen, "synthetic": True, **fields})

        def confirm(job_id, call_id, prompt, deadline):
            event = {"job": job_id, "call": call_id, "prompt_id": prompt, "pid": 6}
            reply = asyncio.run_coroutine_threadsafe(acknowledge(event), loop)
            return reply.result(timeout=max(0.001, deadline - time.time())) == f"GO {JOB} {CALL} {PROMPT}"

        def record_fake_signal(fd):
            if fd != 88 or self.fake_signals:
                raise ValueError("Synthetic signal was ambiguous or repeated")
            self.fake_signals += 1
            self.signal_at = time.time()

        def run_child():
            fake_os = SimpleNamespace(pidfd_open=lambda _: 88, close=lambda _: None)
            with patch.object(comfy_child, "os", fake_os), patch.object(comfy_child, "emit", emit):
                comfy_child.watch_child(
                    run, job, call, float(cutoff), scan=lambda: [(6, 387)],
                    queue=lambda: {"queue_running": [[1, PROMPT, graph, {}, []]], "queue_pending": []},
                    confirm=confirm, send=record_fake_signal,
                )

        await asyncio.to_thread(run_child)
        return 0, "\n".join(map(json.dumps, events)), ""


def timestamp(value):
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def publish(inbox, name, value):
    temporary = inbox / f"{name}.tmp"
    temporary.write_text(json.dumps(value), encoding="utf-8")
    temporary.replace(inbox / name)


async def feed(inbox, timing):
    # Let the watcher establish its freshness boundary before arming the fake run.
    await asyncio.sleep(watcher.POLL_SECONDS)
    publish(inbox, "arm.json", {"run_id": RUN})
    timing["marker"] = time.time()
    while True:
        now = time.time()
        ready = now - timing["marker"] >= timing["detection_seconds"]
        rows = [{
            "job": JOB, "status": "running", "created_at": timestamp(timing["marker"]),
            "attempt": "1ec91a3c-8bc0-486a-a53f-a3fbf1d143e5", "delivery_count": 1,
            "provider_bound": True, "backend_call_id": CALL,
            "execution_started_at": timestamp(timing["marker"]),
        }] if ready else []
        snapshot = {"run_id": RUN, "captured_at": timestamp(now), "active_jobs": len(rows),
                    "pending_dispatches": len(rows), "rows": rows}
        if ready:
            snapshot["marker"] = f"{timestamp(timing['marker'])} ADR005_PROCESS_EXIT_READY job={JOB}"
        publish(inbox, "snapshot.json", snapshot)
        await asyncio.sleep(0.5)


async def rehearse(inbox, lookup_ms, transport_ms, detection_ms):
    if not inbox.name.startswith("inbox-rehearsal-"):
        raise ValueError("Use a dedicated synthetic-only inbox")
    fake = SyntheticProvider(lookup_ms, transport_ms)
    watcher.log("SYNTHETIC_ONLY", real_signals=0, lookup_ms_each=lookup_ms, transport_ms=transport_ms)
    timing = {"detection_seconds": detection_ms / 1000}
    async with asyncio.TaskGroup() as group:
        feeder = group.create_task(feed(inbox, timing))
        try:
            await asyncio.wait_for(watcher.watch(inbox, True, provider=fake), 40)
        finally:
            feeder.cancel()
    if (fake.binds, fake.fake_signals) != (2, 1):
        raise ValueError("Synthetic proof did not record both lookups and exactly one fake signal")
    elapsed = fake.signal_at - timing["marker"]
    if not 0 <= elapsed < 25:
        raise ValueError(f"Expected a synthetic signal within 25 seconds, observed {elapsed:.3f}")
    watcher.log("REHEARSAL_COMPLETE", modal_bindings=fake.binds, fake_signals=fake.fake_signals,
                real_signals=0, marker_to_signal_s=round(elapsed, 3))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inbox", type=Path)
    parser.add_argument("lookup_ms", type=int)
    parser.add_argument("transport_ms", type=int)
    parser.add_argument("--detection-ms", type=int, required=True)
    args = parser.parse_args()
    if min(args.lookup_ms, args.transport_ms, args.detection_ms) < 0:
        parser.error("Rehearsal latencies must be nonnegative")
    asyncio.run(rehearse(args.inbox, args.lookup_ms, args.transport_ms, args.detection_ms))
