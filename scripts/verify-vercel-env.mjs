import { readFile } from "node:fs/promises";
import { validateRuntimeEnvironment, validateProductionInventoryNames, productionRequiredNames } from "../src/lib/config/runtime-env.ts";

/**
 * Credential-free CI fixture exercises the exact same validator as Vercel prebuild.
 * No credential values are printed or persisted.
 */
const fixture = Object.fromEntries(productionRequiredNames.map((name) => [name, "offline-only-placeholder"]));
Object.assign(fixture, {
  SUPABASE_URL: "https://rashyleshocuvpgcooxy.supabase.co",
  CRON_SECRET: "offline-fixture-cron-minimum-length",
  RENDERLAB_GENERATION_RECONCILER_SECRET: "offline-fixture-reconciliation-minimum-length",
  RENDERLAB_FIBO_GENERATION: "1",
  RENDERLAB_GENERATION_GATEWAY_URL: "https://fixture.modal.run",
  RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED: "true",
  RENDERLAB_FIBO_MASK_ENABLED: "true",
});

const mode = process.argv[2] === "--fixture" ? "fixture" : process.env.VERCEL === "1" ? "production" : "local";
if (mode === "local") {
  console.log("Skipping live Vercel preflight outside Vercel; CI validates the same schema with --fixture.");
  process.exit(0);
}
const source = mode === "fixture" ? fixture : process.env;
const issues = validateRuntimeEnvironment(source, mode === "fixture" || process.env.VERCEL_ENV === "production" ? "production" : "fixture");
const inventory = JSON.parse(await readFile(new URL("../docs/operations/PRODUCTION_ENV_REQUIRED_NAMES.json", import.meta.url), "utf8"));
const inventoryIssues = validateProductionInventoryNames(inventory.requiredNames);
if (inventory.count !== 16 || productionRequiredNames.length !== 16) inventoryIssues.push({ name: "PRODUCTION_INVENTORY", reason: "required inventory must have 16 names" });
const errors = [...issues, ...inventoryIssues];
if (errors.length) {
  const safe = errors.map(({ name, reason }) => `${name}: ${reason}`).join("; ");
  throw new Error(`Environment preflight failed: ${safe}`);
}
console.log(mode === "fixture" ? "CI offline config preflight passed (16 synthetic production names, no secrets)." : "Production configuration preflight passed (names and expected flag states, no values logged).");
