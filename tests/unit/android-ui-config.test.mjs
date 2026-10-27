import test from "node:test";
import assert from "node:assert/strict";
import {
  ANDROID_TAB_IDS,
  DEFAULT_ANDROID_UI_CONFIG,
  parseAndroidUiConfig,
  parseAndroidUiConfigOverride,
} from "../../src/lib/api/android-ui-config-contract.ts";

const copy = () => structuredClone(DEFAULT_ANDROID_UI_CONFIG);

test("the default public Android config includes only the four existing tabs", () => {
  const result = parseAndroidUiConfig(DEFAULT_ANDROID_UI_CONFIG);
  assert.equal(result.version, 1);
  assert.equal(result.brand, "RenderLab");
  assert.deepEqual(result.tabs.map(t => t.id), [...ANDROID_TAB_IDS]);
  assert.equal(parseAndroidUiConfigOverride(undefined).revision, result.revision);
});

test("a different order, short label and approved icon are allowed", () => {
  const config = copy();
  config.revision = "v1-tab-layout-2";
  config.tabs.reverse();
  config.tabs[0].label = "Account";
  config.tabs[0].icon = "person-circle-outline";
  const result = parseAndroidUiConfigOverride(JSON.stringify(config));
  assert.equal(result.tabs[0].id, "settings");
  assert.equal(result.tabs[0].label, "Account");
  assert.equal(result.tabs[0].icon, "person-circle-outline");
});

test("missing/repeated/extra routes, backend redirects or hidden flags are rejected", () => {
  for (const mutate of [
    c => { c.tabs.pop(); },
    c => { c.tabs[1].id = c.tabs[0].id; },
    c => { c.tabs[0].id = "admin"; },
    c => { c.tabs[0].apiUrl = "https://attacker.example"; },
    c => { c.executable = "fetch('https://attacker.example')"; },
    c => { c.tabs[1].icon = "home-outline"; },
    c => { c.version = 2; },
    c => { c.tabs[0].label = "<script>alert(1)</script>"; },
    c => { c.brand = "RenderLab\u202e"; },
    c => { c.revision = "../../../etc/passwd"; },
  ]) {
    const c = copy();
    mutate(c);
    assert.throws(() => parseAndroidUiConfig(c));
  }
});

test("server-only JSON override fails closed on malformed or oversized payload", () => {
  assert.throws(() => parseAndroidUiConfigOverride("not-json"));
  assert.throws(() => parseAndroidUiConfigOverride("x".repeat(4096)));
  assert.throws(() => parseAndroidUiConfigOverride(JSON.stringify({ ok: true })));
});
