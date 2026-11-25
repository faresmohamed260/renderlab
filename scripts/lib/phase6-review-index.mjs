import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const keys = [ "1440x900", "390x844", "320x844", "195x422" ].flatMap(size =>
  ["no-preference", "reduce"].map(preference => size + "-" + preference));
export const states = ["create", "shell-open", "shell-settled", "library", "primitives", "popover-open", "popover-settled"];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);

export async function indexReview(directory, sourceSha) {
  await mkdir(directory, { recursive: true });
  const samples = [], missing = [], files = {};
  async function verify(name) {
    if (typeof name !== "string" || !/^[a-z0-9-]+\.(png|webm|json)$/.test(name)) { missing.push("Invalid file name: " + name); return false; }
    try {
      const bytes = await readFile(path.join(directory, name));
      if (!bytes.length) throw Error("empty");
      files[name] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
      return true;
    } catch { missing.push(name); return false; }
  }
  for (const key of keys) {
    const filename = key + ".json";
    let sample;
    try {
      sample = JSON.parse(await readFile(path.join(directory, filename), "utf8"));
      await verify(filename);
      if (sample.key !== key || sample.sourceSha !== sourceSha) throw Error("identity mismatch");
      if (!Array.isArray(sample.frames) || !Array.isArray(sample.clips)) throw Error("invalid file lists");
    } catch (error) {
      missing.push(key + ": " + String(error));
      samples.push({ key, status: "MISSING", frames: [], clips: [] });
      continue;
    }
    for (const name of [...sample.frames, ...sample.clips]) await verify(name);
    for (const name of states.map(state => key + "-" + state + ".png")) {
      if (!sample.frames.includes(name)) missing.push(name);
    }
    if (!sample.clips.includes(key + ".webm")) missing.push(key + ".webm");
    if (sample.status !== "PASS") missing.push(key + ": sample failed");
    samples.push(sample);
  }
  const manifest = { sourceSha, expectedSamples: keys.length, expectedFrames: keys.length * states.length, expectedClips: keys.length, samples, missing, files };
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  const link = name => files[name] ? '<a href="' + escape(name) + '">' + escape(name) + "</a>" : escape(name) + " (missing)";
  await writeFile(path.join(directory, "index.html"), '<!doctype html><html lang="en"><meta charset="utf-8"><title>RenderLab component review</title><style>body{font:16px system-ui;max-width:1100px;margin:auto;padding:24px}section{border-top:1px solid #aaa;padding:16px 0}figure{display:inline-block;vertical-align:top;width:min(100%,480px);margin:8px}img,video{max-width:100%;height:auto}figcaption{overflow-wrap:anywhere}</style><h1>RenderLab component review</h1><p>Source SHA: ' + escape(sourceSha) + '</p><p>' + (missing.length ? "INCOMPLETE — see manifest.json" : "Capture complete — visual approval still required") + '</p><p><a href="README.md">README</a> · <a href="manifest.json">Manifest and diagnostics</a></p>' +
    samples.map(sample => '<section><h2>' + escape(sample.key) + ' — ' + escape(sample.status) + '</h2>' +
      sample.frames.map(name => '<figure>' + (files[name] ? '<a href="' + escape(name) + '"><img loading="lazy" src="' + escape(name) + '" alt="' + escape(name) + '"></a>' : "") + '<figcaption>' + link(name) + '</figcaption></figure>').join("") +
      sample.clips.map(name => '<figure>' + (files[name] ? '<video controls preload="none" src="' + escape(name) + '"></video>' : "") + '<figcaption>' + link(name) + '</figcaption></figure>').join("") + '</section>').join("") + "</html>");
  await writeFile(path.join(directory, "README.md"), [
    "# RenderLab real-component review bundle", "", "Exact source SHA: " + sourceSha, "",
    "Extract the complete artifact ZIP and open index.html locally. PNGs are viewport captures; WebM files record real interactions at normal/reduced motion. Manifest lists state, geometry, errors, sizes and hashes.",
    "Mounted Create, Library and a shared-wrapper specimen use real source components and synthetic data. They are not Vercel previews, live auth, production performance, true browser zoom, or design/motion approval. 195×422 and 320×844 are CSS stress viewports. Existing interaction/overflow acceptance remains separate.",
    "Keep Tailwind utility classes out of review specimens wherever the app CSS scanner can see them: they change the generated CSS of the page under test; use route-local CSS modules for specimen layout.",
    "This first slice covers wrappers available at its source SHA. Newly introduced primitives/skeletons and revised shell-specific states require explicit fixture coverage as their implementation lands; no claim that unmerged components are captured.",
    "A failed or incomplete sample is explicitly listed in manifest.json; the artifact is retained for diagnosis. No external resources, production data or secrets should be present.", "",
    "Expected: " + manifest.expectedFrames + " PNGs, " + manifest.expectedClips + " clips, " + manifest.expectedSamples + " sample reports.",
  ].join("\n") + "\n");
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await indexReview(path.resolve("artifacts/phase6-component-review"), process.env.REVIEW_SOURCE_SHA ?? "local-unverified");
  console.log("Component review manifest:", JSON.stringify({ sourceSha: result.sourceSha, missing: result.missing, files: Object.keys(result.files).length }));
  if (result.missing.length) process.exitCode = 1;
}
