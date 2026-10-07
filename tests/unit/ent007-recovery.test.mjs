import assert from "node:assert/strict";
import test from "node:test";
import {
  ENT007_AUTH_IDENTITY_COLUMNS,
  ENT007_AUTH_USER_COLUMNS,
  ENT007_PUBLIC_TABLES,
  authIdentitiesQuery,
  authUsersQuery,
  decodeBackupKey,
  decryptSnapshot,
  durableR2KeysFromTables,
  encryptSnapshot,
  stableJson,
  tableSnapshotQuery,
} from "../../scripts/lib/ent007-recovery.mjs";

test("ENT-007 table contract excludes legacy Studio and staging state", () => {
  const names = ENT007_PUBLIC_TABLES.map((item) => item.name);
  assert.equal(names.some((name) => name.startsWith("studio_")), false);
  assert.equal(names.includes("generation_sources"), false);
  assert.equal(names.includes("media_upload_sessions"), false);
  assert.equal(names.includes("renderlab_account_exports"), false);
  assert.equal(names.includes("media_assets"), true);
  assert.equal(names.includes("renderlab_account_lifecycle"), true);
});

test("ENT-007 auth contract preserves identity but omits transient token columns", () => {
  assert.ok(ENT007_AUTH_USER_COLUMNS.includes("encrypted_password"));
  assert.equal(ENT007_AUTH_USER_COLUMNS.includes("recovery_token"), false);
  assert.equal(ENT007_AUTH_USER_COLUMNS.includes("confirmation_token"), false);
  assert.ok(ENT007_AUTH_IDENTITY_COLUMNS.includes("identity_data"));
});
test("ENT-007 query builders are schema-qualified and UUID-bounded", () => {
  const tableSql = tableSnapshotQuery({ name: "media_assets", orderBy: "id" });
  assert.match(tableSql, /from public\.media_assets as t/);

  const userId = "11111111-1111-4111-8111-111111111111";
  assert.match(authUsersQuery([userId]), /from auth\.users/);
  assert.match(authIdentitiesQuery([userId]), /from auth\.identities/);
  assert.throws(() => authUsersQuery(["not-a-uuid"]), /Invalid UUID/);
});

test("ENT-007 stable JSON sorts object keys recursively", () => {
  assert.equal(
    stableJson({ z: 1, a: { y: 2, b: 3 }, rows: [{ d: 4, c: 5 }] }),
    '{"a":{"b":3,"y":2},"rows":[{"c":5,"d":4}],"z":1}',
  );
});

test("ENT-007 AES-GCM envelope round-trips and detects tampering", () => {
  const key = decodeBackupKey(Buffer.alloc(32, 7).toString("base64"));
  const plaintext = Buffer.from('{"hello":"renderlab"}', "utf8");
  const envelope = encryptSnapshot(plaintext, key);
  assert.deepEqual(decryptSnapshot(envelope, key), plaintext);

  const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -4)}AAAA` };
  assert.throws(() => decryptSnapshot(tampered, key));
});
test("ENT-007 durable R2 selection excludes tombstoned media and includes active avatars", () => {
  const ownerId = "22222222-2222-4222-8222-222222222222";
  const keys = durableR2KeysFromTables({
    media_assets: [
      { storage_key: "renderlab/generations/keep.png", thumbnail_storage_key: "renderlab/thumbnails/keep.webp", deleted_at: null, purged_at: null },
      { storage_key: "renderlab/generations/delete.png", thumbnail_storage_key: null, deleted_at: "2026-10-07T00:00:00Z", purged_at: null },
    ],
    renderlab_account_profiles: [{ owner_id: ownerId, avatar_state: "active" }],
  });
  assert.deepEqual(keys, [
    `renderlab/account-profiles/${ownerId}/avatar.webp`,
    "renderlab/generations/keep.png",
    "renderlab/thumbnails/keep.webp",
  ]);
});
