import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 0,
          background: "#0a0a0c",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 120"
          width="24"
          height="24"
          fill="#10b981"
        >
          <circle cx="60" cy="24" r="12" />
          <circle cx="24" cy="60" r="12" />
          <circle cx="60" cy="60" r="12" />
          <circle cx="96" cy="60" r="12" />
          <circle cx="60" cy="96" r="12" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
