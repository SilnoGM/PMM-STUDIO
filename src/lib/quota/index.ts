import { prismaBase } from "@/lib/db/client";

/** 上传目录的绝对上限。配额保护用户，这个上限保护服务器磁盘。 */
export const UPLOAD_HARD_CAP_BYTES = 20n * 1024n * 1024n * 1024n;

export class QuotaExceededError extends Error {
  constructor(
    message: string,
    readonly remainingBytes: bigint,
  ) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export interface QuotaSnapshot {
  usedBytes: bigint;
  quotaBytes: bigint;
  remainingBytes: bigint;
}

export async function getQuota(accountId: string): Promise<QuotaSnapshot> {
  const account = await prismaBase.account.findUnique({
    where: { id: accountId },
    select: { storageQuotaBytes: true, storageUsedBytes: true },
  });

  if (!account) {
    throw new Error("账号不存在");
  }

  return {
    usedBytes: account.storageUsedBytes,
    quotaBytes: account.storageQuotaBytes,
    remainingBytes: account.storageQuotaBytes - account.storageUsedBytes,
  };
}

/**
 * 上传前置校验。额外检查全站上传总量，避免有人把配额调高后打满磁盘。
 * 必须在写入文件之前调用，否则会先占磁盘再报错。
 */
export async function assertQuota(accountId: string, additionalBytes: number): Promise<QuotaSnapshot> {
  const snapshot = await getQuota(accountId);
  const requested = BigInt(additionalBytes);

  if (requested > snapshot.remainingBytes) {
    throw new QuotaExceededError(
      `存储空间不足：本账号配额 ${snapshot.quotaBytes / 1024n ** 3n} GB，剩余 ${snapshot.remainingBytes / 1024n ** 2n} MB`,
      snapshot.remainingBytes,
    );
  }

  const total = await prismaBase.account.aggregate({ _sum: { storageUsedBytes: true } });
  const usedTotal = total._sum.storageUsedBytes ?? 0n;

  if (usedTotal + requested > UPLOAD_HARD_CAP_BYTES) {
    throw new QuotaExceededError(
      `服务器存储已达上限（${UPLOAD_HARD_CAP_BYTES / 1024n ** 3n} GB），请联系管理员`,
      0n,
    );
  }

  return snapshot;
}

export async function addUsage(accountId: string, bytes: number): Promise<void> {
  await prismaBase.account.update({
    where: { id: accountId },
    data: { storageUsedBytes: { increment: BigInt(bytes) } },
  });
}

export async function subtractUsage(accountId: string, bytes: number): Promise<void> {
  const snapshot = await getQuota(accountId);
  const next = snapshot.usedBytes - BigInt(bytes);
  await prismaBase.account.update({
    where: { id: accountId },
    data: { storageUsedBytes: next > 0n ? next : 0n },
  });
}
