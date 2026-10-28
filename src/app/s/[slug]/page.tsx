import Link from "next/link";
import { notFound } from "next/navigation";

import { PUBLIC_TEXT } from "@/lib/i18n/public-strings";
import { mediaThumbUrl } from "@/lib/media/url";
import { getPublicAccount, publicQueries } from "@/lib/public/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await getPublicAccount(slug);

  return {
    title: account ? `${account.displayName}｜產品與技術文件` : "PMM Studio",
    description: "產品規格、媒體素材與技術文件",
    robots: { index: true, follow: true },
  };
}

export default async function PublicHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const account = await getPublicAccount(slug);

  if (!account) {
    notFound();
  }

  const queries = publicQueries(account.id);
  const [products, materials] = await Promise.all([queries.products(), queries.materials()]);

  const grouped = new Map<string, typeof products>();
  for (const product of products) {
    const key = product.category?.nameHant ?? PUBLIC_TEXT.allProducts;
    const list = grouped.get(key) ?? [];
    list.push(product);
    grouped.set(key, list);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <section className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">{PUBLIC_TEXT.products}</h1>
        <p className="mt-1 text-sm text-slate-500">
          共 {products.length} 項產品・{materials.length} 份文件
        </p>
      </section>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          {PUBLIC_TEXT.emptyProducts}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {[...grouped.entries()].map(([categoryName, items]) => (
            <section key={categoryName}>
              <h2 className="mb-3 text-sm font-medium text-slate-500">{categoryName}</h2>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => {
                  // 卡片封面优先用图片；只有视频时退到视频封面
                  const cover =
                    product.media.find((asset) => asset.kind === "image") ?? product.media[0];
                  const imageUrl = mediaThumbUrl(cover, 800);

                  return (
                    <li key={product.id}>
                      <Link
                        href={`/s/${account.slug}/p/${encodeURIComponent(product.modelNo)}`}
                        className="group block overflow-hidden rounded-lg border border-slate-200 transition hover:border-slate-300"
                      >
                        <div className="aspect-[4/3] bg-slate-50">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={product.nameHant}
                              className="h-full w-full object-cover transition group-hover:opacity-95"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                              {PUBLIC_TEXT.noImage}
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-medium">{product.nameHant}</p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">{product.modelNo}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {materials.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-3 text-lg font-semibold">{PUBLIC_TEXT.materials}</h2>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {materials.map((material) => (
              <li key={material.slug}>
                <Link
                  href={`/s/${account.slug}/m/${material.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span>{material.titleHant}</span>
                  <span className="text-xs text-slate-400">
                    {material.product?.nameHant ?? ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
