import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ accountId: "" }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAccount: async () =>
    session.accountId
      ? {
          accountId: session.accountId,
          email: "a@test.local",
          displayName: "测试账号",
          isAdmin: false,
        }
      : null,
}));

// Server Action 在 Next 运行时之外执行，把框架钩子替换成可观测的空实现
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { createCategory } from "@/app/(dashboard)/categories/actions";
import { createProduct, uploadProductImage } from "@/app/(dashboard)/products/actions";
import { prismaBase } from "@/lib/db/client";

const suffix = randomUUID().slice(0, 8);
let accountId: string;
let brokeAccountId: string;

async function sampleImage(): Promise<Buffer> {
  return sharp({
    create: { width: 1600, height: 1000, channels: 3, background: { r: 30, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
}

beforeAll(async () => {
  const account = await prismaBase.account.create({
    data: {
      email: `act-${suffix}@test.local`,
      passwordHash: "x",
      slug: `act-${suffix}`,
      displayName: "Action 账号",
    },
  });
  accountId = account.id;

  // 只剩 1 KB 的账号，用来验证配额拦截
  const broke = await prismaBase.account.create({
    data: {
      email: `broke-${suffix}@test.local`,
      passwordHash: "x",
      slug: `broke-${suffix}`,
      displayName: "配额耗尽账号",
      storageQuotaBytes: 1024n,
    },
  });
  brokeAccountId = broke.id;
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: { in: [accountId, brokeAccountId] } } });
  await prismaBase.$disconnect();
});

describe("分类 Action", () => {
  it("繁体留空时用 OpenCC 台湾用语自动填充", async () => {
    session.accountId = accountId;

    const formData = new FormData();
    formData.set("nameHans", "内存模块");
    formData.set("nameHant", "");

    const result = await createCategory({}, formData);

    expect(result.success).toBeTruthy();
    const created = await prismaBase.category.findFirst({
      where: { accountId, nameHans: "内存模块" },
    });
    expect(created?.nameHant).toBe("記憶體模組");
  });
});

describe("产品与图片 Action", () => {
  it("创建产品时型号不参与转换，名称自动转繁体", async () => {
    session.accountId = accountId;

    const formData = new FormData();
    formData.set("nameHans", "软件产品");
    formData.set("nameHant", "");
    formData.set("modelNo", "发-100");
    formData.set("isPublic", "on");

    await expect(createProduct({}, formData)).rejects.toThrow(/REDIRECT:\/products\//);

    const product = await prismaBase.product.findFirst({ where: { accountId, modelNo: "发-100" } });
    expect(product?.nameHant).toBe("軟體產品");
    expect(product?.modelNo).toBe("发-100");
    expect(product?.isPublic).toBe(true);
  });

  it("上传图片后生成主图与三档衍生，并累加配额用量", async () => {
    session.accountId = accountId;

    const product = await prismaBase.product.findFirst({ where: { accountId } });
    const before = await prismaBase.account.findUniqueOrThrow({ where: { id: accountId } });

    const formData = new FormData();
    formData.set("productId", product!.id);
    formData.set("file", new File([new Uint8Array(await sampleImage())], "shot.jpg", { type: "image/jpeg" }));

    const result = await uploadProductImage({}, formData);

    expect(result.error).toBeUndefined();
    expect(result.success).toBeTruthy();

    const assets = await prismaBase.mediaAsset.findMany({ where: { accountId } });
    expect(assets).toHaveLength(1);

    const variants = assets[0].variants as Record<string, { key: string }>;
    expect(Object.keys(variants).sort()).toEqual(["1600", "320", "800"]);

    const after = await prismaBase.account.findUniqueOrThrow({ where: { id: accountId } });
    expect(after.storageUsedBytes).toBeGreaterThan(before.storageUsedBytes);
  });

  it("配额不足时拒绝上传，且不留下任何媒体记录与文件", async () => {
    session.accountId = brokeAccountId;

    const product = await prismaBase.product.create({
      data: {
        accountId: brokeAccountId,
        nameHans: "超配额产品",
        nameHant: "超配額產品",
        modelNo: `OVER-${suffix}`,
      },
    });

    const formData = new FormData();
    formData.set("productId", product.id);
    formData.set("file", new File([new Uint8Array(await sampleImage())], "big.jpg", { type: "image/jpeg" }));

    const result = await uploadProductImage({}, formData);

    expect(result.error).toMatch(/存储空间不足/);
    expect(result.success).toBeUndefined();

    const assets = await prismaBase.mediaAsset.findMany({ where: { accountId: brokeAccountId } });
    expect(assets).toHaveLength(0);

    const broke = await prismaBase.account.findUniqueOrThrow({ where: { id: brokeAccountId } });
    expect(broke.storageUsedBytes).toBe(0n);
  });
});
