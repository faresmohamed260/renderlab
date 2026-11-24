"use client";

import { useState, type ReactNode } from "react";
import { Alert, Button, Checkbox, Confirmation, Disclosure, Empty, Field, FieldDescription, FieldError, Input, Label, Menu, NativeSelect, Segmented, Spinner, Textarea, Toggle, useReducedMotion } from "./primitives";

function Specimen({ title, state, children }: { title: string; state: string; children: ReactNode }) {
  return <div className="p602a-example" data-state={state}>
    <p className="p602a-example-label" data-contrast="">{title} · {state}</p>
    {children}
  </div>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rlv2-specimen p602a-section"><h2>{title}</h2><div className="p602a-grid">{children}</div></section>;
}
export function Showcase() {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  return <div className="p602a-board" data-p602a-board="">
    <p className="p602a-description" data-contrast="">Motion preference: <span data-motion-mode="">{reduced ? "Reduced" : "Normal"}</span>. Hover, focus and press are live browser states; use pointer or keyboard. No real product action.</p>
    <Section title="Actions">
      <Specimen title="Primary" state="idle"><Button variant="primary" data-testid="primary">Create sample</Button></Specimen>
      <Specimen title="Primary" state="hover"><Button variant="primary" data-testid="hover">Hover me</Button></Specimen>
      <Specimen title="Secondary" state="focus"><Button data-testid="focus">Focus me</Button></Specimen>
      <Specimen title="Secondary" state="pressed"><Button data-testid="press" onClick={() => setPressed(!pressed)}>{pressed ? "Activated" : "Press me"}</Button></Specimen>
      <Specimen title="Destructive" state="idle"><Button variant="destructive">Remove</Button></Specimen>
      <Specimen title="Icon" state="idle"><Button variant="icon" aria-label="Add sample">+</Button></Specimen>
      <Specimen title="Link" state="idle"><Button asChild><a href="#feedback">View feedback</a></Button></Specimen>
      <Specimen title="Action" state="disabled"><Button disabled>Unavailable</Button></Specimen>
      <Specimen title="Action" state="pending"><Button pending>Working</Button></Specimen>
      <Specimen title="Action" state="idle"><Button>Long localized-like action name with wrapping</Button></Specimen>
    </Section>
    <Section title="Form fields and labels">
      <Specimen title="Input" state="empty"><Field><Label htmlFor="sample-empty">Title</Label><Input id="sample-empty" placeholder="Enter a title" data-testid="placeholder" /><FieldDescription>Use a descriptive name.</FieldDescription></Field></Specimen>
      <Specimen title="Input" state="idle"><Field><Label htmlFor="sample-filled">Title</Label><Input id="sample-filled" defaultValue="Local fixture" /></Field></Specimen>
      <Specimen title="Input" state="error"><Field><Label htmlFor="sample-error">Title</Label><Input id="sample-error" aria-invalid="true" aria-describedby="sample-error-text" defaultValue="!" /><FieldError id="sample-error-text">Enter a longer title. This multi-line message wraps without clipping or hiding the field.</FieldError></Field></Specimen>
      <Specimen title="Input" state="disabled"><Field><Label htmlFor="sample-disabled">Read only fixture</Label><Input id="sample-disabled" disabled defaultValue="Unavailable" /></Field></Specimen>
      <Specimen title="Textarea" state="empty"><Field><Label htmlFor="sample-text">Description</Label><Textarea id="sample-text" placeholder="Describe the sample" /></Field></Specimen>
      <Specimen title="Textarea" state="focus"><Field><Label htmlFor="sample-focused">Description</Label><Textarea id="sample-focused" defaultValue="Edit this local description" /></Field></Specimen>
      <Specimen title="Textarea" state="error"><Field><Label htmlFor="sample-text-error">Description</Label><Textarea id="sample-text-error" aria-invalid="true" aria-describedby="text-error" /><FieldError id="text-error">A description is required.</FieldError></Field></Specimen>
      <Specimen title="Textarea" state="disabled"><Field><Label htmlFor="sample-text-disabled">Description</Label><Textarea id="sample-text-disabled" disabled defaultValue="Unavailable" /></Field></Specimen>
      <Specimen title="Field" state="success"><Field><Label htmlFor="sample-valid">Valid title</Label><Input id="sample-valid" defaultValue="Sample" aria-describedby="sample-success" /><Alert tone="success"><span id="sample-success">Title is valid.</span></Alert></Field></Specimen>
    </Section>
    <Section title="Selection and choice">
      <Specimen title="Checkbox" state="idle"><div className="p602a-row"><Checkbox id="check-idle" /><Label htmlFor="check-idle">Keep sample</Label></div></Specimen>
      <Specimen title="Checkbox" state="selected"><div className="p602a-row"><Checkbox id="check-selected" defaultChecked /><Label htmlFor="check-selected">Selected</Label></div></Specimen>
      <Specimen title="Checkbox" state="disabled"><div className="p602a-row"><Checkbox id="check-disabled" disabled /><Label htmlFor="check-disabled">Unavailable</Label></div></Specimen>
      <Specimen title="Toggle" state="idle"><Toggle aria-label="Grid view">Grid</Toggle></Specimen>
      <Specimen title="Toggle" state="selected"><Toggle defaultPressed aria-label="List view">List</Toggle></Specimen>
      <Specimen title="Toggle" state="disabled"><Toggle disabled>Unavailable</Toggle></Specimen>
      <Specimen title="Toggle group" state="selected"><Segmented /></Specimen>
      <Specimen title="Toggle group" state="disabled"><Segmented disabled label="Unavailable view" /></Specimen>
      <Specimen title="NativeSelect" state="idle"><Field><Label htmlFor="select-idle">Choice</Label><NativeSelect id="select-idle" defaultValue=""><option value="" disabled>Select a choice</option><option value="a">A</option><option value="b">B</option></NativeSelect></Field></Specimen>
      <Specimen title="NativeSelect" state="selected"><Field><Label htmlFor="select-selected">Choice</Label><NativeSelect id="select-selected" defaultValue="a"><option value="a">A</option><option value="b">B</option></NativeSelect></Field></Specimen>
      <Specimen title="NativeSelect" state="disabled"><Field><Label htmlFor="select-disabled">Choice</Label><NativeSelect id="select-disabled" disabled><option>Unavailable</option></NativeSelect></Field></Specimen>
    </Section>
    <Section title="Disclosure, menu and confirmation">
      <Specimen title="Collapsible" state="idle"><Disclosure /></Specimen>
      <Specimen title="Collapsible" state="selected"><Disclosure initial label="Open settings" /></Specimen>
      <Specimen title="Collapsible" state="disabled"><Disclosure disabled label="Unavailable settings" /></Specimen>
      <Specimen title="DropdownMenu" state="idle"><Menu /></Specimen>
      <Specimen title="DropdownMenu" state="disabled"><Menu disabled label="Unavailable actions" /></Specimen>
      <Specimen title="AlertDialog" state="idle"><Confirmation /></Specimen>
      <Specimen title="AlertDialog" state="disabled"><Confirmation disabled /></Specimen>
    </Section>
    <div id="feedback"><Section title="Feedback and status">
      <Specimen title="Alert" state="idle"><Alert>Local information.</Alert></Specimen>
      <Specimen title="Alert" state="error"><Alert tone="error">Could not complete the local action. Try again.</Alert></Specimen>
      <Specimen title="Alert" state="success"><Alert tone="success">Local action completed.</Alert></Specimen>
      <Specimen title="Alert" state="error"><Alert tone="warning">Review this setting.</Alert></Specimen>
      <Specimen title="Empty" state="empty"><Empty>Samples will appear here when available.</Empty></Specimen>
      <Specimen title="Spinner" state="pending"><div role="status" className="p602a-row" data-contrast=""><Spinner /> Waiting for the local fixture</div></Specimen>
    </Section></div>
  </div>;
}
