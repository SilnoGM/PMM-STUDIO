import Link from "next/link";
import { notFound } from "next/navigation";

import { toTraditionalTaiwan } from "@/lib/i18n/opencc";
import { getPublicAccount } from "@/lib/public/queries";

// 公开页内容随后台开关变化，必须每次请求实时查询
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const account = await getPublicAccount(slug);

  if (!account) {
    notFound();
  }

  // 账号显示名由管理员录入，可能是简体，公开页统一转繁体
  const displayName = toTraditionalTaiwan(account.displayName);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={`/s/${account.slug}`} className="text-base font-semibold tracking-tight">
            {displayName}
          </Link>
          <span className="text-xs text-slate-400">PMM Studio</span>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {displayName}
        </div>
      </footer>
    </div>
  );
}
