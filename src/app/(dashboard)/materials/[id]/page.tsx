import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { auditTraditionalTerms, TERM_BASELINE } from "@/lib/i18n/glossary";
import { stripHtml } from "@/lib/i18n/html";
import { deleteMaterial } from "../actions";
import { MaterialForm } from "../material-form";
import { ReviewForm } from "../review-form";

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAccount();

  const [material, products] = await Promise.all([
    setAccountContext(session.accountId, () =>
      db.material.findFirst({ where: { id } }),
    ),
    setAccountContext(session.accountId, () =>
      db.product.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, nameHans: true, modelNo: true },
      }),
    ),
  ]);

  if (!material) {
    notFound();
  }

  const residualTerms = auditTraditionalTerms(stripHtml(material.contentHant));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{material.titleHans}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span>/s/…/m/{material.slug}</span>
            <span
              className={
                material.hantReviewed
                  ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                  : "rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
              }
            >
              {material.hantReviewed ? "已校对" : "待校对"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/materials" className="text-sm text-slate-500 hover:text-slate-900">
            返回列表
          </Link>
          <form action={deleteMaterial}>
            <input type="hidden" name="id" value={material.id} />
            <button type="submit" className="text-sm text-red-600 hover:underline">
              删除
            </button>
          </form>
        </div>
      </div>

      <MaterialForm
        products={products}
        material={{
          id: material.id,
          titleHans: material.titleHans,
          titleHant: material.titleHant,
          slug: material.slug,
          productId: material.productId,
          isPublic: material.isPublic,
          contentHans: material.contentHans,
        }}
      />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">繁体校对</h2>
          <p className="mt-1 text-xs text-slate-500">
            自动转换只保证字形与常见词汇，产品术语仍需人工确认。保存即视为校对完成。
          </p>
        </div>

        {residualTerms.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-800">发现疑似未转换的简体用语</p>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-700">
              {residualTerms.map((term) => (
                <li key={term.hans}>
                  {term.hans} → 应为 {term.hant}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-emerald-600">未发现基线表内的残留简体术语。</p>
        )}

        <ReviewForm materialId={material.id} contentHant={material.contentHant} />

        <details className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-medium">台湾用语基线表（{TERM_BASELINE.length} 条）</summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {TERM_BASELINE.map((term) => (
              <li key={term.hans}>
                {term.hans} → {term.hant}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
