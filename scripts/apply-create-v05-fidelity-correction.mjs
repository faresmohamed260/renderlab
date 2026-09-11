import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Replacement target is not unique: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

const workspacePath = "src/features/create/create-workspace.tsx";
let workspace = readFileSync(workspacePath, "utf8");

workspace = replaceOnce(
  workspace,
  'import { ChevronDown, ImagePlus, MoreHorizontal, Plus, Sparkles, Volume2, X } from "lucide-react";',
  'import { ChevronDown, ImagePlus, MoreHorizontal, Plus, Volume2, X } from "lucide-react";',
  "remove decorative Generate icon import",
);

workspace = replaceOnce(
  workspace,
  'className="clear-create-workspace mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-24"',
  'className="clear-create-workspace mx-auto flex w-full flex-col"',
  "workspace geometry",
);
workspace = replaceOnce(
  workspace,
  'className="clear-create-stack mx-auto w-full max-w-6xl"',
  'className="clear-create-stack mx-auto w-full"',
  "stack geometry",
);
workspace = replaceOnce(
  workspace,
  'className="clear-create-context mb-8 sm:mb-10"',
  'className="clear-create-context"',
  "context spacing",
);
workspace = replaceOnce(
  workspace,
  `<div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-bright/80">\n              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-bright shadow-[0_0_14px_rgba(178,167,255,0.8)]" />\n              <span>{outputKind === "image" ? "Create / Image" : "Create / Video"}</span>\n            </div>`,
  `<p className="clear-create-eyebrow">{outputKind === "image" ? "Create / Image" : "Create / Video"}</p>`,
  "approved eyebrow",
);
workspace = replaceOnce(
  workspace,
  'className="min-h-[3.25rem] text-[38px] font-semibold tracking-[-0.05em] text-text sm:text-[48px] lg:text-[56px]"',
  'className="clear-create-heading font-semibold text-text"',
  "approved heading geometry",
);
workspace = replaceOnce(
  workspace,
  'className="mt-2 max-w-2xl text-[15px] leading-6 text-text-muted"',
  'className="clear-create-supporting text-text-muted"',
  "approved supporting copy geometry",
);

const modeStart = workspace.indexOf('          <div className="clear-composer-mode" data-create-mode-switch="true">');
const modeEndMarker = '\n\n          <div className="clear-composer-reference-bar" data-create-reference-bar="true">';
const modeEnd = workspace.indexOf(modeEndMarker, modeStart);
if (modeStart < 0 || modeEnd < 0) throw new Error("Could not isolate mode switch block");
let modeBlock = workspace.slice(modeStart, modeEnd);
modeBlock = modeBlock.split("\n").map((line) => line.startsWith("          ") ? line.slice(2) : line).join("\n");
workspace = workspace.slice(0, modeStart) + workspace.slice(modeEnd + 2);
workspace = replaceOnce(
  workspace,
  '        </AnimatePresence>\n\n        <form',
  `        </AnimatePresence>\n\n${modeBlock}\n\n        <form`,
  "move mode switch above composer",
);
workspace = replaceOnce(
  workspace,
  'className="clear-create-composer kinetic-composer relative isolate overflow-hidden rounded-[22px] border p-3 sm:p-4"',
  'className="clear-create-composer kinetic-composer relative isolate overflow-hidden rounded-[22px] border"',
  "remove outer composer padding",
);

const refStart = workspace.indexOf('          {references.length ? (\n            <div className="clear-composer-reference-list');
const refEndMarker = '\n\n          <Collapsible className="clear-composer-controls"';
const refEnd = workspace.indexOf(refEndMarker, refStart);
if (refStart < 0 || refEnd < 0) throw new Error("Could not isolate reference list block");
const refBlock = workspace.slice(refStart, refEnd);
workspace = workspace.slice(0, refStart) + workspace.slice(refEnd + 2);
workspace = replaceOnce(
  workspace,
  '          <Textarea\n            ref={promptInputRef}',
  `${refBlock}\n\n          <div className="clear-composer-prompt-label">Prompt</div>\n          <Textarea\n            ref={promptInputRef}`,
  "move attached references above prompt",
);
workspace = replaceOnce(
  workspace,
  'className="clear-composer-prompt min-h-36 px-2 py-2 text-[17px] leading-7 placeholder:text-text-muted/55 sm:min-h-32 sm:text-[18px]"',
  'className="clear-composer-prompt placeholder:text-text-muted/55"',
  "prompt geometry",
);
workspace = replaceOnce(
  workspace,
  'className="kinetic-control-deck mt-3 flex flex-col gap-2 rounded-2xl border px-1 py-1.5 sm:flex-row sm:items-center sm:p-1.5"',
  'className="clear-composer-footer kinetic-control-deck flex flex-col gap-2 border-t sm:flex-row sm:items-center"',
  "flat composer footer",
);
workspace = replaceOnce(
  workspace,
  '<span>{imageModelTriggerLabels[value]}</span>\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  '<span className="clear-setting-label">Model</span>\n          <strong>{imageModelTriggerLabels[value]}</strong>\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  "image model visible label",
);
workspace = replaceOnce(
  workspace,
  '{value === "original" ? "Original" : value}\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  '<span className="clear-setting-label">Ratio</span>\n          <strong>{value === "original" ? "Original" : value}</strong>\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  "ratio visible label",
);
workspace = replaceOnce(
  workspace,
  '<span>{resolution}·{durationSeconds}s</span>\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  '<span className="clear-setting-label">Video</span>\n          <strong>{resolution} · {durationSeconds}s</strong>\n          <ChevronDown aria-hidden="true" className="size-3 opacity-70" />',
  "video setting visible label",
);
workspace = replaceOnce(
  workspace,
  '<span>Advanced</span>\n                    <MoreHorizontal aria-hidden="true" className="size-4" />',
  '<span className="clear-setting-label">Advanced</span>\n                    <strong aria-hidden="true">{advancedOpen ? "−" : "+"}</strong>',
  "advanced approved trigger",
);
workspace = replaceOnce(
  workspace,
  '{submitting || jobActive ? <Spinner data-icon="inline-start" /> : <Sparkles aria-hidden="true" data-icon="inline-start" />}',
  '{submitting || jobActive ? <Spinner data-icon="inline-start" /> : null}',
  "stable conventional Generate",
);

workspace = workspace.replaceAll('className="mt-3" variant="destructive" role="alert"', 'className="clear-create-support-alert mt-3" variant="destructive" role="alert"');
workspace = workspace.replaceAll('className="mt-3" role="status"', 'className="clear-create-support-alert mt-3" role="status"');
workspace = workspace.replaceAll('className="mt-4" variant="destructive"', 'className="clear-create-support-alert mt-4" variant="destructive"');

const resultInfoStart = workspace.indexOf('              <div className="clear-create-result-info flex flex-col gap-3 border border-border px-4 py-4" data-create-result-info="true">');
const resultMediaMarker = '\n              <div className="clear-create-result-media bg-surface-2" data-create-result-media={resultAsset.kind}>';
const resultInfoEnd = workspace.indexOf(resultMediaMarker, resultInfoStart);
if (resultInfoStart < 0 || resultInfoEnd < 0) throw new Error("Could not isolate result info rail");
const resultInfo = `              <div className="clear-create-result-info flex flex-col border border-border" data-create-result-info="true">\n                <div className="clear-result-meta-block">\n                  <p className="clear-result-kicker">RESULT / {resultAsset.kind.toUpperCase()}</p>\n                  <h3>{resultAsset.displayName || (resultAsset.kind === "image" ? "Generated image" : "Generated video")}</h3>\n                  <p>Generated from this composer. Keep going without rebuilding the request.</p>\n                </div>\n                <dl className="clear-result-specs">\n                  <div><dt>Model</dt><dd>{resultAsset.kind === "image" ? imageModelTriggerLabels[imageModel] : generationModelDefinitions[defaultVideoGenerationModel].label}</dd></div>\n                  <div><dt>Ratio</dt><dd>{aspectRatio === "original" ? "Original" : aspectRatio}</dd></div>\n                  <div><dt>Source</dt><dd>{references.length ? \`${references.length} reference${references.length === 1 ? "" : "s"}\` : "Prompt only"}</dd></div>\n                </dl>\n                {continuationActions.length ? (\n                  <div className="clear-create-result-actions" aria-label="Continue from result">\n                    {[...continuationActions]\n                      .sort((a, b) => Number(b.id === "animate-image") - Number(a.id === "animate-image"))\n                      .map((action) => (\n                        <Button\n                          key={action.id}\n                          type="button"\n                          variant={action.id === "animate-image" ? "default" : "secondary"}\n                          onClick={() => startContinuation(action)}\n                        >\n                          {action.label}\n                        </Button>\n                      ))}\n                  </div>\n                ) : null}\n              </div>`;
workspace = workspace.slice(0, resultInfoStart) + resultInfo + workspace.slice(resultInfoEnd);

writeFileSync(workspacePath, workspace);

const advancedPath = "src/features/create/create-advanced-panel.tsx";
let advanced = readFileSync(advancedPath, "utf8");
advanced = replaceOnce(
  advanced,
  '    <CollapsibleContent className="kinetic-precision-deck mt-3 overflow-hidden rounded-2xl border p-4 sm:p-5">',
  '    <CollapsibleContent className="clear-create-advanced kinetic-precision-deck overflow-hidden border-t px-3 py-3 sm:px-4 sm:py-3.5">',
  "integrate Advanced into composer",
);
advanced = replaceOnce(
  advanced,
  '<p className="text-sm font-semibold text-text">Advanced</p>',
  '<p className="clear-create-advanced-title text-text">Advanced</p>',
  "advanced title",
);
advanced = replaceOnce(
  advanced,
  '<p className="mt-1 text-xs leading-5 text-text-muted">\n            Reproducibility and contextual output controls. Defaults stay safe unless you change them.\n          </p>',
  '<p className="clear-create-advanced-copy text-text-muted">Secondary controls</p>',
  "advanced secondary copy",
);
writeFileSync(advancedPath, advanced);

const globalsPath = "src/app/globals.css";
let globals = readFileSync(globalsPath, "utf8");
const marker = "/* Phase 23 approved v0.5 fidelity correction */";
if (globals.includes(marker)) throw new Error("Fidelity correction CSS already exists");
globals += `\n\n${marker}\n.clear-create-workspace {\n  min-height: calc(100dvh - 72px);\n  max-width: 1440px !important;\n  padding: 52px 48px 42px !important;\n}\n\n.clear-create-stack {\n  max-width: 1120px !important;\n}\n\n.clear-create-context {\n  width: min(900px, 100%);\n  margin: 0 auto 28px !important;\n}\n\n.clear-create-eyebrow {\n  margin: 0;\n  color: #8f99aa;\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: .22em;\n  text-transform: uppercase;\n}\n\n.clear-create-heading {\n  min-height: 0 !important;\n  margin: 15px 0 0;\n  font-size: clamp(42px, 5.1vw, 72px) !important;\n  line-height: .97 !important;\n  letter-spacing: -.058em !important;\n}\n\n.clear-create-supporting {\n  max-width: 650px !important;\n  margin: 16px 0 0 !important;\n  font-size: 15px !important;\n  line-height: 1.6 !important;\n}\n\n.clear-create-context::after {\n  width: min(420px, 56vw) !important;\n  margin-top: 20px !important;\n}\n\n.clear-composer-mode {\n  order: 1;\n  width: min(900px, 100%);\n  margin: 0 auto 10px !important;\n}\n\n.clear-composer-mode [role="radiogroup"] {\n  width: 214px !important;\n  height: 44px;\n  min-height: 44px !important;\n  border-radius: 12px !important;\n  padding: 3px !important;\n  background: rgb(9 14 20 / 88%) !important;\n}\n\n.clear-composer-mode [role="radio"] {\n  min-height: 36px !important;\n  border-radius: 9px !important;\n  font-size: 13px;\n  font-weight: 700;\n}\n\n.clear-create-composer {\n  order: 2;\n  width: min(900px, 100%) !important;\n  padding: 0 !important;\n  border-radius: 22px !important;\n  background: linear-gradient(180deg, rgb(14 20 29 / 96%), rgb(9 14 20 / 96%)) !important;\n}\n\n.clear-composer-reference-bar {\n  min-height: 62px !important;\n  padding: 12px 14px 4px !important;\n}\n\n.clear-composer-reference-list {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n  margin: 0 !important;\n  padding: 0 14px 4px;\n}\n\n.clear-create-composer .kinetic-reference {\n  min-width: 246px;\n  min-height: 58px;\n  margin: 0 !important;\n  border-radius: 12px !important;\n}\n\n.clear-composer-prompt-label {\n  padding: 8px 16px 0;\n  color: #778395;\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: .14em;\n  text-transform: uppercase;\n}\n\n.clear-composer-prompt {\n  min-height: 120px !important;\n  resize: vertical;\n  padding: 10px 16px 17px !important;\n  border: 0 !important;\n  border-radius: 0 !important;\n  font-size: 18px !important;\n  line-height: 1.55 !important;\n}\n\n.clear-composer-footer {\n  margin: 0 !important;\n  padding: 10px 12px 12px !important;\n  border: 0 !important;\n  border-top: 1px solid rgb(255 255 255 / 7%) !important;\n  border-radius: 0 !important;\n  background: transparent !important;\n  box-shadow: none !important;\n}\n\n.clear-composer-settings {\n  gap: 6px !important;\n  padding: 0 !important;\n}\n\n.clear-composer-settings button {\n  min-height: 38px;\n  border-radius: 9px;\n}\n\n.clear-setting-label {\n  color: #788596;\n  font-size: 10px;\n  font-weight: 500;\n}\n\n.clear-composer-settings strong {\n  color: #cbd2db;\n  font-size: 11px;\n  font-weight: 700;\n}\n\n.clear-create-composer .kinetic-generate {\n  min-width: 132px;\n  min-height: 44px;\n  border-radius: 12px;\n  background: #f4f6f8 !important;\n  color: #070a0e !important;\n}\n\n.clear-create-advanced {\n  margin: 0 !important;\n  border-inline: 0 !important;\n  border-bottom: 0 !important;\n  border-radius: 0 !important;\n  background: rgb(6 10 15 / 40%) !important;\n  box-shadow: none !important;\n}\n\n.clear-create-advanced > div:first-child {\n  margin-bottom: 12px !important;\n}\n\n.clear-create-advanced-title {\n  font-size: 10px;\n  font-weight: 800;\n  letter-spacing: .16em;\n  text-transform: uppercase;\n}\n\n.clear-create-advanced-copy {\n  margin-top: 4px;\n  font-size: 10px;\n}\n\n.clear-create-support-alert {\n  order: 4;\n  width: min(900px, 100%);\n  margin-inline: auto;\n}\n\n.clear-create-stage,\n.clear-create-result-loading,\n.clear-create-result {\n  order: 1;\n  margin-top: 0 !important;\n  margin-bottom: 24px !important;\n}\n\n.clear-create-stage[data-active="true"] {\n  width: min(900px, 100%) !important;\n  min-height: 480px !important;\n}\n\n.clear-create-result {\n  width: min(1120px, 100%) !important;\n  grid-template-columns: minmax(0, 1fr) 278px !important;\n  gap: 14px !important;\n}\n\n.clear-create-result-media {\n  min-height: 480px !important;\n  border-radius: 18px !important;\n}\n\n.clear-create-result-info {\n  min-height: 480px;\n  padding: 20px !important;\n  border-radius: 4px 18px 18px 4px !important;\n}\n\n.clear-result-kicker {\n  margin: 0;\n  color: #7c8797;\n  font-size: 9px;\n  font-weight: 700;\n  letter-spacing: .17em;\n}\n\n.clear-result-meta-block h3 {\n  margin: 13px 0 0;\n  font-size: 24px;\n  line-height: 1.05;\n  letter-spacing: -.035em;\n}\n\n.clear-result-meta-block > p:last-child {\n  margin: 12px 0 0;\n  color: var(--color-text-muted);\n  font-size: 13px;\n  line-height: 1.55;\n}\n\n.clear-result-specs {\n  margin: 24px 0;\n  border-top: 1px solid rgb(255 255 255 / 10%);\n}\n\n.clear-result-specs div {\n  display: flex;\n  justify-content: space-between;\n  gap: 14px;\n  padding: 10px 0;\n  border-bottom: 1px solid rgb(255 255 255 / 10%);\n}\n\n.clear-result-specs dt {\n  color: #727d8c;\n  font-size: 10px;\n  letter-spacing: .12em;\n  text-transform: uppercase;\n}\n\n.clear-result-specs dd {\n  margin: 0;\n  color: #c4cbd4;\n  font-size: 11px;\n}\n\n.clear-create-result-actions {\n  margin-top: auto !important;\n  gap: 8px !important;\n}\n\n.clear-create-result-actions > * {\n  min-height: 44px;\n  justify-content: flex-start !important;\n  border-radius: 10px;\n}\n\n.clear-create-workspace[data-create-has-stage="true"] .clear-create-context {\n  margin-bottom: 20px !important;\n}\n\n.clear-create-workspace[data-create-has-stage="true"] .clear-create-heading {\n  font-size: clamp(32px, 3.2vw, 48px) !important;\n}\n\n.clear-create-workspace[data-create-has-stage="true"] .clear-composer-mode {\n  order: 2;\n}\n\n.clear-create-workspace[data-create-has-stage="true"] .clear-create-composer {\n  order: 3;\n}\n\n@media (max-width: 900px) {\n  .clear-create-workspace {\n    padding-inline: 28px !important;\n  }\n\n  .clear-create-result {\n    grid-template-columns: 1fr !important;\n  }\n\n  .clear-create-result-info {\n    min-height: 0;\n    border-radius: 15px !important;\n  }\n}\n\n@media (max-width: 600px) {\n  .clear-create-workspace {\n    min-height: calc(100dvh - 64px);\n    padding: 28px 14px 28px !important;\n  }\n\n  .clear-create-context {\n    margin-bottom: 18px !important;\n  }\n\n  .clear-create-heading {\n    margin-top: 12px;\n    font-size: 42px !important;\n  }\n\n  .clear-create-supporting {\n    font-size: 14px !important;\n  }\n\n  .clear-composer-mode {\n    width: min(900px, 100%);\n  }\n\n  .clear-composer-mode [role="radiogroup"] {\n    width: 100% !important;\n    height: 48px;\n  }\n\n  .clear-composer-mode [role="radio"] {\n    min-height: 40px !important;\n  }\n\n  .clear-create-composer {\n    border-radius: 18px !important;\n  }\n\n  .clear-composer-reference-bar {\n    align-items: flex-start !important;\n    flex-direction: column !important;\n    gap: 5px !important;\n    padding: 10px 10px 2px !important;\n  }\n\n  .clear-composer-reference-trigger {\n    width: 100%;\n    min-height: 44px !important;\n    justify-content: center;\n  }\n\n  .clear-composer-reference-list {\n    display: grid;\n    grid-template-columns: 1fr;\n    width: 100%;\n    padding: 0 10px 2px;\n  }\n\n  .clear-create-composer .kinetic-reference {\n    width: 100%;\n    min-width: 0;\n    min-height: 64px;\n  }\n\n  .clear-composer-prompt-label {\n    padding-inline: 13px;\n  }\n\n  .clear-composer-prompt {\n    min-height: 132px !important;\n    padding-inline: 13px !important;\n    font-size: 17px !important;\n  }\n\n  .clear-composer-footer {\n    align-items: stretch !important;\n    flex-direction: column !important;\n  }\n\n  .clear-composer-settings {\n    width: 100%;\n  }\n\n  .clear-composer-settings button {\n    min-height: 44px !important;\n    flex: 1 1 auto;\n    justify-content: center;\n  }\n\n  .clear-create-composer .kinetic-generate {\n    width: 100%;\n    min-height: 50px;\n  }\n\n  .clear-create-stage[data-active="true"] {\n    min-height: 340px !important;\n  }\n\n  .clear-create-result-media {\n    min-height: 340px !important;\n    border-radius: 15px !important;\n    transform: none !important;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-context {\n    display: none;\n  }\n\n  .clear-create-result-actions {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}\n`;
writeFileSync(globalsPath, globals);

console.log("Applied Create v0.5 fidelity correction.");
