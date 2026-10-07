import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const ENT007_SNAPSHOT_FORMAT = "renderlab-ent007-logical-snapshot";
export const ENT007_ENCRYPTED_FORMAT = "renderlab-ent007-encrypted-snapshot";
export const ENT007_SNAPSHOT_VERSION = 1;

export const ENT007_PUBLIC_TABLES = Object.freeze([
  { name: "generation_jobs", orderBy: "id" },
  { name: "media_assets", orderBy: "id" },
  { name: "media_collections", orderBy: "id" },
  { name: "media_collection_items", orderBy: "collection_id, media_asset_id" },
  { name: "renderlab_account_access", orderBy: "user_id" },
  { name: "renderlab_beta_invitations", orderBy: "id" },
  { name: "renderlab_beta_settings", orderBy: "singleton_id" },
  { name: "renderlab_account_lifecycle", orderBy: "user_id" },
  { name: "renderlab_account_profiles", orderBy: "owner_id" },
  { name: "renderlab_account_preferences", orderBy: "owner_id" },
]);

export const ENT007_EXCLUDED_PUBLIC_TABLES = Object.freeze({
  generation_sources: "temporary reference staging",
  media_upload_sessions: "temporary upload staging",
  generation_admission_reservations: "ephemeral generation admission state",
  renderlab_account_exports: "regenerable export artifacts",
  upload_admission_reservations: "ephemeral upload admission state",
  renderlab_diagnostic_events: "bounded operational telemetry, not recovery authority",
  renderlab_operational_alerts: "derived operational alert state",
});
export const ENT007_AUTH_USER_COLUMNS = Object.freeze([
  "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at",
  "invited_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data",
  "created_at", "updated_at", "phone", "phone_confirmed_at", "banned_until",
  "is_sso_user", "deleted_at", "is_anonymous",
]);

export const ENT007_AUTH_IDENTITY_COLUMNS = Object.freeze([
  "id", "provider_id", "user_id", "identity_data", "provider",
  "last_sign_in_at", "created_at", "updated_at",
]);

export const ENT007_OMITTED_AUTH_STATE = Object.freeze([
  "refresh_tokens", "sessions", "mfa_factors", "mfa_challenges", "mfa_amr_claims",
  "flow_state", "one_time_tokens", "oauth_authorizations", "oauth_consents",
  "webauthn_credentials", "webauthn_challenges", "mfa_recovery_code_sets",
  "mfa_recovery_codes",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value) {
  if (!UUID_RE.test(String(value))) throw new Error(`Invalid UUID in recovery set: ${value}`);
  return String(value).toLowerCase();
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}
export function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

export function decodeBackupKey(encoded) {
  const key = Buffer.from(String(encoded || ""), "base64");
  if (key.length !== 32) throw new Error("ENT007_BACKUP_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSnapshot(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    format: ENT007_ENCRYPTED_FORMAT,
    version: ENT007_SNAPSHOT_VERSION,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    plaintextSha256: sha256Hex(plaintext),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSnapshot(envelope, key) {
  if (envelope?.format !== ENT007_ENCRYPTED_FORMAT || envelope?.algorithm !== "aes-256-gcm") {
    throw new Error("Unsupported ENT-007 encrypted snapshot envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  if (sha256Hex(plaintext) !== envelope.plaintextSha256) throw new Error("ENT-007 snapshot plaintext hash mismatch.");
  return plaintext;
}
export function tableSnapshotQuery({ name, orderBy }) {
  return `select coalesce(jsonb_agg(to_jsonb(t) order by ${orderBy}), '[]'::jsonb) as rows from public.${name} as t`;
}

export const ENT007_OWNER_IDS_QUERY = `
select distinct user_id::text as user_id
from (
  select owner_id as user_id from public.generation_jobs
  union all select owner_id from public.media_assets
  union all select owner_id from public.media_collections
  union all select owner_id from public.media_collection_items
  union all select user_id from public.renderlab_account_access
  union all select claimed_user_id from public.renderlab_beta_invitations
  union all select updated_by from public.renderlab_beta_settings
  union all select user_id from public.renderlab_account_lifecycle
  union all select owner_id from public.renderlab_account_profiles
  union all select owner_id from public.renderlab_account_preferences
) as ids
where user_id is not null
order by user_id`;

export function authUsersQuery(userIds) {
  const ids = userIds.map(assertUuid);
  if (ids.length === 0) return `select ${ENT007_AUTH_USER_COLUMNS.join(", ")} from auth.users where false`;
  const literals = ids.map((id) => `'${id}'::uuid`).join(",");
  return `select ${ENT007_AUTH_USER_COLUMNS.join(", ")} from auth.users where id in (${literals}) order by id`;
}

export function authIdentitiesQuery(userIds) {
  const ids = userIds.map(assertUuid);
  if (ids.length === 0) return `select ${ENT007_AUTH_IDENTITY_COLUMNS.join(", ")} from auth.identities where false`;
  const literals = ids.map((id) => `'${id}'::uuid`).join(",");
  return `select ${ENT007_AUTH_IDENTITY_COLUMNS.join(", ")} from auth.identities where user_id in (${literals}) order by user_id, id`;
}

export const ENT007_MIGRATIONS_QUERY = `
select version, name
from supabase_migrations.schema_migrations
where name like 'renderlab_%' or name = 'revoke_account_lifecycle_trigger_rpc_execute'
order by version`;
export function normalizeManagementRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error("Unexpected Supabase Management API query response shape.");
}

function aggregateRows(result) {
  const rows = normalizeManagementRows(result);
  const value = rows[0]?.rows ?? [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  }
  throw new Error("Expected an aggregated rows array from Supabase.");
}

export async function collectEnt007Snapshot({ query, projectRef, generatedAt = new Date().toISOString() }) {
  const tables = {};
  for (const spec of ENT007_PUBLIC_TABLES) {
    tables[spec.name] = aggregateRows(await query(tableSnapshotQuery(spec), { managed: false }));
  }

  const ownerRows = normalizeManagementRows(await query(ENT007_OWNER_IDS_QUERY, { managed: false }));
  const ownerIds = [...new Set(ownerRows.map((row) => assertUuid(row.user_id)))].sort();
  const authUsers = normalizeManagementRows(await query(authUsersQuery(ownerIds), { managed: true }));
  const authIdentities = normalizeManagementRows(await query(authIdentitiesQuery(ownerIds), { managed: true }));
  const migrations = normalizeManagementRows(await query(ENT007_MIGRATIONS_QUERY, { managed: false }));

  return {
    format: ENT007_SNAPSHOT_FORMAT,
    version: ENT007_SNAPSHOT_VERSION,
    generatedAt,
    sourceProjectRef: projectRef,
    migrations,
    tables,
    auth: { users: authUsers, identities: authIdentities },
    omitted: {
      publicTables: ENT007_EXCLUDED_PUBLIC_TABLES,
      authState: ENT007_OMITTED_AUTH_STATE,
      sessionContinuity: false,
      mfaContinuity: false,
    },
  };
}
export function durableR2KeysFromTables(tables) {
  const keys = new Set();
  for (const asset of tables.media_assets ?? []) {
    if (asset.deleted_at || asset.purged_at) continue;
    if (asset.storage_key) keys.add(String(asset.storage_key));
    if (asset.thumbnail_storage_key) keys.add(String(asset.thumbnail_storage_key));
  }
  for (const profile of tables.renderlab_account_profiles ?? []) {
    if (profile.avatar_state === "active" && profile.owner_id) {
      keys.add(`renderlab/account-profiles/${assertUuid(profile.owner_id)}/avatar.webp`);
    }
  }
  return [...keys].sort();
}

export function buildSafeManifest({ snapshot, plaintext, encryptedEnvelope, generationId }) {
  const rowCounts = Object.fromEntries(
    Object.entries(snapshot.tables).map(([name, rows]) => [name, rows.length]),
  );
  const migrationHead = snapshot.migrations.at(-1) ?? null;
  const encryptedText = stableJson(encryptedEnvelope);
  return {
    format: "renderlab-ent007-backup-manifest",
    version: ENT007_SNAPSHOT_VERSION,
    generationId,
    generatedAt: snapshot.generatedAt,
    sourceProjectRef: snapshot.sourceProjectRef,
    migrationHead,
    rowCounts,
    authUserCount: snapshot.auth.users.length,
    authIdentityCount: snapshot.auth.identities.length,
    durableObjectCount: durableR2KeysFromTables(snapshot.tables).length,
    plaintextSha256: sha256Hex(plaintext),
    encryptedEnvelopeSha256: sha256Hex(encryptedText),
    sessionContinuity: false,
    mfaContinuity: false,
  };
}
