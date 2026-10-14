import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCrossRepoModalOwnership } from "./lib/modal-cross-repo-ownership.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localManifestPath = path.join(root, "config", "modal-project-ownership.json");
const sagaManifestUrl = "https://raw.githubusercontent.com/faresmohamed260/saga/main/config/modal-project-ownership.json";

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Unable to read S.A.G.A. protected-main Modal ownership manifest: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

const renderLabManifest = JSON.parse(await fs.readFile(localManifestPath, "utf8"));
const sagaManifest = await fetchJsonWithRetry(sagaManifestUrl);
assertCrossRepoModalOwnership({ renderLabManifest, sagaManifest });
console.log("RenderLab/S.A.G.A. protected-main Modal ownership is reciprocal and complete.");
