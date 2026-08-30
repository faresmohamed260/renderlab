import { cn } from "@/lib/utils";

export function RenderLabMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8 shrink-0", className)}
    >
      <path
        d="M7 27V5h9c5 0 8 3 8 7s-3 7-8 7H7m9 0 9 8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RenderLabBrand({
  className,
  markClassName,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RenderLabMark className={markClassName} />
      <span className={cn("font-semibold tracking-tight", textClassName)}>RenderLab</span>
    </span>
  );
}
