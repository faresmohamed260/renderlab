"""Synthetic Phase A verification. No production signals or GPU work."""
import asyncio
import contextlib
import io
import json
import time
import unittest
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

import comfy_child as child
import watch_adr005 as watcher

RUN = "45045252694"
JOB = "9359e81b-fe18-4cac-94a9-58a794582f36"
OTHER_JOB = "630c85d1-e064-4927-8562-18562043f549"
ATTEMPT = "0e918eef-7de6-4471-9c1e-9bf196d7376f"
CALL = "fc-01M8226A75EHR4J69RPNC947HP"
TASK = "ta-01M8226H8VX7PZSREFDFDREF4R"
PROMPT = "6385c524-31be-4d5d-af71-60cb9f9e33fc"
MARKER = f"2026-11-22T16:42:36.5124803Z ADR005_PROCESS_EXIT_READY job={JOB}"


def iso(value):
    return datetime.fromtimestamp(value, timezone.utc).isoformat()


def snapshot(at):
    return {
        "captured_at": iso(at),
        "run_id": RUN, "active_jobs": 1, "marker": f"{iso(at)} ADR005_PROCESS_EXIT_READY job={JOB}",
        "rows": [{
            "job": JOB, "status": "running", "created_at": iso(at),
            "provider_bound": True, "attempt": ATTEMPT, "backend_call_id": CALL,
            "execution_started_at": iso(at), "delivery_count": 1,
        }],
    }


def graph_queue():
    graph = {
        "encode": {"class_type": "TextEncodeFibo2", "inputs": {"prompt": child.run_prompt(RUN)}},
        "sample": {"class_type": "KSampler", "inputs": {"seed": 42001, "steps": 8}},
    }
    return {"queue_pending": [], "queue_running": [[1, PROMPT, graph, {}, []]]}


def write_atomic(folder, name, record):
    path = folder / name
    staging = folder / (name + ".temp")
    staging.write_text(json.dumps(record), encoding="utf-8")
    staging.replace(path)


class Guards(unittest.TestCase):
    def setUp(self):
        self.now = time.time()
        self.data = snapshot(self.now)
        self.guard = watcher.Guard(RUN, self.now - 1)

    def test_timestamp_regression(self):
        expected = watcher.parse_timestamp("2026-11-22T16:42:35.446659Z")
        for value in (
            "2026-11-22 16:42:35.446659+00",
            "2026-11-22T16:42:35.4466590+0000",
            "2026-11-22T18:42:35,446659+02:00",
            "2026-11-22T16:42:35.446659123Z",
        ):
            with self.subTest(value=value):
                self.assertEqual(expected, watcher.parse_timestamp(value))
        with self.assertRaisesRegex(ValueError, "Unrecognized zoned"):
            watcher.parse_timestamp("2026-11-22 16:42:35")

    def test_wrong_marker_and_wrong_run(self):
        self.data["marker"] = MARKER.replace(JOB, OTHER_JOB)
        with self.assertRaisesRegex(ValueError, "marker does not name"):
            self.guard.target(self.data, self.now)
        self.data["run_id"] = "45000000000"
        with self.assertRaisesRegex(ValueError, "different workflow run"):
            self.guard.target(self.data, self.now)

    def test_recovery_and_multiple_jobs(self):
        self.guard.target(self.data, self.now)
        self.data["rows"].append(deepcopy(self.data["rows"][0]))
        self.data["rows"][1]["job"] = OTHER_JOB
        with self.assertRaisesRegex(ValueError, "Job B"):
            self.guard.target(self.data, self.now)
        del self.data["rows"][0]
        with self.assertRaisesRegex(ValueError, "latched Job A"):
            self.guard.target(self.data, self.now)
        self.data["active_jobs"] = 2
        with self.assertRaisesRegex(ValueError, "other active production"):
            self.guard.target(self.data, self.now)

    def test_terminal_expired_and_bad_dispatch(self):
        self.data["rows"][0]["status"] = "succeeded"
        with self.assertRaisesRegex(ValueError, "terminalized as succeeded"):
            self.guard.target(self.data, self.now)
        self.data["rows"][0]["status"] = "running"
        self.data["rows"][0]["delivery_count"] = 2
        with self.assertRaisesRegex(ValueError, "exactly-once"):
            self.guard.target(self.data, self.now)
        self.data["captured_at"] = iso(self.now - 9)
        with self.assertRaisesRegex(ValueError, "Snapshot expired"):
            self.guard.target(self.data, self.now)

    def test_execution_deadline(self):
        self.guard.armed_at = self.now - 60
        self.data["rows"][0]["execution_started_at"] = iso(self.now - 31)
        with self.assertRaisesRegex(ValueError, "operator deadline expired"):
            self.guard.target(self.data, self.now)

    def test_database_marker_equivalent(self):
        del self.data["marker"]
        self.assertEqual(self.guard.target(self.data, self.now)[:2], (JOB, CALL))

    def test_modal_call_must_be_running_and_sole(self):
        fake = SimpleNamespace(function_call_id=CALL, status=2, container_id=TASK)
        self.assertEqual(watcher.exact_container([fake], [TASK], CALL, 2), TASK)
        with self.assertRaisesRegex(ValueError, "ambiguous renderer"):
            watcher.exact_container([fake, SimpleNamespace(**{**vars(fake), "function_call_id": "fc-other"})],
                                    [TASK], CALL, 2)
        with self.assertRaisesRegex(ValueError, "ambiguous renderer"):
            watcher.exact_container([fake], [TASK, "another-task"], CALL, 2)
        fake.status = 3
        with self.assertRaisesRegex(ValueError, "no longer running"):
            watcher.exact_container([fake], [TASK], CALL, 2)

    def test_child_argv_and_active_prompt(self):
        root = "/tmp/renderlab-comfy-abc123"
        exe = "/usr/local/bin/python3.12"
        argv = [exe, "main.py", "--listen", "127.0.0.1", "--port", "8188",
                "--input-directory", root + "/input", "--output-directory", root + "/output",
                "--temp-directory", root + "/temp", "--extra-model-paths-config", root + "/models.yaml",
                *child.ARG_TAIL]
        self.assertTrue(child.exact_args(argv, "/opt/ComfyUI", exe))
        self.assertFalse(child.exact_args(argv, "/opt/different", exe))
        self.assertFalse(child.exact_args(argv + ["--extra"], "/opt/ComfyUI", exe))
        self.assertEqual(child.inspect_queue(graph_queue(), RUN), PROMPT)
        with self.assertRaisesRegex(ValueError, "not the exact Job A"):
            child.inspect_queue(graph_queue(), "45000000000")
        changed = graph_queue()
        queued = {"queue_running": [], "queue_pending": changed["queue_running"]}
        self.assertIsNone(child.inspect_queue(queued, RUN))
        changed["queue_pending"] = [["competing-input"]]
        with self.assertRaisesRegex(ValueError, "competing work"):
            child.inspect_queue(changed, RUN)

    def test_child_signals_only_after_confirmation_and_queue_recheck(self):
        calls = []
        with patch.object(child.os, "pidfd_open", return_value=88, create=True), \
                patch.object(child.os, "close"), contextlib.redirect_stdout(io.StringIO()) as output:
            child.watch_child(RUN, JOB, CALL, time.time() + 3, scan=lambda: [(6, 387)],
                              queue=graph_queue, confirm=lambda *_: True, send=calls.append)
        self.assertEqual(calls, [88])
        self.assertEqual([json.loads(line)["event"] for line in output.getvalue().splitlines()],
                         ["REMOTE_READY", "SIGKILL_BEFORE", "SIGKILL_SENT"])
        calls.clear()
        with patch.object(child.os, "pidfd_open", return_value=88, create=True), \
                patch.object(child.os, "close"), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaisesRegex(ValueError, "no signal sent"):
                child.watch_child(RUN, JOB, CALL, time.time() + 3, scan=lambda: [(6, 387)],
                                  queue=graph_queue, confirm=lambda *_: False, send=calls.append)
            queues = iter([graph_queue(), {"queue_running": [], "queue_pending": []}])
            with self.assertRaisesRegex(ValueError, "Job A finished"):
                child.watch_child(RUN, JOB, CALL, time.time() + 3, scan=lambda: [(6, 387)],
                                  queue=lambda: next(queues), confirm=lambda *_: True, send=calls.append)
        self.assertEqual(calls, [])


    def test_stale_actions_marker(self):
        self.data["marker"] = MARKER
        with self.assertRaisesRegex(ValueError, "timestamps disagree"):
            self.guard.target(self.data, self.now)


class FakeProvider:
    def __init__(self, exit_code=0, stdout_ok=True):
        self.exit_code = exit_code
        self.stdout_ok = stdout_ok
        self.binds = []
        self.invocations = []

    async def bind(self, call):
        self.binds.append(call)
        return TASK

    async def exec(self, container, program, *args, acknowledge):
        run, job, call, deadline = args
        self.invocations.append((container, run, job, call, float(deadline)))
        result = await acknowledge({"event": "REMOTE_READY", "job": job, "call": call,
                                    "pid": 6, "prompt_id": PROMPT})
        if result != f"GO {job} {call} {PROMPT}":
            raise AssertionError("wrong acknowledgment")
        acknowledgment = {"event": "SIGKILL_SENT" if self.stdout_ok else "NO_SIGNAL",
                          "job": job, "call": call}
        return self.exit_code, json.dumps(acknowledgment), "FAKE_REMOTE_STDERR"


class WatchLoop(unittest.IsolatedAsyncioTestCase):
    async def run_fixture(self, provider, failure=None):
        with TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()) as output:
            folder = Path(directory)
            task = asyncio.create_task(watcher.watch(folder, True, provider))
            await asyncio.sleep(0.05)
            write_atomic(folder, "arm.json", {"run_id": RUN})
            queued = snapshot(time.time())
            queued["rows"][0]["status"] = "queued"
            write_atomic(folder, "snapshot.json", queued)
            await asyncio.sleep(0.24)
            begin = time.monotonic()
            sample = snapshot(time.time())
            write_atomic(folder, "snapshot.json", sample)
            if failure is None:
                await asyncio.wait_for(task, timeout=1)
            else:
                with self.assertRaisesRegex(ValueError, failure):
                    await asyncio.wait_for(task, timeout=1)
            delay = time.monotonic() - begin
        print(f"SYNTHETIC_READY_TO_RESULT_SECONDS={delay:.3f} POLL_SECONDS={watcher.POLL_SECONDS:.3f}")
        self.assertLess(delay, 1)
        self.assertEqual(provider.binds, [CALL, CALL])
        self.assertEqual(len(provider.invocations), 1)
        self.assertIn('"stderr": "FAKE_REMOTE_STDERR"', output.getvalue())
        self.assertIn(f'"exit_status": {provider.exit_code}', output.getvalue())

    async def test_synthetic_poll_marker_and_single_fake_signal(self):
        await self.run_fixture(FakeProvider())

    async def test_nonzero_exit_is_loud_and_never_retried(self):
        await self.run_fixture(FakeProvider(exit_code=23), "No matching SIGKILL acknowledgment")

    async def test_zero_exit_without_signal_ack_is_failure(self):
        await self.run_fixture(FakeProvider(stdout_ok=False), "No matching SIGKILL acknowledgment")

    async def test_locked_and_missing_snapshots_do_not_stop_the_watcher(self):
        original_read = Path.read_text
        faults = [PermissionError("simulated Windows sharing violation"),
                  FileNotFoundError("simulated file replacement")]
        attempts = []

        def read(path, *args, **kwargs):
            if path.name == "snapshot.json":
                attempts.append(time.monotonic())
                if faults:
                    raise faults.pop(0)
            return original_read(path, *args, **kwargs)

        with TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()) as output:
            folder = Path(directory)
            with patch.object(Path, "read_text", read), patch.object(watcher, "SNAPSHOT_READ_RETRY", 0.15):
                task = asyncio.create_task(watcher.watch(folder, False))
                await asyncio.sleep(0.05)
                write_atomic(folder, "arm.json", {"run_id": RUN})
                deadline = time.monotonic() + 2
                while '"snapshot_read_unavailable"' not in output.getvalue() and time.monotonic() < deadline:
                    await asyncio.sleep(0.02)
                self.assertIn('"snapshot_read_unavailable"', output.getvalue())
                self.assertFalse(task.done(), "the watcher stopped after a missed hand-off")
                write_atomic(folder, "snapshot.json", snapshot(time.time()))
                await asyncio.wait_for(task, timeout=1)
        self.assertGreaterEqual(len(attempts), 3)
        self.assertGreaterEqual(attempts[1] - attempts[0], 0.045)
        self.assertIn('"DRY_RUN_NO_SIGNAL"', output.getvalue())


class LocalTransport(unittest.IsolatedAsyncioTestCase):
    async def test_real_local_subprocess_handshake_and_streams(self):
        import sys
        command = (
            "import sys; print('{\"event\":\"REMOTE_READY\"}', flush=True); "
            "assert input() == 'PROBE'; print('{\"event\":\"CPU_PROBE_STDOUT\"}', flush=True); "
            "print('CPU_PROBE_STDERR', file=sys.stderr, flush=True); sys.exit(7)"
        )
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-c", command, stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        class Writer:
            def write(self, value):
                process.stdin.write(value.encode())

            def write_eof(self):
                process.stdin.close()

            async def drain(self):
                await asyncio.sleep(0)

        async def standard_output():
            async for line in process.stdout:
                content = line.decode()
                yield content[:4]
                yield content[4:]

        async def authorize(value):
            self.assertEqual(value, {"event": "REMOTE_READY"})
            return "PROBE"

        adapter = SimpleNamespace(stdout=standard_output(), stdin=Writer())
        result = await asyncio.wait_for(asyncio.gather(
            process.wait(), watcher.read_remote_output(adapter, authorize), process.stderr.read()
        ), timeout=2)
        code, stdout, stderr = result
        self.assertEqual(code, 7)
        self.assertEqual([json.loads(line)["event"] for line in stdout.splitlines()],
                         ["REMOTE_READY", "CPU_PROBE_STDOUT"])
        self.assertEqual(stderr.strip(), b"CPU_PROBE_STDERR")
        print("LOCAL_TRANSPORT_HANDSHAKE_PASS exit=7 stderr=CPU_PROBE_STDERR")


if __name__ == "__main__":
    unittest.main(verbosity=2)
