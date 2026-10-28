import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// 模拟「以 A 账号登录」的会话；空串代表未登录
const session = vi.hoisted(() => ({ accountId: "" }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAccount: async () =>
    session.accountId
      ? { accountId: session.accountId, isAdmin: false, email: "a@test.local" }
      : null,
}));

import { GET } from "@/app/api/products/[id]/route";
import { db } from "@/lib/db";
import { prismaBase } from "@/lib/db/client";

const suffix = randomUUID().slice(0, 8);

let accountAId: string;
let accountBId: string;
let productAId: string;
let productBId: string;

function callGet(id: string): Promise<Response> {
  return GET(new Request(`http://localhost/api/products/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeAll(async () => {
  const accountA = await prismaBase.account.create({
    data: {
      email: `a-${suffix}@test.local`,
      passwordHash: "not-used",
      slug: `a-${suffix}`,
      displayName: "账号 A",
    },
  });
  const accountB = await prismaBase.account.create({
    data: {
      email: `b-${suffix}@test.local`,
      passwordHash: "not-used",
      slug: `b-${suffix}`,
      displayName: "账号 B",
    },
  });

  accountAId = accountA.id;
  accountBId = accountB.id;

  const productA = await prismaBase.product.create({
    data: { accountId: accountAId, nameHans: "产品 A", nameHant: "產品 A", modelNo: "A-1" },
  });
  const productB = await prismaBase.product.create({
    data: { accountId: accountBId, nameHans: "产品 B", nameHant: "產品 B", modelNo: "B-1" },
  });

  productAId = productA.id;
  productBId = productB.id;
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: { in: [accountAId, accountBId] } } });
  await prismaBase.$disconnect();
});

describe("跨账号越权访问", () => {
  it("以 A 的会话读取 B 的产品，必须返回 404（而不是 403，避免泄露资源存在性）", async () => {
    session.accountId = accountAId;

    const response = await callGet(productBId);

    expect(response.status).toBe(404);
  });

  it("以 A 的会话读取自己的产品，正常返回 200", async () => {
    session.accountId = accountAId;

    const response = await callGet(productAId);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ id: productAId, modelNo: "A-1" });
  });

  it("未登录访问任何产品，返回 401", async () => {
    session.accountId = "";

    const response = await callGet(productAId);

    expect(response.status).toBe(401);
  });
});

describe("账号作用域强制", () => {
  it("没有账号上下文时直接查询业务表必须报错，而不是静默返回全量数据", async () => {
    await expect(db.product.findMany()).rejects.toThrow(/账号上下文/);
  });

  it("findUnique 无法注入 accountId，必须显式报错并提示改用 findFirst", async () => {
    await expect(
      db.$transaction(async () => {
        // 在上下文中调用，仍然要拦住 findUnique
        const { setAccountContext } = await import("@/lib/db/context");
        return setAccountContext(accountAId, () => db.product.findUnique({ where: { id: productAId } }));
      }),
    ).rejects.toThrow(/findFirst/);
  });

  it("创建记录时由扩展强制注入 accountId，忽略调用方传入的值", async () => {
    const { setAccountContext } = await import("@/lib/db/context");

    const created = await setAccountContext(accountAId, () =>
      db.product.create({
        data: {
          accountId: accountBId,
          nameHans: "伪造归属",
          nameHant: "偽造歸屬",
          modelNo: `X-${suffix}`,
        },
      }),
    );

    expect(created.accountId).toBe(accountAId);
  });
});
