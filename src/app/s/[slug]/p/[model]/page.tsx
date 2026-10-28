import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoEmbed } from "@/components/video-embed";
import { PUBLIC_TEXT } from "@/lib/i18n/public-strings";
import { pickImageUrl, absoluteUrl } from "@/lib/media/url";
import { publicUrl } from "@/lib/storage";
import { getPublicAccount, publicQueries } from "@/lib/public/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; model: string }>;
}) {
  const { slug, model } = await params;
  const account = await getPublicAccount(slug);

  if (!account) {
    return { title: "PMM Studio" };
  }

  const product = await publicQueries(account.id).product(decodeURIComponent(model));

  if (!product) {
    return { title: "找不到頁面" };
  }

  return {
    title: `${product.nameHant}｜${account.displayName}`,
    description: `${product.nameHant} 的規格與相關文件`,
    openGraph: {
      title: product.nameHant,
      type: "website",
      // 动态生成的 1200×630 卡片；无图时是一张纯色底图
      images: [absoluteUrl(`/api/og/${account.slug}/${encodeURIComponent(product.modelNo)}`)].filter(
        (url): url is string => Boolean(url),
      ),
    },
  };
}

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ slug: string; model: string }>;
}) {
  const { slug, model } = await params;
  const account = await getPublicAccount(slug);

  if (!account) {
    notFound();
  }

  const queries = publicQueries(account.id);
  const [product, specFields] = await Promise.all([
    queries.product(decodeURIComponent(model)),
    queries.specFields(),
  ]);

  if (!product) {
    notFound();
  }

  const specs = (product.specs ?? {}) as Record<string, string>;
  const specRows = specFields.filter((field) => specs[field.key]);

  const images = product.media.filter((asset) => asset.kind === "image");
  const videos = product.media.filter((asset) => asset.kind.startsWith("video_"));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={`/s/${account.slug}`} className="hover:text-slate-900">
          {PUBLIC_TEXT.backHome}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-400">{product.category?.nameHant ?? PUBLIC_TEXT.products}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {images.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pickImageUrl(images[0], 1600) ?? ""}
                  alt={product.nameHant}
                  className="w-full object-cover"
                />
              </div>
              {images.length > 1 ? (
                <ul className="grid grid-cols-4 gap-2">
                  {images.slice(1).map((asset) => (
                    <li key={asset.id} className="overflow-hidden rounded border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pickImageUrl(asset, 320) ?? ""}
                        alt={product.nameHant}
                        className="aspect-square w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
              {PUBLIC_TEXT.noImage}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{product.nameHant}</h1>
          <p className="mt-1 font-mono text-sm text-slate-400">{product.modelNo}</p>

          <section className="mt-8">
            <h2 className="mb-2 text-sm font-medium text-slate-500">{PUBLIC_TEXT.specs}</h2>
            {specRows.length > 0 ? (
              <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {specRows.map((field) => (
                  <div key={field.key} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                    <dt className="text-sm text-slate-500">{field.labelHant}</dt>
                    <dd className="text-sm">
                      {specs[field.key]}
                      {field.unit ? <span className="ml-1 text-slate-400">{field.unit}</span> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">{PUBLIC_TEXT.emptySpecs}</p>
            )}
          </section>

          {product.materials.length > 0 ? (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-medium text-slate-500">
                {PUBLIC_TEXT.relatedMaterials}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {product.materials.map((material) => (
                  <li key={material.slug}>
                    <Link
                      href={`/s/${account.slug}/m/${material.slug}`}
                      className="block px-4 py-2.5 text-sm hover:bg-slate-50"
                    >
                      {material.titleHant}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      {videos.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-3 text-sm font-medium text-slate-500">{PUBLIC_TEXT.videos}</h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {videos.map((asset) => {
              if (asset.kind === "video_external" && asset.externalId) {
                return (
                  <VideoEmbed
                    key={asset.id}
                    videoId={asset.externalId}
                    title={product.nameHant}
                  />
                );
              }

              if (!asset.storageKey) {
                return null;
              }

              return (
                <video
                  key={asset.id}
                  controls
                  preload="metadata"
                  playsInline
                  poster={asset.posterKey ? publicUrl(asset.posterKey) : undefined}
                  src={publicUrl(asset.storageKey)}
                  className="aspect-video w-full rounded-lg border border-slate-200 bg-black"
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
