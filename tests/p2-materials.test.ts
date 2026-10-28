import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ accountId: "" }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAccount: async () =>
    session.accountId
      ? { accountId: session.accountId, email: "a@test.local", displayName: "测试", isAdmin: false }
      : null,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { createMaterial, saveReviewedHant, updateMaterial } from "@/app/(dashboard)/materials/actions";
import { prismaBase } from "@/lib/db/client";
import { auditTraditionalTerms, TERM_BASELINE } from "@/lib/i18n/glossary";
import { convertHtmlToTraditional, stripHtml } from "@/lib/i18n/html";

const suffix = randomUUID().slice(0, 8);
let accountId: string;

beforeAll(async () => {
  const account = await prismaBase.account.create({
    data: {
      email: `p2-${suffix}@test.local`,
      passwordHash: "x",
      slug: `p2-${suffix}`,
      displayName: "P2 账号",
    },
  });
  accountId = account.id;
  session.accountId = accountId;
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: accountId } });
  await prismaBase.$disconnect();
});

function materialForm(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("titleHans", overrides.titleHans ?? "安装指南");
  formData.set("titleHant", overrides.titleHant ?? "");
  formData.set("slug", overrides.slug ?? `guide-${suffix}`);
  formData.set("contentHans", overrides.contentHans ?? "<p>内存安装说明</p>");
  formData.set("isPublic", "on");
  return formData;
}

describe("富文本简繁转换", () => {
  it("只转换文本节点，保留标签与属性", () => {
    const html = '<p>内存 <a href="https://example.com/内存">链接</a></p>';
    const converted = convertHtmlToTraditional(html);

    expect(converted).toBe('<p>記憶體 <a href="https://example.com/内存">連結</a></p>');
  });

  it("跳过 code 与 pre 内的技术内容", () => {
    const html = "<pre>内存</pre><p>内存</p><code>内存</code>";

    expect(convertHtmlToTraditional(html)).toBe("<pre>内存</pre><p>記憶體</p><code>内存</code>");
  });

  it("stripHtml 去掉标签后用于术语检查", () => {
    expect(stripHtml("<p>内存</p><pre>内存</pre>")).toBe("内存 内存");
  });
});

describe("术语基线检查", () => {
  it("繁体正文里残留简体用语时被检出（转换漏掉的典型情况）", () => {
    // 前后已是繁体，只有术语仍是简体：这是 OpenCC 词库覆盖不到的典型漏转
    const found = auditTraditionalTerms("這台設備的内存很大");

    expect(found.map((entry) => entry.hans)).toContain("内存");
  });

  it("转换完成后不应再命中基线表", () => {
    const converted = stripHtml(convertHtmlToTraditional("<p>内存与软件</p>"));

    expect(auditTraditionalTerms(converted)).toHaveLength(0);
    expect(TERM_BASELINE.length).toBeGreaterThan(10);
  });
});

describe("资料 Action", () => {
  it("创建时自动生成繁体正文并保持待校对", async () => {
    await expect(createMaterial({}, materialForm())).rejects.toThrow(/REDIRECT:\/materials\//);

    const material = await prismaBase.material.findFirstOrThrow({ where: { accountId } });

    expect(material.titleHant).toBe("安裝指南");
    expect(material.contentHant).toBe("<p>記憶體安裝說明</p>");
    expect(material.hantReviewed).toBe(false);
  });

  it("校对后标记为已校对；正文未改动时保留校对状态", async () => {
    const material = await prismaBase.material.findFirstOrThrow({ where: { accountId } });

    const reviewForm = new FormData();
    reviewForm.set("id", material.id);
    reviewForm.set("contentHant", material.contentHant);
    const reviewed = await saveReviewedHant({}, reviewForm);
    expect(reviewed.success).toBeTruthy();

    const updateForm = materialForm();
    updateForm.set("id", material.id);
    const result = await updateMaterial({}, updateForm);
    expect(result.success).toBeTruthy();

    const after = await prismaBase.material.findUniqueOrThrow({ where: { id: material.id } });
    expect(after.hantReviewed).toBe(true);
  });

  it("正文改动后退回待校对，并重新生成繁体", async () => {
    const material = await prismaBase.material.findFirstOrThrow({ where: { accountId } });

    const formData = materialForm({ contentHans: "<p>硬盘更换步骤</p>" });
    formData.set("id", material.id);
    const result = await updateMaterial({}, formData);

    expect(result.success).toMatch(/重新校對/);

    const after = await prismaBase.material.findUniqueOrThrow({ where: { id: material.id } });
    expect(after.contentHant).toBe("<p>硬碟更換步驟</p>");
    expect(after.hantReviewed).toBe(false);
  });
});
