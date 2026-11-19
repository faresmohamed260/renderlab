set -euo pipefail
: "${MODAL_TOKEN_ID:?Missing production token ID}"
: "${MODAL_TOKEN_SECRET:?Missing production token secret}"
cli="${RUNNER_TEMP}/modal-cli/bin/python"
if ! "$cli" -m modal token info 2>/dev/null | grep -Fx 'Workspace: faresmohamed260 (ac-88wJ5dCXYBOywnXXaGmUoV)' >/dev/null; then
  echo 'Modal credential does not resolve to the approved RenderLab workspace.'
  exit 1
fi
"$cli" -m modal secret list -e main --json | python3 -c '
import json, sys
if not any(item.get("name") == "renderlab-fibo-native-gateway" for item in json.load(sys.stdin)):
    sys.exit("The gateway signing secret must be provisioned first.")
'
export RENDERLAB_MODAL_ENVIRONMENT=main
export RENDERLAB_MODAL_MODEL_VOLUME=renderlab-fibo-models
export RENDERLAB_MODAL_GATEWAY_SECRET=renderlab-fibo-native-gateway
"$cli" -m modal deploy -e main workers/fibo-studio/modal_native_renderer.py
"$cli" -m modal deploy -e main workers/fibo-studio/modal_native_production.py
"$cli" -m modal app list -e main --json | python3 -c '
import json, sys
apps = {a.get("description"): a for a in json.load(sys.stdin) if a.get("state") == "deployed"}
expected = {"renderlab-image-generation", "renderlab-generation-gateway"}
if not expected.issubset(apps):
    sys.exit("Could not verify the exact deployed production gateway and image worker.")
print("Verified production apps:", *(apps[name]["app_id"] for name in sorted(expected)))
'
