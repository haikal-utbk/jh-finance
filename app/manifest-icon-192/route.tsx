import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
          fontSize: 92,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        jh
      </div>
    ),
    { width: 192, height: 192 }
  );
}
