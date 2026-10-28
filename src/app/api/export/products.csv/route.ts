import { getSessionAccount } from "@/lib/auth/session";
import { db, setAccountContext } from "@/lib/db";
import { toCsv } from "@/lib/export/csv";

/**
 * 导出产品清单为 CSV。
 * 用 BOM + CRLF 保证 Excel 直接双击打开不乱码、不串行。
 */
export async function GET(): Promise<Response> {
  const session = await getSessionAccount();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { products, specFields } = await setAccountContext(session.accountId, async () => {
    const [productRows, fields] = await Promise.all([
      db.product.findMany({
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
        include: { category: { select: { nameHans: true, nameHant: true } } },
      }),
      db.specField.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
    ]);

    return { products: productRows, specFields: fields };
  });

  const headers = [
    "型号",
    "简体名称",
    "繁体名称",
    "分类(简)",
    "分类(繁)",
    "公开",
    "繁体已校对",
    ...specFields.map((field) => (field.unit ? `${field.labelHans}(${field.unit})` : field.labelHans)),
  ];

  const rows = products.map((product) => {
    const specs = (product.specs ?? {}) as Record<string, string>;

    return [
      product.modelNo,
      product.nameHans,
      product.nameHant,
      product.category?.nameHans ?? "",
      product.category?.nameHant ?? "",
      product.isPublic ? "是" : "否",
      product.hantReviewed ? "是" : "否",
      ...specFields.map((field) => specs[field.key] ?? ""),
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `products-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
