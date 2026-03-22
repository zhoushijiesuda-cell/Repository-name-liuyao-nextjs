import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "六爻专业排盘",
  description: "六爻专业排盘、自动应期与大师断语",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
