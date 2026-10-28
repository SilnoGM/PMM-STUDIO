import { getSessionAccount } from "@/lib/auth/session";
import { prismaBase } from "@/lib/db/client";

export default async function DashboardPage() {
  const session = await getSessionAccount();
  if (!session) {
    return null;
  }

  const account = await prismaBase.account.findUnique({
    where: { id: session.accountId },
    select: { slug: true, storageQuotaBytes: true, storageUsedBytes: true, isAdmin: true },
  });

  const quotaGb = account ? Number(account.storageQuotaBytes) / 1024 ** 3 : 0;
  const usedMb = account ? Number(account.storageUsedBytes) / 1024 ** 2 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">工作台</h1>
        <p className="mt-1 text-sm text-slate-500">
          P0 阶段：登录、账号管理与跨账号隔离已就绪，产品 / 媒体 / 资料模块待 P1 起实现。
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">公开页链接</dt>
          <dd className="mt-1 font-mono text-sm">
            <a
              href={`/s/${account?.slug ?? ""}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              /s/{account?.slug ?? "-"}
            </a>
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">存储配额</dt>
          <dd className="mt-1 text-sm">
            {usedMb.toFixed(1)} MB / {quotaGb.toFixed(0)} GB
          </dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <dt className="text-xs text-slate-500">角色</dt>
          <dd className="mt-1 text-sm">{account?.isAdmin ? "管理员" : "普通账号"}</dd>
        </div>
      </dl>
    </div>
  );
}
