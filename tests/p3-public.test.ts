import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as ogGet } from "@/app/api/og/[slug]/[model]/route";
import { prismaBase } from "@/lib/db/client";
import { getPublicAccount, publicQueries } from "@/lib/public/queries";
import { sanitizeContent } from "@/lib/public/sanitize";

const suffix = randomUUID().slice(0, 8);
let accountId: string;
let accountSlug: string;

beforeAll(async () => {
  accountSlug = `pub-${suffix}`;
  const account = await prismaBase.account.create({
    data: {
      email: `p3-${suffix}@test.local`,
      passwordHash: "x",
      slug: accountSlug,
      displayName: "公开页账号",
    },
    select: { id: true },
  });
  accountId = account.id;

  await prismaBase.product.createMany({
    data: [
      {
        accountId,
        nameHans: "公开产品",
        nameHant: "公開產品",
        modelNo: `PUB-${suffix}`,
        isPublic: true,
      },
      {
        accountId,
        nameHans: "内部产品",
        nameHant: "內部產品",
        modelNo: `PRIV-${suffix}`,
        isPublic: false,
      },
    ],
  });

  await prismaBase.material.createMany({
    data: [
      {
        accountId,
        titleHans: "公开文件",
        titleHant: "公開文件",
        slug: `pub-doc-${suffix}`,
        contentHans: "正文",
        contentHant: "<p>正文</p>",
        isPublic: true,
      },
      {
        accountId,
        titleHans: "内部文件",
        titleHant: "內部文件",
        slug: `priv-doc-${suffix}`,
        contentHans: "正文",
        contentHant: "<p>正文</p>",
        isPublic: false,
      },
    ],
  });
});

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: accountId } });
  await prismaBase.$disconnect();
});

describe("公开页数据边界", () => {
  it("未知 slug 返回 null", async () => {
    expect(await getPublicAccount(`missing-${suffix}`)).toBeNull();
  });

  it("只返回已公开的产品与资料", async () => {
    const account = await getPublicAccount(accountSlug);
    expect(account).not.toBeNull();

    const queries = publicQueries(account!.id);
    const [products, materials] = await Promise.all([queries.products(), queries.materials()]);

    expect(products.map((product) => product.modelNo)).toEqual([`PUB-${suffix}`]);
    expect(materials.map((material) => material.slug)).toEqual([`pub-doc-${suffix}`]);
  });

  it("未公开的产品按模型号查询返回 null（页面据此 404）", async () => {
    const account = await getPublicAccount(accountSlug);
    const product = await publicQueries(account!.id).product(`PRIV-${suffix}`);

    expect(product).toBeNull();
  });

  it("未公开的资料按 slug 查询返回 null", async () => {
    const account = await getPublicAccount(accountSlug);
    const material = await publicQueries(account!.id).material(`priv-doc-${suffix}`);

    expect(material).toBeNull();
  });
});

describe("富文本清洗", () => {
  it("移除脚本、事件属性与 iframe，保留排版标签", () => {
    const dirty =
      '<p onclick="alert(1)">正文</p><script>alert(2)</script><iframe src="https://x"></iframe><h2>标题</h2>';

    const clean = sanitizeContent(dirty);

    expect(clean).toContain("<p>正文</p>");
    expect(clean).toContain("<h2>标题</h2>");
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("iframe");
  });

  it("外链补上 noopener noreferrer", () => {
    const clean = sanitizeContent('<a href="https://example.com">链接</a>');

    expect(clean).toContain('rel="noopener noreferrer"');
  });
});

describe("OG 图", () => {
  it("无图产品返回 1200×630 的 PNG", async () => {
    const response = await ogGet(new Request("http://localhost/api/og"), {
      params: Promise.resolve({ slug: accountSlug, model: `PUB-${suffix}` }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");

    const buffer = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it("未公开产品不生成 OG 图", async () => {
    const response = await ogGet(new Request("http://localhost/api/og"), {
      params: Promise.resolve({ slug: accountSlug, model: `PRIV-${suffix}` }),
    });

    expect(response.status).toBe(404);
  });
});
