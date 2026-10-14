import { readFile } from "node:fs/promises";
import path from "node:path";

export const COMPONENT_SOURCE_REGISTRY_PATH = "docs/ui/component-sources.json";
export const COMPONENT_CATALOG_PATH = "docs/ui/COMPONENT_CATALOG.md";

const SOURCE_TIERS = new Set(["foundation", "motion", "specialized", "icons", "discovery"]);
const POLICY_STATUSES = new Set(["approved", "discovery-only"]);
const ADOPTION_MODES = new Set(["package-dependency", "copy-owned", "per-adoption-review"]);
const LICENSE_STATUSES = new Set(["lockfile-verified", "review-required-per-adoption"]);

function externalSourceHeadings(catalogBody) {
  const start = catalogBody.indexOf("## Approved External Sources");
  const end = catalogBody.indexOf("## External Source Search Order");
  if (start === -1 || end === -1 || end <= start) return [];
  return [...catalogBody.slice(start, end).matchAll(/^###\s+(.+?)\s*$/gm)].map((match) => match[1].trim());
}

function externalSourceSearchItems(catalogBody) {
  const start = catalogBody.indexOf("## External Source Search Order");
  const end = catalogBody.indexOf("## Adoption Checklist");
  if (start === -1 || end === -1 || end <= start) return new Map();
  return new Map(
    [...catalogBody.slice(start, end).matchAll(/^(\d+)\.\s+(.+?)\s*$/gm)].map((match) => [Number(match[1]), match[2].trim()]),
  );
}

function packageVersion(packageJson, packageName) {
  return packageJson.dependencies?.[packageName] ?? packageJson.devDependencies?.[packageName] ?? null;
}

export function findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody }) {
  const problems = [];
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return [`${COMPONENT_SOURCE_REGISTRY_PATH}: registry must be a JSON object`];
  }
  if (registry.schemaVersion !== 1) problems.push(`${COMPONENT_SOURCE_REGISTRY_PATH}: schemaVersion must be 1`);
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    return [...problems, `${COMPONENT_SOURCE_REGISTRY_PATH}: sources must be a non-empty array`];
  }

  const catalogHeadings = externalSourceHeadings(catalogBody);
  const catalogHeadingSet = new Set(catalogHeadings);
  const catalogSearchItems = externalSourceSearchItems(catalogBody);
  const coveredCatalogHeadings = new Set();
  const sourceIds = new Set();
  const packageNames = new Set();
  const searchOrders = new Set();

  for (const [index, source] of registry.sources.entries()) {
    const prefix = `${COMPONENT_SOURCE_REGISTRY_PATH}: sources[${index}]`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      problems.push(`${prefix}: source must be an object`);
      continue;
    }

    for (const field of ["id", "name", "catalogHeading", "tier", "policyStatus", "adoptionMode", "licenseStatus"]) {
      if (typeof source[field] !== "string" || source[field].trim() === "") {
        problems.push(`${prefix}: ${field} must be a non-empty string`);
      }
    }
    if (typeof source.activeUse !== "boolean") problems.push(`${prefix}: activeUse must be boolean`);
    if (source.searchOrder !== null && (!Number.isInteger(source.searchOrder) || source.searchOrder < 1)) {
      problems.push(`${prefix}: searchOrder must be null or a positive integer`);
    } else if (Number.isInteger(source.searchOrder)) {
      searchOrders.add(source.searchOrder);
      if (typeof source.searchLabel !== "string" || source.searchLabel.trim() === "") {
        problems.push(`${prefix}: numbered search source requires a non-empty searchLabel`);
      } else {
        const catalogSearchItem = catalogSearchItems.get(source.searchOrder);
        if (!catalogSearchItem) {
          problems.push(`${prefix}: searchOrder ${source.searchOrder} does not exist in ${COMPONENT_CATALOG_PATH}`);
        } else if (!catalogSearchItem.includes(source.searchLabel)) {
          problems.push(
            `${prefix}: searchLabel ${source.searchLabel} does not match ${COMPONENT_CATALOG_PATH} item ${source.searchOrder}: ${catalogSearchItem}`,
          );
        }
      }
    }
    if (source.searchOrder === null && source.searchLabel !== null) {
      problems.push(`${prefix}: source outside the numbered search order requires searchLabel=null`);
    }

    if (sourceIds.has(source.id)) problems.push(`${prefix}: duplicate source id ${source.id}`);
    sourceIds.add(source.id);
    if (!SOURCE_TIERS.has(source.tier)) problems.push(`${prefix}: unknown tier ${source.tier}`);
    if (!POLICY_STATUSES.has(source.policyStatus)) problems.push(`${prefix}: unknown policyStatus ${source.policyStatus}`);
    if (!ADOPTION_MODES.has(source.adoptionMode)) problems.push(`${prefix}: unknown adoptionMode ${source.adoptionMode}`);
    if (!LICENSE_STATUSES.has(source.licenseStatus)) problems.push(`${prefix}: unknown licenseStatus ${source.licenseStatus}`);

    if (!catalogHeadingSet.has(source.catalogHeading)) {
      problems.push(`${prefix}: catalogHeading does not exist in ${COMPONENT_CATALOG_PATH}: ${source.catalogHeading}`);
    } else {
      coveredCatalogHeadings.add(source.catalogHeading);
    }

    if (source.adoptionMode === "package-dependency") {
      if (typeof source.packageName !== "string" || source.packageName.trim() === "") {
        problems.push(`${prefix}: package-dependency requires packageName`);
        continue;
      }
      if (packageNames.has(source.packageName)) problems.push(`${prefix}: duplicate packageName ${source.packageName}`);
      packageNames.add(source.packageName);
      if (typeof source.expectedVersion !== "string" || source.expectedVersion.trim() === "") {
        problems.push(`${prefix}: package-dependency requires expectedVersion`);
      }
      if (source.licenseStatus !== "lockfile-verified") {
        problems.push(`${prefix}: package-dependency must use licenseStatus lockfile-verified`);
      }
      if (typeof source.licenseSpdx !== "string" || source.licenseSpdx.trim() === "") {
        problems.push(`${prefix}: lockfile-verified package requires licenseSpdx`);
      }

      const manifestVersion = packageVersion(packageJson, source.packageName);
      if (manifestVersion !== source.expectedVersion) {
        problems.push(
          `${prefix}: ${source.packageName} expectedVersion ${source.expectedVersion} does not match package.json ${manifestVersion ?? "<missing>"}`,
        );
      }
      const lockEntry = packageLock.packages?.[`node_modules/${source.packageName}`];
      if (!lockEntry) {
        problems.push(`${prefix}: ${source.packageName} is missing from package-lock.json`);
      } else {
        if (lockEntry.version !== source.expectedVersion) {
          problems.push(
            `${prefix}: ${source.packageName} expectedVersion ${source.expectedVersion} does not match package-lock.json ${lockEntry.version ?? "<missing>"}`,
          );
        }
        if (lockEntry.license !== source.licenseSpdx) {
          problems.push(
            `${prefix}: ${source.packageName} licenseSpdx ${source.licenseSpdx} does not match package-lock.json ${lockEntry.license ?? "<missing>"}`,
          );
        }
      }
    } else {
      for (const field of ["packageName", "expectedVersion", "licenseSpdx"]) {
        if (source[field] !== null) problems.push(`${prefix}: ${source.adoptionMode} source requires ${field}=null`);
      }
      if (source.licenseStatus !== "review-required-per-adoption") {
        problems.push(`${prefix}: ${source.adoptionMode} source must use licenseStatus review-required-per-adoption`);
      }
    }

    if (source.policyStatus === "discovery-only" && source.adoptionMode !== "per-adoption-review") {
      problems.push(`${prefix}: discovery-only source must use adoptionMode per-adoption-review`);
    }
  }

  for (const heading of catalogHeadings) {
    if (!coveredCatalogHeadings.has(heading)) {
      problems.push(`${COMPONENT_SOURCE_REGISTRY_PATH}: missing registry coverage for catalog source heading ${heading}`);
    }
  }

  if (searchOrders.size > 0) {
    const minOrder = Math.min(...searchOrders);
    const maxOrder = Math.max(...searchOrders);
    for (let order = minOrder; order <= maxOrder; order += 1) {
      if (!searchOrders.has(order)) {
        problems.push(`${COMPONENT_SOURCE_REGISTRY_PATH}: governed external searchOrder sequence is missing ${order}`);
      }
    }
  }

  return problems;
}

export async function verifyComponentSourceRegistry({ rootDir = process.cwd() } = {}) {
  const [registryBody, packageJsonBody, packageLockBody, catalogBody] = await Promise.all([
    readFile(path.join(rootDir, COMPONENT_SOURCE_REGISTRY_PATH), "utf8"),
    readFile(path.join(rootDir, "package.json"), "utf8"),
    readFile(path.join(rootDir, "package-lock.json"), "utf8"),
    readFile(path.join(rootDir, COMPONENT_CATALOG_PATH), "utf8"),
  ]);
  const registry = JSON.parse(registryBody.replace(/^\uFEFF/, ""));
  const packageJson = JSON.parse(packageJsonBody.replace(/^\uFEFF/, ""));
  const packageLock = JSON.parse(packageLockBody.replace(/^\uFEFF/, ""));
  const problems = findComponentSourceRegistryProblems({ registry, packageJson, packageLock, catalogBody });
  if (problems.length > 0) {
    throw new Error(`Component source governance verification failed:\n- ${problems.join("\n- ")}`);
  }
  return {
    sources: registry.sources.length,
    activeSources: registry.sources.filter((source) => source.activeUse).length,
  };
}
