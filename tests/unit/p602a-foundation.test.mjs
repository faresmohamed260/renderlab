import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { springs } from "../../design/system/v2/springs.ts";
import { productionLeak, productionSourceLeak, productionBuildLeak, prototypeProblems } from "../../scripts/verify-p602a-isolation.mjs";

const spec = await readFile(new URL("../../docs/ui/DESIGN_LANGUAGE_V2.md", import.meta.url), "utf8");
const css = await readFile(new URL("../../design/system/v2/tokens.css", import.meta.url), "utf8");
const baseCss = css.slice(0, css.indexOf("@media"));
const tokens = Object.fromEntries([...baseCss.matchAll(/^\s*--rlv2-([\w-]+):\s*([^;]+);/gm)].map(([, name, value]) => [name, value.trim()]));
const readToken = (name) => {
  const value = tokens[name];
  assert.ok(value, "Missing token " + name);
  const alias = /^var\(--rlv2-([\w-]+)\)$/.exec(value);
  return alias ? readToken(alias[1]) : value;
};
const table = new Map(spec.split("\n").filter((line) => line.startsWith("| ")).map((line) => {
  const [, role, value] = line.split("|");
  return [role.trim(), value.trim()];
}));
function role(name) {
  assert.ok(table.has(name), "Missing V2 specification row " + name);
  return table.get(name);
}

test("palette owners match the authoritative candidate table, not historical inputs", () => {
  const pairs = [
    ["canvas", ["canvas"]],
    ["surface.base / raised / high", ["surface-base", "surface-raised", "surface-high"]],
    ["surface.panel", ["surface-panel"]],
    ["surface.control / hover / field-focus", ["surface-control", "surface-hover", "surface-field-focus"]],
    ["surface.selected", ["surface-selected", "text-selected"]],
    ["surface.overlay", ["surface-overlay"]],
    ["text.primary / secondary / quiet", ["text-primary", "text-secondary", "text-quiet"]],
    ["text.placeholder / disabled", ["text-placeholder", "text-disabled"]],
    ["accent.primary / hover / on-accent", ["accent-primary", "accent-hover", "on-accent"]],
    ["accent.focus / geometry", ["focus"]],
    ["border.subtle / boundary", ["border-subtle", "border-boundary"]],
    ["border.action-selection", ["border-action-selection"]],
    ["status.success / warning / danger", ["success", "warning", "danger"]],
  ];
  for (const [label, names] of pairs) {
    assert.deepEqual(names.map(readToken), role(label).match(/#[0-9a-f]{6}\b/g), label);
  }
  for (const [label, name] of [
    ["surface.panel", "surface-panel-layered"],
    ["surface.overlay", "surface-overlay-layered"],
    ["atmosphere.creative", "atmosphere-creative"],
    ["elevation.panel", "elevation-panel"],
    ["elevation.overlay", "elevation-overlay"],
  ]) {
    assert.ok(role(label).includes(readToken(name)), name);
  }
  assert.deepEqual([readToken("focus-width"), readToken("focus-offset")], role("accent.focus / geometry").match(/\d+px/g));
  assert.equal(readToken("material-panel"), "blur(16px) saturate(110%)");
  assert.equal(readToken("material-shell"), readToken("material-panel"));
  assert.equal(readToken("material-overlay"), "blur(16px)");
  assert.equal(readToken("material-none"), "none");
  for (const name of ["flat", "primary", "focus"]) assert.equal(readToken("elevation-" + name), "none");
});

test("geometry, type and timing roles use the reviewed spec values", () => {
  const numeric = (name) => Number.parseFloat(readToken(name));
  const numbers = (row) => row.match(/\d+(?:\.\d+)?/g).map(Number);
  assert.deepEqual(["micro", "control", "field", "panel", "pill"].map((name) => numeric("radius-" + name)), numbers(role("radius.micro / control / field / panel / pill").split("px;")[0]));
  assert.deepEqual([4, 8, 12, 16, 24, 32, 48, 64].map((n) => numeric("space-" + n)), numbers(role("spacing").split("px modular")[0]));
  const body = role("type.body / label / caption");
  assert.deepEqual(["body", "label", "caption"].map((name) => numeric("type-" + name) * 16), numbers(body.split("px at")[0]));
  assert.deepEqual(["body", "label", "caption"].map((name) => numeric("leading-" + name)), numbers(body.split("root; ")[1].split(" line height")[0]));
  assert.deepEqual(["body", "label", "caption"].map((name) => numeric("weight-" + name)), numbers(body.split("line height, ")[1].split(" weight")[0]));
  assert.deepEqual(["section", "page", "display"].map((name) => numeric("type-" + name) * 16), numbers(role("type.section / page / display").split("px,")[0]));
  assert.equal(readToken("weight-heading"), "600");
  assert.ok(readToken("type-family").startsWith("Inter,"));
  assert.deepEqual(["compact", "regular", "large"].map((name) => numeric("control-" + name)), numbers(role("control.visual / effective hit").split("px visual")[0]));
  assert.deepEqual([readToken("hit-preferred"), readToken("hit-minimum")], ["44px", "24px"]);
  const timings = spec.match(/Color\/opacity changes use (\d+ms) micro, (\d+ms) normal, (\d+ms) contextual; ease-out (cubic-bezier\([^)]+\))/);
  assert.ok(timings);
  assert.deepEqual(["micro", "normal", "contextual"].map((name) => readToken("duration-" + name)), timings.slice(1, 4));
  assert.equal(readToken("ease-out").replaceAll(" ", ""), timings[4].replaceAll(" ", ""));
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{\s*--rlv2-duration-micro: 0ms;\s*--rlv2-duration-normal: 0ms;\s*--rlv2-duration-contextual: 0ms;/);
});

test("all four named spring configs map the merged physics table directly", () => {
  const expected = Object.fromEntries([...spec.matchAll(/^\| (snappy|smooth|gentle|drag-release) \| (\d+) \| (\d+) \| (\d+) \|/gm)]
    .map(([, name, tension, friction, mass]) => [name, { tension: Number(tension), friction: Number(friction), mass: Number(mass) }]));
  assert.equal(Object.keys(expected).length, 4);
  assert.deepEqual(springs, expected);
});

test("isolation sentinels detect production paths, imports, rendered markup and CSS", () => {
  for (const [file, body] of [
    ["src/app/p6-02a-create/page.tsx", ""],
    ["src/components/ui/leak.ts", 'import "../../design/system/v2/springs";'],
    ["server/app/page.js", "data-p602a-isolated"],
    ["static/chunks/style.css", "--rlv2-canvas:#0b0c10"],
    ["server/app-paths-manifest.json", '{"p6-02a-create/page":"app/leak.js"}'],
  ]) assert.equal(productionLeak(file, body), true);
  assert.equal(productionLeak("src/app/page.tsx", "export default function Page() {}"), false);
});

test("prototype source guard rejects backend, network, environment and duplicate token paths", () => {
  const file = "design/rd/p6-02a-create/app/page.tsx";
  for (const body of [
    'import "@/server/create-preview";',
    'import "../../../../src/lib/config/runtime-env";',
    'import "next/font/google";',
    'fetch("/api/generation/jobs");',
    'const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;',
    'localStorage.setItem("key", "fixture");',
    ':root { --rlv2-canvas: #fff; }',
  ]) assert.ok(prototypeProblems(file, body).length, body);
  assert.ok(prototypeProblems("design/rd/p6-02a-create/app/api/test/route.ts", "").length);
  assert.deepEqual(prototypeProblems(file, 'import "../../../system/v2/springs";'), []);
  assert.deepEqual(prototypeProblems(file, 'import type { ReactNode } from "react";'), []);
});

test("only the precise production tracing exclusion is permitted; trace manifests still fail closed", () => {
  const config = "  outputFileTracingExcludes: { \"/**\": [\"./design/rd/p6-02a-create/**/*\", \"./design/system/v2/**/*\"] },\n";
  assert.equal(productionSourceLeak("next.config.ts", config), false);
  assert.equal(productionSourceLeak("next.config.ts", config + 'import "./design/system/v2/springs";'), true);
  assert.equal(productionSourceLeak("src/app/page.tsx", config), true);
  assert.equal(productionLeak("server/app/create-preview/[...path]/route.js.nft.json", '{"files":["../../../../../design/system/v2/tokens.css"]}'), true);
});

test("serialized Next exclusion is configuration only; all packaged paths and unexpected metadata remain guarded", () => {
  const manifest = { version: 1, files: ["server/app/page.js"], ignore: [], config: {
    outputFileTracingExcludes: { "/**": ["./design/rd/p6-02a-create/**/*", "./design/system/v2/**/*"] },
  } };
  const serialize = (file, data) => (file.endsWith(".js") ? "self.__SERVER_FILES_MANIFEST=" : "") + JSON.stringify(data, null, 2);
  for (const file of ["required-server-files.json", "required-server-files.js"]) {
    assert.equal(productionBuildLeak(file, serialize(file, manifest)), false);
    assert.equal(productionBuildLeak(file, serialize(file, { ...manifest, files: ["design/system/v2/tokens.css"] })), true);
    assert.equal(productionBuildLeak(file, serialize(file, { ...manifest, ignore: ["design/rd/p6-02a-create/app/page.tsx"] })), true);
    assert.equal(productionBuildLeak(file, serialize(file, { ...manifest, config: { ...manifest.config, extra: "data-p602a-isolated" } })), true);
    assert.equal(productionBuildLeak(file, serialize(file, { ...manifest, config: { outputFileTracingExcludes: { "/**": ["./design/**/*"] } } })), true);
    assert.equal(productionBuildLeak(file, serialize(file, { ...manifest, config: {} })), true);
    assert.equal(productionBuildLeak(file, "malformed"), true);
  }
  assert.equal(productionBuildLeak("server/app/create-preview/[...path]/route.js.nft.json", '{"files":["../../../../../design/system/v2/tokens.css"]}'), true);
  assert.equal(productionBuildLeak("static/chunks/leak.css", "--rlv2-canvas:#0b0c10"), true);
});
