from pathlib import Path
import subprocess
import sys
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "plan-modal-workload-deployment.py"


class ModalWorkloadDeploymentPlanTest(unittest.TestCase):
    def run_plan(self, workspace="ac-88wJ5dCXYBOywnXXaGmUoV", environment="qualification"):
        return subprocess.run([
            sys.executable, str(SCRIPT),
            "--workspace-id", workspace,
            "--environment", environment,
            "--gateway-secret", f"renderlab-gateway-{environment}",
            "--dispatcher-secret", f"renderlab-dispatcher-{environment}",
            "--worker-secret", f"renderlab-worker-{environment}",
            "--model-volume", f"renderlab-fibo-models-{environment}",
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

    def test_rejects_wrong_workspace_and_unsafe_environment(self):
        self.assertNotEqual(self.run_plan(workspace="ac-other").returncode, 0)
        self.assertNotEqual(self.run_plan(environment="main; deploy").returncode, 0)


if __name__ == "__main__":
    unittest.main()
