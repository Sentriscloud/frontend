import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0c",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          fontFamily: "sans-serif",
          color: "#f5f5f4",
          position: "relative",
        }}
      >
        {/* Emerald glow accent */}
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 600,
            height: 600,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0) 70%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            width="56"
            height="56"
            fill="#10b981"
          >
            <circle cx="60" cy="24" r="12" />
            <circle cx="24" cy="60" r="12" />
            <circle cx="60" cy="60" r="12" />
            <circle cx="96" cy="60" r="12" />
            <circle cx="60" cy="96" r="12" />
          </svg>
          <span style={{ fontSize: 28, fontWeight: 500 }}>SentrisCloud</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#10b981",
              fontFamily: "monospace",
            }}
          >
            ── Products built on Sentrix Chain
          </span>
          <h1
            style={{
              fontSize: 88,
              fontWeight: 500,
              lineHeight: 1,
              letterSpacing: -2,
              margin: 0,
              maxWidth: 900,
            }}
          >
            The user-facing layer of the Sentrix ecosystem.
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#a8a29e",
            fontSize: 20,
          }}
        >
          <span>SentrixScan · Wallet · Faucet · CoinBlast</span>
          <span style={{ fontFamily: "monospace" }}>sentriscloud.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
