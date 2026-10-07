import assert from "node:assert/strict";
import test from "node:test";
import {
  assessDeveloperToolchain,
  npmVersionFromUserAgent,
} from "../../scripts/lib/developer-toolchain.mjs";

test("developer toolchain accepts the supported Node 24 and npm 11 majors", () => {
  const result = assessDeveloperToolchain({ nodeVersion: "24.11.0", npmVersion: "11.6.2" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.problems, []);
});

test("developer toolchain fails closed on unsupported Node or npm majors", () => {
  const node = assessDeveloperToolchain({ nodeVersion: "25.2.1", npmVersion: "11.6.2" });
  assert.equal(node.ok, false);
  assert.match(node.problems.join("\n"), /requires Node 24\.x/);

  const npm = assessDeveloperToolchain({ nodeVersion: "24.11.0", npmVersion: "10.9.4" });
  assert.equal(npm.ok, false);
  assert.match(npm.problems.join("\n"), /requires npm 11\.x/);
});

test("developer toolchain fails closed when versions cannot be established", () => {
  const result = assessDeveloperToolchain({ nodeVersion: "unknown", npmVersion: null });
  assert.equal(result.ok, false);
  assert.equal(result.problems.length, 2);
});

test("npm version is read from npm's lifecycle user agent without external commands", () => {
  assert.equal(npmVersionFromUserAgent("npm/11.6.2 node/v24.11.0 win32 x64 workspaces/false"), "11.6.2");
  assert.equal(npmVersionFromUserAgent("pnpm/10 node/v24"), null);
});
