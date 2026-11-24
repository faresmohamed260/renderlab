/** Synthetic-only local Create state machine. No provider/job identifiers or persistence. */
export const compositions = ["empty", "typing", "references", "advanced", "generating", "result", "error", "failed"] as const;
export type Composition = typeof compositions[number];
export type Ratio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type Mode = "generate" | "edit";
export type Reference = Readonly<{ key: "sample-a" | "sample-b" | "sample-c" | "sample-d"; title: string; artwork: "dunes" | "arch" | "stone" | "sky" }>;
export const references: readonly Reference[] = [
  { key: "sample-a", title: "Desert architecture", artwork: "arch" },
  { key: "sample-b", title: "Soft sandstone texture", artwork: "stone" },
  { key: "sample-c", title: "Warm evening sky", artwork: "sky" },
  { key: "sample-d", title: "Dune composition", artwork: "dunes" },
];
export type Recipe = Readonly<{ mode: Mode; prompt: string; ratio: Ratio; references: readonly Reference[]; advanced: boolean; steps: number; vgl: string; mask: boolean }>;
type Base = { recipe: Recipe; announcement: string };
export type CreateFixture =
  | (Base & { phase: "draft" })
  | (Base & { phase: "error"; message: string })
  | (Base & { phase: "active"; status: "accepted" | "queued" | "running" | "cancelling" })
  | (Base & { phase: "result"; result: "sample-result" })
  | (Base & { phase: "failed"; message: string });
export type FixtureEvent =
  | { type: "reset"; composition: Composition }
  | { type: "prompt"; value: string }
  | { type: "mode"; value: Mode }
  | { type: "ratio"; value: Ratio }
  | { type: "advanced"; value: boolean }
  | { type: "steps"; value: number }
  | { type: "vgl"; value: string }
  | { type: "mask"; value: boolean }
  | { type: "attach"; key: Reference["key"] }
  | { type: "replace"; key: Reference["key"]; replacement: Reference["key"] }
  | { type: "remove"; key: Reference["key"] }
  | { type: "move"; key: Reference["key"]; direction: -1 | 1 }
  | { type: "submit" }
  | { type: "advance" }
  | { type: "cancel" }
  | { type: "fail" }
  | { type: "reuse" };
const prompt = "A quiet architectural study of a sandstone arch in a wide desert landscape, warm evening light and delicate shadows.";
const recipe = (): Recipe => ({ mode: "generate", prompt: "", ratio: "1:1", references: [], advanced: false, steps: 4, vgl: "", mask: false });
export function fixture(composition: Composition): CreateFixture {
  const base = { recipe: recipe(), announcement: "" };
  switch (composition) {
    case "empty": return { ...base, phase: "draft" };
    case "typing": return { ...base, phase: "draft", recipe: { ...base.recipe, prompt } };
    case "references": return { ...base, phase: "draft", recipe: { ...base.recipe, mode: "edit", prompt: "Preserve the arch from @image1 and use the texture of @image2.", references: references.slice(0, 2) } };
    case "advanced": return { ...base, phase: "draft", recipe: { ...base.recipe, prompt, advanced: true, ratio: "16:9" } };
    case "generating": return { ...base, phase: "active", status: "running", recipe: { ...base.recipe, prompt, ratio: "16:9" } };
    case "result": return { ...base, phase: "result", result: "sample-result", recipe: { ...base.recipe, prompt, mode: "edit", references: references.slice(0, 1), ratio: "16:9" } };
    case "error": return { ...base, phase: "error", message: "Could not submit the sample. Your prompt and references are retained.", recipe: { ...base.recipe, prompt, mode: "edit", references: references.slice(0, 1) } };
    case "failed": return { ...base, phase: "failed", message: "The sample render did not complete. No result was saved.", recipe: { ...base.recipe, prompt, ratio: "16:9" } };
  }
}
export function blocker(value: Recipe): string | undefined {
  if (!value.prompt.trim() && !value.vgl.trim()) return "Enter a prompt or manual VGL JSON.";
  if (value.mode === "edit" && !value.references.length) return "Attach a source image first.";
  if (value.steps !== 4) return "The hosted fixture supports 4 steps.";
  if (value.mask && value.references.length !== 1) return "Use a single source for a masked edit.";
  if (!value.vgl.trim() && [...value.prompt.matchAll(/@image(\d+)\b/g)].some((match) => Number(match[1]) > value.references.length || Number(match[1]) < 1)) return "Restore the missing image or remove its prompt tag.";
  if (value.vgl.trim()) {
    try {
      const parsed: unknown = JSON.parse(value.vgl);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).length === 0) return "Enter a JSON object.";
    } catch { return "Enter valid JSON."; }
  }
}
export function transition(state: CreateFixture, event: FixtureEvent): CreateFixture {
  if (event.type === "reset") return fixture(event.composition);
  if (state.phase === "active") {
    if (event.type === "cancel" && state.status !== "cancelling") return { ...state, status: "cancelling", announcement: "Cancellation requested." };
    if (event.type === "fail") return { recipe: state.recipe, announcement: "Render failed.", phase: "failed", message: "The sample render did not complete. No result was saved." };
    if (event.type === "advance") {
      switch (state.status) {
        case "accepted": return { ...state, status: "queued", announcement: "Queued." };
        case "queued": return { ...state, status: "running", announcement: "Rendering." };
        case "running": return { recipe: state.recipe, announcement: "Sample ready.", phase: "result", result: "sample-result" };
        case "cancelling": return { recipe: state.recipe, announcement: "Sample cancelled.", phase: "draft" };
      }
    }
    return state;
  }
  const draft = (patch: Partial<Recipe>, announcement = ""): CreateFixture => ({ phase: "draft", recipe: { ...state.recipe, ...patch }, announcement });
  const list = state.recipe.references;
  switch (event.type) {
    case "prompt": return draft({ prompt: event.value });
    case "mode": return draft({ mode: event.value, references: event.value === "generate" ? [] : list, mask: false });
    case "ratio": return draft({ ratio: event.value });
    case "advanced": return { ...state, recipe: { ...state.recipe, advanced: event.value } };
    case "steps": return Number.isInteger(event.value) && event.value >= 1 && event.value <= 8 ? draft({ steps: event.value }) : state;
    case "vgl": return draft({ vgl: event.value });
    case "mask": return state.recipe.mode === "edit" && list.length === 1 ? draft({ mask: event.value }) : state;
    case "attach": {
      const item = references.find((ref) => ref.key === event.key);
      return state.recipe.mode === "edit" && item && !list.some((ref) => ref.key === item.key) && list.length < 4
        ? draft({ references: [...list, item], vgl: "", mask: false }, item.title + " attached.") : state;
    }
    case "replace": {
      const item = references.find((ref) => ref.key === event.replacement);
      return item && list.some((ref) => ref.key === event.key) && !list.some((ref) => ref.key === item.key)
        ? draft({ references: list.map((ref) => ref.key === event.key ? item : ref), vgl: "", mask: false }, item.title + " replaced source.") : state;
    }
    case "remove": return list.some((ref) => ref.key === event.key) ? draft({ references: list.filter((ref) => ref.key !== event.key), vgl: "", mask: false }, "Reference removed.") : state;
    case "move": {
      const from = list.findIndex((ref) => ref.key === event.key);
      const to = from + event.direction;
      if (from < 0 || to < 0 || to >= list.length) return state;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return draft({ references: next, vgl: "", mask: false }, next[to].title + " moved to position " + (to + 1) + ".");
    }
    case "submit": {
      const reason = blocker(state.recipe);
      return reason ? { phase: "error", recipe: state.recipe, message: reason, announcement: reason }
        : { phase: "active", recipe: state.recipe, status: "accepted", announcement: "Sample accepted." };
    }
    case "reuse": return draft({}, "Sample settings retained.");
    case "advance":
    case "cancel":
    case "fail": return state;
  }
}
