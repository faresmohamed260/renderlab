import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { springRoles, springOptions } from "../../src/lib/ui/spring-roles.ts";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const css = read("src/app/semantic-tokens.css");
const base = css.split("@supports")[0];
const tokens = new Map([...base.matchAll(/^\s*--rl-([\w-]+):\s*([^;]+);/gm)].map(([, name,value]) => [name,value.trim()]));
const get = (name) => {
  const value = tokens.get(name);
  assert.ok(value, name);
  const alias = /^var\(--rl-([\w-]+)\)$/.exec(value);
  return alias ? get(alias[1]) : value;
};
test("production token owner is imported once; no production CSS redefines its roles", () => {
  assert.equal(read("src/app/globals.css").match(/@import "\.\/semantic-tokens\.css";/g)?.length, 1);
  assert.equal([...base.matchAll(/^\s*--rl-[\w-]+:/gm)].length, tokens.size);
  for (const entry of readdirSync(new URL("../../src", import.meta.url), {recursive:true})) {
    if (!entry.endsWith(".css") || entry.replaceAll("\\","/") === "app/semantic-tokens.css") continue;
    assert.doesNotMatch(read("src/" + entry), /--rl-[\w-]+\s*:/, entry);
  }
  assert.doesNotMatch(css, /--rlv2-|design\/system\/v2/);
});
test("semantic colors and action gradients match the approved corrected values", () => {
  const expected = {
    canvas:"#07060b", "surface-base":"#191620", "surface-raised":"#252134",
    "surface-high":"#312a40", "surface-panel":"#201b30", "surface-overlay":"#201a30",
    "surface-selected":"#403657", "surface-field-focus":"#352a63", "text-primary":"#f5f5f7",
    "text-secondary":"#d5d1e1", "text-quiet":"#beb9cc", "text-disabled":"#beb9cc",
    "text-placeholder":"#beb9cc", "accent-primary":"#6d50d1", "accent-primary-end":"#9841bd",
    "accent-hover":"#7654d8", "accent-hover-end":"#a045c4", "accent-pressed":"#6044bd",
    "accent-pressed-end":"#8535aa", "on-accent":"#ffffff", focus:"#e6ddff",
    "border-boundary":"#a9a0bd", success:"#76dbb3", warning:"#f0c878", danger:"#ff9ba5"
  };
  for (const [name,value] of Object.entries(expected)) assert.equal(get(name),value,name);
  assert.equal(get("gradient-primary"),"linear-gradient(110deg, var(--rl-accent-primary), var(--rl-accent-primary-end))");
  assert.equal(get("focus-width"),"2px");
  assert.equal(get("focus-offset"),"3px");
  assert.equal(get("hit-minimum"),"24px");
});
test("opaque defaults, filter opt-in and user preference fallbacks are explicit", () => {
  assert.equal(get("surface-panel-layered"),"#201b30");
  assert.equal(get("surface-overlay-layered"),"#201a30");
  assert.equal(get("material-panel"),"none");
  assert.match(css, /@supports \(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /--rl-surface-panel-layered: rgb\(255 255 255 \/ 5\.5%\)/);
  assert.match(css, /--rl-material-panel: blur\(30px\) saturate\(150%\)/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\), \(forced-colors: active\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*--rl-duration-contextual: 0ms/);
});
test("shared spring roles agree with V2 and reduced motion commits immediately", () => {
  const spec = read("docs/ui/DESIGN_LANGUAGE_V2.md");
  const expected = Object.fromEntries([...spec.matchAll(/^\| (snappy|smooth|gentle|drag-release) \| (\d+) \| (\d+) \| (\d+) \|/gm)].map(([,name,tension,friction,mass])=>[name,{tension:+tension,friction:+friction,mass:+mass}]));
  assert.deepEqual(springRoles,expected);
  for (const name of Object.keys(expected)) {
    assert.deepEqual(springOptions(name,false),{config:expected[name],immediate:false});
    assert.deepEqual(springOptions(name,true),{config:expected[name],immediate:true});
  }
});
