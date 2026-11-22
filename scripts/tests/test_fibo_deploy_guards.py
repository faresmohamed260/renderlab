"""Exercise the production FIBO deployment script with a fake CLI."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy-fibo-production.sh"
BASH = shutil.which("bash")
SHA = "decd2f6b7a2a640806649c123b2ea5bb9e552aa0"


@unittest.skipUnless(BASH and os.name != "nt", "Requires a POSIX shell and executable test fixture")
class FiboDeployGuards(unittest.TestCase):
    def run_case(self, scenario):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cli = root / "modal-cli" / "bin" / "python"
            cli.parent.mkdir(parents=True)
            cli.write_text(r"""#!/usr/bin/env bash
case "$*" in
  '-m modal token info')
    if [[ "$SCENARIO" = wrong-workspace ]]; then
      echo 'Workspace: other (ac-other)'
    else
      echo 'Workspace: faresmohamed260 (ac-88wJ5dCXYBOywnXXaGmUoV)'
    fi ;;
  '-m modal secret list -e main --json')
    if [[ "$SCENARIO" = missing-signing-secret ]]; then echo '[]'
    else echo '[{"name":"renderlab-fibo-native-gateway"},{"name":"renderlab-generation-dispatcher"},{"name":"renderlab-generation-monitor"},{"name":"renderlab-generation-worker"}]'; fi ;;
  '-m modal app list -e main --json')
    if [[ "$SCENARIO" = wrong-app ]]; then echo '[]'
    else echo '[{"description":"renderlab-image-generation","state":"deployed","app_id":"ap-wS5WKruuipwssNGHf7Eo6k"},{"description":"renderlab-generation-gateway","state":"deployed","app_id":"ap-UfrkwIijsdz6xiGiQwtMlB"}]'; fi ;;
  '-m modal app history -e main '*)
    app_id="$7"
    if [[ "$SCENARIO" = stale-history || ! -f "$RUNNER_TEMP/$app_id" ]]; then
      echo '[{"version":"v8","time_deployed":"2026-01-01 00:00:00+00:00","commit":null,"tag":null}]'
    else
      printf '[{"version":"v9","time_deployed":"%s","commit":"decd2f6","tag":"decd2f6"}]\n' "$(cat "$RUNNER_TEMP/$app_id")"
    fi ;;
  '-m modal deploy -e main workers/fibo-studio/modal_native_renderer.py --tag decd2f6')
    date -u '+%Y-%m-%d %H:%M:%S+00:00' >"$RUNNER_TEMP/ap-wS5WKruuipwssNGHf7Eo6k" ;;
  '-m modal deploy -e main workers/fibo-studio/modal_native_production.py --tag decd2f6')
    date -u '+%Y-%m-%d %H:%M:%S+00:00' >"$RUNNER_TEMP/ap-UfrkwIijsdz6xiGiQwtMlB" ;;
  *) exit 99 ;;
esac
""", encoding="utf-8")
            cli.chmod(0o700)
            env = {
                **os.environ, "RUNNER_TEMP": directory, "SCENARIO": scenario,
                "GITHUB_SHA": SHA, "MODAL_TOKEN_ID": "fixture-id", "MODAL_TOKEN_SECRET": "fixture-secret",
            }
            if scenario == "missing-credential":
                env.pop("MODAL_TOKEN_SECRET")
            result = subprocess.run([BASH, str(SCRIPT)], env=env, capture_output=True, text=True, timeout=10)
            return result, (root / "ap-wS5WKruuipwssNGHf7Eo6k").exists(), (root / "ap-UfrkwIijsdz6xiGiQwtMlB").exists()

    def test_rejects_before_deployment(self):
        for scenario in ("missing-credential", "wrong-workspace", "missing-signing-secret", "wrong-app"):
            with self.subTest(scenario=scenario):
                result, renderer, gateway = self.run_case(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(renderer or gateway)

    def test_stale_renderer_history_stops_before_gateway(self):
        result, renderer, gateway = self.run_case("stale-history")
        self.assertTrue(renderer)
        self.assertFalse(gateway)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("deployment history", result.stderr)

    def test_verifies_both_app_history_entries(self):
        result, renderer, gateway = self.run_case("success")
        self.assertTrue(renderer and gateway)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"appId": "ap-wS5WKruuipwssNGHf7Eo6k"', result.stdout)
        self.assertIn('"appId": "ap-UfrkwIijsdz6xiGiQwtMlB"', result.stdout)


if __name__ == "__main__":
    unittest.main()
