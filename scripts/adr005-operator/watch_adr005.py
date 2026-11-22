"""WANDA operator for one separately authorized RenderLab ADR-005 run."""
import argparse
import asyncio
import base64
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID, uuid4

WORKSPACE = "faresmohamed260"
ENVIRONMENT = "main"
RENDERER = "renderlab-image-generation/render"
RENDERER_APP = "ap-wS5WKruuipwssNGHf7Eo6k"
CPU_GATEWAY_APP = "ap-UfrkwIijsdz6xiGiQwtMlB"
POLL_SECONDS = 0.2
SNAPSHOT_READ_DELAY = 0.05
SNAPSHOT_READ_RETRY = 2.0
RELAY_STALE_SECONDS = 10.0
SIGNAL_WINDOW = 30
SNAPSHOT_TTL = 5
RUN_ID = re.compile(r"[1-9][0-9]{7,14}")
CALL_ID = re.compile(r"fc-[A-Z0-9]{14,35}")
TASK_ID = re.compile(r"ta-[A-Z0-9]{14,35}")
TIMESTAMP = re.compile(
    r"(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:[.,](\d{1,12}))?(Z|[+-]\d\d(?::?\d\d)?)"
)
MARKER = re.compile(r"(?:(\S+) +)?ADR005_PROCESS_EXIT_READY job=([a-f0-9-]{36})")


def valid_uuid(value):
    return isinstance(value, str) and str(UUID(value)) == value


def parse_timestamp(value):
    match = TIMESTAMP.fullmatch(value)
    if match is None:
        raise ValueError(f"Unrecognized zoned timestamp {value!r}")
    day, clock, fraction, zone = match.groups()
    if zone == "Z":
        zone = "+00:00"
    elif len(zone) == 3:
        zone += ":00"
    elif len(zone) == 5:
        zone = zone[:3] + ":" + zone[3:]
    micros = (fraction or "").ljust(6, "0")[:6]
    return datetime.fromisoformat(f"{day}T{clock}.{micros}{zone}").timestamp()


def log(event, **fields):
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    print(json.dumps({"event": event, "at": now, **fields}), flush=True)


def snapshot_sql(run_id):
    if RUN_ID.fullmatch(run_id) is None:
        raise ValueError("Invalid GitHub run ID")
    return f"""WITH fixture AS (
  SELECT g.id::text AS job, g.status, g.created_at AS created_at,
         (g.provider_job_id IS NOT NULL) AS provider_bound,
         d.attempt_id::text AS attempt, d.backend_call_id,
         d.execution_started_at, d.delivery_count
  FROM public.generation_jobs g
  JOIN auth.users u ON u.id = g.owner_id
  LEFT JOIN public.generation_dispatch_outbox d ON d.job_id = g.id AND d.owner_id = g.owner_id
  WHERE u.email = 'renderlab-adr005-process-exit-recovery-' ||
        left(encode(sha256(convert_to('production-adr005-{run_id}', 'UTF8')), 'hex'), 12) ||
        '@example.com'
  ORDER BY g.created_at, g.id
  LIMIT 3
)
SELECT jsonb_build_object(
  'run_id', '{run_id}',
  'captured_at', clock_timestamp(),
  'active_jobs', (SELECT count(*) FROM public.generation_jobs
                  WHERE status NOT IN ('failed', 'succeeded', 'cancelled')),
  'pending_dispatches', (SELECT count(*) FROM public.generation_dispatch_outbox
                          WHERE status NOT IN ('completed', 'failed', 'cancelled')),
  'rows', coalesce((SELECT jsonb_agg(to_jsonb(fixture) ORDER BY created_at, job) FROM fixture), '[]'::jsonb)
) AS snapshot;"""


class Guard:
    def __init__(self, run_id, armed_at):
        self.run_id = run_id
        self.armed_at = armed_at
        self.job = None
        self.call = None

    def target(self, snapshot, now):
        if snapshot["run_id"] != self.run_id:
            raise ValueError("Snapshot belongs to a different workflow run")
        if not -2 <= now - parse_timestamp(snapshot["captured_at"]) <= SNAPSHOT_TTL:
            raise ValueError("Snapshot expired or host clocks disagree")
        if type(snapshot["active_jobs"]) is not int or snapshot["active_jobs"] not in (0, 1):
            raise ValueError("Refusing to signal with other active production work")
        rows = snapshot["rows"]
        if not isinstance(rows, list) or len(rows) > 1:
            raise ValueError("Ambiguous fixture rows or Job B already submitted")
        if not rows:
            if snapshot["active_jobs"] != 0:
                raise ValueError("A production job outside this fixture became active")
            if self.job is not None:
                raise ValueError("Job A disappeared from the exact fixture")
            return None
        row = rows[0]
        job = row["job"]
        if not valid_uuid(job) or parse_timestamp(row["created_at"]) < self.armed_at - 2:
            raise ValueError("Job is not a fresh fixture created after the watcher armed")
        if self.job is not None and self.job != job:
            raise ValueError("Refusing to change the latched Job A ID")
        self.job = job
        if "marker" in snapshot:
            match = MARKER.fullmatch(snapshot["marker"])
            if match is None or match[2] != job:
                raise ValueError("Actions marker does not name the latched Job A")
        if row["status"] in ("succeeded", "failed", "cancelled"):
            raise ValueError(f"Job A already terminalized as {row['status']}; no signal sent")
        if row["status"] == "queued":
            return None
        if row["status"] != "running" or snapshot["active_jobs"] != 1:
            raise ValueError("Unexpected Job A status or active job count")
        call = row["backend_call_id"]
        if (row["provider_bound"] is not True or not valid_uuid(row["attempt"])
                or type(row["delivery_count"]) is not int or row["delivery_count"] != 1
                or CALL_ID.fullmatch(call or "") is None):
            raise ValueError("Job A has no unambiguous exactly-once Modal call")
        if self.call is not None and self.call != call:
            raise ValueError("Job A provider call changed")
        self.call = call
        ready_at = parse_timestamp(row["execution_started_at"])
        if ready_at < self.armed_at - 2 or ready_at > now + 2:
            raise ValueError("Job A has an inconsistent execution-start timestamp")
        if "marker" in snapshot and match[1]:
            marker_at = parse_timestamp(match[1])
            if marker_at < ready_at - 2 or marker_at > now + 2:
                raise ValueError("Actions marker and execution-start timestamps disagree")
        deadline = ready_at + SIGNAL_WINDOW
        if now >= deadline:
            raise ValueError("Job A's external operator deadline expired; no signal sent")
        return job, call, ready_at, deadline


def read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except OSError:
        return None


async def read_snapshot(path, *, available_seconds=RELAY_STALE_SECONDS):
    cutoff = time.monotonic() + min(SNAPSHOT_READ_RETRY, max(0, available_seconds))
    while True:
        try:
            return json.loads(path.read_text(encoding="utf-8-sig"))
        except OSError as error:
            remaining = cutoff - time.monotonic()
            if remaining <= 0:
                log("RELAY_WARNING", reason="snapshot_read_unavailable",
                    error=type(error).__name__, detail=str(error))
                return None
            await asyncio.sleep(min(SNAPSHOT_READ_DELAY, remaining))


def exact_container(calls, tasks, call, running_status):
    matches = [item for item in calls if item.function_call_id == call]
    if len(matches) != 1:
        raise ValueError("Modal does not report one exact input for Job A's provider call")
    target = matches[0]
    if target.status != running_status:
        raise ValueError("Modal reports Job A's exact call is no longer running; no signal sent")
    live = [item for item in calls if item.status == running_status]
    container = target.container_id
    if len(live) != 1 or TASK_ID.fullmatch(container or "") is None or tasks != [container]:
        raise ValueError("Refusing to act on ambiguous renderer work or containers")
    return container


class Modal:
    @classmethod
    async def connect(cls):
        import modal
        from google.protobuf.empty_pb2 import Empty
        from modal.cli.utils import _resolve_function_id
        from modal.client import _Client

        if modal.__version__ != "1.6.4":
            raise ValueError("The tested Modal transport requires SDK 1.6.4")
        client = await _Client.from_env()
        workspace = await client._stub.WorkspaceNameLookup(Empty(), retry=None, timeout=3)
        if (workspace.workspace_name or workspace.username) != WORKSPACE:
            raise ValueError("Selected Modal profile does not belong to RenderLab's production workspace")
        function_id, _, _ = await _resolve_function_id(client, RENDERER, ENVIRONMENT, command="calls")
        return cls(client, function_id)

    def __init__(self, client, function_id):
        self.client = client
        self.function_id = function_id

    async def tasks(self, app_id):
        from modal_proto import api_pb2

        request = api_pb2.TaskListRequest(environment_name=ENVIRONMENT, app_id=app_id)
        result = await self.client._stub.TaskList(request)
        if any(task.app_id != app_id for task in result.tasks):
            raise ValueError("Modal TaskList returned a task for a different app")
        return [task.task_id for task in result.tasks]

    async def bind(self, call):
        from modal_proto import api_pb2

        request = api_pb2.FunctionCallFetchRequest(
            function_id=self.function_id,
            tail=api_pb2.FunctionCallFetchRequest.Tail(count=32),
            all_variants=False,
        )
        calls, tasks = await asyncio.gather(
            self.client._stub.FunctionCallFetch(request), self.tasks(RENDERER_APP)
        )
        return exact_container(
            calls.function_call_inputs, tasks, call, api_pb2.FUNCTION_CALL_INPUT_STATUS_RUNNING
        )

    async def exec(self, container, program, *args, acknowledge):
        from modal.container_process import _ContainerProcess
        from modal.sandbox._impl_v1 import command_router_access_fetcher
        from modal.sandbox._task_command_router_client import TaskCommandRouterClient
        from modal_proto import task_command_router_pb2 as pb

        router = await TaskCommandRouterClient.connect(
            self.client, container, command_router_access_fetcher(self.client, container)
        )
        exec_id = str(uuid4())
        try:
            await router.exec_start(pb.TaskExecStartRequest(
                task_id=container,
                exec_id=exec_id,
                command_args=["python", "-c", program, *args],
                stdout_config=pb.TASK_EXEC_STDOUT_CONFIG_PIPE,
                stderr_config=pb.TASK_EXEC_STDERR_CONFIG_PIPE,
            ))
            process = _ContainerProcess(exec_id, container, self.client, command_router_client=router)
            return await asyncio.gather(
                process.wait(), read_remote_output(process, acknowledge), process.stderr.read()
            )
        finally:
            await router.close()


async def read_remote_output(process, acknowledge):
    parts = []
    pending = ""
    approved = False
    async for part in process.stdout:
        parts.append(part)
        pending += part
        while "\n" in pending:
            line, pending = pending.split("\n", 1)
            event = json.loads(line)
            if event.get("event") == "REMOTE_READY":
                if approved:
                    raise ValueError("Duplicate remote authorization request")
                payload = await acknowledge(event)
                process.stdin.write(payload + "\n")
                process.stdin.write_eof()
                await process.stdin.drain()
                approved = True
    return "".join(parts)


async def watch(inbox, allow_signal, provider=None, *, observe_only=False):
    if observe_only and allow_signal:
        raise ValueError("Observe-only mode cannot signal")
    if not inbox.is_dir() or any((inbox / name).exists() for name in ("arm.json", "snapshot.json", "observe-done.json")):
        raise ValueError("Use an existing empty one-use inbox; arm it only after WATCHING")
    if allow_signal and provider is None:
        provider = await asyncio.wait_for(Modal.connect(), 12)
    armed_at = time.time()
    log("WATCHING", inbox=str(inbox), poll_seconds=POLL_SECONDS, signal_enabled=allow_signal,
        observe_only=observe_only)
    guard = None
    last_capture = None
    seen_at = None
    first_observed = None
    last_observed = None
    observations = 0
    detection_bounds = []

    def relay_error(value):
        if value is not None and "error" in value:
            raise ValueError(f"Snapshot relay failed: {value['error']}")

    def fresh(value, now):
        return value is not None and -2 <= now - parse_timestamp(value["captured_at"]) <= SNAPSHOT_TTL

    snapshot_path = inbox / "snapshot.json"

    def relay_time_left():
        return RELAY_STALE_SECONDS - (time.monotonic() - seen_at)

    async def require_current(target, deadline):
        nonlocal seen_at, last_capture
        warned = False
        while time.time() < deadline and relay_time_left() > 0:
            value = await read_snapshot(snapshot_path,
                                        available_seconds=min(relay_time_left(), deadline - time.time()))
            relay_error(value)
            now = time.time()
            if now >= deadline or relay_time_left() <= 0:
                break
            if fresh(value, now):
                if guard.target(value, now) != target:
                    raise ValueError("Job A changed during Modal verification")
                if value["captured_at"] != last_capture:
                    last_capture = value["captured_at"]
                    seen_at = time.monotonic()
                return
            if not warned:
                log("RELAY_WARNING", reason="awaiting_fresh_job_a_snapshot")
                warned = True
            await asyncio.sleep(POLL_SECONDS)
        raise ValueError("No fresh Job A evidence before the relay or operator deadline")

    while True:
        if guard is None and (arm := read_json(inbox / "arm.json")) is not None:
            run_id = arm["run_id"]
            if RUN_ID.fullmatch(run_id) is None:
                raise ValueError("Arm file does not contain one exact Actions run ID")
            guard = Guard(run_id, armed_at)
            seen_at = time.monotonic()
            log("ARMED", run_id=run_id)
        if guard is not None and relay_time_left() <= 0:
            raise ValueError("The read-only database snapshot relay stopped")
        if guard is not None and (snapshot := await read_snapshot(
                snapshot_path, available_seconds=relay_time_left())) is not None:
            if relay_time_left() <= 0:
                raise ValueError("The read-only database snapshot relay stopped")
            relay_error(snapshot)
            captured_at = snapshot["captured_at"]
            if captured_at != last_capture:
                last_capture = captured_at
                now = time.time()
                if not fresh(snapshot, now):
                    log("RELAY_WARNING", reason="stale_database_snapshot", captured_at=captured_at,
                        age_ms=round((now - parse_timestamp(captured_at)) * 1000))
                    continue
                seen_at = time.monotonic()
                target = guard.target(snapshot, now)
                if observe_only:
                    if snapshot["active_jobs"] != 0 or snapshot["pending_dispatches"] != 0 or snapshot["rows"]:
                        raise ValueError("Observe-only soak saw a live job")
                    observed = parse_timestamp(captured_at)
                    if first_observed is None:
                        first_observed = observed
                    last_observed = observed
                    observations += 1
                    relay_sample = snapshot.get("relay_sample", {})
                    previous = relay_sample.get("previous_capture_at")
                    detection_ms = round((now - parse_timestamp(previous)) * 1000) if previous else None
                    if detection_ms is not None:
                        detection_bounds.append(detection_ms)
                    log("OBSERVE_SAMPLE", sequence=relay_sample.get("sequence"),
                        captured_at=captured_at, active_jobs=0,
                        capture_to_watch_ms=round((now - observed) * 1000),
                        detection_bound_ms=detection_ms)
                if target is not None:
                    job, call, ready_at, deadline = target
                    log("JOB_A_READY", run_id=guard.run_id, job=job, call=call,
                        source="actions-marker+database" if "marker" in snapshot else "database",
                        execution_started_at=snapshot["rows"][0]["execution_started_at"],
                        detection_seconds=round(time.time() - ready_at, 3))
                    if not allow_signal:
                        log("DRY_RUN_NO_SIGNAL", job=job)
                        return
                    container = await asyncio.wait_for(provider.bind(call), 5)
                    await require_current(target, deadline)
                    remaining = deadline - time.time()
                    if remaining <= 0:
                        raise ValueError("Job A deadline expired during Modal binding")
                    remote = Path(__file__).with_name("comfy_child.py").read_bytes()
                    program = "exec(__import__('base64').b64decode(%r))" % base64.b64encode(remote)
                    async def authorize(event):
                        prompt = event["prompt_id"]
                        if event.get("job") != job or event.get("call") != call or not valid_uuid(prompt):
                            raise ValueError("Remote requested authorization for a different job or call")
                        if await asyncio.wait_for(provider.bind(call), 4) != container:
                            raise ValueError("Job A container changed before signal")
                        await require_current(target, deadline)
                        log("REMOTE_AUTHORIZED", job=job, call=call, container=container,
                            pid=event["pid"], prompt_id=prompt)
                        return f"GO {job} {call} {prompt}"

                    log("REMOTE_START", job=job, call=call, container=container)
                    try:
                        code, stdout, stderr = await asyncio.wait_for(
                            provider.exec(container, program, guard.run_id, job, call, str(deadline), acknowledge=authorize),
                            remaining + 4,
                        )
                    except Exception:
                        log("REMOTE_OUTCOME_UNKNOWN_STOP", job=job, call=call)
                        raise
                    log("REMOTE_RESULT", job=job, call=call, container=container,
                        exit_status=code, stdout=stdout, stderr=stderr)
                    matching = [json.loads(line) for line in stdout.splitlines()]
                    if code != 0 or not any(
                        item["event"] == "SIGKILL_SENT" and item["job"] == job and item["call"] == call
                        for item in matching
                    ):
                        raise ValueError("No matching SIGKILL acknowledgment; stop without retry")
                    log("SIGNAL_CONFIRMED", job=job, call=call, container=container)
                    return
        if observe_only and (done := read_json(inbox / "observe-done.json")) is not None:
            if guard is None or done["run_id"] != guard.run_id or first_observed is None:
                raise ValueError("Observe-only completion belongs to a different session")
            observed_span = last_observed - first_observed
            if done["capture_span_ms"] < 600_000 or observed_span < 600:
                raise ValueError("Observe-only run did not cover ten minutes of database captures")
            if not detection_bounds:
                raise ValueError("Observe-only run did not collect detection latency")
            detection_bounds.sort()
            rank = (95 * len(detection_bounds) + 99) // 100
            p95 = detection_bounds[rank - 1]
            if p95 > 10_000:
                raise ValueError(f"Observe-only p95 detection bound exceeded ten seconds ({p95} ms)")
            log("OBSERVE_COMPLETE", run_id=guard.run_id, samples=observations,
                observed_capture_span_seconds=round(observed_span, 3), detection_p95_ms=p95, active_jobs=0)
            return
        await asyncio.sleep(POLL_SECONDS)


async def check_provider(call):
    if CALL_ID.fullmatch(call) is None:
        raise ValueError("Invalid Modal call ID")
    started = time.monotonic()
    provider = await asyncio.wait_for(Modal.connect(), 12)
    try:
        await asyncio.wait_for(provider.bind(call), 5)
    except ValueError as error:
        if "exact call is no longer running" not in str(error):
            raise
        log("PROVIDER_HISTORICAL_CALL_REFUSED", elapsed_seconds=round(time.monotonic() - started, 3),
            detail=str(error))
        return
    raise ValueError("Historical call probe unexpectedly found an active call")


async def probe():
    started = time.monotonic()
    provider = await asyncio.wait_for(Modal.connect(), 12)
    tasks = await asyncio.wait_for(provider.tasks(CPU_GATEWAY_APP), 5)
    if len(tasks) != 1 or TASK_ID.fullmatch(tasks[0]) is None:
        raise ValueError("Expected one already-running CPU gateway container for transport probe")
    transport_start = time.monotonic()
    async def acknowledge(event):
        if event != {"event": "REMOTE_READY"}:
            raise ValueError("Unexpected CPU probe handshake")
        return "PROBE"

    program = (
        "import select, sys; print('{\"event\":\"REMOTE_READY\"}', flush=True); "
        "assert select.select([sys.stdin], [], [], 5)[0] and input() == 'PROBE'; "
        "print('{\"event\":\"CPU_PROBE_STDOUT\"}', flush=True); "
        "print('CPU_PROBE_STDERR', file=sys.stderr, flush=True); sys.exit(7)"
    )
    code, stdout, stderr = await asyncio.wait_for(
        provider.exec(tasks[0], program, acknowledge=acknowledge), 8
    )
    events = [json.loads(line)["event"] for line in stdout.splitlines()]
    if (code, events, stderr.strip()) != (7, ["REMOTE_READY", "CPU_PROBE_STDOUT"], "CPU_PROBE_STDERR"):
        raise ValueError("CPU transport probe did not preserve nonzero status and both streams")
    log("CPU_TRANSPORT_PASS", exit_status=code, stdout=events, stderr=stderr.strip(),
        connect_seconds=round(transport_start - started, 3),
        exec_seconds=round(time.monotonic() - transport_start, 3))


def run_on_modal_loop(operation, *args):
    profile = os.environ.get("RENDERLAB_ADR005_MODAL_PROFILE", "").strip()
    if not profile:
        raise ValueError("Set RENDERLAB_ADR005_MODAL_PROFILE to the approved operator profile")
    if any(os.environ.get(name) for name in (
        "MODAL_TOKEN_ID", "MODAL_TOKEN_SECRET", "MODAL_OAUTH_REFRESH_TOKEN",
        "MODAL_OAUTH_CLIENT_ID", "MODAL_OAUTH_CLIENT_SECRET", "MODAL_SERVER_URL",
    )):
        raise ValueError("Use the approved named Modal profile without environment overrides")
    subprocess.run(
        ["node", "--input-type=module", "-e",
         "import { assertRenderLabModalAccount } from './lib/modal-project-ownership.mjs';"
         "assertRenderLabModalAccount('modal-01');"],
        cwd=Path(__file__).resolve().parents[1], check=True, timeout=5,
    )
    os.environ["MODAL_PROFILE"] = profile
    from modal.config import Config
    servers = Config().get("server_url").split(",")
    if any(server not in ("https://api.modal.com", "https://api.modal2.com") for server in servers):
        raise ValueError("The approved Modal profile must use the Modal API")
    from modal._utils.async_utils import synchronizer
    return synchronizer.create_blocking(operation)(*args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--inbox", type=Path)
    modes.add_argument("--sql", metavar="RUN_ID")
    modes.add_argument("--probe", action="store_true")
    modes.add_argument("--check-finished-call", metavar="CALL_ID")
    behavior = parser.add_mutually_exclusive_group()
    behavior.add_argument("--signal-exact-job-a", action="store_true")
    behavior.add_argument("--observe-only", action="store_true")
    args = parser.parse_args()
    if (args.signal_exact_job_a or args.observe_only) and not args.inbox:
        parser.error("A watcher mode requires --inbox")
    try:
        if args.sql:
            print(snapshot_sql(args.sql))
        elif args.check_finished_call:
            run_on_modal_loop(check_provider, args.check_finished_call)
        elif args.probe:
            run_on_modal_loop(probe)
        elif args.signal_exact_job_a:
            run_on_modal_loop(watch, args.inbox, True)
        else:
            asyncio.run(watch(args.inbox, False, observe_only=args.observe_only))
    except Exception as error:
        log("WATCHER_STOP", error=type(error).__name__, detail=str(error))
        print(f"ADR005_WATCHER_ERROR {type(error).__name__}: {error}", file=sys.stderr, flush=True)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
