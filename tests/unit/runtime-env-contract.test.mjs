import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  runtimeEnvSchema, productionAlwaysNames, productionRequiredNames,
  validateRuntimeEnvironment, validateProductionInventoryNames,
  envFlag, envString, closedBetaEnforcement, fiboMaskEnabled, maintenanceBatchLimit, RuntimeConfigError, requireFeatureEnv,
} from "../../src/lib/config/runtime-env.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const baseline = () => {
  const values = Object.fromEntries(productionRequiredNames.map((name) => [name, "fake-secret-sentinel-do-not-log"]));
  Object.assign(values, {
    SUPABASE_URL: "https://rashyleshocuvpgcooxy.supabase.co",
    CRON_SECRET: "fixture-cron-credential-minimum-length",
    RENDERLAB_GENERATION_RECONCILER_SECRET: "fixture-reconciler-credential-minimum-length",
    RENDERLAB_FIBO_GENERATION: "1",
    RENDERLAB_GENERATION_GATEWAY_URL: "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run",
    RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED: "true",
    RENDERLAB_FIBO_MASK_ENABLED: "true",
  });
  return values;
};
const has = (issues, name) => issues.some((e) => e.name === name);

test("offline all-valid beta Production fixture is accepted without real secrets", () => {
  assert.deepEqual(validateRuntimeEnvironment(baseline(), "production"), []);
  assert.equal(productionAlwaysNames.length, 10);
  assert.equal(productionRequiredNames.length, 16);
});

test("each of 16 required Production names fails closed when missing", () => {
  for (const name of productionRequiredNames) {
    const fixture = baseline();
    delete fixture[name];
    const issues = validateRuntimeEnvironment(fixture, "production");
    assert(has(issues, name), "Missing Production name was accepted: " + name);
  }
});

test("malformed approvals, gateway URL, flags, weak secrets are rejected with sanitized names", () => {
  const invalid = [
    ["SUPABASE_URL", "https://wrong-project.example.invalid"],
    ["CRON_SECRET", "short"],
    ["RENDERLAB_GENERATION_RECONCILER_SECRET", "short"],
    ["RENDERLAB_GENERATION_GATEWAY_URL", "https://bad.example.net"],
    ["RENDERLAB_FIBO_GENERATION", "definitely-not-boolean"],
    ["RENDERLAB_FIBO_MASK_ENABLED", "1"],
    ["RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED", "off"],
    ["RENDERLAB_FIBO_AUTOVGL_ENABLED", "invalid-flag"],
  ];
  for (const [name, raw] of invalid) {
    const fixture = baseline();
    fixture[name] = raw;
    const serialized = JSON.stringify(validateRuntimeEnvironment(fixture, "production"));
    assert(serialized.includes(name), "Missing sanitized error name: " + name);
    assert(!serialized.includes("fake-secret-sentinel-do-not-log"));
    if (raw === "definitely-not-boolean" || raw === "invalid-flag" || raw === "https://bad.example.net") assert(!serialized.includes(raw));
  }
});

test("real production gateway origin is accepted and all other identities and URL components are rejected", () => {
  const valid = "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run";
  for (const context of ["production", "fixture"]) {
    assert.deepEqual(validateRuntimeEnvironment({...baseline(), RENDERLAB_GENERATION_GATEWAY_URL: valid}, context), []);
    for (const url of [
      "https://other-user-main--renderlab-generation-gateway-web.us-east.modal.run",
      "https://faresmohamed260-main--other-app-web.us-east.modal.run",
      "https://faresmohamed260-main--renderlab-generation-gateway-other.us-east.modal.run",
      "https://faresmohamed260-preview--renderlab-generation-gateway-web.us-east.modal.run",
      "https://faresmohamed260--renderlab-generation-gateway-web.modal.run",
      "https://faresmohamed260-main--renderlab-generation-gateway-web.modal.run",
      "https://faresmohamed260-main--renderlab-generation-gateway-web.eu-west.modal.run",
      "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run.evil.example",
      "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.example",
      "http://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run",
      "https://fixture-user@faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run",
      valid + ":443",
      valid + ":8443",
      valid + "/other",
      valid + "?x=1",
      valid + "#fragment",
    ]) {
      const fixture = {...baseline(), RENDERLAB_GENERATION_GATEWAY_URL: url};
      assert(has(validateRuntimeEnvironment(fixture, context), "RENDERLAB_GENERATION_GATEWAY_URL"), url);
      delete fixture.RENDERLAB_GENERATION_GATEWAY_URL;
      fixture.RENDERLAB_FIBO_GATEWAY_URL = url;
      assert(has(validateRuntimeEnvironment(fixture, context), "RENDERLAB_GENERATION_GATEWAY_URL"), "legacy alias: " + url);
    }
  }
});

test("gateway credentials are required together only when active or gateway configured", () => {
  const disabled = baseline();
  disabled.RENDERLAB_FIBO_GENERATION = "0";
  disabled.RENDERLAB_FIBO_MASK_ENABLED = "false";
  disabled.RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED = "false";
  delete disabled.RENDERLAB_GENERATION_GATEWAY_URL;
  delete disabled.RENDERLAB_FIBO_MODAL_KEY;
  delete disabled.RENDERLAB_FIBO_MODAL_SECRET;
  assert.deepEqual(validateRuntimeEnvironment(disabled, "fixture"), []);
  for (const name of ["RENDERLAB_GENERATION_GATEWAY_URL", "RENDERLAB_FIBO_MODAL_KEY", "RENDERLAB_FIBO_MODAL_SECRET"]) {
    const enabled = baseline();
    delete enabled[name];
    assert(has(validateRuntimeEnvironment(enabled, "fixture"), name));
  }
  const legacy = baseline();
  delete legacy.RENDERLAB_GENERATION_GATEWAY_URL;
  legacy.RENDERLAB_FIBO_GATEWAY_URL = "https://faresmohamed260-main--renderlab-generation-gateway-web.us-east.modal.run";
  assert.deepEqual(validateRuntimeEnvironment(legacy, "fixture"), []);
  delete legacy.RENDERLAB_FIBO_MODAL_KEY;
  assert(has(validateRuntimeEnvironment(legacy, "fixture"), "RENDERLAB_FIBO_MODAL_KEY"));
});

test("typed flags retain previous strict defaults and explicit production enrollment", () => {
  const keys = ["RENDERLAB_FIBO_GENERATION", "RENDERLAB_FIBO_MASK_ENABLED", "RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED", "RENDERLAB_CREATE_PREVIEW"];
  const saved = Object.fromEntries(keys.map((name) => [name, process.env[name]]));
  try {
    for (const name of keys) delete process.env[name];
    for (const name of keys) assert.equal(envFlag(name), false);
    process.env.RENDERLAB_FIBO_GENERATION = "true";
    assert.equal(envFlag("RENDERLAB_FIBO_GENERATION"), false);
    process.env.RENDERLAB_FIBO_GENERATION = "1";
    assert.equal(envFlag("RENDERLAB_FIBO_GENERATION"), true);
    process.env.RENDERLAB_FIBO_MASK_ENABLED = "1";
    assert.equal(envFlag("RENDERLAB_FIBO_MASK_ENABLED"), false);
    process.env.RENDERLAB_FIBO_MASK_ENABLED = "true";
    assert.equal(envFlag("RENDERLAB_FIBO_MASK_ENABLED"), true);
    process.env.RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED = "on";
    assert.equal(envFlag("RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED"), true);
    process.env.RENDERLAB_CREATE_PREVIEW = "true";
    assert.equal(envFlag("RENDERLAB_CREATE_PREVIEW"), false);
    process.env.RENDERLAB_CREATE_PREVIEW = "1";
    assert.equal(envFlag("RENDERLAB_CREATE_PREVIEW"), true);
  } finally {
    for (const name of keys) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});

test("runtime missing required setting throws only at invocation, never includes secrets", () => {
  const key = "RENDERLAB_MAINTENANCE_SECRET";
  const previous = process.env[key];
  try {
    delete process.env[key];
    assert.equal(envString(key), undefined);
    assert.throws(() => requireFeatureEnv(key), (error) => {
      assert(error instanceof RuntimeConfigError);
      assert.equal(error.nameOfSetting, key);
      assert(!error.message.includes("fake-secret-sentinel-do-not-log"));
      return true;
    });
  } finally { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; }
});

test("names-only production inventory matches all 16 schema-required names bidirectionally", async () => {
  const inventory = JSON.parse(await readFile(join(projectRoot, "docs/operations/PRODUCTION_ENV_REQUIRED_NAMES.json"), "utf8"));
  assert.equal(inventory.count, 16);
  assert.equal(inventory.requiredNames.length, 16);
  assert.deepEqual(validateProductionInventoryNames(inventory.requiredNames), []);
  for (const name of inventory.requiredNames) {
    assert(has(validateProductionInventoryNames(inventory.requiredNames.filter(x=>x!==name)), name));
  }
  assert(has(validateProductionInventoryNames([...inventory.requiredNames,"EXTRA_REQUIRED_FAKE"]), "EXTRA_REQUIRED_FAKE"));
  assert(inventory.requiredNames.includes("RENDERLAB_FIBO_MASK_ENABLED"));
  assert(inventory.requiredNames.includes("RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED"));
});

test("all app env accessor names are classified, including test-only and client-safe public names", async () => {
  const src = join(projectRoot,"src");
  let accessed = new Set();
  async function visit(dir) {
    for (const e of await readdir(dir,{withFileTypes:true})) {
      if (e.isDirectory()) { await visit(join(dir,e.name)); continue; }
      if (!/\.tsx?$/.test(e.name) || e.name === "runtime-env.ts") continue;
      const source = await readFile(join(dir,e.name),"utf8");
      for (const match of source.matchAll(/env(?:String|Flag)\("([A-Z_0-9]+)"\)/g)) accessed.add(match[1]);
      assert(!/process\.env\.[A-Z][A-Z_0-9]+/.test(source.replace(/\/\/ Compatibility:[^\n]*/g,"")), "Direct read bypasses schema in " + e.name);
    }
  }
  await visit(src);
  for (const name of accessed) assert(Object.hasOwn(runtimeEnvSchema,name), "Unknown runtime env name: "+name);
  assert(accessed.size > 40, "Callsite coverage unexpectedly shallow");
  assert.equal(runtimeEnvSchema.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE.category,"test-only");
});

test("CI fixture invokes production preflight without Vercel and emits no secret", () => {
  const path = join(projectRoot,"scripts/verify-vercel-env.mjs");
  const result = spawnSync(process.execPath,[path,"--fixture"],{cwd:projectRoot,encoding:"utf8",env:{...process.env,VERCEL:""}});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/offline config preflight passed/);
  assert(!result.stdout.includes("fake-secret-sentinel-do-not-log"));
});

test("test-only runtime overrides are rejected in Production but usable in isolated fixture mode", () => {
  const fixture = baseline();
  fixture.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE = "test-run-123";
  assert(has(validateRuntimeEnvironment(fixture, "production"), "RENDERLAB_TEST_OBSERVABILITY_NAMESPACE"));
  assert.deepEqual(validateRuntimeEnvironment(fixture, "fixture"), []);
});

test("runtime flags fail closed on Production drift without crashing unrelated operations", () => {
  const keys = ["VERCEL_ENV", "RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED", "RENDERLAB_FIBO_MASK_ENABLED"];
  const saved = Object.fromEntries(keys.map(name => [name, process.env[name]]));
  const original = console.error;
  const warnings = [];
  try {
    console.error = (...args) => warnings.push(args.map(String).join(" "));
    process.env.VERCEL_ENV = "production";
    delete process.env.RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED;
    delete process.env.RENDERLAB_FIBO_MASK_ENABLED;
    assert.equal(closedBetaEnforcement(), true, "Production access must stay closed");
    assert.equal(fiboMaskEnabled(), false, "Unconfigured mask affects only masked edits");
    assert(warnings.some(message => message.includes("RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED")));
    assert(warnings.some(message => message.includes("RENDERLAB_FIBO_MASK_ENABLED")));
    assert(!warnings.join(" ").includes("fake-secret-sentinel-do-not-log"));
  } finally {
    console.error = original;
    for (const name of keys) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});

test("maintenance numeric default is defined once and preserves finite-or-eight behavior", () => {
  const name = "RENDERLAB_MAINTENANCE_BATCH_LIMIT";
  const previous = process.env[name];
  try {
    delete process.env[name];
    assert.equal(maintenanceBatchLimit(), 8);
    process.env[name] = "17";
    assert.equal(maintenanceBatchLimit(), 17);
    process.env[name] = "invalid";
    assert.equal(maintenanceBatchLimit(), 8);
    assert(has(validateRuntimeEnvironment({...baseline(), [name]:"invalid"}, "production"),name));
  } finally { if (previous === undefined) delete process.env[name]; else process.env[name] = previous; }
});

test("F5 test-only routing and admin Health scoping are refused at runtime in Production", () => {
  const flags = ["RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE", "RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE"];
  const url = "RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL";
  const keys = ["VERCEL_ENV", ...flags, url];
  const saved = Object.fromEntries(keys.map(name => [name, process.env[name]]));
  const oldError = console.error;
  const warnings = [];
  try {
    console.error = (...args) => warnings.push(args.join(" "));
    for (const key of flags) process.env[key] = "true";
    process.env[url] = "https://secret-fixture.invalid";
    process.env.VERCEL_ENV = "preview";
    for (const key of flags) assert.equal(envFlag(key), true);
    assert.equal(envString(url), "https://secret-fixture.invalid");
    process.env.VERCEL_ENV = "production";
    for (const key of flags) {
      assert.equal(envFlag(key), false);
      assert.equal(envString(key), undefined);
    }
    assert.equal(envString(url), undefined);
    for (const key of [...flags, url]) assert(warnings.some(w => w.includes(key)));
    assert(!warnings.join(" ").includes("secret-fixture.invalid"));
  } finally {
    console.error = oldError;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test("N5 CRON_SECRET preflight matches 32-character runtime minimum", () => {
  for (const length of [16, 31, 32, 33]) {
    const value = "s".repeat(length);
    for (const context of ["production","fixture"])
      assert.equal(has(validateRuntimeEnvironment({...baseline(), CRON_SECRET:value}, context), "CRON_SECRET"), length < 32);
  }
});

test("N4 Deployment Readiness watches typed config, inventory and proxy on PR and push", async () => {
  const yaml = await readFile(join(projectRoot,".github/workflows/deployment-readiness.yml"), "utf8");
  for (const name of ["src/lib/config/runtime-env.ts","docs/operations/PRODUCTION_ENV_REQUIRED_NAMES.json","proxy.ts"])
    assert.equal(yaml.split('- "' + name + '"').length - 1, 2);
});

test("F7 every schema-classified test-only name is refused at runtime in Production", () => {
  const entries = Object.entries(runtimeEnvSchema).filter(([, spec]) => spec.category === "test-only");
  assert(entries.length >= 15);
  const names = ["VERCEL_ENV", ...entries.map(([name]) => name)];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const original = console.error;
  const warnings = [];
  try {
    console.error = (...args) => warnings.push(args.join(" "));
    process.env.VERCEL_ENV = "preview";
    for (const [name, spec] of entries) {
      const value = spec.kind === "boolean" ? (spec.encoding === "1" ? "1" : "true") : "fixture-sensitive-value";
      process.env[name] = value;
      assert.equal(envString(name), value, name);
      if (spec.kind === "boolean") assert.equal(envFlag(name), true, name);
    }
    process.env.VERCEL_ENV = "production";
    for (const [name, spec] of entries) {
      assert.equal(envString(name), undefined, name);
      if (spec.kind === "boolean") assert.equal(envFlag(name), false, name);
    }
    assert(!warnings.join(" ").includes("fixture-sensitive-value"));
  } finally {
    console.error = original;
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  }
});
