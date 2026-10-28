import { notFound } from "next/navigation";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { mediaThumbUrl } from "@/lib/media/url";
import { deleteMedia } from "../actions";
import { ProductForm } from "../product-form";
import { UploadForm } from "../upload-form";
import { VideoUploadForm, YouTubeForm } from "../video-forms";

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
  const images = product.media.filter((asset) => asset.kind === "image");
  const videos = product.media.filter((asset) => asset.kind.startsWith("video_"));

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
        <h2 className="text-sm font-semibold">图片（{images.length}）</h2>

        {images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {images.map((asset) => {
              const thumbUrl = mediaThumbUrl(asset, 800);

              return (
                <li key={asset.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
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
                    <form action={deleteMedia}>
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

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">视频（{videos.length}）</h2>

        {videos.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {videos.map((asset) => {
              const poster = mediaThumbUrl(asset, 800);

              return (
                <li
                  key={asset.id}
                  className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-slate-100">
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={poster} alt="视频封面" className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">
                      {asset.kind === "video_local" ? "本地视频" : "YouTube 外链"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {asset.kind === "video_local"
                        ? `${Number(asset.bytes ?? 0n) / 1024 / 1024} MB · ${asset.durationSec ?? 0} 秒`
                        : asset.externalId}
                    </p>
                  </div>

                  <form action={deleteMedia}>
                    <input type="hidden" name="id" value={asset.id} />
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      删除
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">还没有视频</p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <VideoUploadForm productId={product.id} />
          <YouTubeForm productId={product.id} />
        </div>
      </section>
    </div>
  );
}
