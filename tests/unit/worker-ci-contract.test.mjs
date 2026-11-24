import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("N6 required quality discovers every worker test in an isolated pinned venv", () => {
  const quality = readFileSync(".github/workflows/engineering-quality.yml", "utf8");
  const pins = readFileSync("workers/fibo-studio/requirements-ci.txt", "utf8");
  assert.match(quality, /python3 -m venv/);
  assert.match(quality, /-r workers\/fibo-studio\/requirements-ci\.txt/);
  assert.match(quality, /find workers -type f -name 'test_\*\.py'/);
  assert.match(quality, /-m unittest discover -s "\$directory" -p "test_\*\.py"/);
  assert.match(quality, /test "\$\{#test_dirs\[@\]\}" -gt 0/);
  for (const line of pins.split("\n").filter(s => s && !s.startsWith("#")))
    assert.match(line, /^[A-Za-z0-9-]+(?:\[[a-z]+\])?==[0-9.]+$/);
  assert.match(pins, /modal==/);
  assert.match(pins, /Pillow==/);
});

test("N9 monthly grouped pip and composite-action updates are registered", () => {
  const yaml = readFileSync(".github/dependabot.yml", "utf8");
  assert.match(yaml, /package-ecosystem: "pip"\n    directory: "\/workers\/fibo-studio"\n    schedule:\n      interval: "monthly"/);
  assert.match(yaml, /worker-test-dependencies:/);
  assert.match(yaml, /- "\/\.github\/actions\/setup-node-project"/);
});
