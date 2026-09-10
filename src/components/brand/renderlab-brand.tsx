import { cn } from "@/lib/utils";

type RenderLabMarkTone = "brand" | "mono";

export function RenderLabMark({
  className,
  tone = "brand",
}: {
  className?: string;
  tone?: RenderLabMarkTone;
}) {
  const topLeftFill = tone === "brand" ? "url(#renderlab-mark-top-left)" : "currentColor";
  const upperRightFill = tone === "brand" ? "url(#renderlab-mark-upper-right)" : "currentColor";
  const bottomLeftFill = tone === "brand" ? "url(#renderlab-mark-bottom-left)" : "currentColor";
  const bottomRightFill = tone === "brand" ? "url(#renderlab-mark-bottom-right)" : "currentColor";

  return (
    <svg
      viewBox="0 0 122 132"
      fill="none"
      aria-hidden="true"
      data-renderlab-mark="lab-grid"
      data-renderlab-mark-tone={tone}
      className={cn("size-8 shrink-0", className)}
    >
      {tone === "brand" ? (
        <defs>
          <linearGradient id="renderlab-mark-top-left" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#D4F1FF" />
            <stop offset=".48" stopColor="#9DBAFF" />
            <stop offset="1" stopColor="#6F79F8" />
          </linearGradient>
          <radialGradient id="renderlab-mark-upper-right" cx="122" cy="28" r="94" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#F7C7F1" />
            <stop offset=".34" stopColor="#D38AF2" />
            <stop offset=".62" stopColor="#8C69F6" />
            <stop offset="1" stopColor="#637AF4" />
          </radialGradient>
          <linearGradient id="renderlab-mark-bottom-left" x1="24" y1="73" x2="24" y2="132" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#347BF2" />
            <stop offset=".55" stopColor="#469EF7" />
            <stop offset="1" stopColor="#73D7FF" />
          </linearGradient>
          <linearGradient id="renderlab-mark-bottom-right" x1="72" y1="92" x2="122" y2="132" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7084F3" />
            <stop offset=".45" stopColor="#3568E8" />
            <stop offset="1" stopColor="#315CDF" />
          </linearGradient>
        </defs>
      ) : null}
      <rect x="0" y="0" width="56" height="47" rx="4" fill={topLeftFill} />
      <path d="M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z" fill={upperRightFill} />
      <rect x="0" y="73" width="48" height="59" rx="4" fill={bottomLeftFill} />
      <path d="M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z" fill={bottomRightFill} />
    </svg>
  );
}

export function RenderLabBrand({
  className,
  markClassName,
  textClassName,
  markTone = "brand",
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  markTone?: RenderLabMarkTone;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      data-renderlab-brand="locked-lab-grid"
    >
      <RenderLabMark className={markClassName} tone={markTone} />
      <span
        className={cn("inline-flex items-baseline whitespace-nowrap leading-none tracking-[-0.035em]", textClassName)}
        data-renderlab-wordmark="renderlab"
      >
        <span className="font-bold" data-renderlab-wordmark-part="render">
          Render
        </span>
        <span className="font-normal" data-renderlab-wordmark-part="lab">
          Lab
        </span>
      </span>
    </span>
  );
}
