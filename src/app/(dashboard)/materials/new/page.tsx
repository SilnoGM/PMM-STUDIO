import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { MaterialForm } from "../material-form";

export default async function NewMaterialPage() {
  const session = await requireAccount();

  const products = await setAccountContext(session.accountId, () =>
    db.product.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nameHans: true, modelNo: true },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">新建资料</h1>
        <p className="mt-1 text-sm text-slate-500">
          正文用简体编写，保存时会自动转成台湾繁体并标记为待校对。
        </p>
      </div>

      <MaterialForm products={products} />
    </div>
  );
}
