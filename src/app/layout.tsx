import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMM Studio",
  description: "产品、媒体与资料三位一体的内容中台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
