import { CreatePreviewWorkspace, type CreateResultReview } from "@/features/create/create-preview-workspace";
import type { HistoryReadActions } from "@/features/create/history/history-transport";
import { createProps } from "../../fixtures";

// Isolated judge infrastructure: illustrative art from the approved comp, never provider output.
const illustration = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 600\" width=\"800\" height=\"600\" preserveAspectRatio=\"xMidYMid slice\" role=\"img\" aria-label=\"Generated image: a sandstone arch in a desert at golden hour\" style=\"display:block\">\n<defs>\n<linearGradient id=\"skyL1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6f8196\"/><stop offset=\".55\" stop-color=\"#d9a98a\"/><stop offset=\"1\" stop-color=\"#f1c79a\"/></linearGradient>\n<linearGradient id=\"archL1\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#ebbd93\"/><stop offset=\"1\" stop-color=\"#a8694f\"/></linearGradient>\n</defs>\n<rect width=\"800\" height=\"600\" fill=\"url(#skyL1)\"/>\n<circle cx=\"580\" cy=\"170\" r=\"58\" fill=\"#f6d9a6\"/>\n<path d=\"M0 420 C140 360 260 380 380 410 C520 445 650 400 800 380 V600 H0Z\" fill=\"#c07f5d\"/>\n<path d=\"M0 480 C160 430 300 470 440 490 C580 510 700 470 800 450 V600 H0Z\" fill=\"#a5694f\"/>\n<path d=\"M200 480 V290 C200 190 260 130 330 130 C400 130 460 190 460 290 V480 H390 V300 C390 250 365 215 330 215 C295 215 270 250 270 300 V480 Z\" fill=\"url(#archL1)\"/>\n<path d=\"M0 545 C200 515 420 565 800 525 V600 H0Z\" fill=\"#8c5540\"/>\n</svg>";
const asImage = (svg: string) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
const thumbnail = (a: string, b: string, c: string) => asImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><defs><linearGradient id="g" x2="0.7" y2="1"><stop stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/></svg>`);
const prompt = "A quiet architectural study of a sandstone arch in a wide desert, warm evening light and long shadows";
const prompts = [prompt, "Twilight skyline over a calm harbor, soft violet haze and distant lights", "Misty pine forest at dawn, shafts of light through the trees", "Studio portrait with warm rim light, shallow depth of field", "Minimal product shot on a pale stone pedestal, soft shadows"];
const labels = ["Sandstone arch", "Twilight skyline", "Misty pine forest", "Studio portrait"];
const images = [asImage(illustration), thumbnail("#2c3e63","#7a6cc2","#d98fb0"), thumbnail("#17332e","#3f8f7b","#c4e2b4"), thumbnail("#3b1f2b","#a8445a","#f0a98a")];
const ages = [0,12,31,48];
const id = (index: number) => "a1100000-0000-4000-8000-" + String(index + 1).padStart(12, "0");
const jobId = (index: number) => "b2200000-0000-4000-8000-" + String(index + 1).padStart(12, "0");

export default function CreateResultReviewPage() {
  const now = Date.now();
  const review: CreateResultReview = { prompt, results: labels.map((label, index) => ({
    assetId: id(index), batchId: jobId(index), reviewLabel: label, createdAt: new Date(now - ages[index] * 60_000).toISOString(),
    image_data: images[index], filename: label.toLowerCase().replaceAll(" ", "-") + ".svg", isFavorite: false,
    width: 800, height: 600, aspect: 4/3, seed: 1889046298 + index, promptUsed: prompts[index],
    run: { mode: index === 3 ? "edit" : "generate", prompt: prompts[index], negativePrompt: "", vgl: "", steps: 4, imageCount: "1", sizeIndex: 1, inputs: [] },
  })) };
  async function readPromptsAction(query: Parameters<HistoryReadActions["readPromptsAction"]>[0]): ReturnType<HistoryReadActions["readPromptsAction"]> {
    "use server";
    return { items: prompts.map((value,index)=>({ id: jobId(index), prompt:value, status:"succeeded" as const, operation:index===3 ? "edit-image" as const : "create-image" as const, createdAt:new Date(now - index*60_000).toISOString() })).filter(item=>item.prompt.toLowerCase().includes(query.search.toLowerCase())), nextCursor:null };
  }
  async function readJobsAction(offset: number): ReturnType<HistoryReadActions["readJobsAction"]> {
    "use server";
    const running = { id:jobId(5), status:"running" as const, operation:"create-image" as const, outputKind:"image" as const, prompt:"Fixture running job", summary:"Fixture running job", outputAssetIds:[], canCancel:true, canRetry:false, canReuse:false, canRunAgain:false,error:null,createdAt:new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),startedAt:new Date(now).toISOString(),completedAt:null };
    const failed = { ...running, id:jobId(6), status:"failed" as const, prompt:"Fixture timed out", summary:"Fixture timed out", canCancel:false, canRetry:true, canReuse:true, error:{code:"fixture_timeout",message:"Timed out"}, createdAt:new Date(now-18*60_000).toISOString(),startedAt:null,completedAt:new Date(now-18*60_000).toISOString() };
    return {state:"ready",items:offset===0?[running,failed]:[],page:{offset,limit:20,hasMore:false},hasActive:offset===0};
  }
  async function reuseAction(job: string): ReturnType<HistoryReadActions["reuseAction"]> {
    "use server";
    if (job !== jobId(6)) return {ok:false,reason:"unavailable"};
    return {ok:true,draft:{mode:"generate",references:[],prompt:prompts[0],vgl:"",seed:"1889046298",randomize:false,steps:4,negativePrompt:"",aspectRatio:"4:3"}};
  }
  // The isolated private-preview capability path renders an enabled real composer.
  // No hosted model/credentials, no generation provider call on load.
  return <CreatePreviewWorkspace {...createProps} hostedOnly={false} hostedModel={undefined} hostedAccountKey="synthetic-result-review" initialAspectRatio="4:3" initialReview={review} historyActions={{readPromptsAction,readJobsAction,reuseAction}} />;
}
