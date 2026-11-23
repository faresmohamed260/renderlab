import { registerHooks } from "node:module";
export const OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const JOB = "11111111-1111-4111-8111-111111111111";
const key = Symbol.for("renderlab.r4.generation.routes");
const state = globalThis[key] = {};
export function reset(overrides = {}) {
  Object.assign(state, { calls: [], session: "active", ownerId: OWNER, ...overrides });
  return state;
}
export const s = reset();
const stub = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
const shared = 'const S=()=>globalThis[Symbol.for("renderlab.r4.generation.routes")];';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/server") return stub('export const NextResponse={json:(data,options)=>Response.json(data,options)};');
    if (specifier === "server-only") return stub("export {};");
    if (specifier === "@/server/security/same-origin-mutation")
      return stub(shared + 'export function enforceSameOriginMutation(){S().calls.push(["origin"]);return null;}');
    if (specifier === "@/lib/supabase/server") return stub(shared +
      'export async function getCurrentRenderLabAccount(){S().calls.push(["account"]);return S().session==="active"?{id:S().ownerId}:null;}' +
      'export async function getCurrentRenderLabIdentity(){S().calls.push(["identity-only"]);return {id:S().ownerId};}');
    if (specifier === "@/lib/api/generation-api-schemas")
      return stub('export const generationApiSchemas={request:{parse:()=>({ok:true,request:{operation:"create-image",prompt:"fixture"}})}};');
    if (specifier === "@/server/generation/submit-generation") return stub(shared +
      'export function isGenerationBackendConfigured(){return true;}' +
      'export function isFiboGenerationAvailable(){return true;}' +
      'export function isFiboMaskGenerationAvailable(){return true;}' +
      'export function isFiboAutoVglAvailable(){return false;}' +
      'export async function submitGeneration(owner,request){S().calls.push(["submit",owner,request]);return {ok:true,job:{id:"fixture"}};}');
    if (specifier === "@/server/generation/cancel-generation") return stub(shared +
      'export async function requestGenerationCancellation(owner,id){S().calls.push(["cancel",owner,id]);return {ok:true,job:{status:"cancelling"}};}');
    if (specifier === "@/server/generation/retry-generation") return stub(shared +
      'export async function retryGeneration(owner,id){S().calls.push(["retry",owner,id]);return {ok:true,job:{id}};}');
    if (specifier === "@/server/generation/run-again-generation") return stub(shared +
      'export async function runAgainGeneration(owner,id){S().calls.push(["run-again",owner,id]);return {ok:true,job:{id}};}');
    if (specifier.startsWith("@/")) return next(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    return next(specifier, context);
  },
});
export const request = () => new Request("https://app.invalid/api/generation/jobs", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ operation: "create-image", prompt: "fixture" }),
});
