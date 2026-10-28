import { redirect } from "next/navigation";

import { getSessionAccount } from "@/lib/auth/session";
import { prismaBase } from "@/lib/db/client";
import { CreateAccountForm } from "./create-account-form";

export default async function AccountsPage() {
  const session = await getSessionAccount();

  if (!session) {
    redirect("/login");
  }

  if (!session.isAdmin) {
    redirect("/dashboard");
  }

  const accounts = await prismaBase.account.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      slug: true,
      displayName: true,
      status: true,
      isAdmin: true,
      storageQuotaBytes: true,
      storageUsedBytes: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">账号管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          每个账号对应一个独立的内容空间与一个公开页链接（/s/slug）。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">账号</th>
              <th className="px-4 py-2 font-medium">slug</th>
              <th className="px-4 py-2 font-medium">配额</th>
              <th className="px-4 py-2 font-medium">角色</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="font-medium">{account.displayName}</div>
                  <div className="text-xs text-slate-500">{account.email}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{account.slug}</td>
                <td className="px-4 py-2 text-xs">
                  {(Number(account.storageUsedBytes) / 1024 ** 2).toFixed(1)} MB /{" "}
                  {(Number(account.storageQuotaBytes) / 1024 ** 3).toFixed(0)} GB
                </td>
                <td className="px-4 py-2 text-xs">{account.isAdmin ? "管理员" : "普通"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateAccountForm />
    </div>
  );
}
