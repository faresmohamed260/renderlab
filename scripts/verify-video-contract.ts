import { readFileSync } from "node:fs";
import {
  defaultVideoResolution,
  generationAdvancedCapabilities,
  imageAspectRatios,
  videoAspectRatios,
  videoDurations,
  videoResolutions,
} from "../src/lib/capabilities/generation";
import { parseGenerationRequest } from "../src/lib/api/generation-contract";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function parse(value: unknown) {
  return parseGenerationRequest(value);
}

const omitted = parse({
  prompt: "phase 7d omitted resolution",
  output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: true },
  inputs: [],
  advanced: { seed: 42, frameRate: 24 },
});
assert(omitted.ok, "Omitted Video resolution must remain backward-compatible.");
assert(omitted.request.output.resolution === defaultVideoResolution, "Omitted Video resolution must normalize to 480p.");

let accepted = 0;
for (const resolution of videoResolutions) {
  for (const aspectRatio of videoAspectRatios) {
    for (const durationSeconds of videoDurations) {
      for (const frameRate of generationAdvancedCapabilities.video.frameRates) {
        for (const audioEnabled of [false, true] as const) {
const result = parse({
  prompt: "phase 7d cartesian contract",
  output: { kind: "video", aspectRatio, durationSeconds, audioEnabled, resolution },
  inputs: [],
  advanced: { seed: 123, frameRate },
});
assert(result.ok, `Supported Video combination rejected: ${JSON.stringify({ resolution, aspectRatio, durationSeconds, frameRate, audioEnabled })}`);
assert(result.request.output.resolution === resolution, "Resolution did not round-trip through normalization.");
accepted += 1;
        }
      }
    }
  }
}
assert(accepted === 1320, `Expected 1320 supported fixed Video combinations, verified ${accepted}.`);

for (const invalidResolution of ["4K", "480P", "1440p", 480, null, true]) {
  const result = parse({
    prompt: "invalid resolution",
    output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false, resolution: invalidResolution },
    inputs: [],
    advanced: { seed: 1, frameRate: 24 },
  });
  assert(!result.ok, `Invalid Video resolution was accepted: ${String(invalidResolution)}`);
}

const imageWithResolution = parse({
  prompt: "image cannot carry video resolution",
  output: { kind: "image", aspectRatio: "1:1", resolution: "480p" },
  inputs: [],
  advanced: { seed: 1, steps: 4, guidance: 1 },
});
assert(!imageWithResolution.ok, "Image request accepted output.resolution.");

for (const staleAdvanced of [{ steps: 11 }, { guidance: 1 }, { steps: 11, guidance: 1 }]) {
  const result = parse({
    prompt: "stale video tuning",
    output: { kind: "video", aspectRatio: "16:9", durationSeconds: 5, audioEnabled: false, resolution: "480p" },
    inputs: [],
    advanced: { seed: 1, frameRate: 24, ...staleAdvanced },
  });
  assert(!result.ok, `Video accepted inactive tuning: ${JSON.stringify(staleAdvanced)}`);
}

const imageTuning = parse({
  prompt: "image tuning stays active",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
  advanced: { seed: 1, steps: 4, guidance: 1 },
});
assert(imageTuning.ok, "Image Steps/Guidance regression: verified Image tuning was rejected.");

const imageFrameRate = parse({
  prompt: "image cannot carry frame rate",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
  advanced: { seed: 1, steps: 4, guidance: 1, frameRate: 24 },
});
assert(!imageFrameRate.ok, "Image request accepted Video-only frameRate.");

for (const invalidDuration of [4, 6, 29, 31]) {
  const result = parse({
    prompt: "invalid duration",
    output: { kind: "video", aspectRatio: "16:9", durationSeconds: invalidDuration, audioEnabled: false, resolution: "480p" },
    inputs: [],
    advanced: { seed: 1, frameRate: 24 },
  });
  assert(!result.ok, `Non-curated Video duration was accepted: ${invalidDuration}`);
}

const originalWithoutSource = parse({
  prompt: "original without source",
  output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: false, resolution: "2K" },
  inputs: [],
  advanced: { seed: 1, frameRate: 30 },
});
assert(!originalWithoutSource.ok, "Animate Original was accepted without a source image.");

const originalWithSource = parse({
  prompt: "original with source",
  output: { kind: "video", aspectRatio: "original", durationSeconds: 5, audioEnabled: false, resolution: "2K" },
  inputs: [{ alias: "image1", source: { type: "media-asset", id: "00000000-0000-0000-0000-000000000001" }, role: "first-frame" }],
  advanced: { seed: 1, frameRate: 30 },
});
assert(originalWithSource.ok, "Source-backed Animate Original did not pass product-contract parsing.");

const nativeSource = readFileSync(new URL("../src/server/generation/native-generation.ts", import.meta.url), "utf8");
const buildStart = nativeSource.indexOf("function buildForm(");
const buildEnd = nativeSource.indexOf("async function errorBody", buildStart);
assert(buildStart >= 0 && buildEnd > buildStart, "Could not inspect native buildForm implementation.");
const buildForm = nativeSource.slice(buildStart, buildEnd);
const videoStart = buildForm.indexOf("const source = prepared.sources[0]");
assert(videoStart >= 0, "Could not locate native Video multipart branch.");
const videoBranch = buildForm.slice(videoStart);
assert(!videoBranch.includes('form.append("steps"'), "Native Video multipart still sends steps.");
assert(!videoBranch.includes('form.append("cfg"'), "Native Video multipart still sends cfg.");
assert(videoBranch.includes('request.output.resolution'), "Native Video multipart does not forward normalized resolution.");

assert(imageAspectRatios.length === 11 && videoAspectRatios.length === 11, "Curated aspect-ratio contract drifted unexpectedly.");
console.log(`Phase 7D pure contract verified: ${accepted} fixed Video combinations; 480p omission default; invalid resolution/duration/tuning rejection; native multipart reconciliation.`);
