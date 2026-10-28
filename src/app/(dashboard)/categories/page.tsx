import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { CategoryForm } from "./category-form";
import { deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const session = await requireAccount();

  const categories = await setAccountContext(session.accountId, () =>
    db.category.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">分类</h1>
        <p className="mt-1 text-sm text-slate-500">分类名称需要简体与繁体两套，客户在公开页看到的是繁体。</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">简体</th>
              <th className="px-4 py-2 font-medium">繁体</th>
              <th className="px-4 py-2 font-medium">产品数</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  还没有分类
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{category.nameHans}</td>
                  <td className="px-4 py-2">{category.nameHant}</td>
                  <td className="px-4 py-2 text-slate-500">{category._count.products}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={category.id} />
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

      <CategoryForm />
    </div>
  );
}
