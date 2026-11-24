import { test as base, expect, type Route } from "@playwright/test";
import type { BatchDeleteMediaAssetsRequest, BatchDeleteMediaAssetsResponse, BatchFavoriteMediaAssetsRequest,
  BatchFavoriteMediaAssetsResponse, FavoriteMediaAssetResponse, RenameMediaAssetResponse, DeleteMediaAssetResponse } from "@/lib/api/media-assets-contract";
import type { BatchMediaCollectionMembershipRequest, BatchMediaCollectionMembershipResponse,
  MediaCollectionMembershipResponse, DeleteMediaCollectionResponse, UpdateMediaCollectionResponse } from "@/lib/api/media-collections-contract";
import { firstAsset, secondAsset, collection } from "../component-app/library-fixtures";

type Call = { method: string; path: string; body: unknown };
type IO = { calls: Call[]; failNext: boolean };
const origin = "http://127.0.0.1:4173";

export const test = base.extend<{ io: IO }>({
  io: async ({ context }, use) => {
    const io: IO = { calls: [], failNext: false };
    const unexpected: string[] = [];
    let batchDeletes = 0;
    // Keep mocked persistence visible to the fixture server on router.refresh().
    const persist = (name: string, value: string) => context.addCookies([{ name, value, url: origin }]);
    const reject = async (route: Route, reason: string) => {
      unexpected.push(reason);
      await route.abort();
    };
    await context.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const path = url.pathname;
      if (url.origin !== origin) return reject(route, method + " " + url.origin);
      if (!path.startsWith("/api/") && !path.startsWith("/create-preview/")) return route.continue();
      const body: unknown = request.postData() ? request.postDataJSON() : null;
      io.calls.push({ method, path, body });
      const failureEligible =
        (method === "POST" && path === "/api/media/assets/batch-favorite")
        || (method === "PUT" && path === "/api/media/assets/" + firstAsset.id + "/favorite")
        || (method === "DELETE" && path === "/api/media/assets/" + firstAsset.id);
      if (io.failNext && failureEligible) {
        io.failNext = false;
        return route.fulfill({ status: 503, json: { ok: false, error: { code: "media_unavailable", message: "Fixture request failed." } } });
      }
      if (method === "POST" && path === "/api/media/assets/batch-delete") {
        const { assetIds } = body as BatchDeleteMediaAssetsRequest;
        const expected = batchDeletes++ === 0 ? [firstAsset.id, secondAsset.id] : [secondAsset.id];
        if (JSON.stringify(assetIds) !== JSON.stringify(expected)) return reject(route, "Unexpected delete IDs");
        const partial = expected.length === 2;
        const response: BatchDeleteMediaAssetsResponse = {
          ok: true,
          results: partial ? [
            { assetId: firstAsset.id, ok: true, deleted: true, cleanupPending: false },
            { assetId: secondAsset.id, ok: false, error: { code: "media_unavailable", message: "Retry fixture" } },
          ] : [{ assetId: secondAsset.id, ok: true, deleted: true, cleanupPending: false }],
          summary: { requested: expected.length, deleted: 1, cleanupPending: 0, failed: partial ? 1 : 0 },
        };
        return route.fulfill({ json: response });
      }
      if (method === "POST" && path === "/api/media/assets/batch-favorite") {
        const { assetIds, favorite } = body as BatchFavoriteMediaAssetsRequest;
        const response: BatchFavoriteMediaAssetsResponse = { ok: true, favorite,
          results: assetIds.map(assetId => ({ assetId, ok: true, favorite })),
          summary: { requested: assetIds.length, succeeded: assetIds.length, failed: 0 } };
        return route.fulfill({ json: response });
      }
      if (method === "POST" && path === "/api/media/collections/" + collection.id + "/items/batch") {
        const { assetIds, containsAsset } = body as BatchMediaCollectionMembershipRequest;
        const response: BatchMediaCollectionMembershipResponse = { ok: true, collectionId: collection.id, containsAsset,
          results: assetIds.map(assetId => ({ assetId, ok: true, containsAsset })),
          summary: { requested: assetIds.length, succeeded: assetIds.length, failed: 0 } };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/assets/" + firstAsset.id + "/favorite" && (method === "PUT" || method === "DELETE")) {
        await persist("fixture-favorite", method === "PUT" ? "1" : "0");
        const response: FavoriteMediaAssetResponse = { ok: true, asset: { ...firstAsset, isFavorite: method === "PUT" } };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/assets/" + firstAsset.id && method === "PATCH") {
        await persist("fixture-name", (body as { displayName: string }).displayName);
        const response: RenameMediaAssetResponse = { ok: true, asset: { ...firstAsset, displayName: (body as { displayName: string }).displayName } };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/assets/" + firstAsset.id && method === "DELETE") {
        const response: DeleteMediaAssetResponse = { ok: true, deleted: true, cleanupPending: false };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/collections/" + collection.id && method === "PATCH") {
        const response: UpdateMediaCollectionResponse = { ok: true, collection: { ...collection, name: (body as { name: string }).name } };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/collections/" + collection.id && method === "DELETE") {
        const response: DeleteMediaCollectionResponse = { ok: true, collectionId: collection.id, deleted: true };
        return route.fulfill({ json: response });
      }
      if (path === "/api/media/collections/" + collection.id + "/items/" + firstAsset.id && (method === "PUT" || method === "DELETE")) {
        await persist("fixture-membership", method === "PUT" ? "1" : "0");
        const response: MediaCollectionMembershipResponse = { ok: true, collection: { ...collection, containsAsset: method === "PUT" } };
        return route.fulfill({ json: response });
      }
      return reject(route, method + " " + path);
    });
    await use(io);
    expect(unexpected, "Only explicit fixture I/O; never contact providers").toEqual([]);
    expect(io.failNext, "Every requested failure must be consumed by an allowed endpoint").toBe(false);
  },
});
export { expect };
