import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2F5545",
          color: "#F6F4EE",
          fontSize: 86,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        jh
      </div>
    ),
    { ...size }
  );
}
