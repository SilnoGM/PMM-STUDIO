import Link from "next/link";

import { requireAccount } from "@/lib/auth/guard";
import { searchAll } from "@/lib/search/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAccount();
  const { q = "" } = await searchParams;
  const keyword = q.trim();
  const results = keyword ? await searchAll(session.accountId, keyword) : { products: [], materials: [] };
  const total = results.products.length + results.materials.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">搜索</h1>
        <p className="mt-1 text-sm text-slate-500">
          {keyword ? `「${keyword}」找到 ${total} 条结果` : "输入型号、产品或文件标题"}
        </p>
      </div>

      <form action="/search" className="flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={keyword}
          placeholder="例如 PM-1000、路由器、安装"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          搜索
        </button>
      </form>

      {!keyword ? null : total === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          没有匹配的内容
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {results.products.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-500">
                产品（{results.products.length}）
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {results.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.id}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                    >
                      <span className="text-sm">
                        {product.nameHans}
                        <span className="ml-2 text-slate-400">{product.nameHant}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono">{product.modelNo}</span>
                        <span>{product.isPublic ? "公开" : "未公开"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {results.materials.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-medium text-slate-500">
                资料（{results.materials.length}）
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                {results.materials.map((material) => (
                  <li key={material.id}>
                    <Link
                      href={`/materials/${material.id}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                    >
                      <span className="text-sm">
                        {material.titleHans}
                        <span className="ml-2 text-slate-400">{material.titleHant}</span>
                      </span>
                      <span className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="font-mono">{material.slug}</span>
                        <span>{material.isPublic ? "公开" : "未公开"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
