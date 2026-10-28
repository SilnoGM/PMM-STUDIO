import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ accountId: "" }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAccount: async () =>
    session.accountId
      ? { accountId: session.accountId, email: "p5@test.local", displayName: "P5", isAdmin: false }
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

import { GET as exportCsv } from "@/app/api/export/products.csv/route";
import { uploadProductModel } from "@/app/(dashboard)/products/actions";
import { prismaBase } from "@/lib/db/client";
import { toCsv } from "@/lib/export/csv";
import { searchAll } from "@/lib/search/queries";

const suffix = randomUUID().slice(0, 8);
let accountA: string;
let accountB: string;
let productA: string;
let productB: string;

beforeAll(async () => {
  const a = await prismaBase.account.create({
    data: { email: `p5a-${suffix}@test.local`, passwordHash: "x", slug: `p5a-${suffix}`, displayName: "A" },
  });
  const b = await prismaBase.account.create({
    data: { email: `p5b-${suffix}@test.local`, passwordHash: "x", slug: `p5b-${suffix}`, displayName: "B" },
  });
  accountA = a.id;
  accountB = b.id;

  const pa = await prismaBase.product.create({
    data: {
      accountId: accountA,
      nameHans: "企业级路由器",
      nameHant: "企業級路由器",
      modelNo: `PM-${suffix}`,
      specs: { memory: "8" },
      isPublic: true,
    },
  });
  const pb = await prismaBase.product.create({
    data: {
      accountId: accountB,
      nameHans: "企业级路由器 B",
      nameHant: "企業級路由器 B",
      modelNo: `PB-${suffix}`,
    },
  });
  productA = pa.id;
  productB = pb.id;
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: { in: [accountA, accountB] } } });
  await prismaBase.$disconnect();
});

describe("CSV 序列化", () => {
  it("逗号、引号、换行都被正确转义，并带 UTF-8 BOM", () => {
    const csv = toCsv(
      ["名称", "备注"],
      [
        ['含,逗号', '含"引号"'],
        ["含\n换行", null],
      ],
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"含,逗号"');
    expect(csv).toContain('"含""引号"""');
    expect(csv).toContain('"含\n换行"');
    // 表头 + 两条数据，用 CRLF 分隔
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});

describe("全局搜索", () => {
  it("简体、繁体、型号三种写法都能命中", async () => {
    const simplified = await searchAll(accountA, "企业级");
    const traditional = await searchAll(accountA, "企業級");
    const byModel = await searchAll(accountA, `PM-${suffix}`);

    expect(simplified.products.map((item) => item.id)).toContain(productA);
    expect(traditional.products.map((item) => item.id)).toContain(productA);
    expect(byModel.products.map((item) => item.id)).toContain(productA);
  });

  it("只返回当前账号的数据", async () => {
    const results = await searchAll(accountA, "企业级");

    expect(results.products.map((item) => item.id)).not.toContain(productB);
  });

  it("空关键词返回空结果而不是全量数据", async () => {
    const results = await searchAll(accountA, "   ");

    expect(results.products).toHaveLength(0);
    expect(results.materials).toHaveLength(0);
  });
});

describe("CSV 导出接口", () => {
  it("需要登录，未登录返回 401", async () => {
    session.accountId = "";
    const response = await exportCsv();
    expect(response.status).toBe(401);
  });

  it("导出内容包含本账号产品、规格列与 BOM", async () => {
    session.accountId = accountA;
    const response = await exportCsv();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");

    // Response.text() 会按规范吃掉 BOM，要验证 BOM 必须看原始字节
    const bytes = Buffer.from(await response.arrayBuffer());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);

    const text = bytes.toString("utf8");
    expect(text).toContain(`PM-${suffix}`);
    expect(text).toContain("企业级路由器");
    expect(text).toContain("繁体已校对");
  });
});

describe("3D 模型上传", () => {
  function glbBuffer(padding = 0): Buffer {
    // 最小合法 GLB 头：magic "glTF" + version 2 + 总长度
    const header = Buffer.alloc(12);
    header.write("glTF", 0, "ascii");
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(12 + padding, 8);
    return Buffer.concat([header, Buffer.alloc(padding, 1)]);
  }

  it("合法 GLB 入库并计入配额", async () => {
    session.accountId = accountA;
    const before = await prismaBase.account.findUniqueOrThrow({ where: { id: accountA } });

    const formData = new FormData();
    formData.set("productId", productA);
    formData.set("file", new File([new Uint8Array(glbBuffer(256))], "case.glb", { type: "model/gltf-binary" }));

    const result = await uploadProductModel({}, formData);
    expect(result.success).toBeTruthy();

    const asset = await prismaBase.mediaAsset.findFirstOrThrow({
      where: { accountId: accountA, kind: "model_3d" },
    });
    expect(Number(asset.bytes)).toBe(268);

    const after = await prismaBase.account.findUniqueOrThrow({ where: { id: accountA } });
    expect(after.storageUsedBytes - before.storageUsedBytes).toBe(268n);
  });

  it("扩展名正确但内容不是 GLB 时拒绝", async () => {
    session.accountId = accountA;

    const formData = new FormData();
    formData.set("productId", productA);
    formData.set(
      "file",
      new File([new Uint8Array(Buffer.from("fake glb content"))], "fake.glb", {
        type: "model/gltf-binary",
      }),
    );

    const result = await uploadProductModel({}, formData);
    expect(result.error).toMatch(/GLB/);
  });
});
