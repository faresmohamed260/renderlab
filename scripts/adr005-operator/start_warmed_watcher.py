"""Warm the ADR-005 watcher with read-only, empty-queue snapshots."""
import argparse
import asyncio
import sys
import time
from pathlib import Path

import watch_adr005 as watcher

async def warmed_watch(warmup, live, preflight_id):
    if watcher.RUN_ID.fullmatch(preflight_id) is None:
        raise ValueError("Use an unused numeric preflight run ID")
    if not warmup.is_dir() or not live.is_dir() or warmup == live:
        raise ValueError("Use separate fresh preflight and live inboxes")
    provider = await asyncio.wait_for(watcher.Modal.connect(), 12)
    watcher.log("PREFLIGHT_POLLING", poll_seconds=watcher.POLL_SECONDS, inbox=str(warmup))
    started = time.monotonic()
    while not (warmup / "arm.json").is_file():
        if time.monotonic() - started >= 45:
            raise ValueError("Preflight relay did not start")
        await asyncio.sleep(watcher.POLL_SECONDS)

    seen_at = time.monotonic()
    last_capture = None
    accepted = 0
    while accepted < 3:
        remaining = watcher.RELAY_STALE_SECONDS - (time.monotonic() - seen_at)
        if remaining <= 0:
            raise ValueError("Preflight relay did not provide fresh snapshots")
        value = await watcher.read_snapshot(warmup / "snapshot.json", available_seconds=remaining)
        if value is not None:
            if "error" in value:
                raise ValueError(f"Preflight relay failed: {value['error']}")
            if (value["run_id"] != preflight_id or value["rows"] != []
                    or type(value["active_jobs"]) is not int or value["active_jobs"] != 0
                    or type(value["pending_dispatches"]) is not int or value["pending_dispatches"] != 0):
                raise ValueError("Preflight requires the exact empty-queue snapshot")
            capture = watcher.parse_timestamp(value["captured_at"])
            now = time.time()
            if -2 <= now - capture <= watcher.SNAPSHOT_TTL and (last_capture is None or capture > last_capture):
                last_capture = capture
                seen_at = time.monotonic()
                accepted += 1
                watcher.log("PREFLIGHT_SNAPSHOT_ACCEPTED", index=accepted,
                            captured_at=value["captured_at"], age_ms=round((now-capture)*1000),
                            active_jobs=0, pending_dispatches=0)
        await asyncio.sleep(watcher.POLL_SECONDS)

    watcher.log("PREFLIGHT_READY", fresh_snapshots=accepted, live_inbox=str(live))
    await watcher.watch(live, True, provider=provider)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("warmup", type=Path)
    parser.add_argument("live", type=Path)
    parser.add_argument("--preflight-id", required=True)
    args = parser.parse_args()
    try:
        watcher.run_on_modal_loop(warmed_watch, args.warmup, args.live, args.preflight_id)
    except Exception as error:
        watcher.log("WATCHER_STOP", error=type(error).__name__, detail=str(error))
        print(f"ADR005_WATCHER_ERROR {type(error).__name__}: {error}", file=sys.stderr, flush=True)
        raise SystemExit(1)
