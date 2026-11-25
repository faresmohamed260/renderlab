"use client";

import type { ComponentProps } from "react";
import { Slider as Primitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Slider({
  className, value, defaultValue, min = 0, "aria-label": label,
  "aria-labelledby": labelledBy, thumbLabels, ...props
}: ComponentProps<typeof Primitive.Root> & { thumbLabels?: readonly string[] }) {
  const values = value ?? defaultValue ?? [min];
  return <Primitive.Root data-slot="slider" value={value} defaultValue={defaultValue} min={min}
    className={cn("relative flex min-h-11 min-w-0 touch-none select-none items-center data-[orientation=vertical]:h-44 data-[orientation=vertical]:w-11 data-[orientation=vertical]:flex-col", className)}
    {...props}>
    <Primitive.Track data-slot="slider-track" className="relative h-2 w-full grow overflow-hidden rounded-full bg-[var(--rl-surface-high)] data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2">
      <Primitive.Range data-slot="slider-range" className="absolute h-full bg-[var(--rl-accent-primary)] data-[orientation=vertical]:w-full" />
    </Primitive.Track>
    {values.map((_, index) => <Primitive.Thumb key={index} data-slot="slider-thumb"
      aria-label={thumbLabels?.[index] ?? (values.length === 1 ? label : label ? label + " " + (index + 1) : "Value " + (index + 1))}
      aria-labelledby={values.length === 1 ? labelledBy : undefined}
      className="block size-6 rounded-full border border-[color:var(--rl-border-action-selection)] bg-[var(--rl-text-primary)] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-[var(--rl-focus-offset)] focus-visible:outline-[color:var(--rl-focus)] data-[disabled]:bg-[var(--rl-text-disabled)]" />)}
  </Primitive.Root>;
}
