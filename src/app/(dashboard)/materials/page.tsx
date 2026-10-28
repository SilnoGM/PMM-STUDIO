import Link from "next/link";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { deleteMaterial } from "./actions";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireAccount();
  const { filter } = await searchParams;
  const onlyUnreviewed = filter === "unreviewed";

  const materials = await setAccountContext(session.accountId, () =>
    db.material.findMany({
      where: onlyUnreviewed ? { hantReviewed: false } : undefined,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { nameHans: true } } },
    }),
  );

  const pendingCount = await setAccountContext(session.accountId, () =>
    db.material.count({ where: { hantReviewed: false } }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">资料</h1>
          <p className="mt-1 text-sm text-slate-500">
            教程、手册等文档内容。客户只看繁体，因此自动转换后必须人工校对。
          </p>
        </div>
        <Link
          href="/materials/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          新建资料
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/materials"
          className={
            onlyUnreviewed
              ? "rounded-full border border-slate-300 px-3 py-1 text-slate-600"
              : "rounded-full bg-slate-900 px-3 py-1 text-white"
          }
        >
          全部
        </Link>
        <Link
          href="/materials?filter=unreviewed"
          className={
            onlyUnreviewed
              ? "rounded-full bg-amber-500 px-3 py-1 text-white"
              : "rounded-full border border-slate-300 px-3 py-1 text-slate-600"
          }
        >
          待校对（{pendingCount}）
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">简体标题</th>
              <th className="px-4 py-2 font-medium">繁体标题</th>
              <th className="px-4 py-2 font-medium">关联产品</th>
              <th className="px-4 py-2 font-medium">校对</th>
              <th className="px-4 py-2 font-medium">公开</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {onlyUnreviewed ? "没有待校对的内容" : "还没有资料，点右上角新建"}
                </td>
              </tr>
            ) : (
              materials.map((material) => (
                <tr key={material.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/materials/${material.id}`} className="font-medium hover:underline">
                      {material.titleHans}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{material.titleHant}</td>
                  <td className="px-4 py-2 text-slate-500">{material.product?.nameHans ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        material.hantReviewed
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                      }
                    >
                      {material.hantReviewed ? "已校对" : "待校对"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{material.isPublic ? "是" : "否"}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteMaterial}>
                      <input type="hidden" name="id" value={material.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        删除
                      </button>
                    </form>
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
