import { ImageResponse } from "next/og";

export const alt = "RenderLab — image and video creative workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function LabGridMark() {
  return (
    <svg width="50" height="54" viewBox="0 0 122 132" fill="none">
      <defs>
        <linearGradient id="og-renderlab-tl" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D4F1FF" />
          <stop offset=".48" stopColor="#9DBAFF" />
          <stop offset="1" stopColor="#6F79F8" />
        </linearGradient>
        <radialGradient id="og-renderlab-ur" cx="122" cy="28" r="94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7C7F1" />
          <stop offset=".34" stopColor="#D38AF2" />
          <stop offset=".62" stopColor="#8C69F6" />
          <stop offset="1" stopColor="#637AF4" />
        </radialGradient>
        <linearGradient id="og-renderlab-bl" x1="24" y1="73" x2="24" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#347BF2" />
          <stop offset=".55" stopColor="#469EF7" />
          <stop offset="1" stopColor="#73D7FF" />
        </linearGradient>
        <linearGradient id="og-renderlab-br" x1="72" y1="92" x2="122" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7084F3" />
          <stop offset=".45" stopColor="#3568E8" />
          <stop offset="1" stopColor="#315CDF" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="56" height="47" rx="4" fill="url(#og-renderlab-tl)" />
      <path d="M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z" fill="url(#og-renderlab-ur)" />
      <rect x="0" y="73" width="48" height="59" rx="4" fill="url(#og-renderlab-bl)" />
      <path d="M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z" fill="url(#og-renderlab-br)" />
    </svg>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#090A0C",
          color: "#F4F5F7",
          padding: "64px 72px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <LabGridMark />
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 30, letterSpacing: -1.1 }}>
            <span style={{ fontWeight: 700 }}>Render</span>
            <span style={{ fontWeight: 400 }}>Lab</span>
          </div>
          <div style={{ marginLeft: 10, border: "1px solid #2B303A", borderRadius: 999, padding: "8px 14px", color: "#9CA3AF", fontSize: 16 }}>
            Closed beta
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
          <div style={{ color: "#8C7CFF", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>THE CREATIVE LAB</div>
          <div style={{ fontSize: 72, lineHeight: 1.02, letterSpacing: -3, fontWeight: 700 }}>Create images. Shape them. Put them in motion.</div>
          <div style={{ color: "#9CA3AF", fontSize: 24, lineHeight: 1.4 }}>Image and video creation, reference-driven edits, reusable media, and generation history in one focused workspace.</div>
        </div>
        <div style={{ display: "flex", gap: 14, color: "#9CA3AF", fontSize: 16 }}>
          <span>Create Image</span><span>·</span><span>Edit Image</span><span>·</span><span>Create Video</span><span>·</span><span>Animate Image</span>
        </div>
      </div>
    ),
    size,
  );
}
