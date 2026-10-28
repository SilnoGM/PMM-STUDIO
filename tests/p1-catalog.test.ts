import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaBase } from "@/lib/db/client";
import { toTraditionalTaiwan } from "@/lib/i18n/opencc";
import { persistImage, renderImage } from "@/lib/media/image";
import { QuotaExceededError, addUsage, assertQuota, getQuota, subtractUsage } from "@/lib/quota";
import { resolveStoragePath, storage } from "@/lib/storage";

const suffix = randomUUID().slice(0, 8);
let accountId: string;
let tinyQuotaAccountId: string;

async function sampleImage(width = 2400, height = 1200): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 100, b: 50 } },
  })
    .jpeg()
    .toBuffer();
}

beforeAll(async () => {
  const account = await prismaBase.account.create({
    data: {
      email: `p1-${suffix}@test.local`,
      passwordHash: "not-used",
      slug: `p1-${suffix}`,
      displayName: "P1 账号",
    },
  });
  accountId = account.id;

  const tiny = await prismaBase.account.create({
    data: {
      email: `tiny-${suffix}@test.local`,
      passwordHash: "not-used",
      slug: `tiny-${suffix}`,
      displayName: "小配额账号",
      storageQuotaBytes: 1024n,
    },
  });
  tinyQuotaAccountId = tiny.id;
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: { in: [accountId, tinyQuotaAccountId] } } });
  await prismaBase.$disconnect();
});

describe("图片管线", () => {
  it("生成主图与 1600/800/320 三档衍生，总字节等于各文件之和", async () => {
    const rendered = await renderImage(await sampleImage());

    expect(rendered.variants.map((variant) => variant.width)).toEqual([1600, 800, 320]);
    // 主图长边被限制在 3000 以内，且保持比例
    expect(rendered.master.width).toBeLessThanOrEqual(3000);
    expect(rendered.master.width).toBeGreaterThan(rendered.master.height);

    const sum =
      rendered.master.buffer.byteLength +
      rendered.variants.reduce((total, variant) => total + variant.buffer.byteLength, 0);

    expect(rendered.totalBytes).toBe(sum);
  });

  it("落盘后的文件可以按 key 读回，且位于账号目录下", async () => {
    const rendered = await renderImage(await sampleImage(1200, 800));
    const processed = await persistImage(accountId, rendered);

    expect(processed.masterKey.startsWith(`${accountId}/`)).toBe(true);

    const saved = await storage.read(processed.masterKey);
    expect(saved.byteLength).toBe(rendered.master.buffer.byteLength);
  });

  it("拒绝非图片内容", async () => {
    await expect(renderImage(Buffer.from("not an image"))).rejects.toThrow(/图片/);
  });

  it("路径穿越被拒绝", () => {
    expect(() => resolveStoragePath("../etc/passwd")).toThrow(/非法/);
  });
});

describe("配额", () => {
  it("超出剩余空间时抛 QuotaExceededError", async () => {
    await expect(assertQuota(tinyQuotaAccountId, 4096)).rejects.toBeInstanceOf(QuotaExceededError);
  });

  it("增减用量后不会出现负数", async () => {
    await addUsage(accountId, 100);
    expect((await getQuota(accountId)).usedBytes).toBe(100n);

    await subtractUsage(accountId, 500);
    expect((await getQuota(accountId)).usedBytes).toBe(0n);
  });
});

describe("简繁转换", () => {
  it("按台湾用语转换，而不是只换字形", () => {
    expect(toTraditionalTaiwan("内存")).toBe("記憶體");
    expect(toTraditionalTaiwan("软件")).toBe("軟體");
  });
});
