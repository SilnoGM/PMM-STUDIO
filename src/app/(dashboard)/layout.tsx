import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionAccount } from "@/lib/auth/session";
import { signOut } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionAccount();

  if (!session) {
    redirect("/login");
  }

  async function logout(): Promise<void> {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <span className="font-semibold">PMM Studio</span>
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              工作台
            </Link>
            <Link href="/products" className="text-slate-600 hover:text-slate-900">
              产品
            </Link>
            <Link href="/categories" className="text-slate-600 hover:text-slate-900">
              分类
            </Link>
            <Link href="/spec-fields" className="text-slate-600 hover:text-slate-900">
              参数字典
            </Link>
            <Link href="/materials" className="text-slate-600 hover:text-slate-900">
              资料
            </Link>
            {session.isAdmin ? (
              <Link href="/admin/accounts" className="text-slate-600 hover:text-slate-900">
                账号管理
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{session.displayName || session.email}</span>
            <form action={logout}>
              <button type="submit" className="text-slate-500 hover:text-slate-900">
                退出
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
