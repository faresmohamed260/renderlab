import { test as base, expect } from "@playwright/test";
import { emptyHistory, fixtureAssetId, fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
// Mirrors the GenerationCapabilities response: optional flags are emitted only when true.
const hostedCapabilities = { available: true, fiboAvailable: true, fiboMaskAvailable: true } satisfies { available: boolean; fiboAvailable?: true; fiboMaskAvailable?: true; fiboAutoVglAvailable?: true };

export const test = base.extend<{ io: string[] }>({
  io: async ({ context }, use) => {
    const calls: string[] = [];
    const unexpected: string[] = [];
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== origin) {
        unexpected.push(request.method() + " " + url.origin);
        await route.abort();
        return;
      }
      if (request.method() === "GET" && url.pathname === "/api/generation/jobs" && !url.search) {
        calls.push("GET capabilities");
        await route.fulfill({ json: hostedCapabilities });
        return;
      }
      if (url.pathname === "/api/media/assets" && request.method() === "GET"
        && url.searchParams.get("origin") === "generated") {
        calls.push("GET history");
        await route.fulfill({ json: emptyHistory });
        return;
      }
      if (request.method() === "GET" && url.pathname === "/api/media/assets/" + fixtureAssetId + "/content" && url.searchParams.get("source") === "1") {
        calls.push("GET continuation source");
        await route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        return;
      }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push(request.method() + " " + url.pathname);
        await route.abort();
        return;
      }
      await route.continue();
    });
    await use(calls);
    expect(unexpected, "No unknown API, provider, or external browser requests").toEqual([]);
  },
});

export { expect };
