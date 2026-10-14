import { readFile } from "node:fs/promises";
import path from "node:path";

export const EXTERNAL_FACT_REGISTRY_PATH = "docs/governance/external-facts.json";
export const DOCUMENT_METADATA_PATH = "docs/governance/documents.json";
export const EXTERNAL_FACT_MARKER_PATTERN = /<!--\s*EXTERNAL_FACT:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*-->/g;

function verificationInstant(value) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const instant = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

function markerIds(body) {
  return [...body.matchAll(new RegExp(EXTERNAL_FACT_MARKER_PATTERN.source, "g"))].map((match) => match[1]);
}

export function findExternalFactRegistryProblems({ registry, documentsRegistry, authorityBodies, now = new Date() }) {
  const problems = [];
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return [`${EXTERNAL_FACT_REGISTRY_PATH}: registry must be a JSON object`];
  }
  if (registry.schemaVersion !== 1) problems.push(`${EXTERNAL_FACT_REGISTRY_PATH}: schemaVersion must be 1`);
  if (!Array.isArray(registry.facts) || registry.facts.length === 0) {
    return [...problems, `${EXTERNAL_FACT_REGISTRY_PATH}: facts must be a non-empty array`];
  }

  const currentManagedPaths = new Set(
    (documentsRegistry?.documents || []).filter((document) => document.lifecycle === "current").map((document) => document.path),
  );
  const factsById = new Map();

  for (const [index, fact] of registry.facts.entries()) {
    const prefix = `${EXTERNAL_FACT_REGISTRY_PATH}: facts[${index}]`;
    if (!fact || typeof fact !== "object" || Array.isArray(fact)) {
      problems.push(`${prefix}: fact must be an object`);
      continue;
    }
    for (const field of ["id", "authority_path", "subject", "claim", "source", "verified_at"]) {
      if (typeof fact[field] !== "string" || fact[field].trim() === "") {
        problems.push(`${prefix}: ${field} must be a non-empty string`);
      }
    }
    if (typeof fact.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fact.id)) {
      problems.push(`${prefix}: id must be lowercase kebab-case`);
    }
    if (factsById.has(fact.id)) problems.push(`${prefix}: duplicate fact id ${fact.id}`);
    else factsById.set(fact.id, fact);

    if (typeof fact.authority_path === "string" && !currentManagedPaths.has(fact.authority_path)) {
      problems.push(`${prefix}: authority_path must reference a current managed document: ${fact.authority_path}`);
    }

    const verifiedAt = verificationInstant(fact.verified_at);
    if (!verifiedAt) {
      problems.push(`${prefix}: verified_at must be YYYY-MM-DD or an offset-aware ISO 8601 timestamp`);
    } else if (verifiedAt.getTime() > now.getTime()) {
      problems.push(`${prefix}: verified_at cannot be in the future`);
    }

    if (typeof fact.reverify_before_action !== "boolean") {
      problems.push(`${prefix}: reverify_before_action must be boolean`);
    }
    if (!Array.isArray(fact.action_contexts)) {
      problems.push(`${prefix}: action_contexts must be an array`);
    } else {
      if (fact.reverify_before_action === true && fact.action_contexts.length === 0) {
        problems.push(`${prefix}: reverify_before_action facts require at least one action_context`);
      }
      for (const [actionIndex, context] of fact.action_contexts.entries()) {
        if (typeof context !== "string" || context.trim() === "") {
          problems.push(`${prefix}: action_contexts[${actionIndex}] must be a non-empty string`);
        }
      }
      if (new Set(fact.action_contexts).size !== fact.action_contexts.length) {
        problems.push(`${prefix}: action_contexts must not contain duplicates`);
      }
    }

    if (fact.max_age_days !== undefined && fact.max_age_days !== null) {
      if (!Number.isInteger(fact.max_age_days) || fact.max_age_days < 1) {
        problems.push(`${prefix}: max_age_days must be null/omitted or a positive integer`);
      } else if (verifiedAt) {
        const ageMs = now.getTime() - verifiedAt.getTime();
        if (ageMs > fact.max_age_days * 24 * 60 * 60 * 1000) {
          problems.push(`${prefix}: verification is older than max_age_days=${fact.max_age_days}`);
        }
      }
    }
    if (fact.reverify_before_action !== true && (fact.max_age_days === undefined || fact.max_age_days === null)) {
      problems.push(`${prefix}: external facts require reverify_before_action=true or a bounded max_age_days`);
    }
  }

  const seenMarkers = new Map();
  for (const [documentPath, body] of authorityBodies.entries()) {
    for (const id of markerIds(body)) {
      if (!seenMarkers.has(id)) seenMarkers.set(id, []);
      seenMarkers.get(id).push(documentPath);
      const fact = factsById.get(id);
      if (!fact) {
        problems.push(`${documentPath}: EXTERNAL_FACT marker ${id} has no registry record`);
      } else if (fact.authority_path !== documentPath) {
        problems.push(`${documentPath}: EXTERNAL_FACT marker ${id} belongs to ${fact.authority_path}`);
      }
    }
  }

  for (const fact of registry.facts) {
    if (!fact || typeof fact.id !== "string") continue;
    const markers = seenMarkers.get(fact.id) || [];
    if (markers.length === 0) {
      problems.push(`${fact.id}: registry fact is missing <!-- EXTERNAL_FACT: ${fact.id} --> in ${fact.authority_path}`);
    } else if (markers.length > 1) {
      problems.push(`${fact.id}: EXTERNAL_FACT marker must appear exactly once; found ${markers.length}`);
    }
  }

  return problems;
}

export async function verifyExternalFactRegistry({ rootDir = process.cwd(), now = new Date() } = {}) {
  const [registryBody, documentsBody] = await Promise.all([
    readFile(path.join(rootDir, EXTERNAL_FACT_REGISTRY_PATH), "utf8"),
    readFile(path.join(rootDir, DOCUMENT_METADATA_PATH), "utf8"),
  ]);
  const registry = JSON.parse(registryBody.replace(/^\uFEFF/, ""));
  const documentsRegistry = JSON.parse(documentsBody.replace(/^\uFEFF/, ""));
  const currentPaths = documentsRegistry.documents.filter((document) => document.lifecycle === "current").map((document) => document.path);
  const authorityBodies = new Map(
    await Promise.all(currentPaths.map(async (documentPath) => [documentPath, await readFile(path.join(rootDir, documentPath), "utf8")])),
  );
  const problems = findExternalFactRegistryProblems({ registry, documentsRegistry, authorityBodies, now });
  if (problems.length > 0) {
    throw new Error(`External fact governance verification failed:\n- ${problems.join("\n- ")}`);
  }
  return {
    facts: registry.facts.length,
    reverifyBeforeAction: registry.facts.filter((fact) => fact.reverify_before_action === true).length,
  };
}
