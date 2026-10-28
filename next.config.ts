import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自托管：产出精简镜像，Dockerfile 中直接复制 .next/standalone
  output: "standalone",
  // 原生模块不能被打包器内联，必须外置后由 standalone 追踪复制
  serverExternalPackages: ["argon2", "sharp"],
  // 构建阶段不跑 lint：单独执行 pnpm lint，避免构建变慢且掩盖真实错误
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
