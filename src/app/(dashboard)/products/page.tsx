import Link from "next/link";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { getQuota } from "@/lib/quota";

export default async function ProductsPage() {
  const session = await requireAccount();

  const [products, quota] = await Promise.all([
    setAccountContext(session.accountId, () =>
      db.product.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { nameHans: true } },
          _count: { select: { media: true } },
        },
      }),
    ),
    getQuota(session.accountId),
  ]);

  const usedMb = Number(quota.usedBytes) / 1024 ** 2;
  const quotaGb = Number(quota.quotaBytes) / 1024 ** 3;
  const usedRatio = Number(quota.usedBytes) / Number(quota.quotaBytes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">产品</h1>
          <p className="mt-1 text-sm text-slate-500">
            共 {products.length} 个产品。勾选「公开」后才会出现在对外展示页。
          </p>
        </div>
        <Link
          href="/products/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          新建产品
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">存储占用</span>
          <span className={usedRatio > 0.9 ? "font-medium text-red-600" : "text-slate-600"}>
            {usedMb.toFixed(1)} MB / {quotaGb.toFixed(0)} GB
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={usedRatio > 0.9 ? "h-full bg-red-500" : "h-full bg-slate-900"}
            style={{ width: `${Math.min(100, usedRatio * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">简体</th>
              <th className="px-4 py-2 font-medium">繁体</th>
              <th className="px-4 py-2 font-medium">型号</th>
              <th className="px-4 py-2 font-medium">分类</th>
              <th className="px-4 py-2 font-medium">图片</th>
              <th className="px-4 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  还没有产品，点右上角「新建产品」开始
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                      {product.nameHans}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{product.nameHant}</td>
                  <td className="px-4 py-2 font-mono text-xs">{product.modelNo}</td>
                  <td className="px-4 py-2 text-slate-500">{product.category?.nameHans ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{product._count.media}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        product.isPublic
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                      }
                    >
                      {product.isPublic ? "公开" : "未公开"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
