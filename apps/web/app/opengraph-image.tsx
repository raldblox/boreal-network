import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";

export const alt = "Boreal turns requests into completed work.";
export const contentType = "image/png";
export const size = {
  height: 630,
  width: 1200,
};

const markStyle = {
  display: "block",
  filter: "drop-shadow(0 22px 38px rgba(14, 116, 144, 0.24))",
} satisfies CSSProperties;

function BorealMark({ size = 132 }: { size?: number }) {
  return (
    <svg
      fill="none"
      height={Math.round(size * 0.865)}
      style={markStyle}
      viewBox="0 0 634 548"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M488.037 72.8154L272.879 144.222L273.887 0L488.037 72.8154Z"
        fill="url(#paint0)"
      />
      <path
        d="M503.367 282.669L196.443 179.869L503.367 78.0205V282.669Z"
        fill="url(#paint1)"
      />
      <path
        d="M617.035 330.546L181.039 476.958V184.981L617.035 330.546Z"
        fill="url(#paint2)"
      />
      <path
        d="M0 547.782L632.372 335.667L633.817 547.782H0Z"
        fill="url(#paint3)"
      />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint0"
          x1="488.037"
          x2="272.879"
          y1="71.9473"
          y2="71.9473"
        >
          <stop stopColor="#01FDFF" />
          <stop offset="1" stopColor="#62FFCE" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint1"
          x1="196.443"
          x2="503.319"
          y1="171.363"
          y2="182.066"
        >
          <stop stopColor="#22C1F3" />
          <stop offset="1" stopColor="#01FDFF" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint2"
          x1="616.686"
          x2="181.039"
          y1="184.981"
          y2="184.981"
        >
          <stop stopColor="#477BE0" />
          <stop offset="1" stopColor="#23C1F0" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="paint3"
          x1="-0.361355"
          x2="633.456"
          y1="547.782"
          y2="547.782"
        >
          <stop stopColor="#6537C6" />
          <stop offset="1" stopColor="#3D73CB" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background:
          "radial-gradient(circle at 18% 16%, rgba(98, 255, 206, 0.32) 0, rgba(98, 255, 206, 0) 30%), radial-gradient(circle at 82% 24%, rgba(71, 123, 224, 0.34) 0, rgba(71, 123, 224, 0) 32%), linear-gradient(135deg, #f8fbff 0%, #eef9f6 48%, #dcebff 100%)",
        color: "#08111f",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        height: "100%",
        padding: 48,
        width: "100%",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.84)",
          border: "1px solid rgba(8,17,31,0.1)",
          borderRadius: 40,
          boxShadow: "0 30px 80px rgba(15, 23, 42, 0.16)",
          display: "flex",
          flexDirection: "row",
          gap: 34,
          height: "100%",
          justifyContent: "space-between",
          overflow: "hidden",
          padding: 52,
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 600,
          }}
        >
          <div
            style={{
              alignItems: "center",
              color: "#0f172a",
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              gap: 22,
              letterSpacing: "-0.02em",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "#07111f",
                borderRadius: 26,
                display: "flex",
                height: 104,
                justifyContent: "center",
                width: 104,
              }}
            >
              <BorealMark size={76} />
            </div>
            Boreal
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                letterSpacing: "-0.06em",
                lineHeight: 0.92,
              }}
            >
              Requests into completed work.
            </div>
            <div
              style={{
                color: "#334155",
                display: "flex",
                fontSize: 31,
                lineHeight: 1.28,
                maxWidth: 590,
              }}
            >
              Post a request, compare plans, run or fund the work, verify
              artifacts, and reuse accepted solutions.
            </div>
          </div>
          <div
            style={{
              color: "#475569",
              display: "flex",
              fontSize: 24,
              gap: 16,
            }}
          >
            <span>human + AI fulfillment</span>
            <span style={{ color: "#14b8a6" }}>•</span>
            <span>proof attached</span>
          </div>
        </div>
        <div
          style={{
            alignItems: "stretch",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            justifyContent: "center",
            width: 300,
          }}
        >
          {["Request", "Plans", "Run", "Proof"].map((label, index) => (
            <div
              key={label}
              style={{
                alignItems: "center",
                background:
                  index === 0
                    ? "linear-gradient(135deg, #07111f 0%, #103a55 100%)"
                    : "rgba(255,255,255,0.76)",
                border:
                  index === 0
                    ? "1px solid rgba(255,255,255,0.18)"
                    : "1px solid rgba(15,23,42,0.11)",
                borderRadius: 26,
                color: index === 0 ? "#f8fafc" : "#0f172a",
                display: "flex",
                fontSize: 31,
                fontWeight: 700,
                justifyContent: "space-between",
                padding: "26px 28px",
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  color: index === 0 ? "#62ffce" : "#0f766e",
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            bottom: -116,
            display: "flex",
            opacity: 0.12,
            position: "absolute",
            right: -120,
            transform: "rotate(-8deg)",
          }}
        >
          <BorealMark size={430} />
        </div>
        <div
          style={{
            background: "linear-gradient(90deg, #6537c6 0%, #23c1f0 100%)",
            bottom: 0,
            display: "flex",
            height: 10,
            left: 0,
            position: "absolute",
            width: "100%",
          }}
        />
      </div>
    </div>,
    size
  );
}
