import { ImageResponse } from "next/og";

export const alt = "RenderLab — image and video creative workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          <svg width="54" height="54" viewBox="0 0 32 32" fill="none">
            <path d="M7 27V5h9c5 0 8 3 8 7s-3 7-8 7H7m9 0 9 8" stroke="#F4F5F7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 30, fontWeight: 700 }}>RenderLab</div>
          <div style={{ marginLeft: 10, border: "1px solid #2B303A", borderRadius: 999, padding: "8px 14px", color: "#9CA3AF", fontSize: 16 }}>Closed beta</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
          <div style={{ color: "#7C6CF2", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>THE CREATIVE WORKSPACE</div>
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
