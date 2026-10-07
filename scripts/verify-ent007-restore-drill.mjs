import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";

import { decodeBackupKey, decryptSnapshot } from "./lib/ent007-recovery.mjs";

const databaseUrl = process.env.ENT007_RESTORE_DATABASE_URL;
const outputDir = process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-recovery";
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);
if (!databaseUrl) throw new Error("ENT007_RESTORE_DATABASE_URL is required.");

const restoreOrder = [
  "generation_jobs",
  "media_assets",
  "media_collections",
  "media_collection_items",
  "renderlab_account_access",
  "renderlab_beta_invitations",
  "renderlab_beta_settings",
  "renderlab_account_lifecycle",
  "renderlab_account_profiles",
  "renderlab_account_preferences",
];

function psql(args, options = {}) {
  return execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-X", ...args], {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

function sqlLiteralJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function quotedIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

function insertRowsSql(schema, table, rows) {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  for (const row of rows) {
    const keys = Object.keys(row);
    if (keys.length !== columns.length || keys.some((key, index) => key !== columns[index])) {
      throw new Error(`Inconsistent row shape for ${schema}.${table}.`);
    }
  }
  const columnSql = columns.map(quotedIdentifier).join(", ");
  const sourceSql = columns.map((column) => `r.${quotedIdentifier(column)}`).join(", ");
  const encoded = sqlLiteralJson(rows);
  return `insert into ${quotedIdentifier(schema)}.${quotedIdentifier(table)} (${columnSql})\nselect ${sourceSql}\nfrom jsonb_populate_recordset(null::${quotedIdentifier(schema)}.${quotedIdentifier(table)}, convert_from(decode('${encoded}', 'base64'), 'utf8')::jsonb) as r;`;
}
async function loadSnapshot() {
  const files = await readdir(outputDir);
  const encryptedName = files.find((name) => name.endsWith(".snapshot.enc.json"));
  const manifestName = files.find((name) => name.endsWith(".manifest.json"));
  if (!encryptedName || !manifestName) throw new Error("ENT-007 snapshot outputs are incomplete.");
  const envelope = JSON.parse(await readFile(join(outputDir, encryptedName), "utf8"));
  const manifest = JSON.parse(await readFile(join(outputDir, manifestName), "utf8"));
  const plaintext = decryptSnapshot(envelope, encryptionKey);
  return { snapshot: JSON.parse(plaintext.toString("utf8")), manifest };
}

async function writeAuthShim(tempDir) {
  const sql = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;

create table auth.users (
  id uuid primary key,
  aud varchar null,
  role varchar null,
  email varchar null,
  encrypted_password varchar null,
  email_confirmed_at timestamptz null,
  invited_at timestamptz null,
  last_sign_in_at timestamptz null,
  raw_app_meta_data jsonb null,
  raw_user_meta_data jsonb null,
  created_at timestamptz null,
  updated_at timestamptz null,
  phone text null,
  phone_confirmed_at timestamptz null,
  banned_until timestamptz null,
  is_sso_user boolean not null default false,
  deleted_at timestamptz null,
  is_anonymous boolean not null default false
);

create table auth.identities (
  id uuid primary key,
  provider_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz null,
  created_at timestamptz null,
  updated_at timestamptz null
);

create table auth.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz null,
  updated_at timestamptz null,
  refreshed_at timestamp null,
  user_agent text null
);
`;
  const path = join(tempDir, "auth-shim.sql");
  await writeFile(path, sql);
  return path;
}

function verifyMigrationHead(snapshot) {
  const head = snapshot.migrations.at(-1);
  if (!head) throw new Error("Snapshot has no RenderLab migration evidence.");
  const files = execFileSync("git", ["ls-files", "supabase/migrations/*.sql"], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const repoHead = basename(files.at(-1), ".sql").replace(/^\d+_/, "");
  if (repoHead !== head.name) {
    throw new Error(`Migration head mismatch: snapshot=${head.name} repo=${repoHead}`);
  }
  return head;
}

async function writeRestoreData(tempDir, snapshot) {
  const chunks = ["begin;", "delete from public.renderlab_beta_settings;"];
  const usersSql = insertRowsSql("auth", "users", snapshot.auth.users ?? []);
  const identitiesSql = insertRowsSql("auth", "identities", snapshot.auth.identities ?? []);
  if (usersSql) chunks.push(usersSql);
  if (identitiesSql) chunks.push(identitiesSql);
  for (const table of restoreOrder) {
    const sql = insertRowsSql("public", table, snapshot.tables[table] ?? []);
    if (sql) chunks.push(sql);
  }
  chunks.push("commit;");
  const path = join(tempDir, "restore-data.sql");
  await writeFile(path, `${chunks.join("\n\n")}\n`);
  return path;
}

function scalar(sql) {
  return psql(["-At", "-c", sql], { capture: true }).trim();
}

function verifyRestoredState(snapshot, manifest) {
  for (const table of restoreOrder) {
    const expected = (snapshot.tables[table] ?? []).length;
    const actual = Number(scalar(`select count(*) from public.${table};`));
    if (actual !== expected) throw new Error(`Row count mismatch for ${table}: expected ${expected}, got ${actual}`);
  }

  const authUsers = Number(scalar("select count(*) from auth.users;"));
  const authIdentities = Number(scalar("select count(*) from auth.identities;"));
  const authSessions = Number(scalar("select count(*) from auth.sessions;"));
  if (authUsers !== manifest.authUserCount) throw new Error("Restored Auth user count mismatch.");
  if (authIdentities !== manifest.authIdentityCount) throw new Error("Restored Auth identity count mismatch.");
  if (authSessions !== 0) throw new Error("ENT-007 restore unexpectedly restored active sessions.");

  const rlsMissing = Number(scalar(`
select count(*)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = any (array[${restoreOrder.map((name) => `'${name}'`).join(",")}])
  and not c.relrowsecurity;`));
  if (rlsMissing !== 0) throw new Error(`RLS missing on ${rlsMissing} restored RenderLab tables.`);

  const browserPrivileges = Number(scalar(`
select count(*)
from unnest(array[${restoreOrder.map((name) => `'public.${name}'`).join(",")}]) as t(name)
where has_table_privilege('anon', t.name, 'select,insert,update,delete')
   or has_table_privilege('authenticated', t.name, 'select,insert,update,delete');`));
  if (browserPrivileges !== 0) throw new Error("Browser roles retained direct privileges on restored RenderLab tables.");

  const orphanAssets = Number(scalar(`
select count(*)
from public.media_assets a
left join public.generation_jobs j on j.id = a.generation_job_id
where a.generation_job_id is not null and j.id is null;`));
  if (orphanAssets !== 0) throw new Error(`Restored media contains ${orphanAssets} orphan generation references.`);

  const ownerOrphans = Number(scalar(`
select count(*) from (
  select owner_id from public.generation_jobs
  union all select owner_id from public.media_assets
  union all select owner_id from public.media_collections
  union all select owner_id from public.media_collection_items
  union all select user_id from public.renderlab_account_access
  union all select claimed_user_id from public.renderlab_beta_invitations where claimed_user_id is not null
  union all select updated_by from public.renderlab_beta_settings where updated_by is not null
  union all select user_id from public.renderlab_account_lifecycle
  union all select owner_id from public.renderlab_account_profiles
  union all select owner_id from public.renderlab_account_preferences
) ids
left join auth.users u on u.id = ids.owner_id
where u.id is null;`));
  if (ownerOrphans !== 0) throw new Error(`Restored state contains ${ownerOrphans} owner references without Auth users.`);

  return { authUsers, authIdentities, authSessions, rlsMissing, browserPrivileges, orphanAssets, ownerOrphans };
}

const started = performance.now();
const tempDir = await mkdtemp(join(tmpdir(), "renderlab-ent007-restore-"));
try {
  const { snapshot, manifest } = await loadSnapshot();
  if (snapshot.format !== "renderlab-ent007-logical-snapshot") throw new Error("Unexpected ENT-007 snapshot format.");
  if (snapshot.omitted?.sessionContinuity !== false || snapshot.omitted?.mfaContinuity !== false) {
    throw new Error("ENT-007 restore contract must require fresh sessions and MFA re-enrollment.");
  }
  const migrationHead = verifyMigrationHead(snapshot);
  const shimPath = await writeAuthShim(tempDir);
  psql(["-f", shimPath]);

  const migrationFiles = execFileSync("git", ["ls-files", "supabase/migrations/*.sql"], { encoding: "utf8" })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  for (const migration of migrationFiles) psql(["-f", migration]);

  const restorePath = await writeRestoreData(tempDir, snapshot);
  psql(["-f", restorePath]);
  const checks = verifyRestoredState(snapshot, manifest);
  const elapsedMs = Math.round(performance.now() - started);
  const evidence = {
    format: "renderlab-ent007-restore-evidence",
    version: 1,
    generationId: manifest.generationId,
    sourceProjectRef: snapshot.sourceProjectRef,
    migrationHead,
    restoredTableCount: restoreOrder.length,
    restoredRowCounts: manifest.rowCounts,
    authUserCount: checks.authUsers,
    authIdentityCount: checks.authIdentities,
    restoredSessionCount: checks.authSessions,
    rlsMissingCount: checks.rlsMissing,
    browserPrivilegeViolationCount: checks.browserPrivileges,
    orphanMediaReferenceCount: checks.orphanAssets,
    ownerOrphanCount: checks.ownerOrphans,
    sessionContinuity: false,
    mfaContinuity: false,
    elapsedMs,
  };
  console.log(JSON.stringify(evidence));
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
