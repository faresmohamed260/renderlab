/**
 * Single typed environment schema for app runtime and Vercel build preflight.
 * Never echo a raw value, credentials, or a derived secret in errors.
 * Reads are lazy so an unrelated route can operate if one optional feature is unset.
 * Public NEXT_PUBLIC_* and NODE_ENV are statically spelled for Next.js client inlining.
 */
export type ConfigCategory = "production-required" | "feature-required" | "optional" | "test-only";
export type ConfigKind = "string" | "boolean" | "number";
export type ConfigIssue = { name: string; reason: string };
const entries = {
  "CLOUDFLARE_R2_ACCESS_KEY_ID": {
    "category": "production-required",
    "kind": "string"
  },
  "CLOUDFLARE_R2_ACCOUNT_ID": {
    "category": "production-required",
    "kind": "string"
  },
  "CLOUDFLARE_R2_BUCKET": {
    "category": "production-required",
    "kind": "string"
  },
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY": {
    "category": "production-required",
    "kind": "string"
  },
  "CRON_SECRET": {
    "category": "production-required",
    "kind": "string"
  },
  "GITHUB_ACTIONS": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "LOCALAPPDATA": {
    "category": "optional",
    "kind": "string"
  },
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": {
    "category": "optional",
    "kind": "string"
  },
  "NEXT_PUBLIC_SUPABASE_URL": {
    "category": "optional",
    "kind": "string"
  },
  "NODE_ENV": {
    "category": "optional",
    "kind": "string"
  },
  "R2_ACCESS_KEY_ID": {
    "category": "optional",
    "kind": "string"
  },
  "R2_ACCOUNT_ID": {
    "category": "optional",
    "kind": "string"
  },
  "R2_BUCKET_NAME": {
    "category": "optional",
    "kind": "string"
  },
  "R2_SECRET_ACCESS_KEY": {
    "category": "optional",
    "kind": "string"
  },
  "RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "boolean",
    "encoding": "flex",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_ADVANCED_PROMPT": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_CANCEL": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_EXTENDED": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_LIVE_PREVIEW": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_MASKS": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_CREATE_PREVIEW_PYTHON": {
    "category": "optional",
    "kind": "string"
  },
  "RENDERLAB_CREATE_PREVIEW_VARIABLE_STEPS": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_FIBO_AUTOVGL_ENABLED": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_FIBO_GATEWAY_URL": {
    "category": "feature-required",
    "kind": "string"
  },
  "RENDERLAB_FIBO_GENERATION": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_FIBO_MASK_ENABLED": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_FIBO_MODAL_KEY": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "string"
  },
  "RENDERLAB_FIBO_MODAL_SECRET": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "string"
  },
  "RENDERLAB_FIBO_PREVIEW": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_GENERATION_BACKEND_TOKEN": {
    "category": "feature-required",
    "kind": "string"
  },
  "RENDERLAB_GENERATION_BACKEND_URL": {
    "category": "feature-required",
    "kind": "string"
  },
  "RENDERLAB_GENERATION_GATEWAY_URL": {
    "category": "feature-required",
    "deployedBetaRequired": true,
    "kind": "string"
  },
  "RENDERLAB_GENERATION_RECONCILER_SECRET": {
    "category": "production-required",
    "kind": "string"
  },
  "RENDERLAB_HOSTED_CREATE": {
    "category": "optional",
    "kind": "boolean",
    "encoding": "1",
    "default": false
  },
  "RENDERLAB_MAINTENANCE_BATCH_LIMIT": {
    "category": "optional",
    "kind": "number",
    "default": 8
  },
  "RENDERLAB_MAINTENANCE_SECRET": {
    "category": "optional",
    "kind": "string"
  },
  "RENDERLAB_TEST_ACCOUNT_DATA_LIFECYCLE_FAULTS": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_GENERATION_FINALIZATION_FAULT_SEQUENCE": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_GENERATION_FINALIZATION_FAULTS": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_MAINTENANCE_FAULTS": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_MAINTENANCE_OWNER_ID": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_MAINTENANCE_OWNER_SCOPE": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_OBSERVABILITY_NAMESPACE": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_OBSERVABILITY_PERSIST": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_RECONCILER_OWNER_ID": {
    "category": "test-only",
    "kind": "string"
  },
  "RENDERLAB_TEST_RECONCILER_OWNER_SCOPE": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS": {
    "category": "test-only",
    "kind": "boolean",
    "encoding": "true",
    "default": false
  },
  "RESEND_API_KEY": {
    "category": "production-required",
    "kind": "string"
  },
  "SUPABASE_PUBLISHABLE_KEY": {
    "category": "production-required",
    "kind": "string"
  },
  "SUPABASE_SERVICE_ROLE_KEY": {
    "category": "production-required",
    "kind": "string"
  },
  "SUPABASE_URL": {
    "category": "production-required",
    "kind": "string"
  },
  "VERCEL_ENV": {
    "category": "optional",
    "kind": "string"
  }
} as const;

export const runtimeEnvSchema = entries;
export type RuntimeEnvName = keyof typeof runtimeEnvSchema;
export type BooleanEnvName = { [K in RuntimeEnvName]: (typeof runtimeEnvSchema)[K]["kind"] extends "boolean" ? K : never }[RuntimeEnvName];
export const productionAlwaysNames: readonly RuntimeEnvName[] = Object.entries(runtimeEnvSchema)
  .filter(([, spec]) => spec.category === "production-required")
  .map(([name]) => name as RuntimeEnvName)
  .sort();
export const productionRequiredNames: readonly RuntimeEnvName[] = Object.entries(runtimeEnvSchema)
  .filter(([, spec]) => spec.category === "production-required" ||
    ("deployedBetaRequired" in spec && spec.deployedBetaRequired === true))
  .map(([name]) => name as RuntimeEnvName)
  .sort();
const approvedSupabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const modalOrigin = /^https:\/\/faresmohamed260--renderlab-generation-gateway-web\.modal\.run$/;

function envSource(name: RuntimeEnvName): string | undefined {
  // Next.js compiles only literal NEXT_PUBLIC_ keys into browser bundles.
  if (name === "NEXT_PUBLIC_SUPABASE_URL") return process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (name === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (name === "NODE_ENV") return process.env.NODE_ENV;
  return process.env[name];
}
const reportedMissingProductionEnv = new Set<string>();
export function envString(name: RuntimeEnvName): string | undefined {
  const value = envSource(name);
  if (envSource("VERCEL_ENV") === "production" && !value?.trim() &&
      runtimeEnvSchema[name].category === "production-required" &&
      !reportedMissingProductionEnv.has(name)) {
    reportedMissingProductionEnv.add(name);
    console.error(`Configuration error: ${name}: required in Production; affected service may be unavailable.`);
  }
  return value;
}
function enabled(value: string | undefined, mode: "1" | "true" | "flex"): boolean {
  if (mode === "1") return value === "1";
  if (mode === "true") return value === "true";
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
export function envFlag(name: BooleanEnvName): boolean {
  const spec = runtimeEnvSchema[name];
  if (spec.kind !== "boolean") return false;
  return enabled(envSource(name), spec.encoding as "1" | "true" | "flex");
}
/** Old route semantics retained: Number(raw || 8), finite-or-default; default lives in schema. */
export function maintenanceBatchLimit(): number {
  const fallback = runtimeEnvSchema.RENDERLAB_MAINTENANCE_BATCH_LIMIT.default;
  const requested = Number(envString("RENDERLAB_MAINTENANCE_BATCH_LIMIT") || fallback);
  return Number.isFinite(requested) ? requested : fallback;
}

let betaEnforcementWarningReported = false;
/** Missing/malformed Production admission flag must never reopen private access. */
export function closedBetaEnforcement(): boolean {
  const enabledFlag = envFlag("RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED");
  if (envString("VERCEL_ENV") !== "production") return enabledFlag;
  if (!enabledFlag && !betaEnforcementWarningReported) {
    betaEnforcementWarningReported = true;
    console.error("Configuration error: RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED: must be enabled in Production; enforcement remains on.");
  }
  return true;
}

/** Missing mandatory Production mask flag is loudly diagnosed; unrelated Create work stays available. */
let maskDriftWarningReported = false;
export function fiboMaskEnabled(): boolean {
  const enabledFlag = envFlag("RENDERLAB_FIBO_MASK_ENABLED");
  if (envString("VERCEL_ENV") === "production" && !enabledFlag) {
    if (!maskDriftWarningReported) {
      maskDriftWarningReported = true;
      console.error("Configuration error: RENDERLAB_FIBO_MASK_ENABLED: must be true in Production; masked editing unavailable.");
    }
  }
  return enabledFlag;
}
export class RuntimeConfigError extends Error {
  readonly nameOfSetting: RuntimeEnvName;
  constructor(nameOfSetting: RuntimeEnvName, reason: string) {
    super(`Configuration error: ${nameOfSetting}: ${reason}`);
    this.name = "RuntimeConfigError";
    this.nameOfSetting = nameOfSetting;
  }
}
export function requireFeatureEnv(name: RuntimeEnvName): string {
  const value = envString(name)?.trim();
  if (!value) throw new RuntimeConfigError(name, "required for this operation");
  return value;
}

/** Names and sanitized failure reasons ONLY. Never include source values. */
export function validateRuntimeEnvironment(
  source: Record<string, string | undefined>,
  context: "production" | "fixture" | "local" = "production",
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const issue = (name: string, reason: string) => issues.push({ name, reason });
  if (context !== "production" && context !== "fixture") return issues;
  const require = (name: string) => {
    if (!source[name]?.trim()) issue(name, "required");
  };
  const names = context === "production" ? productionRequiredNames : productionAlwaysNames;
  for (const name of names) {
    if (name === "RENDERLAB_GENERATION_GATEWAY_URL" && !source[name]?.trim() && source.RENDERLAB_FIBO_GATEWAY_URL?.trim()) continue;
    require(name);
  }
  for (const [name, spec] of Object.entries(runtimeEnvSchema)) {
    const raw = source[name];
    if (raw === undefined || raw === "") continue;
    if (spec.kind === "number" && !Number.isFinite(Number(raw))) issue(name, "must be a finite number");
    if (spec.kind === "boolean") {
      const permitted = spec.encoding === "flex"
        ? ["1","0","true","false","yes","no","on","off"]
        : spec.encoding === "1" ? ["1","0"] : ["true","false"];
      if (!permitted.includes(spec.encoding === "flex" ? raw.trim().toLowerCase() : raw)) {
        issue(name, "expected a valid boolean flag");
      }
    }
  }
  if (source.SUPABASE_URL?.trim() && source.SUPABASE_URL.trim().replace(/\/$/, "") !== approvedSupabaseUrl) issue("SUPABASE_URL", "wrong approved project URL");
  if (source.CRON_SECRET?.trim() && source.CRON_SECRET.trim().length < 16) issue("CRON_SECRET", "below required minimum length");
  if (source.RENDERLAB_GENERATION_RECONCILER_SECRET?.trim() && source.RENDERLAB_GENERATION_RECONCILER_SECRET.trim().length < 32) issue("RENDERLAB_GENERATION_RECONCILER_SECRET", "below required minimum length");

  const fiboEnabled = enabled(source.RENDERLAB_FIBO_GENERATION, "1");
  const gateway = (source.RENDERLAB_GENERATION_GATEWAY_URL?.trim() || source.RENDERLAB_FIBO_GATEWAY_URL?.trim() || "").replace(/\/$/, "");
  if (fiboEnabled) {
    if (!gateway) issue("RENDERLAB_GENERATION_GATEWAY_URL", "required when FIBO enabled (legacy alias accepted)");
    if (!source.RENDERLAB_FIBO_MODAL_KEY?.trim()) issue("RENDERLAB_FIBO_MODAL_KEY", "required when FIBO enabled");
    if (!source.RENDERLAB_FIBO_MODAL_SECRET?.trim()) issue("RENDERLAB_FIBO_MODAL_SECRET", "required when FIBO enabled");
  }
  if (gateway) {
    if (!modalOrigin.test(gateway)) issue("RENDERLAB_GENERATION_GATEWAY_URL", "must be an HTTPS Modal origin");
    if (!source.RENDERLAB_FIBO_MODAL_KEY?.trim()) issue("RENDERLAB_FIBO_MODAL_KEY", "required for configured gateway");
    if (!source.RENDERLAB_FIBO_MODAL_SECRET?.trim()) issue("RENDERLAB_FIBO_MODAL_SECRET", "required for configured gateway");
  }
  if (context === "production") {
    for (const [name, spec] of Object.entries(runtimeEnvSchema)) {
      if (spec.category === "test-only" && name.startsWith("RENDERLAB_TEST_") && source[name]?.trim()) issue(name, "test-only override not permitted in Production");
    }
    if (!fiboEnabled) issue("RENDERLAB_FIBO_GENERATION", "must be enabled in Production");
    if (!enabled(source.RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED, "flex")) issue("RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED", "must enforce closed beta in Production");
    if (!enabled(source.RENDERLAB_FIBO_MASK_ENABLED, "true")) issue("RENDERLAB_FIBO_MASK_ENABLED", "must be true in Production");
  }
  return Array.from(new Map(issues.map(x => [x.name + ":" + x.reason,x])).values());
}

/** Explicit schema-vs-production inventory check, with no values. */
export function validateProductionInventoryNames(inventoryNames: readonly string[]): ConfigIssue[] {
  const inventory = new Set(inventoryNames);
  const required = new Set<string>(productionRequiredNames);
  const issues: ConfigIssue[] = [];
  for (const name of required) if (!inventory.has(name)) issues.push({ name, reason: "missing from Production inventory" });
  for (const name of inventory) if (!required.has(name)) issues.push({ name, reason: "unexpected in the required-name inventory" });
  if (required.size !== 16) issues.push({ name: "PRODUCTION_INVENTORY", reason: "expected 16 required schema names" });
  return issues;
}
