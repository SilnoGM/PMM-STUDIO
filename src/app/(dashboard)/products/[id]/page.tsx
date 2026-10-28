import { notFound } from "next/navigation";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { deleteProductImage } from "../actions";
import { ProductForm } from "../product-form";
import { UploadForm } from "../upload-form";

interface MediaVariant {
  key?: string;
  width?: number;
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAccount();

  const [product, categories, specFields] = await Promise.all([
    setAccountContext(session.accountId, () =>
      db.product.findFirst({
        where: { id },
        include: { media: { orderBy: { createdAt: "asc" } } },
      }),
    ),
    setAccountContext(session.accountId, () =>
      db.category.findMany({ orderBy: [{ sort: "asc" }, { nameHans: "asc" }] }),
    ),
    setAccountContext(session.accountId, () =>
      db.specField.findMany({ orderBy: [{ sort: "asc" }, { key: "asc" }] }),
    ),
  ]);

  if (!product) {
    notFound();
  }

  const specs = (product.specs ?? {}) as Record<string, string>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">{product.nameHans}</h1>
        <p className="mt-1 text-sm text-slate-500">
          型号 {product.modelNo} · {product.isPublic ? "公开展示中" : "未公开"}
        </p>
      </div>

      <ProductForm
        categories={categories.map(({ id: categoryId, nameHans, nameHant }) => ({
          id: categoryId,
          nameHans,
          nameHant,
        }))}
        specFields={specFields.map(({ key, labelHans, labelHant, unit, type }) => ({
          key,
          labelHans,
          labelHant,
          unit,
          type,
        }))}
        product={{
          id: product.id,
          nameHans: product.nameHans,
          nameHant: product.nameHant,
          modelNo: product.modelNo,
          categoryId: product.categoryId,
          isPublic: product.isPublic,
          specs,
        }}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">媒体素材（{product.media.length}）</h2>

        {product.media.length > 0 ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.media.map((asset) => {
              const variants = (asset.variants ?? {}) as Record<string, MediaVariant>;
              const thumbKey = variants["800"]?.key ?? asset.storageKey;

              return (
                <li key={asset.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {thumbKey ? (
                    // 开发环境由 Next 路由代理，生产由 Caddy 直出
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicUrl(thumbKey)}
                      alt={product.nameHans}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs text-slate-400">
                      无预览
                    </div>
                  )}
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs text-slate-500">
                      {asset.bytes ? `${(Number(asset.bytes) / 1024 / 1024).toFixed(2)} MB` : "-"}
                    </span>
                    <form action={deleteProductImage}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="productId" value={product.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        删除
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">还没有图片</p>
        )}

        <UploadForm productId={product.id} />
      </section>
    </div>
  );
}
