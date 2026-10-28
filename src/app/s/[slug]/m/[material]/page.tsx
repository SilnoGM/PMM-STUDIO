import Link from "next/link";
import { notFound } from "next/navigation";

import { PUBLIC_TEXT } from "@/lib/i18n/public-strings";
import { getPublicAccount, publicQueries } from "@/lib/public/queries";
import { sanitizeContent } from "@/lib/public/sanitize";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; materialSlug?: string }>;
}) {
  const { slug } = await params;
  const account = await getPublicAccount(slug);

  return {
    title: account ? `${account.displayName}｜技術文件` : "PMM Studio",
  };
}

export default async function PublicMaterialPage({
  params,
}: {
  params: Promise<{ slug: string; material: string }>;
}) {
  const { slug, material: materialSlug } = await params;
  const account = await getPublicAccount(slug);

  if (!account) {
    notFound();
  }

  const material = await publicQueries(account.id).material(materialSlug);

  if (!material) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href={`/s/${account.slug}`} className="hover:text-slate-900">
          {PUBLIC_TEXT.backHome}
        </Link>
        {material.product ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/s/${account.slug}/p/${encodeURIComponent(material.product.modelNo)}`}
              className="hover:text-slate-900"
            >
              {material.product.nameHant}
            </Link>
          </>
        ) : null}
      </nav>

      <article>
        <h1 className="text-2xl font-semibold tracking-tight">{material.titleHant}</h1>
        <p className="mt-1 text-xs text-slate-400">
          {new Date(material.createdAt).toISOString().slice(0, 10)}
        </p>

        {/* 内容来自富文本编辑器，注入前已按白名单清洗（见 lib/public/sanitize） */}
        <div
          className="tiptap mt-8 text-[15px] leading-7 text-slate-700"
          dangerouslySetInnerHTML={{ __html: sanitizeContent(material.contentHant) }}
        />
      </article>
    </main>
  );
}
