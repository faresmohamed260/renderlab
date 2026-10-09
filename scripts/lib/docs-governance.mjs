import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import {
  readProductionManifest,
  verifyProductionDocumentationSync,
} from "./production-documentation-sync.mjs";

export const DOCUMENT_METADATA_PATH = "docs/governance/documents.json";
export const DOCUMENT_METADATA_SCHEMA_PATH = "docs/governance/document-metadata.schema.json";

export const REQUIRED_MANAGED_DOCUMENTS = Object.freeze([
  "AGENTS.md",
  "PROJECT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "docs/INDEX.md",
  "docs/STATUS.md",
  "docs/architecture/INFRASTRUCTURE.md",
  "docs/architecture/FRONTEND_ARCHITECTURE.md",
  "docs/architecture/PRODUCT_CAPABILITIES.md",
  "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
  "docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md",
  "docs/ui/UI_MIGRATION.md",
  "docs/ui/SCREEN_REGISTRY.md",
  "docs/ui/COMPONENT_CATALOG.md",
  "docs/ui/UI_DECISIONS.md",
  "docs/ui/UI_SYSTEM.md",
  "docs/ui/DESIGN_WORKFLOW.md",
  "docs/ui/VISUAL_NORTH_STAR.md",
  "docs/ui/BRAND_SYSTEM.md",
  "docs/ui/CREATIVE_DEVELOPMENT.md",
]);

export const STRUCTURED_STATUS_ENUMS = Object.freeze({
  Execution: Object.freeze(["PLANNED", "IN PROGRESS", "IMPLEMENTED", "COMPLETE", "DEFERRED", "SUPERSEDED", "CANCELLED"]),
  Repository: Object.freeze(["UNMERGED", "MERGED"]),
  Deployment: Object.freeze(["NOT DEPLOYED", "PRODUCTION-LIVE", "NOT APPLICABLE"]),
  "UI maturity": Object.freeze(["PLANNED", "UNAUDITED", "MIGRATING", "APPROVED", "LOCKED"]),
});

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function parseJsonText(text, source) {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error(`${source}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readJson(rootDir, repoPath) {
  return parseJsonText(await readFile(path.join(rootDir, repoPath), "utf8"), repoPath);
}

function utcDateStart(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return Number.NaN;
  const timestamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return Number.NaN;
  }
  return timestamp;
}

function todayUtcStart(now) {
  const date = now instanceof Date ? now : new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function assertSchemaValue(entry, key, propertySchema, problems) {
  const value = entry[key];
  if (propertySchema.enum && !propertySchema.enum.includes(value)) {
    problems.push(`${entry.path || "<unknown>"}: ${key} must be one of ${propertySchema.enum.join(", ")}; found ${JSON.stringify(value)}`);
  }
  if (propertySchema.type === "string" && typeof value !== "string") {
    problems.push(`${entry.path || "<unknown>"}: ${key} must be a string`);
  }
  if (Array.isArray(propertySchema.type)) {
    const allowed = propertySchema.type;
    const valid = (value === null && allowed.includes("null")) || (Number.isInteger(value) && allowed.includes("integer"));
    if (!valid) problems.push(`${entry.path || "<unknown>"}: ${key} has an invalid type`);
  }
  if (propertySchema.type === "array" && !Array.isArray(value)) {
    problems.push(`${entry.path || "<unknown>"}: ${key} must be an array`);
  }
}

export async function validateDocumentMetadata({ registry, schema, rootDir = process.cwd(), now = new Date() }) {
  const problems = [];
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new Error("Documentation metadata registry must be an object.");
  }
  if (registry.$schema !== `./${path.basename(DOCUMENT_METADATA_SCHEMA_PATH)}`) {
    problems.push(`metadata registry $schema must be ./${path.basename(DOCUMENT_METADATA_SCHEMA_PATH)}`);
  }
  if (registry.schemaVersion !== 1) problems.push("metadata registry schemaVersion must be 1");
  for (const key of Object.keys(registry)) {
    if (!["$schema", "schemaVersion", "documents"].includes(key)) problems.push(`metadata registry contains unknown top-level field ${key}`);
  }
  if (!Array.isArray(registry.documents) || registry.documents.length === 0) {
    problems.push("metadata registry documents must be a non-empty array");
  }

  const documentSchema = schema?.$defs?.document;
  if (!documentSchema || !Array.isArray(documentSchema.required) || !documentSchema.properties) {
    problems.push(`${DOCUMENT_METADATA_SCHEMA_PATH}: missing $defs.document schema contract`);
    return problems;
  }

  const entries = Array.isArray(registry.documents) ? registry.documents : [];
  const byPath = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push("metadata registry contains a non-object document entry");
      continue;
    }
    const keys = Object.keys(entry);
    for (const required of documentSchema.required) {
      if (!Object.hasOwn(entry, required)) problems.push(`${entry.path || "<unknown>"}: missing metadata field ${required}`);
    }
    if (documentSchema.additionalProperties === false) {
      for (const key of keys) {
        if (!Object.hasOwn(documentSchema.properties, key)) problems.push(`${entry.path || "<unknown>"}: unknown metadata field ${key}`);
      }
    }
    for (const [key, propertySchema] of Object.entries(documentSchema.properties)) {
      if (Object.hasOwn(entry, key)) assertSchemaValue(entry, key, propertySchema, problems);
    }

    if (Number.isInteger(entry.reviewIntervalDays) && (entry.reviewIntervalDays < 1 || entry.reviewIntervalDays > 365)) {
      problems.push(`${entry.path || "<unknown>"}: reviewIntervalDays must be between 1 and 365 when set`);
    }

    if (typeof entry.path !== "string" || entry.path.length === 0) continue;
    const repoPath = normalizeRepoPath(entry.path);
    if (repoPath !== entry.path) problems.push(`${entry.path}: metadata path must use normalized repository separators`);
    if (byPath.has(repoPath)) problems.push(`${repoPath}: duplicate metadata entry`);
    byPath.set(repoPath, entry);

    try {
      const info = await stat(path.join(rootDir, repoPath));
      if (!info.isFile()) problems.push(`${repoPath}: metadata path is not a file`);
    } catch {
      problems.push(`${repoPath}: metadata path does not exist`);
    }

    const reviewedAt = utcDateStart(entry.lastReviewed);
    if (!Number.isFinite(reviewedAt)) problems.push(`${repoPath}: lastReviewed must be a real YYYY-MM-DD date`);
    if (entry.lifecycle === "current") {
      if (!Number.isInteger(entry.reviewIntervalDays) || entry.reviewIntervalDays < 1 || entry.reviewIntervalDays > 365) {
        problems.push(`${repoPath}: current documents require reviewIntervalDays between 1 and 365`);
      } else if (Number.isFinite(reviewedAt)) {
        const today = todayUtcStart(now);
        if (reviewedAt > today) problems.push(`${repoPath}: lastReviewed cannot be in the future`);
        const ageDays = Math.floor((today - reviewedAt) / 86_400_000);
        if (ageDays > entry.reviewIntervalDays) {
          problems.push(`${repoPath}: governance review is stale (${ageDays} days > ${entry.reviewIntervalDays}-day policy)`);
        }
      }
      if (entry.authority === "historical") problems.push(`${repoPath}: current documents cannot use historical authority`);
      if (Array.isArray(entry.supersededBy) && entry.supersededBy.length > 0) {
        problems.push(`${repoPath}: current documents cannot be supersededBy another document`);
      }
    }
    if (entry.lifecycle === "superseded" && entry.authority !== "historical") {
      problems.push(`${repoPath}: superseded documents must use historical authority`);
    }
    for (const arrayKey of ["supersedes", "supersededBy"]) {
      if (!Array.isArray(entry[arrayKey])) continue;
      if (new Set(entry[arrayKey]).size !== entry[arrayKey].length) problems.push(`${repoPath}: ${arrayKey} contains duplicates`);
      if (entry[arrayKey].includes(repoPath)) problems.push(`${repoPath}: ${arrayKey} cannot reference itself`);
    }
  }

  for (const requiredPath of REQUIRED_MANAGED_DOCUMENTS) {
    if (!byPath.has(requiredPath)) problems.push(`${DOCUMENT_METADATA_PATH}: missing required managed document ${requiredPath}`);
  }

  for (const [repoPath, entry] of byPath) {
    for (const targetPath of entry.supersedes || []) {
      const target = byPath.get(targetPath);
      if (!target) {
        problems.push(`${repoPath}: supersedes unknown metadata document ${targetPath}`);
        continue;
      }
      if (!(target.supersededBy || []).includes(repoPath)) {
        problems.push(`${repoPath}: supersedes ${targetPath}, but reciprocal supersededBy is missing`);
      }
      if (!new Set(["superseded", "historical"]).has(target.lifecycle)) {
        problems.push(`${repoPath}: superseded target ${targetPath} must be historical or superseded`);
      }
    }
    for (const sourcePath of entry.supersededBy || []) {
      const source = byPath.get(sourcePath);
      if (!source) {
        problems.push(`${repoPath}: supersededBy references unknown metadata document ${sourcePath}`);
        continue;
      }
      if (!(source.supersedes || []).includes(repoPath)) {
        problems.push(`${repoPath}: supersededBy ${sourcePath}, but reciprocal supersedes is missing`);
      }
    }
  }

  return problems;
}

function statusPrefix(value, allowed) {
  const normalized = value.trim().replace(/^`|`$/g, "");
  for (const candidate of [...allowed].sort((a, b) => b.length - a.length)) {
    if (normalized === candidate) return { candidate, rest: "" };
    if (normalized.startsWith(`${candidate} `)) return { candidate, rest: normalized.slice(candidate.length).trim() };
  }
  return null;
}

export function findStructuredStatusProblems(documents) {
  const problems = [];
  for (const document of documents) {
    for (const [lineIndex, originalLine] of document.body.split(/\r?\n/).entries()) {
      const line = originalLine.replace(/\*\*/g, "").replace(/`/g, "");
      for (const [label, allowed] of Object.entries(STRUCTURED_STATUS_ENUMS)) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\s*(?::|=)\\s*([^;.]+)`, "g");
        for (const match of line.matchAll(regex)) {
          const rawValue = match[1].trim();
          if (!rawValue || /^[,)]/.test(rawValue)) continue;
          const parsed = statusPrefix(rawValue, allowed);
          if (!parsed || parsed.rest.startsWith("/")) {
            problems.push(`${document.path}:${lineIndex + 1}: ${label} uses unknown/non-canonical value ${JSON.stringify(match[1].trim())}`);
          }
        }
      }
    }
  }
  return problems;
}

function parseUiDecisionRecords(body) {
  const starts = [...body.matchAll(/^###\s+(UI-\d+)\s+.+$/gm)];
  const records = new Map();
  for (const [index, start] of starts.entries()) {
    const end = index + 1 < starts.length ? starts[index + 1].index : body.length;
    const block = body.slice(start.index, end);
    const field = (name) => {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return block.match(new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*(.+?)\\s*$`, "mi"))?.[1]?.trim() || "";
    };
    records.set(start[1], {
      id: start[1],
      status: field("Status"),
      supersedes: [...field("Supersedes").matchAll(/UI-\d+/g)].map((match) => match[0]),
      supersededBy: [...field("Superseded by").matchAll(/UI-\d+/g)].map((match) => match[0]),
    });
  }
  return records;
}

export function findUiDecisionSupersessionProblems(body) {
  const problems = [];
  const records = parseUiDecisionRecords(body);
  for (const record of records.values()) {
    if (record.status === "Superseded" && record.supersededBy.length === 0) {
      problems.push(`${record.id}: Status Superseded requires an explicit Superseded by field`);
    }
    if (record.status === "Accepted" && record.supersededBy.length > 0) {
      problems.push(`${record.id}: Accepted decisions cannot also declare Superseded by`);
    }
    for (const targetId of record.supersedes) {
      const target = records.get(targetId);
      if (!target) {
        problems.push(`${record.id}: Supersedes references unknown decision ${targetId}`);
        continue;
      }
      if (!target.supersededBy.includes(record.id)) {
        problems.push(`${record.id}: Supersedes ${targetId}, but ${targetId} does not reciprocally declare Superseded by ${record.id}`);
      }
    }
    for (const sourceId of record.supersededBy) {
      const source = records.get(sourceId);
      if (!source) {
        problems.push(`${record.id}: Superseded by references unknown decision ${sourceId}`);
        continue;
      }
      if (!source.supersedes.includes(record.id)) {
        problems.push(`${record.id}: Superseded by ${sourceId}, but ${sourceId} does not reciprocally declare Supersedes ${record.id}`);
      }
    }
  }
  return problems;
}

export function findClosedContractUncheckedBoxProblems(documents) {
  const problems = [];
  for (const document of documents) {
    if (!/(?:CONTRACT|IMPLEMENTATION_CONTRACT).*\.md$/i.test(document.path)) continue;
    const closed = /(?:^|\n)(?:#{1,6}\s+[^\n]*closure|\*\*Status:\*\*[^\n]*(?:COMPLETE|CLOSED)|Status:[^\n]*(?:COMPLETE|CLOSED)|[^\n]*Execution\s*(?::|=)\s*`?COMPLETE`?)/i.test(document.body);
    if (!closed) continue;
    for (const [lineIndex, line] of document.body.split(/\r?\n/).entries()) {
      if (/^\s*[-*]\s*\[\s\]/.test(line)) problems.push(`${document.path}:${lineIndex + 1}: closed contract contains an unchecked task box`);
    }
  }
  return problems;
}

export function findDuplicateCurrentSectionProblems(documents) {
  const problems = [];
  for (const document of documents) {
    if (document.path.startsWith("docs/archive/")) continue;
    const seen = new Map();
    for (const [lineIndex, line] of document.body.split(/\r?\n/).entries()) {
      const match = /^##\s+(Current\b.+)$/i.exec(line);
      if (!match) continue;
      const normalized = match[1]
        .replace(/\s+[—-]\s+\d{4}-\d{2}-\d{2}.*$/, "")
        .trim()
        .toLowerCase();
      if (seen.has(normalized)) {
        problems.push(`${document.path}:${lineIndex + 1}: duplicate current H2 ${JSON.stringify(normalized)}; first seen at line ${seen.get(normalized)}`);
      } else {
        seen.set(normalized, lineIndex + 1);
      }
    }
  }
  return problems;
}

function localReferenceTarget(documentPath, rawTarget) {
  let target = rawTarget.trim();
  if (!target || /^(?:https?:|mailto:|data:|#)/i.test(target)) return null;
  if (target.startsWith("<") && target.includes(">")) target = target.slice(1, target.indexOf(">"));
  else target = target.split(/\s+/)[0];
  target = target.split("#")[0].split("?")[0];
  if (!target || /[*?{}<>]/.test(target)) return null;
  try {
    target = decodeURIComponent(target);
  } catch {
    return { invalid: true, target };
  }
  if (target.startsWith("/")) return null;
  return normalizeRepoPath(path.posix.normalize(path.posix.join(path.posix.dirname(documentPath), target)));
}

export async function findBrokenDocumentationReferenceProblems(documents, { rootDir = process.cwd() } = {}) {
  const problems = [];
  const seen = new Set();
  async function check(documentPath, lineNumber, rawTarget) {
    const key = `${documentPath}:${lineNumber}:${rawTarget}`;
    if (seen.has(key)) return;
    seen.add(key);
    const resolved = localReferenceTarget(documentPath, rawTarget);
    if (!resolved) return;
    if (typeof resolved === "object" && resolved.invalid) {
      problems.push(`${documentPath}:${lineNumber}: invalid encoded documentation reference ${JSON.stringify(rawTarget)}`);
      return;
    }
    try {
      await stat(path.join(rootDir, resolved));
    } catch {
      problems.push(`${documentPath}:${lineNumber}: broken documentation reference ${JSON.stringify(rawTarget)} -> ${resolved}`);
    }
  }

  for (const document of documents) {
    const lines = document.body.split(/\r?\n/);
    for (const [lineIndex, line] of lines.entries()) {
      for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) await check(document.path, lineIndex + 1, match[1]);
      for (const match of line.matchAll(/`((?:docs\/|AGENTS\.md|PROJECT\.md|README\.md|SECURITY\.md|CONTRIBUTING\.md)[^`\n]*?\.md(?:#[^`\n]*)?)`/g)) {
        const repoTarget = match[1].split("#")[0];
        if (/[*?{}<>]/.test(repoTarget)) continue;
        try {
          await stat(path.join(rootDir, repoTarget));
        } catch {
          problems.push(`${document.path}:${lineIndex + 1}: broken repository documentation reference ${JSON.stringify(match[1])}`);
        }
      }
    }
  }
  return problems;
}

function trackedMarkdownPaths(rootDir) {
  const output = execFileSync("git", ["ls-files"], { cwd: rootDir, encoding: "utf8" });
  return output
    .split(/\r?\n/)
    .map((value) => normalizeRepoPath(value.trim()))
    .filter((value) => value.endsWith(".md"));
}

async function readDocuments(rootDir, paths) {
  return Promise.all(paths.map(async (repoPath) => ({ path: repoPath, body: await readFile(path.join(rootDir, repoPath), "utf8") })));
}

export async function verifyDocsGovernance({ rootDir = process.cwd(), now = new Date() } = {}) {
  const registry = await readJson(rootDir, DOCUMENT_METADATA_PATH);
  const schema = await readJson(rootDir, DOCUMENT_METADATA_SCHEMA_PATH);
  const metadataProblems = await validateDocumentMetadata({ registry, schema, rootDir, now });
  const markdownPaths = trackedMarkdownPaths(rootDir);
  const documents = await readDocuments(rootDir, markdownPaths);
  const byPath = new Map(documents.map((document) => [document.path, document]));
  const currentManagedDocuments = registry.documents
    .filter((entry) => entry.lifecycle === "current" && entry.path.endsWith(".md"))
    .map((entry) => byPath.get(entry.path))
    .filter(Boolean);

  const problems = [
    ...metadataProblems,
    ...findStructuredStatusProblems(currentManagedDocuments),
    ...findUiDecisionSupersessionProblems(byPath.get("docs/ui/UI_DECISIONS.md")?.body || ""),
    ...findClosedContractUncheckedBoxProblems(documents),
    ...findDuplicateCurrentSectionProblems(documents),
    ...(await findBrokenDocumentationReferenceProblems(documents, { rootDir })),
  ];

  try {
    const manifest = await readProductionManifest(rootDir);
    await verifyProductionDocumentationSync({ expectedSha: manifest.applicationSha, rootDir });
  } catch (error) {
    problems.push(`production manifest consistency: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (problems.length > 0) {
    throw new Error(`Documentation governance verification failed:\n- ${problems.join("\n- ")}`);
  }

  return {
    managedDocuments: registry.documents.length,
    markdownDocuments: documents.length,
    currentManagedDocuments: currentManagedDocuments.length,
  };
}
