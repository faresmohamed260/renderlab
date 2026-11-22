import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

from native_comfy_session import ComfySession, UncleanComfyWorker


class Interrupted(BaseException):
    pass


class ComfySessionTest(unittest.TestCase):
    def setUp(self):
        self.session = ComfySession("/comfy", "/models")
        self.current_prompt = None
        self.deleted = []
        self.jobs = []
        self.interrupt = None
        self.process = Mock()
        self.process.poll.side_effect = lambda: 0 if self.process.terminate.called else None
        self.addCleanup(self.session._reset)
        process_patch = patch("native_comfy_session.Popen", return_value=self.process)
        request_patch = patch.object(self.session, "_request", side_effect=self.request)
        self.start = process_patch.start()
        request_patch.start()
        self.addCleanup(process_patch.stop)
        self.addCleanup(request_patch.stop)

    def request(self, path, payload=None):
        if path == "/system_stats":
            return {"system": {}}
        if path == "/queue":
            return {"queue_running": [], "queue_pending": []}
        if path == "/prompt":
            self.current_prompt = str(uuid4())
            return {"prompt_id": self.current_prompt}
        if path == "/history":
            self.deleted.extend(payload["delete"])
            return None
        if path == "/history/" + self.current_prompt:
            if self.interrupt is not None:
                raise self.interrupt
            return {self.current_prompt: {"status": {"status_str": "success"}}}
        self.fail(f"Unexpected ComfyUI method: {path}")

    def stage(self, files):
        self.jobs.append(files)
        (files.input / "fixture.png").write_bytes(b"fixture")
        return {}

    def collect(self, files, record):
        self.assertEqual(record["status"]["status_str"], "success")
        (files.output / "result.png").write_bytes(b"test-image")
        return files.key

    def test_success_reuses_process_and_removes_each_job_and_history(self):
        first = self.session.run(self.stage, self.collect, "first")
        second = self.session.run(self.stage, self.collect, "second")

        self.assertNotEqual(first, second)
        self.start.assert_called_once()
        self.assertFalse(self.process.terminate.called)
        self.assertEqual(len(set(self.deleted)), 2)
        for files in self.jobs:
            self.assertFalse(files.input.exists())
            self.assertFalse(files.output.exists())
        self.assertEqual(list((self.jobs[0].input.parent).iterdir()), [])
        temp = self.jobs[0].input.parent.parent / "temp"
        self.assertTrue(temp.is_dir())
        self.assertEqual(list(temp.iterdir()), [])

    def test_interruption_reaps_process_before_a_new_job(self):
        self.interrupt = Interrupted()
        with self.assertRaises(Interrupted):
            self.session.run(self.stage, self.collect, "cancelled")

        self.process.terminate.assert_called_once()
        self.process.wait.assert_called_once()
        self.assertFalse(self.jobs[0].output.parent.exists())
        replacement = Mock()
        replacement.poll.return_value = None
        self.start.return_value = replacement
        self.interrupt = None
        self.session.run(self.stage, self.collect, "next")
        self.assertEqual(self.start.call_count, 2)
        self.assertEqual(len(self.deleted), 1)

    def test_unclean_workspace_blocks_reuse(self):
        with patch("native_comfy_session.shutil.rmtree", side_effect=PermissionError("busy")):
            with self.assertRaises(UncleanComfyWorker) as error:
                self.session.run(self.stage, self.collect, "failed")
        self.assertTrue(error.exception.recycle_required)
        self.process.terminate.assert_called_once()
        # This test stays in Python after the renderer would have recycled.
        with self.assertRaises(UncleanComfyWorker) as reset:
            self.session._reset()
        self.assertFalse(reset.exception.recycle_required)
