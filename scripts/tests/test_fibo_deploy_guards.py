"""Exercise FIBO deploy guards with fake CLI responses; never contact Modal."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy-fibo-qualification.sh"
BASH = shutil.which("bash")


@unittest.skipUnless(BASH and os.name != "nt", "Requires a POSIX shell and executable test fixture")
class FiboDeployGuards(unittest.TestCase):
    def run_case(self, scenario):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cli = root / "modal-cli" / "bin" / "python"
            cli.parent.mkdir(parents=True)
            cli.write_text("""#!/usr/bin/env bash
case "$*" in
  '-m modal token info')
    if [[ "$SCENARIO" = wrong-workspace ]]; then
      echo 'Workspace: other (ac-other)'
    else
      echo 'Workspace: faresmohamed260 (ac-88wJ5dCXYBOywnXXaGmUoV)'
    fi ;;
  '-m modal secret list -e main --json')
    if [[ "$SCENARIO" = missing-signing-secret ]]; then echo '[]'
    else echo '[{"Name":"renderlab-fibo-native-gateway"}]'; fi ;;
  '-m modal deploy -e main workers/fibo-studio/modal_native_candidate.py')
    touch "$RUNNER_TEMP/dispatched" ;;
  '-m modal app list -e main --json')
    if [[ "$SCENARIO" = absent-app ]]; then echo '[]'
    else echo '[{"Description":"renderlab-fibo-native-candidate","State":"deployed","App ID":"ap-fixture"}]'; fi ;;
  *) exit 99 ;;
esac
""", encoding="utf-8")
            cli.chmod(0o700)
            env = {**os.environ, "RUNNER_TEMP": directory, "SCENARIO": scenario,
                   "MODAL_TOKEN_ID": "fixture-id", "MODAL_TOKEN_SECRET": "fixture-secret"}
            if scenario == "missing-credential":
                env.pop("MODAL_TOKEN_SECRET")
            result = subprocess.run([BASH, str(SCRIPT)], env=env, capture_output=True, text=True, timeout=10)
            return result, (root / "dispatched").exists()

    def test_rejects_before_deployment(self):
        for scenario in ("missing-credential", "wrong-workspace", "missing-signing-secret"):
            with self.subTest(scenario=scenario):
                result, dispatched = self.run_case(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(dispatched)

    def test_verifies_deployment_readback(self):
        result, dispatched = self.run_case("absent-app")
        self.assertTrue(dispatched)
        self.assertNotEqual(result.returncode, 0)
        result, dispatched = self.run_case("success")
        self.assertTrue(dispatched)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ap-fixture", result.stdout)


if __name__ == "__main__":
    unittest.main()
