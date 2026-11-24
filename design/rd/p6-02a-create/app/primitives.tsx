"use client";

import { forwardRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { animated, useSpring } from "@react-spring/web";
import { AlertDialog, Checkbox as RadixCheckbox, Collapsible, DropdownMenu, Label as RadixLabel, Slot, Toggle as RadixToggle, ToggleGroup } from "radix-ui";
import { springs } from "../../../system/v2/springs";

const query = "(prefers-reduced-motion: reduce)";
function subscribe(notify: () => void) {
  const media = matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => false);
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "secondary" | "destructive" | "icon"; pending?: boolean; asChild?: boolean };
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", pending = false, asChild = false, disabled, children, className = "", onPointerDown, onPointerUp, onPointerCancel, onPointerLeave, onKeyDown, onKeyUp, onBlur, ...props }, ref,
) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const style = useSpring({ scale: pressed && !disabled && !pending ? 0.98 : 1, config: springs.snappy, immediate: reduced });
  const classes = "p602a-control p602a-button " + className;
  if (asChild) {
    return <Slot.Root className={classes} data-variant={variant} data-contrast="" {...props}>{children}</Slot.Root>;
  }
  return <animated.button {...props} ref={ref} type={props.type ?? "button"} className={classes} data-variant={variant} data-contrast="" data-pressed={pressed || undefined}
    disabled={disabled || pending} aria-busy={pending || undefined} style={style}
    onPointerDown={(e) => { onPointerDown?.(e); if (!e.defaultPrevented && e.button === 0) setPressed(true); }}
    onPointerUp={(e) => { setPressed(false); onPointerUp?.(e); }}
    onPointerCancel={(e) => { setPressed(false); onPointerCancel?.(e); }}
    onPointerLeave={(e) => { setPressed(false); onPointerLeave?.(e); }}
    onKeyDown={(e) => { onKeyDown?.(e); if (!e.defaultPrevented && (e.key === " " || e.key === "Enter")) setPressed(true); }}
    onKeyUp={(e) => { setPressed(false); onKeyUp?.(e); }}
    onBlur={(e) => { setPressed(false); onBlur?.(e); }}
  >{pending && <Spinner />}{children}</animated.button>;
});

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(props, ref) {
  return <input {...props} ref={ref} className="p602a-control p602a-field-control" data-contrast="" />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(props, ref) {
  return <textarea {...props} ref={ref} className="p602a-control p602a-field-control p602a-textarea" data-contrast="" />;
});
export function Label(props: ComponentProps<typeof RadixLabel.Root>) {
  return <RadixLabel.Root {...props} className="p602a-label" data-contrast="" />;
}
export function Field({ children }: { children: ReactNode }) {
  return <div className="p602a-field">{children}</div>;
}
export function FieldDescription(props: ComponentProps<"p">) {
  return <p {...props} className="p602a-description" data-contrast="" />;
}
export function FieldError(props: ComponentProps<"p">) {
  return <p {...props} className="p602a-error" data-contrast="" />;
}
export function NativeSelect(props: ComponentProps<"select">) {
  return <select {...props} className="p602a-control p602a-field-control" data-contrast="" />;
}
export function Checkbox(props: ComponentProps<typeof RadixCheckbox.Root>) {
  return <RadixCheckbox.Root {...props} className="p602a-control p602a-checkbox" data-contrast="">
    <RadixCheckbox.Indicator aria-hidden="true">✓</RadixCheckbox.Indicator>
  </RadixCheckbox.Root>;
}
export function Toggle(props: ComponentProps<typeof RadixToggle.Root>) {
  return <RadixToggle.Root {...props} className="p602a-control p602a-toggle" data-contrast="" />;
}
export function Segmented({ disabled = false, label = "View", initial = "one" }: { disabled?: boolean; label?: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ToggleGroup.Root type="single" value={value} onValueChange={(next) => { if (next) setValue(next); }} disabled={disabled} aria-label={label} className="p602a-row">
    <ToggleGroup.Item value="one" className="p602a-control p602a-toggle" data-contrast="">One</ToggleGroup.Item>
    <ToggleGroup.Item value="two" className="p602a-control p602a-toggle" data-contrast="">Two</ToggleGroup.Item>
  </ToggleGroup.Root>;
}
export function Disclosure({ disabled = false, initial = false, label = "Advanced settings" }: { disabled?: boolean; initial?: boolean; label?: string }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(initial);
  const style = useSpring({ opacity: open ? 1 : 0, y: open ? 0 : -1, config: springs.smooth, immediate: reduced });
  return <Collapsible.Root open={open} onOpenChange={setOpen} disabled={disabled} className="p602a-stack">
    <Collapsible.Trigger asChild><Button disabled={disabled}>{label} {open ? "−" : "+"}</Button></Collapsible.Trigger>
    <Collapsible.Content forceMount hidden={!open}>
      <animated.div style={{ opacity: style.opacity, transform: style.y.to((y) => "translateY(calc(var(--rlv2-space-4) * " + y + "))") }} className="p602a-inset">
        <p data-contrast="">Optional settings remain attached to the trigger.</p>
      </animated.div>
    </Collapsible.Content>
  </Collapsible.Root>;
}
export function Menu({ disabled = false, label = "More actions" }: { disabled?: boolean; label?: string }) {
  const [checked, setChecked] = useState(true);
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><Button disabled={disabled}>{label}</Button></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content sideOffset={8} collisionPadding={8} className="p602a-popover" aria-label="Sample actions">
      <DropdownMenu.Label className="p602a-description" data-contrast="">Local actions</DropdownMenu.Label>
      <DropdownMenu.Item className="p602a-menu-item" data-contrast="">Rename</DropdownMenu.Item>
      <DropdownMenu.CheckboxItem checked={checked} onCheckedChange={setChecked} className="p602a-menu-item" data-contrast=""><DropdownMenu.ItemIndicator>✓ </DropdownMenu.ItemIndicator>Keep selection</DropdownMenu.CheckboxItem>
      <DropdownMenu.Item disabled className="p602a-menu-item" data-contrast="">Unavailable</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
export function Confirmation({ disabled = false }: { disabled?: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  return <div className="p602a-stack">
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild><Button variant="destructive" disabled={disabled}>Remove sample</Button></AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="p602a-overlay" />
        <AlertDialog.Content className="p602a-dialog">
          <AlertDialog.Title className="p602a-title" data-contrast="">Remove this sample?</AlertDialog.Title>
          <AlertDialog.Description className="p602a-description" data-contrast="">Only this in-memory demonstration changes. This cannot remove real media.</AlertDialog.Description>
          <div className="p602a-row">
            <AlertDialog.Cancel asChild><Button>Cancel</Button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><Button variant="destructive" onClick={() => setConfirmed(true)}>Remove</Button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
    {confirmed && <Alert tone="success">Sample removed locally.</Alert>}
  </div>;
}
export function Alert({ tone = "neutral", children }: { tone?: "neutral" | "error" | "success" | "warning"; children: ReactNode }) {
  return <div role={tone === "error" ? "alert" : "status"} className="p602a-alert" data-tone={tone} data-contrast="">
    <span aria-hidden="true">{tone === "success" ? "✓" : tone === "neutral" ? "i" : "!"}</span> {children}
  </div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="p602a-empty"><h3 className="p602a-title" data-contrast="">Nothing here yet</h3><p className="p602a-description" data-contrast="">{children}</p></div>;
}
export function Spinner() {
  return <span className="p602a-spinner" aria-hidden="true">◌</span>;
}
