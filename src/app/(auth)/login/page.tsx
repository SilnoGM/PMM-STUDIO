import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function authenticate(formData: FormData): Promise<void> {
    "use server";

    try {
      await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: "/dashboard",
      });
    } catch (caught) {
      // 登录失败走 AuthError；成功时 signIn 抛的是重定向信号，必须继续抛出去
      if (caught instanceof AuthError) {
        redirect("/login?error=1");
      }
      throw caught;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PMM Studio</h1>
        <p className="mt-1 text-sm text-slate-500">登录以管理产品、媒体与资料</p>
      </div>

      <form action={authenticate} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          邮箱
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          密码
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>

        {error ? <p className="text-sm text-red-600">邮箱或密码不正确</p> : null}

        <button
          type="submit"
          className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          登录
        </button>
      </form>
    </main>
  );
}
