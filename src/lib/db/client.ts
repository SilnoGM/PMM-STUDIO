import { PrismaClient } from "@prisma/client";

import { getAccountContext } from "./context";

const globalForPrisma = globalThis as unknown as { prismaBase?: PrismaClient };

/**
 * 未加作用域的客户端。
 * 只允许在登录校验、管理员建号、种子脚本与测试中使用；业务代码一律用 db。
 */
export const prismaBase =
  globalForPrisma.prismaBase ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}

/** 需要账号隔离的模型。accounts 不在其中：登录与管理员操作必须跨账号查询。 */
const SCOPED_MODELS = new Set(["Category", "SpecField", "Product", "MediaAsset", "Material"]);

/** 这些操作的 where 只接受唯一字段，无法安全注入 accountId */
const BLOCKED_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow"]);

type Args = Record<string, unknown>;

/**
 * 账号作用域扩展：任何业务查询都会被强制加上 accountId 条件。
 *
 * 这是隔离的最后一道防线，因此宁可报错也不放行：
 * - 缺少上下文直接抛错，避免退化成「查全表」
 * - findUnique 无法注入条件，直接拒绝并提示改用 findFirst
 * - create / upsert 由服务端覆盖 accountId，忽略调用方传入值
 */
export const db = prismaBase.$extends({
  name: "accountScope",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const context = getAccountContext();
        if (!context) {
          throw new Error(
            `[account-scope] 模型 ${model} 的 ${operation} 缺少账号上下文，请用 setAccountContext() 包裹查询。`,
          );
        }

        if (BLOCKED_OPERATIONS.has(operation)) {
          throw new Error(
            `[account-scope] ${model}.${operation} 无法注入 accountId，请改用 findFirst({ where: { id } })。`,
          );
        }

        const scoped: Args = { ...(args as Args) };
        const where = (scoped.where as Args | undefined) ?? {};
        const whereWithAccount = { ...where, accountId: context.accountId };

        switch (operation) {
          case "create":
            scoped.data = { ...(scoped.data as Args), accountId: context.accountId };
            break;
          case "createMany": {
            // data 可以是单对象或数组，两种都要覆盖
            const data = scoped.data;
            scoped.data = Array.isArray(data)
              ? data.map((item) => ({ ...(item as Args), accountId: context.accountId }))
              : { ...(data as Args), accountId: context.accountId };
            break;
          }
          case "upsert":
            scoped.where = whereWithAccount;
            scoped.create = { ...(scoped.create as Args), accountId: context.accountId };
            break;
          default:
            scoped.where = whereWithAccount;
        }

        return query(scoped as never);
      },
    },
  },
});
