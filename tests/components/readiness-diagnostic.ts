import type { Page, TestInfo } from "@playwright/test";

type Diagnostic = { at: number; label: string; ready: string; fonts: string; css: number; pendingCss: number; viewport: number[]; target: string | null; geometry: number[] | null; hit: string | null; inert: boolean; active: string | null };
const records = new WeakMap<Page, { responses: string[]; frames: Diagnostic[] }>();

// Diagnostic-only branch. No waits, product changes, retries or forced actions.
export async function attachReadinessDiagnostic(page: Page) {
  const data = { responses: [] as string[], frames: [] as Diagnostic[] };
  records.set(page,data);
  page.on("response",response=>{
    const url=new URL(response.url());
    if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/create-preview/")) data.responses.push(response.request().method()+" "+url.pathname+" "+response.status());
  });
  await page.exposeBinding("__recordReadinessAudit",(_source, value: Diagnostic)=>{
    if(data.frames.length<100)data.frames.push(value);
  });
  await page.addInitScript(()=>{
    let events=0;
    const identify=(element: Element|null)=>element ? element.tagName+":"+(element.getAttribute("aria-label")??element.getAttribute("role")??element.id??"") : null;
    const observe=(label:string,target:Element|null)=>{
      const r=target?.getBoundingClientRect();
      const hit=r?document.elementFromPoint(r.x+r.width/2,r.y+r.height/2):null;
      const value={at:performance.now(),label,ready:document.readyState,fonts:document.fonts.status,css:document.styleSheets.length,pendingCss:[...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter(link=>!link.sheet).length,viewport:[innerWidth,innerHeight],target:identify(target),geometry:r?[r.x,r.y,r.width,r.height]:null,hit:identify(hit),inert:!!target?.closest('[inert],[aria-hidden="true"]'),active:identify(document.activeElement)};
      void (window as unknown as {__recordReadinessAudit:(value:unknown)=>Promise<void>}).__recordReadinessAudit(value).catch(()=>{});
    };
    document.addEventListener("DOMContentLoaded",()=>{
      observe("dom-content-loaded",document.querySelector("main"));
      requestAnimationFrame(()=>observe("first-frame",document.querySelector("main")));
    },{once:true});
    window.addEventListener("load",()=>observe("load",document.querySelector("main")),{once:true});
    void document.fonts.ready.then(()=>observe("fonts-ready",document.querySelector("main")));
    for(const type of ["pointerdown","click","keydown"]){
      document.addEventListener(type,event=>{
        if(!event.isTrusted||events++>=8)return;
        observe(type,event.target instanceof Element?event.target:null);
      },true);
    }
  });
}
export function reportReadinessDiagnostic(page:Page,info:TestInfo) {
  const data=records.get(page);
  console.log("MOUNTED_READINESS_DIAGNOSTIC",JSON.stringify({file:info.file.split(/[\\/]/).at(-1),title:info.title,project:info.project.name,repeat:info.repeatEachIndex,status:info.status,expected:info.expectedStatus,errors:info.errors.map(e=>e.message),...data}));
}
