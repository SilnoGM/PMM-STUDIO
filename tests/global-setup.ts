/* eslint-disable no-restricted-syntax --
 * 测试库初始化需要清空所有账号数据，这一步本就不该受账号作用域约束。
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const TRUNCATE_SQL = `TRUNCATE TABLE "media_assets", "materials", "products", "spec_fields", "categories", "accounts" RESTART IDENTITY CASCADE`;

export default async function setup(): Promise<void> {
  const envFile = resolve(process.cwd(), ".env");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL 未设置，无法准备测试库");
  }

  // 先迁移到最新 schema，保证测试跑的是当前模型
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });

  const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
  try {
    // 每次全量清空，避免上一次失败的用例留下脏数据
    await prisma.$executeRawUnsafe(TRUNCATE_SQL);
  } finally {
    await prisma.$disconnect();
  }
}
