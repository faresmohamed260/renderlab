export type GenerationFinalizationFaultPoint =
  | "before-primary-write"
  | "after-primary-write"
  | "after-media-insert"
  | "thumbnail-write";

const enabled = process.env.RENDERLAB_TEST_GENERATION_FINALIZATION_FAULTS === "true";
const plannedFaults = enabled
  ? (process.env.RENDERLAB_TEST_GENERATION_FINALIZATION_FAULT_SEQUENCE || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean) as GenerationFinalizationFaultPoint[]
  : [];

let nextFaultIndex = 0;

export function injectGenerationFinalizationFault(point: GenerationFinalizationFaultPoint) {
  if (!enabled || plannedFaults[nextFaultIndex] !== point) return;
  nextFaultIndex += 1;
  throw new Error(`RenderLab configured finalization fault: ${point}`);
}
