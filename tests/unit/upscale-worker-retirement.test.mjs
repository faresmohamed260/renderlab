import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runtimeEnvSchema } from "../../src/lib/config/runtime-env.ts";
import { getImageUpscaleWorker } from "../../src/server/generation/upscale-worker.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const obsolete = ["RENDERLAB_UPSCALE_WORKER_GATEWAY_URL", "RENDERLAB_TEST_UPSCALE_WORKER_GATEWAY_URL", "RENDERLAB_TEST_UPSCALE_WORKER_OVERRIDE"];

test("removed unauthenticated upscale Modal worker cannot be re-enabled by stale env", () => {
  assert.equal(existsSync(join(root, "workers/image-upscale")), false);
  for (const name of obsolete) {
    assert.equal(Object.hasOwn(runtimeEnvSchema, name), false);
  }
  const before = Object.fromEntries(obsolete.map(name => [name, process.env[name]]));
  try {
    for (const name of obsolete) process.env[name] = "https://attacker.invalid";
    assert.equal(getImageUpscaleWorker(), null);
  } finally {
    for (const name of obsolete) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  }
});

test("retired public route keeps 410 and historical storage remains undisturbed", async () => {
  const route = await readFile(join(root, "src/app/api/media/assets/[assetId]/upscale/route.ts"), "utf8");
  assert.match(route, /enforceSameOriginMutation/);
  assert.match(route, /feature_retired/);
  assert.match(route, /status:\s*410/);
  assert.equal(existsSync(join(root, "src/server/media/media-assets.ts")), true);
  assert.equal(existsSync(join(root, "src/server/generation/upscale-lifecycle.ts")), true);
});

test("no current GitHub workflow or package script depends on removed worker", async () => {
  const dir = join(root, ".github/workflows");
  for (const name of await readdir(dir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const source = await readFile(join(dir, name), "utf8");
    for (const needle of ["workers/image-upscale", "verify-image-upscale.mjs", "mock-image-upscale-worker.mjs", "RENDERLAB_UPSCALE_WORKER_GATEWAY_URL"]) {
      assert(!source.includes(needle), name + " depends on retired upscale worker: " + needle);
    }
  }
  const packageJson = await readFile(join(root, "package.json"), "utf8");
  assert(!packageJson.includes("workers/image-upscale"));
});
