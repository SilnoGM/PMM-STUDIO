import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { deleteSpecField } from "./actions";
import { SpecFieldForm } from "./spec-field-form";

export default async function SpecFieldsPage() {
  const session = await requireAccount();

  const fields = await setAccountContext(session.accountId, () =>
    db.specField.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">参数字典</h1>
        <p className="mt-1 text-sm text-slate-500">
          产品参数统一在这里定义，避免每个产品各写一套字段名。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">key</th>
              <th className="px-4 py-2 font-medium">简体</th>
              <th className="px-4 py-2 font-medium">繁体</th>
              <th className="px-4 py-2 font-medium">单位</th>
              <th className="px-4 py-2 font-medium">类型</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  还没有参数定义
                </td>
              </tr>
            ) : (
              fields.map((field) => (
                <tr key={field.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{field.key}</td>
                  <td className="px-4 py-2">{field.labelHans}</td>
                  <td className="px-4 py-2">{field.labelHant}</td>
                  <td className="px-4 py-2 text-slate-500">{field.unit ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-500">{field.type}</td>
                  <td className="px-4 py-2 text-right">
                    <form action={deleteSpecField}>
                      <input type="hidden" name="id" value={field.id} />
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

      <SpecFieldForm />
    </div>
  );
}
