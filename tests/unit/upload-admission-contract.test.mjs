import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const media = fs.readFileSync("src/server/media/media-uploads.ts", "utf8");
const reference = fs.readFileSync("src/server/media/reference-uploads.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/0026_renderlab_upload_admission_concurrency_fix.sql", "utf8");

test("upload admission binds deterministic staging identity before row creation", () => {
  assert.match(media, /const uploadId = randomUUID\(\);[\s\S]*bindUploadAdmission\(ownerId, reservation, uploadId\)[\s\S]*id: uploadId/);
  assert.match(reference, /const sourceId = randomUUID\(\);[\s\S]*bindUploadAdmission\(ownerId, reservation, sourceId\)[\s\S]*id: sourceId/);
});

test("upload admission counts only bound reservations whose staging row is not yet pending", () => {
  assert.match(migration, /reservation\.bound_resource_id is null/);
  assert.match(migration, /not exists \(\s*select 1\s*from public\.media_upload_sessions/);
  assert.match(migration, /not exists \(\s*select 1\s*from public\.generation_sources/);
  assert.match(migration, /v_max_active_uploads constant integer := 8/);
  assert.match(migration, /v_max_uploads_per_hour constant integer := 30/);
});
