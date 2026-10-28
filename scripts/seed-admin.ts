import { hash } from "argon2";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { prismaBase } from "../src/lib/db/client";

/**
 * 创建（或更新）首个管理员账号。
 * 账号管理页本身需要管理员登录才能进入，所以必须有这样一个引导入口。
 */
async function main(): Promise<void> {
  const envFile = resolve(process.cwd(), ".env");
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("请先在 .env 中设置 ADMIN_EMAIL 与 ADMIN_PASSWORD");
  }

  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD 至少 10 位");
  }

  const slug = email.split("@")[0].replace(/[^a-z0-9-]/g, "-").slice(0, 40) || "admin";

  const account = await prismaBase.account.upsert({
    where: { email },
    update: { passwordHash: await hash(password), isAdmin: true, status: "active" },
    create: {
      email,
      slug,
      displayName: "管理员",
      passwordHash: await hash(password),
      isAdmin: true,
    },
  });

  console.log(`管理员已就绪：${account.email}（slug: ${account.slug}）`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prismaBase.$disconnect();
  });
