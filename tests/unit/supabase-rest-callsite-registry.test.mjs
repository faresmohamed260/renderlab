import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { compareRegisteredSites, scanPrivilegedCalls, sourceCallSites } from "../helpers/supabase-rest-callsite-scan.mjs";

const root = process.cwd();
const registryFile = path.join(root, "tests/fixtures/supabase-rest-callsite-registry.json");

test("every server-side service-role supabaseRest call has a reviewed classification and family harness", () => {
  const discovered = scanPrivilegedCalls(root);
  assert.ok(discovered.length >= 100, "unexpectedly low number of privileged call sites");
  assert.ok(fs.existsSync(registryFile), "P0-03b registry must be checked in before this test passes");
  const registry = JSON.parse(fs.readFileSync(registryFile, "utf8")).sites;
  assert.ok(Array.isArray(registry), "P0-03b registry must contain sites[]");
  assert.deepEqual(compareRegisteredSites(discovered, registry), []);
  assert.equal(registry.filter((s) => s.classification === "owner-scoped" && s.negativeHarness === "none").length, 0);
  for (const site of registry) {
    assert.ok(!site.principalDerivation.includes("trusted client-supplied"),
      "Unverified client-provided owner IDs must never be treated as authenticated: " + site.id);
    if (site.classification === "admin") assert.match(site.negativeHarness, /A[45]/);
    if (site.classification === "internal") assert.match(site.negativeHarness, /I[12]|O[138]/);
  }
});

test("static AST scan detects a newly introduced privileged call and drift, even in the same module", () => {
  const sourceFile = path.join(root, "src/server/media/media-assets.ts");
  const original = fs.readFileSync(sourceFile, "utf8");
  const injected = original + "\nexport async function addedPrivilegedRead() { return supabaseRest('media_assets?select=id'); }\n";
  const first = sourceCallSites(sourceFile, original, root);
  const second = sourceCallSites(sourceFile, injected, root);
  assert.equal(second.length, first.length + 1);
  const newSite = second.find((site) => !first.some((existing) => existing.id === site.id));
  assert.equal(newSite?.staticTableOrRpc, "media_assets");
  const registry = fs.existsSync(registryFile)
    ? JSON.parse(fs.readFileSync(registryFile, "utf8")).sites
    : [];
  assert.ok(compareRegisteredSites(second, registry).some((failure) => failure.includes("Unregistered")));
});

test("every owner-scoped registry entry declares independently inspectable owner binding", () => {
  const discovered = scanPrivilegedCalls(root);
  const registry = JSON.parse(fs.readFileSync(registryFile, "utf8")).sites;
  const sites = new Map(discovered.map((site) => [site.id, site]));
  const families = new Set(["jobs", "admission", "media-assets", "collections", "uploads", "references", "account-lifecycle"]);
  const assertions = [];
  for (const row of registry) {
    if (row.classification !== "owner-scoped") continue;
    assert.ok(families.has(row.family), `Uncovered owner family ${row.family} at ${row.id}`);
    const site = sites.get(row.id);
    assert.ok(site, `Registry is stale at ${row.id}`);
    const source = fs.readFileSync(path.join(root, site.file), "utf8").split("\n");
    const neighborhood = source.slice(Math.max(0, site.line - 30), site.line + 25).join("\n");
    let bound = false;
    switch (row.ownerEvidence) {
      case "owner-filter-query":
        bound = /(?:owner_id|user_id|claimed_user_id)=eq\./.test(site.argument);
        break;
      case "owner-filter-URLSearchParams":
        bound = /(?:owner_id\s*:|\bowner_id\s*,|set\(["']owner_id["']|owner_id=eq\.)/.test(neighborhood);
        break;
      case "actor-derived-RPC-p_owner_id":
        bound = /p_(?:user|owner)_id\s*:/.test(neighborhood);
        break;
      case "actor-derived-payload-owner_id-or-prior-owner-scoped-row":
        bound = /(?:owner_id|user_id)\s*:/.test(neighborhood);
        break;
      default:
        assert.fail(`Unknown owner-evidence classification at ${row.id}`);
    }
    assertions.push({id:row.id, bound, family:row.family});
  }
  const missing = assertions.filter((entry) => !entry.bound);
  assert.deepEqual(missing, [], "Owner filter/payload/RPC evidence was not found near recorded service-role sites");
  assert.ok(assertions.length >= 70, "Unexpectedly few verified owner-scoped sites");
});