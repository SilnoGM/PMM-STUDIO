import type { Metadata } from "next";

import { DevtoolsZhLoader } from "@/components/devtools-zh-loader";

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
      <body>
        {children}
        {/* 仅开发环境：把 Next.js 开发工具浮层翻译成简体中文 */}
        {process.env.NODE_ENV === "development" ? <DevtoolsZhLoader /> : null}
      </body>
    </html>
  );
}
