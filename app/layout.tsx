import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "jh.finance",
  description: "Pendataan aset dan keuangan pribadi/keluarga",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "jh.finance",
  },
};

export const viewport = {
  themeColor: "#2F5545",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plexSans.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
