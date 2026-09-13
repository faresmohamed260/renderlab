import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const manifestPath = path.join(root, "config", "modal-project-ownership.json");
const expectedRenderLabLabels = [
  "modal-01",
  "modal-02",
  "modal-42",
  "modal-43",
  "modal-44",
  "modal-45",
  "modal-46",
  "modal-47",
];
const expectedSagaLabels = Array.from(
  { length: 39 },
  (_, index) => `modal-${String(index + 3).padStart(2, "0")}`,
);

export function readModalOwnershipManifest() {
  const payload = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (payload.project !== "renderlab") {
    throw new Error("Modal ownership manifest is not owned by RenderLab.");
  }
  if (JSON.stringify(payload.ownedAccountLabels) !== JSON.stringify(expectedRenderLabLabels)) {
    throw new Error(
      "RenderLab Modal ownership must be exactly modal-01, modal-02, and modal-42 through modal-47.",
    );
  }
  if (
    JSON.stringify(payload.reservedForOtherProjects?.saga) !==
    JSON.stringify(expectedSagaLabels)
  ) {
    throw new Error("Saga Modal reservation must be exactly modal-03 through modal-41.");
  }
  return payload;
}

export function assertRenderLabModalAccount(label) {
  const manifest = readModalOwnershipManifest();
  if (!manifest.ownedAccountLabels.includes(label)) {
    throw new Error(
      `Modal account ${label} is not owned by RenderLab; refusing credential selection.`,
    );
  }
  return label;
}

export function filterRenderLabModalRoster(rows) {
  if (!Array.isArray(rows)) throw new Error("Modal roster must be an array.");
  const manifest = readModalOwnershipManifest();
  const byLabel = new Map();
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const label = String(
      row.label || row.name || row.account || `modal-${String(index + 1).padStart(2, "0")}`,
    ).trim();
    if (byLabel.has(label)) {
      throw new Error(`Duplicate Modal account label in roster: ${label}`);
    }
    byLabel.set(label, row);
  });
  const missing = manifest.ownedAccountLabels.filter((label) => !byLabel.has(label));
  if (missing.length) {
    throw new Error(`RenderLab Modal roster is missing owned accounts: ${missing.join(", ")}`);
  }
  return manifest.ownedAccountLabels.map((label) => byLabel.get(label));
}

export const RENDERLAB_MODAL_ACCOUNT_LABELS = Object.freeze([...expectedRenderLabLabels]);
export const SAGA_MODAL_ACCOUNT_LABELS = Object.freeze([...expectedSagaLabels]);
