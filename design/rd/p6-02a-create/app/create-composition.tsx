"use client";

import { useReducer, useState, useRef, type Dispatch, type PointerEvent as ReactPointerEvent } from "react";
import { animated, useSpring } from "@react-spring/web";
import { Collapsible, Popover, ToggleGroup } from "radix-ui";
import { springs } from "../../../system/v2/springs";
import { Alert, Button, Field, FieldDescription, Label, NativeSelect, Range, Textarea, Toggle, useReducedMotion } from "./primitives";
import { blocker, compositions, fixture, references, transition, type Composition, type FixtureEvent, type CreateFixture, type Ratio, type Reference } from "./create-fixtures";

const ratios: readonly Ratio[] = ["1:1", "4:3", "3:4", "16:9", "9:16"];
const artwork = "/p602a-artwork.svg";
type Send = Dispatch<FixtureEvent>;
function Art({ item, result = false }: { item?: Reference; result?: boolean }) {
  return <div className="p602a-art" data-art={item?.artwork ?? "dunes"} role="img" aria-label={result ? "Synthetic sandstone arch result" : item?.title ?? "Synthetic desert artwork"} />;
}

function ReferenceCard({ item, index, length, available, send, disabled }: { item: Reference; index: number; length: number; available: readonly Reference[]; send: Send; disabled: boolean }) {
  const reduced = useReducedMotion();
  const [{ offset }, api] = useSpring(() => ({ offset: 0, config: springs["drag-release"] }));
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  function finish(e: ReactPointerEvent<HTMLButtonElement>, valid: boolean) {
    const from = start.current;
    if (!from || e.pointerId !== from.id) return;
    start.current = null;
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-reference]");
    const siblings = Array.from(e.currentTarget.closest(".p602a-references")?.querySelectorAll("[data-reference]") ?? []);
    const target = hit ? siblings.indexOf(hit) : -1;
    if (valid && target >= 0 && Math.abs(target - index) === 1 && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 12) {
      send({ type: "move", key: item.key, direction: target < index ? -1 : 1 });
    }
    void api.start({ offset: 0, immediate: reduced, config: { ...springs["drag-release"], clamp: true } });
  }
  const dragStyle = { "--p602a-drag-offset": offset, opacity: 1 };
  return <animated.article className="p602a-reference" data-reference={item.key} style={dragStyle}>
    <Art item={item} />
    <div className="p602a-reference-text"><strong data-contrast="">{index === 0 ? "Source" : "Reference " + index}</strong><span data-contrast="">@image{index + 1} · {item.title}</span></div>
    <div className="p602a-row">
      <Button variant="icon" disabled={disabled} aria-label={"Drag " + item.title} className="p602a-grip"
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (start.current && !reduced) void api.start({ offset: Math.max(-1, Math.min(1, (e.clientX - start.current.x + e.clientY - start.current.y) / 64)), immediate: true }); }}
        onPointerUp={(e) => finish(e, true)} onPointerCancel={(e) => finish(e, false)} onLostPointerCapture={(e) => finish(e, false)}>↕</Button>
      <Button variant="icon" aria-label={"Move " + item.title + " earlier"} disabled={disabled || index === 0} onClick={() => send({ type: "move", key: item.key, direction: -1 })}>↑</Button>
      <Button variant="icon" aria-label={"Move " + item.title + " later"} disabled={disabled || index === length - 1} onClick={() => send({ type: "move", key: item.key, direction: 1 })}>↓</Button>
      <Button variant="icon" aria-label={"Remove " + item.title} disabled={disabled} onClick={() => send({ type: "remove", key: item.key })}>×</Button>
    </div>
    {available.length > 0 && <Button disabled={disabled} aria-label={"Replace " + item.title} onClick={() => send({ type: "replace", key: item.key, replacement: available[0].key })}>Replace</Button>}
  </animated.article>;
}
function Toolbar({ state }: { state: CreateFixture }) {
  const [open, setOpen] = useState<"queue" | "shortcuts" | "recent" | null>(null);
  const reduced = useReducedMotion();
  return <div className="p602a-row p602a-toolbar">
    {(["queue", "shortcuts", "recent"] as const).map((key) => (
      <Popover.Root key={key} open={open === key} onOpenChange={(next) => setOpen(next ? key : null)}>
        <Popover.Trigger asChild><Button>{key === "queue" ? "Queue" : key === "shortcuts" ? "Shortcuts" : "Recent"}</Button></Popover.Trigger>
        <Popover.Portal><Popover.Content aria-label={key} sideOffset={8} collisionPadding={8} className="p602a-popover p602a-create-popover" data-reduced={reduced}>
          <strong data-contrast="">{key === "queue" ? "Queue" : key === "shortcuts" ? "Keyboard shortcuts" : "Recent prompt"}</strong>
          <p className="p602a-description" data-contrast="">{key === "queue" ? state.phase === "active" ? "One local sample · " + state.status : "No active render." : key === "shortcuts" ? "Ctrl + Enter: Generate. Escape: close a popover." : state.recipe.prompt || "No recent prompt."}</p>
          <Popover.Close asChild><Button>Close</Button></Popover.Close>
        </Popover.Content></Popover.Portal>
      </Popover.Root>
    ))}
  </div>;
}
function Stage({ state, send }: { state: CreateFixture; send: Send }) {
  const reduced = useReducedMotion();
  const [compare, setCompare] = useState(false);
  const [history, setHistory] = useState(false);
  const result = state.phase === "result";
  const source = state.recipe.references[0];
  const style = useSpring({ reveal: result ? 1 : 0, config: springs.gentle, immediate: reduced });
  const revealStyle = { "--p602a-reveal": style.reveal, opacity: 1 };
  return <section className="p602a-stage" aria-label="Media stage">
    <div className="p602a-stage-head"><div><p className="p602a-kicker" data-contrast="">Workspace</p><h2 data-contrast="">Image canvas</h2></div><span className="p602a-description" data-contrast="">{state.recipe.ratio}</span></div>
    <div className="p602a-media" data-media-state={state.phase}>
      {result ? <animated.div className="p602a-result-reveal" style={revealStyle}><Art item={compare ? source : undefined} result={!compare} /></animated.div>
        : state.phase === "active" ? <div className="p602a-stage-message" role="status"><strong data-contrast="">{state.status === "cancelling" ? "Cancelling" : state.status === "running" ? "Rendering image" : state.status === "queued" ? "Queued" : "Accepted"}</strong><p data-contrast="">Waiting for the next local fixture event.</p></div>
        : state.phase === "failed" ? <div className="p602a-stage-message"><Alert tone="error">{state.message}</Alert></div>
        : source ? <div className="p602a-source-preview"><Art item={source} />{state.recipe.mask && <div className="p602a-mask-outline" aria-label="Synthetic selected region" role="img" />}</div>
        : <div className="p602a-stage-message"><span className="p602a-empty-mark" aria-hidden="true">◇</span><strong data-contrast="">Your image starts here</strong><p data-contrast="">Describe an idea or switch to Image Editing to attach a source.</p></div>}
    </div>
    {result && <div className="p602a-row p602a-stage-actions">
      {source && <Toggle aria-label="Compare source and result" pressed={compare} onPressedChange={setCompare}>Compare</Toggle>}
      <Button onClick={() => send({ type: "reuse" })}>Reuse settings</Button>
      <Button asChild><a href={artwork} download="synthetic-sample.svg">Download sample</a></Button>
    </div>}
    {state.phase === "failed" && <Button onClick={() => send({ type: "reuse" })}>Reuse settings</Button>}
    <Collapsible.Root open={history} onOpenChange={setHistory}>
      <Collapsible.Trigger asChild><Button>History {result ? "· 1" : state.phase === "failed" ? "· 1 failed" : "· Empty"}</Button></Collapsible.Trigger>
      <Collapsible.Content><p className="p602a-description" data-contrast="">{result ? "Synthetic result · Ready" : state.phase === "failed" ? "Synthetic render · Failed" : "No completed samples in this fixture."}</p></Collapsible.Content>
    </Collapsible.Root>
  </section>;
}
function Composer({ state, send }: { state: CreateFixture; send: Send }) {
  const recipe = state.recipe;
  const active = state.phase === "active";
  const reason = blocker(recipe);
  const available = references.filter((item) => !recipe.references.some((ref) => ref.key === item.key));
  const reduced = useReducedMotion();
  const advanced = useSpring({ y: recipe.advanced ? 0 : -1, config: springs.smooth, immediate: reduced });
  const advancedStyle = { "--p602a-disclosure-offset": advanced.y, opacity: 1 };
  return <section className="p602a-composer" aria-label="Image composer" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !reason && !active) { e.preventDefault(); send({ type: "submit" }); } }}>
    <div className="p602a-stage-head"><div><p className="p602a-kicker" data-contrast="">FIBO · Image</p><h2 data-contrast="">Compose</h2></div></div>
    <ToggleGroup.Root type="single" value={recipe.mode} onValueChange={(value) => { if (value === "generate" || value === "edit") send({ type: "mode", value }); }} disabled={active} aria-label="Workflow" className="p602a-row">
      <ToggleGroup.Item className="p602a-control p602a-toggle" data-contrast="" value="generate">Text to Image</ToggleGroup.Item>
      <ToggleGroup.Item className="p602a-control p602a-toggle" data-contrast="" value="edit">Image Editing</ToggleGroup.Item>
    </ToggleGroup.Root>
    <Field><Label htmlFor="p602a-prompt">Prompt</Label><Textarea id="p602a-prompt" rows={4} value={recipe.prompt} disabled={active} placeholder="Describe the image you want to create…" onChange={(e) => send({ type: "prompt", value: e.target.value })} /></Field>
    {recipe.mode === "edit" && <div className="p602a-stack">
      <div className="p602a-stage-head"><strong data-contrast="">Source & references</strong><span className="p602a-description" data-contrast="">{recipe.references.length}/4</span></div>
      <div className="p602a-references">{recipe.references.map((item, index) => <ReferenceCard key={item.key} item={item} index={index} length={recipe.references.length} available={available} send={send} disabled={active} />)}</div>
      <Button disabled={active || !available.length} onClick={() => available[0] && send({ type: "attach", key: available[0].key })}>Attach sample image</Button>
      {recipe.references.length === 1 && <Toggle disabled={active} pressed={recipe.mask} onPressedChange={(value) => send({ type: "mask", value })}>Selected region {recipe.mask ? "on" : "off"}</Toggle>}
      <p className="p602a-description" data-contrast="">Drag onto an adjacent card or use arrows to reorder. Mask preview is a fixed synthetic region, not a mask editor.</p>
    </div>}
    <Field><Label htmlFor="p602a-ratio">Aspect ratio</Label><NativeSelect id="p602a-ratio" value={recipe.ratio} disabled={active} onChange={(e) => { const ratio = ratios.find((value) => value === e.target.value); if (ratio) send({ type: "ratio", value: ratio }); }}>{ratios.map((value) => <option key={value}>{value}</option>)}</NativeSelect></Field>
    <Collapsible.Root open={recipe.advanced} onOpenChange={(value) => send({ type: "advanced", value })} disabled={active} className="p602a-stack">
      <Collapsible.Trigger asChild><Button disabled={active}>Advanced {recipe.advanced ? "−" : "+"}</Button></Collapsible.Trigger>
      <Collapsible.Content forceMount hidden={!recipe.advanced}><animated.div className="p602a-advanced p602a-disclosure-inset" style={advancedStyle}>
        <Field><Label htmlFor="create-preview-steps">Steps · {recipe.steps}</Label><Range id="create-preview-steps" min={1} max={8} value={recipe.steps} disabled={active} onChange={(e) => send({ type: "steps", value: e.target.valueAsNumber })} /><FieldDescription>Hosted fixture supports 4 steps.</FieldDescription></Field>
        <Field><Label htmlFor="p602a-vgl">Manual VGL JSON</Label><Textarea id="p602a-vgl" rows={3} value={recipe.vgl} disabled={active} placeholder="Enter JSON instruction (optional)" onChange={(e) => send({ type: "vgl", value: e.target.value })} /><FieldDescription>Generated VGL is unavailable in this workspace.</FieldDescription></Field>
      </animated.div></Collapsible.Content>
    </Collapsible.Root>
    {state.phase === "error" && <Alert tone="error">{state.message}</Alert>}
    {reason && <p id="p602a-blocker" className="p602a-description" data-contrast="">{reason}</p>}
    <Button variant="primary" disabled={!!reason || active} aria-describedby={reason ? "p602a-blocker" : undefined} pending={active} onClick={() => send({ type: "submit" })}>{active ? "Rendering" : "Generate"}</Button>
    {active && <Button disabled={state.status === "cancelling"} onClick={() => send({ type: "cancel" })}>{state.status === "cancelling" ? "Cancelling…" : "Cancel render"}</Button>}
    <p className="p602a-sr-only" role="status">{state.announcement}</p>
  </section>;
}
export function CreateComposition() {
  const [state, send] = useReducer(transition, "empty", fixture);
  const [selected, setSelected] = useState<Composition>("empty");
  const [revision, setRevision] = useState(0);
  function reset(composition: Composition) { setSelected(composition); send({ type: "reset", composition }); setRevision((n) => n + 1); }
  return <main className="p602a-create-page" data-p602a-isolated="create">
    <aside className="p602a-fixture-controls" aria-label="Prototype-only fixture controls">
      <p data-contrast="">Local design fixture · not product controls</p>
      <Label htmlFor="p602a-fixture">Composition</Label>
      <NativeSelect id="p602a-fixture" value={selected} onChange={(e) => { const value = compositions.find((item) => item === e.target.value); if (value) reset(value); }}>{compositions.map((item) => <option key={item}>{item}</option>)}</NativeSelect>
      <Button onClick={() => reset(selected)}>Reset fixture</Button>
      <Button disabled={state.phase !== "active"} onClick={() => send({ type: "advance" })}>Advance fixture</Button>
      <Button disabled={state.phase !== "active"} onClick={() => send({ type: "fail" })}>Fail fixture</Button>
    </aside>
    <div className="p602a-composition" data-create-composition={selected} data-create-phase={state.phase} data-job-status={state.phase === "active" ? state.status : undefined}>
      <header className="p602a-create-header"><div><p className="p602a-kicker" data-contrast="">RenderLab / Create</p><h1 data-contrast="">Make an image</h1></div><Toolbar key={revision} state={state} /></header>
      <div className="p602a-create-grid" key={revision}><Composer state={state} send={send} /><Stage state={state} send={send} /></div>
    </div>
  </main>;
}
