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
if not any(item.get("name") == "renderlab-fibo-native-gateway" for item in json.load(sys.stdin)):
    sys.exit("The dedicated gateway signing secret must be provisioned first.")
'
"$cli" -m modal deploy -e main workers/fibo-studio/modal_native_candidate.py
"$cli" -m modal app list -e main --json | python3 -c '
import json, sys
apps = [a for a in json.load(sys.stdin) if a.get("description") == "renderlab-fibo-native-candidate" and a.get("state") == "deployed"]
if len(apps) != 1:
    sys.exit("Could not verify the exact deployed qualification gateway.")
print("Verified qualification app:", apps[0]["app_id"])
'
