# 生产镜像
# 两点取舍：
# 1. 用 Debian slim 而非 alpine —— argon2 与 sharp 的预编译二进制在 glibc 下可直接使用
# 2. ffmpeg 用静态二进制镜像而非 apt-get —— 构建期不依赖 debian 软件源，镜像也更小
FROM mwader/static-ffmpeg:7.1 AS ffmpeg

FROM node:22-bookworm-slim AS base
COPY --from=ffmpeg /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /ffprobe /usr/local/bin/ffprobe
RUN chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
# 仅构建期占位的连接串：next build 会加载数据层模块，但不会真正连库
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm exec prisma generate && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# standalone 产物只含运行时必需文件；静态资源与 public 需单独复制
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 上传目录以 volume 挂载，容器内只作为挂载点存在
RUN mkdir -p /app/data/uploads && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
