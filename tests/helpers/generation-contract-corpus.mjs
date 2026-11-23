// A fixed, generated characterization corpus for the *existing* FIBO request parser.
// No network, random seed, real account, provider, or clock dependency.
const BASE = {
  prompt: "  Portrait at sunrise  ",
  model: "fibo2-edit-turbo",
  output: { kind: "image", aspectRatio: "1:1" },
  inputs: [],
};
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const source = (i, type = "media-asset") => ({
  alias: "image" + i, role: i === 1 ? "primary-image" : "reference",
  source: { type, id: "fixture-owned-source-" + i },
});
const mask = { type: "temporary-source", id: UUID };
const goodVgl = '{"caption":"A studio portrait","edit":"soft lighting"}';
const base = () => structuredClone(BASE);
function override(name, mutate, accepted) {
  const candidate = base();
  mutate(candidate);
  return { name, input: candidate, accepted };
}
const explicit = [
  { name: "null", input: null, accepted: false },
  { name: "undefined", input: undefined, accepted: false },
  { name: "string", input: "portrait", accepted: false },
  { name: "number", input: 1, accepted: false },
  { name: "array", input: [], accepted: false },
  override("baseline trimmed", () => {}, true),
  override("default model", x => { delete x.model; }, true),
  override("blank prompt", x => { x.prompt = "   "; }, false),
  override("missing prompt", x => { delete x.prompt; }, false),
  override("prompt number", x => { x.prompt = 42; }, false),
  override("prompt null", x => { x.prompt = null; }, false),
  override("prompt exactly 4000", x => { x.prompt = "x".repeat(4000); }, true),
  override("prompt exactly 4001", x => { x.prompt = "x".repeat(4001); }, false),
  override("prompt exactly 8000", x => { x.prompt = "x".repeat(8000); }, false),
  override("prompt exactly 8001", x => { x.prompt = "x".repeat(8001); }, false),
  override("only emoji 2000", x => { x.prompt = "😀".repeat(2000); }, true),
  override("only emoji 2001", x => { x.prompt = "😀".repeat(2001); }, true),
  override("emoji 4001 exceeds UTF16 resource limit", x => { x.prompt = "😀".repeat(4001); }, false),
  override("unknown model", x => { x.model = "future"; }, false),
  override("historic flux model", x => { x.model = "flux2-klein-9b"; }, false),
  override("historic qwen model", x => { x.model = "qwen-image-edit-2511"; }, false),
  override("historic video model", x => { x.model = "ltx25-redgraft"; }, false),
  override("missing output", x => { delete x.output; }, false),
  override("output null", x => { x.output = null; }, false),
  override("video output", x => { if (x.output) x.output.kind = "video"; }, false),
  override("absent kind", x => { delete x.output.kind; }, false),
  override("invalid aspect ratio", x => { x.output.aspectRatio = "2:1"; }, false),
  override("legacy 4:5 ratio", x => { x.output.aspectRatio = "4:5"; }, false),
  override("valid 16:9", x => { x.output.aspectRatio = "16:9"; }, true),
  override("valid 9:16", x => { x.output.aspectRatio = "9:16"; }, true),
  override("valid 3:4", x => { x.output.aspectRatio = "3:4"; }, true),
  override("valid 4:3", x => { x.output.aspectRatio = "4:3"; }, true),
  override("original without source", x => { if (x.output) x.output.aspectRatio = "original"; }, false),
  override("original with source", x => { x.output.aspectRatio = "original"; x.inputs = [source(1)]; }, true),
  override("video duration", x => { if (x.output) x.output.durationSeconds = 5; }, false),
  override("video audio", x => { x.output.audioEnabled = false; }, false),
  override("video resolution", x => { x.output.resolution = "1080p"; }, false),
  override("unknown output field allowed", x => { x.output.other = 1; }, true),
  override("missing inputs", x => { delete x.inputs; }, false),
  override("null inputs", x => { x.inputs = null; }, false),
  override("one valid source", x => { x.inputs = [source(1)]; }, true),
  override("two valid sources", x => { x.inputs = [source(1),source(2)]; }, true),
  override("four valid sources", x => { x.inputs = [source(1),source(2),source(3),source(4)]; }, true),
  override("five sources max", x => { x.inputs = Array.from({length:5},(_,i)=>source(i+1)); }, false),
  override("wrong first role", x => { x.inputs = [source(2)]; }, false),
  override("wrong second role", x => { x.inputs = [source(1),{...source(2),role:"primary-image"}]; }, false),
  override("omitted alias gets default", x => { const v=source(1);delete v.alias;x.inputs=[v]; }, true),
  override("duplicate aliases", x => { x.inputs=[source(1),{...source(2),alias:"image1"}]; }, false),
  override("zero alias", x => { x.inputs=[{...source(1),alias:"image0"}]; }, false),
  override("aliased id trim", x => { const v=source(1);v.source.id="  source  ";x.inputs=[v]; }, true),
  override("blank source id", x => { const v=source(1);v.source.id="  ";x.inputs=[v]; }, false),
  override("unrecognized source type", x => { const v=source(1);v.source.type="external";x.inputs=[v]; }, false),
  override("temporary source accepted", x => { x.inputs=[source(1,"temporary-source")]; }, true),
  override("source null", x => { const v=source(1);v.source=null;x.inputs=[v]; }, false),
  override("raw input value", x => { x.inputs=[42]; }, false),
  override("mask distinct source", x => { x.inputs=[source(1)];x.mask=mask; }, true),
  override("mask no source", x => { x.mask=mask; }, false),
  override("mask two sources", x => { x.inputs=[source(1),source(2)];x.mask=mask; }, false),
  override("mask same source", x => { const v=source(1);v.source.id=UUID;x.inputs=[v];x.mask=mask; }, false),
  override("mask malformed uuid", x => { x.inputs=[source(1)];x.mask={...mask,id:"bad"}; }, false),
  override("mask extra key", x => { x.inputs=[source(1)];x.mask={...mask,extra:1}; }, false),
  override("VGL valid", x => { x.vgl=goodVgl; }, true),
  override("VGL only", x => { x.prompt="";x.vgl=goodVgl; }, true),
  override("VGL JSON array", x => { x.vgl="[]"; }, false),
  override("VGL empty object", x => { x.vgl="{}"; }, false),
  override("VGL invalid JSON", x => { x.vgl="{bad"; }, false),
  override("VGL forbidden unattached alias", x => { x.vgl='{"caption":"@image1"}'; }, false),
  override("VGL attached alias", x => { x.inputs=[source(1)];x.vgl='{"caption":"@image1"}'; }, true),
  override("VGL token detached", x => { x.vgl='{"caption":"<image_2>"}'; }, false),
  override("VGL 8192 boundary", x => { x.prompt="";x.vgl=JSON.stringify({caption:"x".repeat(8178)}); }, true),
  override("VGL 8193 boundary", x => { x.vgl=JSON.stringify({caption:"x".repeat(8200)}); }, false),
  override("autoVgl true", x => { x.autoVgl=true; }, true),
  override("autoVgl false", x => { x.autoVgl=false; }, false),
  override("autoVgl string", x => { x.autoVgl="true"; }, false),
  override("autoVgl with source", x => { x.autoVgl=true;x.inputs=[source(1)]; }, false),
  override("autoVgl with mask", x => { x.autoVgl=true;x.inputs=[source(1)];x.mask=mask; }, false),
  override("autoVgl with manual VGL", x => { x.autoVgl=true;x.vgl=goodVgl; }, false),
  override("autoVgl without prompt", x => { x.autoVgl=true;x.prompt=""; }, false),
  override("generatedVgl sentinel", x => { x.generatedVgl=false; }, false),
  override("plain prompt unknown reference", x => { x.prompt="portrait of @image1"; }, false),
  override("plain prompt bound reference", x => { x.inputs=[source(1)];x.prompt="portrait of @image1"; }, true),
  override("plain prompt wrong reference", x => { x.inputs=[source(1)];x.prompt="portrait of @image2"; }, false),
  override("advanced empty", x => { x.advanced={}; }, true),
  override("advanced null", x => { x.advanced=null; }, false),
  override("seed zero", x => { x.advanced={seed:0}; }, true),
  override("seed negative", x => { x.advanced={seed:-1}; }, true),
  override("seed fractional", x => { x.advanced={seed:1.5}; }, false),
  override("seed unsafe integer", x => { x.advanced={seed:Number.MAX_SAFE_INTEGER+1}; }, false),
  override("steps 1", x => { x.advanced={steps:1}; }, true),
  override("steps 8", x => { x.advanced={steps:8}; }, true),
  override("steps 9", x => { x.advanced={steps:9}; }, false),
  override("steps 201", x => { x.advanced={steps:201}; }, false),
  override("steps zero", x => { x.advanced={steps:0}; }, false),
  override("guidance 1", x => { x.advanced={guidance:1}; }, true),
  override("guidance 0", x => { x.advanced={guidance:0}; }, false),
  override("guidance 2", x => { x.advanced={guidance:2}; }, false),
  override("frameRate image", x => { x.advanced={frameRate:24}; }, false),
  override("negativePrompt 4000", x => { x.advanced={negativePrompt:"x".repeat(4000)}; }, true),
  override("negativePrompt 4001", x => { x.advanced={negativePrompt:"x".repeat(4001)}; }, false),
  override("negativePrompt 8001", x => { x.advanced={negativePrompt:"x".repeat(8001)}; }, false),
  override("advanced unknown property", x => { x.advanced={future:{unsafe:true}}; }, true),
  override("json_instruction sentinel", x => { x.json_instruction="{}"; }, false),
  override("empty prompt VGL with long JSON", x => { x.prompt="";x.vgl=JSON.stringify({caption:"x".repeat(5000)}); }, true),
  override("text and long VGL", x => { x.vgl=JSON.stringify({caption:"x".repeat(5000)}); }, true),
];
const mutationFactories = [
  x => { x.prompt = null; },
  x => { x.prompt = "x".repeat(4001); },
  x => { x.prompt = "edit @image2"; },
  x => { x.model = "flux2-klein-9b"; },
  x => { x.model = undefined; },
  x => { x.output = null; },
  x => { x.output.kind = "video"; },
  x => { if (x.output) x.output.aspectRatio = "21:9"; },
  x => { x.output.aspectRatio = "original"; },
  x => { x.output.durationSeconds = 5; },
  x => { x.inputs = [source(1)]; },
  x => { x.inputs = [source(1), source(2)]; },
  x => { x.inputs = Array.from({length:5}, (_,i)=>source(i+1)); },
  x => { x.inputs = [{...source(1),alias:"image0"}]; },
  x => { x.inputs = [source(2)]; },
  x => { x.inputs = [source(1),{...source(2),alias:"image1"}]; },
  x => { x.mask = mask; },
  x => { x.inputs=[source(1)];x.mask=mask; },
  x => { x.vgl = goodVgl; },
  x => { x.prompt="";x.vgl=goodVgl; },
  x => { x.vgl = "[]"; },
  x => { x.vgl = '{"caption":"@image1"}'; },
  x => { x.autoVgl = true; },
  x => { x.autoVgl = false; },
  x => { x.advanced = {seed:2}; },
  x => { x.advanced = {steps:8}; },
  x => { x.advanced = {steps:9}; },
  x => { x.advanced = {guidance:1}; },
  x => { x.advanced = {guidance:0}; },
  x => { x.advanced = {frameRate:24}; },
  x => { x.advanced = {negativePrompt:"x".repeat(4001)}; },
  x => { x.generatedVgl = true; },
  x => { x.json_instruction = "{}"; },
];
let seed = 0x26a4e11d;
const next = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
};
const generated = Array.from({length:1024}, (_,index) => {
  const candidate = base();
  const changes = index < 256 ? 0 : 1 + next()%4;
  if (!changes) {
    candidate.prompt = ["  First prompt  ", "Edit @image1", "Create image", "😀".repeat(16)][next()%4];
    const count = next()%5;
    candidate.inputs = Array.from({length:count}, (_,i)=>source(i+1));
    if (candidate.prompt.includes("@image1") && !count) candidate.prompt="Portrait";
    candidate.output.aspectRatio = ["1:1","4:3","3:4","16:9","9:16"][next()%5];
    if (next()%4===0) candidate.advanced = {steps:1+next()%8,guidance:1,seed:next()};
  } else {
    for (let j=0;j<changes;j++) mutationFactories[next()%mutationFactories.length](candidate);
  }
  return { name: "generated-" + String(index).padStart(4,"0"), input: candidate };
});
export const generationRequestCorpus = Object.freeze([...explicit, ...generated]);
export const explicitCaseCount = explicit.length;
export const generatedCaseCount = generated.length;
