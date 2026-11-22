set -euo pipefail
: "${MODAL_TOKEN_ID:?Missing production token ID}"
: "${MODAL_TOKEN_SECRET:?Missing production token secret}"
: "${GITHUB_SHA:?Missing exact GitHub release SHA}"
cli="${RUNNER_TEMP}/modal-cli/bin/python"
if ! "$cli" -m modal token info 2>/dev/null | grep -Fx 'Workspace: faresmohamed260 (ac-88wJ5dCXYBOywnXXaGmUoV)' >/dev/null; then
  echo 'Modal credential does not resolve to the approved RenderLab workspace.'
  exit 1
fi
"$cli" -m modal secret list -e main --json | python3 -c '
import json, sys
names = {item["name"] for item in json.load(sys.stdin)}
required = {"renderlab-fibo-native-gateway", "renderlab-generation-dispatcher", "renderlab-generation-monitor", "renderlab-generation-worker"}
if not required.issubset(names):
    sys.exit("Required production app secrets are missing.")
'
export RENDERLAB_MODAL_ENVIRONMENT=main
export RENDERLAB_MODAL_MODEL_VOLUME=renderlab-fibo-models
export RENDERLAB_MODAL_GATEWAY_SECRET=renderlab-fibo-native-gateway
export RENDERLAB_MODAL_DISPATCHER_SECRET=renderlab-generation-dispatcher
export RENDERLAB_MODAL_MONITOR_SECRET=renderlab-generation-monitor
export RENDERLAB_MODAL_WORKER_SECRET=renderlab-generation-worker

renderer_id=ap-wS5WKruuipwssNGHf7Eo6k
gateway_id=ap-UfrkwIijsdz6xiGiQwtMlB

verify_apps() {
  "$cli" -m modal app list -e main --json | python3 -c '
import json, sys
apps = {a["description"]: a["app_id"] for a in json.load(sys.stdin) if a["state"] == "deployed"}
expected = dict(zip(("renderlab-image-generation", "renderlab-generation-gateway"), sys.argv[1:]))
if any(apps.get(name) != app_id for name, app_id in expected.items()):
    sys.exit("Exact production Modal app identity check failed.")
' "$renderer_id" "$gateway_id"
}

deploy_component() {
  local app_id="$1"
  local entrypoint="$2"
  local previous start end tag
  tag="${GITHUB_SHA:0:7}"
  previous=$("$cli" -m modal app history -e main "$app_id" --json | python3 -c '
import json, sys
print(json.load(sys.stdin)[0]["Version"])
')
  start=$(date +%s)
  "$cli" -m modal deploy -e main "$entrypoint" --tag "$tag"
  end=$(date +%s)
  "$cli" -m modal app history -e main "$app_id" --json | python3 -c '
from datetime import datetime
import json, sys

app_id, previous, sha, start, end = sys.argv[1:]
latest = json.load(sys.stdin)[0]
deployed_at = datetime.fromisoformat(latest["Time deployed"]).timestamp()
commit = latest.get("Commit")
if (latest["Version"] == previous or latest.get("Tag") != sha[:7]
        or (commit and not sha.startswith(commit))
        or not int(start) <= deployed_at < int(end) + 1):
    sys.exit(f"New Modal deployment history did not match the invocation for {app_id}.")
print(json.dumps({"appId": app_id, "releaseSha": sha, **latest}))
' "$app_id" "$previous" "$GITHUB_SHA" "$start" "$end"
}

verify_apps
deploy_component "$renderer_id" workers/fibo-studio/modal_native_renderer.py
deploy_component "$gateway_id" workers/fibo-studio/modal_native_production.py
verify_apps
