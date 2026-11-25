import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const pins = { "@axe-core/playwright": "4.14.0", "axe-core": "4.14.1" };
const readJson = async file => JSON.parse(await readFile(file, "utf8"));
const pkg = await readJson("package.json"), lock = await readJson("package-lock.json");
for (const [name, version] of Object.entries(pins)) {
  assert.equal(pkg.devDependencies[name], version);
  assert.equal(pkg.dependencies[name], undefined);
  assert.equal(lock.packages[""].devDependencies[name], version);
  const entry = lock.packages["node_modules/" + name];
  assert.equal(entry.version, version);
  assert.equal(entry.dev, true);
  assert.equal(entry.license, "MPL-2.0");
  assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  if (process.argv[2] === "registry") {
    const actual = JSON.parse(execFileSync("npm", ["view", name + "@" + version, "dist.integrity", "--json",
      "--registry=https://registry.npmjs.org/"], { encoding: "utf8" }));
    assert.equal(actual, entry.integrity, "Official npm registry hash mismatch: " + name);
    console.log("Verified registry SHA-512", name, version, actual);
  }
}
if (process.argv[2] === "build") {
  const marker = /(?:@axe-core[\\/]playwright|(?:node_modules[\\/])?axe-core[\\/]|axe\.min\.js|AxeBuilder|axe\.run\(|axe-core v4\.14\.1)/i;
  let count = 0;
  const problems = [];
  const manifest = await readJson(".next/server/app-paths-manifest.json");
  assert.ok(Object.keys(manifest).length > 0);
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (marker.test(file)) problems.push(file);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && /\.(?:[cm]?js|json|css|map|html|rsc|txt)$/.test(file)) {
        count++;
        if (marker.test(await readFile(file, "utf8"))) problems.push(file);
      }
    }
  }
  await walk(".next/server");
  await walk(".next/static");
  assert.ok(count > 0);
  assert.deepEqual(problems, [], "Scanner leaked into production output");
  console.log("Axe excluded from", count, "production server/static files and trace manifests");
}
