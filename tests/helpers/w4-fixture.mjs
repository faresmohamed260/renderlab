import assert from "node:assert/strict";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { readFileSync } from "node:fs";

export const ownerA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const ownerB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const foreignId = "bbbbbbbb-0000-4000-8000-bbbbbbbbbbbb";
export const fixedIso = "2026-11-23T12:00:00.000Z";
const NativeDate = Date;
const fixedMs = NativeDate.parse(fixedIso);

export function installRiskHarness({ storage = false } = {}) {
  Object.assign(process.env, {
    SUPABASE_URL: "https://db.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-w4-service-role-not-a-secret",
    SUPABASE_PUBLISHABLE_KEY: "synthetic-w4-publishable",
    GITHUB_ACTIONS: "true",
  });
  globalThis.Date = class FixedDate extends NativeDate {
    constructor(...args) { if (args.length) super(...args); else super(fixedMs); }
    static now() { return fixedMs; }
  };
  const data = (code) => ({ url: "data:text/javascript," + encodeURIComponent(code), shortCircuit: true });
  registerHooks({
    resolve(spec, context, next) {
      if (spec === "server-only") return data("export {};");
      if (storage && spec === "@/server/storage/r2") return data(
        'const s=()=>globalThis[Symbol.for("w4.storage")];'
        + 'export function isR2Configured(){return true;}'
        + 'export async function deleteR2Object(key){s().deleted.push(key);if(s().failDelete)throw Error("FAKE_R2_DELETE_FAILURE");}'
        + 'export async function r2ObjectExists(key){s().exists.push(key);return s().objectExists;}'
        + 'export async function createSignedReadUrl(key,ttl){s().read.push({key,ttl});return "https://signed.invalid/read";}'
        + 'export async function createSignedDownloadUrl(arg){s().download.push(arg);return "https://signed.invalid/download";}'
        + 'export async function createSignedUploadUrl(arg){s().upload.push(arg);return "https://signed.invalid/upload";}'
        + 'export async function headR2Object(key){s().head.push(key);return s().objectHead;}'
        + 'export async function readR2Object(){throw Error("UNEXPECTED_STORAGE_READ");}'
        + 'export async function writeR2Object(){throw Error("UNEXPECTED_STORAGE_WRITE");}'
      );
      if (storage && spec === "@/server/media/image-thumbnail") return data(
        'export const IMAGE_THUMBNAIL_CONTENT_TYPE="image/webp";'
        + 'export function imageThumbnailStorageKey(){return "fake-thumbnail";}'
        + 'export async function createImageThumbnailBytes(){throw Error("UNEXPECTED_THUMBNAIL");}'
      );
      if (spec.startsWith("@/")) return next(new URL("../../src/" + spec.slice(2) + ".ts", import.meta.url).href, context);
      return next(spec, context);
    },
    load(url, context, nextLoad) {
      // Node's default TS stripping rejects parameter properties. Transform
      // only the two existing admin service modules; no app source is edited.
      if (url.includes("/src/server/admin/") && /admin-(settings|operations)[.]ts$/.test(url)) {
        return { format: "module", source: stripTypeScriptTypes(readFileSync(new URL(url), "utf8"), { mode: "transform" }), shortCircuit: true };
      }
      return nextLoad(url, context);
    },
  });
}

export function storageFixture() {
  const state = { deleted: [], exists: [], read: [], download: [], upload: [], head: [],
    failDelete: false, objectExists: true, objectHead: { contentType: "image/png", sizeBytes: 10, etag: "safe-etag" } };
  globalThis[Symbol.for("w4.storage")] = state;
  return state;
}

// Any unrecognized URL fails. The actual service-role wrapper performs the HTTP call.
export function fakeDb(t, respond = () => []) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    const u = new URL(url);
    assert.equal(u.origin, "https://db.example.invalid", "No outbound network/proxy calls");
    assert.ok(u.pathname.startsWith("/rest/v1/"));
    const call = { path: u.pathname.slice("/rest/v1/".length), method: init.method || "GET",
      query: u.searchParams, body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    const result = await respond(call);
    if (result && result.__dbError) return Response.json({
      code: result.code || "P0001", message: result.__dbError,
      details: "SENSITIVE_UPSTREAM_DETAIL_SENTINEL",
    }, { status: result.status || 400 });
    return Response.json(result === undefined ? [] : result);
  });
  return calls;
}

export function assertOwnerQueries(calls, owner = ownerA) {
  for (const call of calls) {
    if (call.path.startsWith("rpc/")) continue;
    if (call.path.startsWith("renderlab_beta_settings")) continue;
    const scoped = call.query.get("owner_id") === "eq." + owner
      || call.query.get("user_id") === "eq." + owner;
    assert.ok(scoped, "Unscoped DB operation: " + call.method + " " + call.path);
  }
}
