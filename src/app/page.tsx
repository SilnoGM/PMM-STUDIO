import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">PMM Studio</h1>
      <p className="text-slate-600">
        产品、媒体与资料三位一体的内容中台。当前为 P0 骨架阶段，仅包含登录、账号管理与隔离基础。
      </p>
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          进入工作台
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          登录
        </Link>
      </div>
    </main>
  );
}
