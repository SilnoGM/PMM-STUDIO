import { existsSync } from "node:fs";
import { resolve } from "node:path";

// 测试一律连测试库：global-setup 会迁移并清空它，绝不能指向开发库
const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL 未设置，测试需要独立的测试库，见 .env.example");
}

if (testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL 不能与 DATABASE_URL 相同，否则测试会清空开发数据");
}

process.env.DATABASE_URL = testDatabaseUrl;

// 上传目录固定在仓库内，避免测试污染真实 data/uploads
process.env.UPLOAD_DIR = `${process.cwd()}/data/test-uploads`;
