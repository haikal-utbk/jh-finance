import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jh.finance — Aset & Keuangan Keluarga",
    short_name: "jh.finance",
    description: "Pendataan aset dan keuangan pribadi/keluarga",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F6F4EE",
    theme_color: "#2F5545",
    icons: [
      { src: "/manifest-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
