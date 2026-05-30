import { ImageResponse } from "next/og";

export const alt = "Boreal turns requests into completed work.";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #e8f7f5 45%, #dff1ff 100%)",
        color: "#0f172a",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        height: "100%",
        padding: 64,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(15,23,42,0.12)",
          borderRadius: 42,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: 56,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#0f766e",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Boreal
          </div>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: "-0.05em",
              lineHeight: 0.96,
              maxWidth: 880,
            }}
          >
            Requests into completed work.
          </div>
        </div>
        <div
          style={{
            color: "#334155",
            display: "flex",
            fontSize: 30,
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          Post a request, compare plans, run or fund the work, verify artifacts,
          and reuse accepted solutions.
        </div>
      </div>
    </div>,
    size
  );
}
