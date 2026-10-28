import { getSessionAccount } from "@/lib/auth/session";
import { db, setAccountContext } from "@/lib/db";

/**
 * 全量数据备份（JSON，不含文件本体）。
 * 图片与视频仍在 data/uploads 下，备份需要连同该目录一起转移，
 * 这里导出的是「重建数据库所需的一切」。
 */
export async function GET(): Promise<Response> {
  const session = await getSessionAccount();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const data = await setAccountContext(session.accountId, async () => {
    const [categories, specFields, products, mediaAssets, materials] = await Promise.all([
      db.category.findMany({ orderBy: { sort: "asc" } }),
      db.specField.findMany({ orderBy: { sort: "asc" } }),
      db.product.findMany({ orderBy: { createdAt: "asc" } }),
      db.mediaAsset.findMany({ orderBy: { createdAt: "asc" } }),
      db.material.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    return { categories, specFields, products, mediaAssets, materials };
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { slug: session.email, id: session.accountId },
    // BigInt 不能直接 JSON 序列化，统一转成字符串
    ...JSON.parse(
      JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? value.toString() : value)),
    ),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
