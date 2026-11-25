import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { indexReview, keys, states } from "../../scripts/lib/phase6-review-index.mjs";

test("review index fails closed on missing states, keeps diagnostic index and hashes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "phase6-index-"));
  try {
    const key = keys[0], filename = key + "-create.png";
    await writeFile(path.join(dir, filename), "synthetic index test bytes");
    await writeFile(path.join(dir, key + ".json"), JSON.stringify({ key, sourceSha: "test-sha", frames: [filename], clips: [], status: "FAIL" }));
    const result = await indexReview(dir, "test-sha");
    assert.equal(result.expectedSamples, 8);
    assert.equal(result.expectedFrames, 56);
    assert.equal(result.expectedClips, 8);
    assert.ok(result.missing.includes(key + "-shell-open.png"));
    assert.ok(result.missing.includes(key + ".webm"));
    assert.equal(result.files[filename].sha256.length, 64);
    assert.match(await readFile(path.join(dir, "index.html"), "utf8"), /INCOMPLETE/);
    assert.match(await readFile(path.join(dir, "README.md"), "utf8"), /Extract the complete artifact ZIP/);
    for (const key of keys) {
      const frames = states.map(state => key + "-" + state + ".png"), clips = [key + ".webm"];
      for (const name of [...frames, ...clips]) await writeFile(path.join(dir, name), "synthetic index test bytes");
      await writeFile(path.join(dir, key + ".json"), JSON.stringify({ key, sourceSha: "test-sha", frames, clips, status: "PASS" }));
    }
    assert.deepEqual((await indexReview(dir, "test-sha")).missing, []);
    assert.notEqual((await indexReview(dir, "wrong-sha")).missing.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
