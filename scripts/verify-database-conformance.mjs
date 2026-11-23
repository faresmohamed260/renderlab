#!/usr/bin/env node
/**
 * Fully disposable PostgreSQL migration + state-machine conformance gate.
 * Never uses an application client, cloud credentials, or remote database.
 * Requirements: Node 24, psql 17, local Postgres 17 administrator account.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateJobTransition,
  generationJobStatuses,
} from "../src/lib/capabilities/generation-job-state-machine.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const host = process.env.PGHOST ?? "127.0.0.1";
const port = process.env.PGPORT ?? "5432";
const user = process.env.PGUSER ?? "postgres";
const database = process.env.PGDATABASE ?? "";
if (!["127.0.0.1", "localhost", "::1"].includes(host)
  || database !== "renderlab_conformance"
  || user !== "postgres"
  || !/^\d{1,5}$/.test(port)) {
  throw new Error("Refusing database conformance outside the explicit local, disposable renderlab_conformance database.");
}
if (!process.env.PGPASSWORD) {
  throw new Error("PGPASSWORD is required for the disposable PostgreSQL service only.");
}
if (process.argv.slice(2).some(arg => arg !== "--check")) {
  throw new Error("Usage: node scripts/verify-database-conformance.mjs [--check]");
}
const options = ["-X", "-w", "-v", "ON_ERROR_STOP=1", "-h", host, "-p", port, "-U", user, "-d", database];
const env = { ...process.env };
delete env.PGSERVICE;
delete env.PGHOSTADDR;
function psql(args = [], input) {
  try {
    return execFileSync("psql", [...options, ...args], {
      cwd: root, env, input, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const detail = (error.stderr ?? error.message ?? "").toString();
    throw new Error("Disposable PostgreSQL command failed: " + detail.slice(-5000), { cause: error });
  }
}
const scalar = (sql) => psql(["-t", "-A", "-c", sql]);
const admin = scalar("select rolsuper from pg_roles where rolname = current_user");
assert.equal(admin, "t", "Only ephemeral PostgreSQL superuser may bootstrap the test-only roles.");
const directory = join(root, "supabase", "migrations");
const names = (await readdir(directory)).filter(n => /^\d+_[a-z0-9_]+\.sql$/i.test(n)).sort();
assert.ok(names.length >= 33, "All 33+ numbered migrations must be included, never a handpicked subset.");
const bootstrap = join(root, "tests", "fixtures", "disposable-supabase-bootstrap.sql");
psql(["-f", bootstrap]);
async function migrate() {
  let applied = 0, skipped = 0;
  for (const name of names) {
    const bytes = await readFile(join(directory, name));
    const hash = createHash("sha256").update(bytes).digest("hex");
    const stored = scalar("select sha256 from conformance.applied_migrations where name = '" + name + "'");
    if (stored) {
      assert.equal(stored, hash, "Previously applied migration changed: " + name);
      skipped++;
      continue;
    }
    // The file and its tracking marker commit together, or both roll back.
    psql(["--single-transaction", "-f", join(directory, name), "-c",
      "insert into conformance.applied_migrations(name, sha256) values ('" + name + "', '" + hash + "')"]);
    console.log("Applied " + name);
    applied++;
  }
  assert.equal(Number(scalar("select count(*) from conformance.applied_migrations")), names.length);
  return { applied, skipped };
}
const first = await migrate();
assert.equal(first.applied + first.skipped, names.length);
const second = await migrate();
assert.equal(second.applied, 0, "Second run must not re-run non-idempotent DDL");
assert.equal(second.skipped, names.length, "Second run must verify every stored hash");
const expectedGaps = generationJobStatuses.flatMap(from =>
  generationJobStatuses.map(to => ({
    from, to, decision: evaluateJobTransition(from, to),
  }))
);
assert.equal(expectedGaps.length, 64);
const sqlValue = (s) => "'" + s.replaceAll("'", "''") + "'";
const rows = expectedGaps.map(e =>
  "(" + [e.from,e.to,e.decision].map(sqlValue).join(", ") + ")").join(",\n  ");
const template = await readFile(join(root, "tests", "fixtures", "database-conformance.sql"), "utf8");
assert.equal(template.split("/* MODEL_EDGE_ROWS */").length, 2);
psql([], template.replace("/* MODEL_EDGE_ROWS */", rows));
const invitationConformance = join(root, "tests", "fixtures", "invitation-claim-conformance.sql");
psql(["-f", invitationConformance]);
const atomicTemplate = await readFile(join(root, "tests", "fixtures", "atomic-terminalize-conformance.sql"), "utf8");
assert.equal(atomicTemplate.split("/* MODEL_EDGE_ROWS */").length, 2);
psql([], atomicTemplate.replace("/* MODEL_EDGE_ROWS */", rows));
psql(["-f", join(root, "tests", "fixtures", "database-0031-version-skew.sql")]);
execFileSync(process.execPath, [join(root,"scripts","verify-0031-ent007-isolated-restore.mjs")], {
  cwd: root,env,stdio: "inherit",timeout:120_000,
});
execFileSync(process.execPath, [join(root, "scripts", "verify-atomic-terminalize-concurrency.mjs")], {
  cwd: root, env, stdio: "inherit", timeout: 60_000,
});
console.log("PASS: " + names.length + " migrations from scratch; second pass skipped "
  + second.skipped + " with verified checksums.");
console.log("PASS: real DB constraints, RPCs, privileges, RLS and all 64 model state pairs; new atomic RPC and two-connection races.");
console.log("EXPECTED GAP: generic SQL UPDATE permits "
  + expectedGaps.filter(e => e.decision === "forbidden").length
  + " forbidden model edges; terminal/reservation release is not atomic (P0-07).");
