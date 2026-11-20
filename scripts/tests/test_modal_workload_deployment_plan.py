import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "plan-modal-workload-deployment.py"


class ModalWorkloadDeploymentPlanTest(unittest.TestCase):
    def run_plan(self, workspace="ac-88wJ5dCXYBOywnXXaGmUoV", environment="qualification", extra=()):
        return subprocess.run([
            sys.executable, str(SCRIPT),
            "--workspace-id", workspace,
            "--environment", environment,
            "--gateway-secret", f"renderlab-gateway-{environment}",
            "--dispatcher-secret", f"renderlab-dispatcher-{environment}",
            "--worker-secret", f"renderlab-worker-{environment}",
            "--model-volume", f"renderlab-fibo-models-{environment}",
            *extra,
        ], capture_output=True, text=True, timeout=10)

    def test_prints_environment_local_commands_without_contacting_modal(self):
        result = self.run_plan()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("modal deploy -e qualification", result.stdout)
        self.assertIn("modal_native_renderer.py", result.stdout)
        self.assertIn("modal_native_production.py", result.stdout)
        self.assertNotIn("modal_video_generation.py", result.stdout)
        self.assertNotIn("modal_image_tools.py", result.stdout)
        self.assertNotIn("modal_video_tools.py", result.stdout)
        self.assertIn('"mutatesProvider": false', result.stdout)
        self.assertNotIn(" -e main ", result.stdout)

    def test_full_topology_includes_cpu_only_inactive_workloads(self):
        result = self.run_plan(environment="main", extra=("--include-inactive",))
        self.assertEqual(result.returncode, 0, result.stderr)
        plan = json.loads(result.stdout)
        self.assertEqual(len(plan["commands"]), 5)
        self.assertIn("renderlab-image-generation", plan["apps"])
        self.assertIn("renderlab-generation-gateway", plan["apps"])
        self.assertIn("renderlab-video-generation", plan["apps"])
        self.assertIn("renderlab-image-tools", plan["apps"])
        self.assertIn("renderlab-video-tools", plan["apps"])
        self.assertTrue(all("modal deploy -e main" in command for command in plan["commands"]))

    def test_rejects_wrong_workspace_and_unsafe_environment(self):
        self.assertNotEqual(self.run_plan(workspace="ac-other").returncode, 0)
        self.assertNotEqual(self.run_plan(environment="main; deploy").returncode, 0)

    def test_isolated_plan_requires_matching_provider_inventory(self):
        with TemporaryDirectory() as directory:
            inventory = Path(directory) / "readback.json"
            extra = ("--isolated", "--resource-readback", str(inventory))
            readback = {
                "workspaceId": "ac-88wJ5dCXYBOywnXXaGmUoV", "environment": "qualification",
                "secrets": [
                    "renderlab-gateway-qualification", "renderlab-dispatcher-qualification",
                    "renderlab-worker-qualification",
                ],
                "volumes": ["renderlab-fibo-models-qualification"],
            }
            inventory.write_text(json.dumps(readback), encoding="utf-8")
            approved = self.run_plan(extra=extra)
            self.assertEqual(approved.returncode, 0, approved.stderr)
            self.assertTrue(json.loads(approved.stdout)["validatedResourceReadback"])
            self.assertNotEqual(self.run_plan(environment="main", extra=extra).returncode, 0)
            self.assertNotEqual(self.run_plan(extra=("--isolated",)).returncode, 0)
            for invalid in (dict(readback, environment="main"), dict(readback, volumes=[])):
                inventory.write_text(json.dumps(invalid), encoding="utf-8")
                self.assertNotEqual(self.run_plan(extra=extra).returncode, 0)


if __name__ == "__main__":
    unittest.main()
