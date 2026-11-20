from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from native_comfy_session import JobFiles
from native_fibo_adapter import FiboAdapter
from workload_contract import FIBO_MODEL_KEY, FIBO_MODEL_VERSION, Operation, WorkRequest


def png(size=(256, 256), color="white"):
    from PIL import Image

    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="PNG")
    return buffer.getvalue()


class FakeSession:
    def __init__(self, *, escaped=False):
        self.escaped = escaped
        self.graph = None

    def run(self, stage, collect, attempt_id):
        with TemporaryDirectory(prefix="renderlab-adapter-test-") as directory:
            root = Path(directory)
            files = JobFiles("a" * 32, root / "input" / ("a" * 32), root / "output" / ("a" * 32))
            files.input.mkdir(parents=True)
            files.output.mkdir(parents=True)
            self.graph = stage(files)
            target = (root / "output" / "result.png") if self.escaped else (files.output / "result.png")
            target.write_bytes(png())
            subfolder = ".." if self.escaped else files.key
            record = {"outputs": {"output": {"images": [{"subfolder": subfolder, "filename": "result.png"}]}}}
            return collect(files, record)


class FiboAdapterTest(unittest.TestCase):
    def request(self, **payload):
        return WorkRequest(
            "attempt-1", FIBO_MODEL_KEY, FIBO_MODEL_VERSION, Operation.EDIT_IMAGE,
            {"prompt": "Edit", "seed": 7, "width": 256, "height": 256, "steps": 4,
             "negative_prompt": "", "vgl": "", "generate_vgl": False, **payload},
        )

    def test_stages_bounded_source_and_mask_inside_the_job_workspace(self):
        session = FakeSession()
        graph = {"output": {"inputs": {"filename_prefix": "RenderLab"}}}
        with patch("native_fibo_adapter.build_graph", return_value=graph) as build, \
             patch("native_fibo_adapter.normalize_mask_bytes", return_value=png(color="black")):
            result = FiboAdapter(session).execute(self.request(sources=[png()], mask=png(color="black")))

        self.assertEqual(result.attempt_id, "attempt-1")
        self.assertEqual(result.content_type, "image/png")
        self.assertTrue(result.content.startswith(bytes.fromhex("89504e470d0a1a0a")))
        options = build.call_args.kwargs
        self.assertRegex(options["images"][0], r"^[a-f0-9]{32}/[a-f0-9]{32}\.png$")
        self.assertRegex(options["mask"], r"^[a-f0-9]{32}/[a-f0-9]{32}\.png$")
        self.assertEqual(session.graph["output"]["inputs"]["filename_prefix"], "a" * 32 + "/RenderLab")

    def test_rejects_comfy_output_outside_the_job_directory(self):
        with patch("native_fibo_adapter.build_graph", return_value={"output": {"inputs": {}}}):
            with self.assertRaisesRegex(RuntimeError, "Unexpected FIBO output"):
                FiboAdapter(FakeSession(escaped=True)).execute(self.request(sources=[png()]))


if __name__ == "__main__":
    unittest.main()
