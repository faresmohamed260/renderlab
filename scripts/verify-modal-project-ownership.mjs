import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RENDERLAB_MODAL_ACCOUNT_LABELS,
  SAGA_MODAL_ACCOUNT_LABELS,
  readModalOwnershipManifest,
} from "./lib/modal-project-ownership.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = readModalOwnershipManifest();

if (manifest.ownedAccountLabels.length !== 8) {
  throw new Error("RenderLab must own exactly eight Modal accounts.");
}
if (
  SAGA_MODAL_ACCOUNT_LABELS.some((label) =>
    RENDERLAB_MODAL_ACCOUNT_LABELS.includes(label),
  )
) {
  throw new Error("Modal project allocations overlap.");
}

const workflowRoot = path.join(root, ".github", "workflows");
for (const name of fs.readdirSync(workflowRoot)) {
  if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
  if (name === "modal-project-isolation-patch.yml") continue;
  const text = fs.readFileSync(path.join(workflowRoot, name), "utf8");
  if (name === "fibo-qualification-deploy.yml") {
    const guards = [
      "workflow_dispatch:", "inputs.candidate_sha == github.sha", "github.ref == 'refs/heads/main'",
      "environment: fibo-qualification", "assertRenderLabModalAccount", "scripts/deploy-fibo-qualification.sh",
    ];
    const script = fs.readFileSync(path.join(root, "scripts", "deploy-fibo-qualification.sh"), "utf8");
    if (guards.some((guard) => !text.includes(guard))
      || /^  (push|pull_request|pull_request_target|schedule|workflow_run):/m.test(text)
      || !script.includes("ac-88wJ5dCXYBOywnXXaGmUoV")
      || !script.includes("deploy -e main workers/fibo-studio/modal_native_candidate.py")) {
      throw new Error("FIBO qualification deploy must remain manual and scoped to the approved workspace and app.");
    }
    continue;
  }
  if (/MODAL_TOKEN_ID|MODAL_TOKEN_SECRET|RENDERLAB_MODAL_TOKENS_JSON/.test(text)) {
    throw new Error(
      `Modal credential use requires an ownership-reviewed workflow; unexpected reference in ${name}.`,
    );
  }
}

console.log("RenderLab Modal project ownership boundary verified.");
