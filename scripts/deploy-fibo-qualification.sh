set -euo pipefail
: "${MODAL_TOKEN_ID:?Missing qualification token ID}"
: "${MODAL_TOKEN_SECRET:?Missing qualification token secret}"
cli="${RUNNER_TEMP}/modal-cli/bin/python"
# Match provider read-back, not the local profile name or a user input.
if ! "$cli" -m modal token info 2>/dev/null | grep -Fx 'Workspace: faresmohamed260 (ac-88wJ5dCXYBOywnXXaGmUoV)' >/dev/null; then
  echo 'Modal credential does not resolve to the approved RenderLab workspace.'
  exit 1
fi
"$cli" -m modal secret list -e main --json | python3 -c '
import json, sys
names = {item.get("name") for item in json.load(sys.stdin)}
required = {"renderlab-fibo-native-gateway", "renderlab-generation-dispatcher", "renderlab-generation-worker"}
if not required.issubset(names):
    sys.exit("The dedicated gateway and dispatcher secrets must be provisioned first.")
'
export RENDERLAB_MODAL_ENVIRONMENT=main
export RENDERLAB_MODAL_MODEL_VOLUME=renderlab-fibo-models
export RENDERLAB_MODAL_GATEWAY_SECRET=renderlab-fibo-native-gateway
export RENDERLAB_MODAL_DISPATCHER_SECRET=renderlab-generation-dispatcher
export RENDERLAB_MODAL_WORKER_SECRET=renderlab-generation-worker
"$cli" -m modal deploy -e main workers/fibo-studio/modal_native_renderer.py
"$cli" -m modal deploy -e main workers/fibo-studio/modal_native_candidate.py
"$cli" -m modal app list -e main --json | python3 -c '
import json, sys
apps = {a.get("description"): a for a in json.load(sys.stdin) if a.get("state") == "deployed"}
expected = {"renderlab-image-generation", "renderlab-generation-gateway-candidate"}
if not expected.issubset(apps):
    sys.exit("Could not verify the exact deployed qualification gateway and image worker.")
print("Verified qualification apps:", *(apps[name]["app_id"] for name in sorted(expected)))
'
