import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const session = await requireAccount();

  const [categories, specFields] = await Promise.all([
    setAccountContext(session.accountId, () =>
      db.category.findMany({ orderBy: [{ sort: "asc" }, { nameHans: "asc" }] }),
    ),
    setAccountContext(session.accountId, () =>
      db.specField.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">新建产品</h1>
        <p className="mt-1 text-sm text-slate-500">
          繁体名称留空时会用 OpenCC（台湾用语）自动转换，建议创建后人工核对。
        </p>
      </div>

      <ProductForm
        categories={categories.map(({ id, nameHans, nameHant }) => ({ id, nameHans, nameHant }))}
        specFields={specFields.map(({ key, labelHans, labelHant, unit, type }) => ({
          key,
          labelHans,
          labelHant,
          unit,
          type,
        }))}
      />
    </div>
  );
}
