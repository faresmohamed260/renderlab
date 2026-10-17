const COMPLETE_KEY_RE = /^ent007\/generations\/(\d{14}-[0-9a-f]{8})\/complete\.json$/;
const GENERATION_ID_RE = /^\d{14}-[0-9a-f]{8}$/;

export function assertEnt007GenerationId(value) {
  const generationId = String(value || "").trim();
  if (!GENERATION_ID_RE.test(generationId)) {
    throw new Error("ENT-007 generation ID is invalid.");
  }
  return generationId;
}

export function selectLatestCompleteEnt007Generation(objects, {
  nowMs = Date.now(),
  maxAgeSeconds = 48 * 60 * 60,
} = {}) {
  if (!Array.isArray(objects)) throw new Error("ENT-007 retained object listing must be an array.");
  if (!Number.isFinite(nowMs)) throw new Error("ENT-007 selection nowMs must be finite.");
  if (!Number.isFinite(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new Error("ENT-007 maximum generation age must be positive.");
  }

  const candidates = objects.flatMap((item) => {
    const key = String(item?.Key || "");
    const match = key.match(COMPLETE_KEY_RE);
    if (!match) return [];
    const lastModifiedMs = new Date(item?.LastModified || 0).getTime();
    if (!Number.isFinite(lastModifiedMs) || lastModifiedMs <= 0) return [];
    return [{
      generationId: match[1],
      key,
      lastModifiedMs,
    }];
  });

  if (candidates.length === 0) {
    throw new Error("No complete ENT-007 retained generation is available.");
  }

  candidates.sort((left, right) => (
    right.lastModifiedMs - left.lastModifiedMs
    || right.generationId.localeCompare(left.generationId)
  ));
  const selected = candidates[0];
  const ageSeconds = Math.max(0, Math.floor((nowMs - selected.lastModifiedMs) / 1000));
  if (ageSeconds > maxAgeSeconds) {
    throw new Error(`Latest complete ENT-007 retained generation is stale (${ageSeconds}s old).`);
  }

  return {
    ...selected,
    ageSeconds,
  };
}
