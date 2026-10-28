import { AsyncLocalStorage } from "node:async_hooks";

export interface AccountContext {
  accountId: string;
}

const storage = new AsyncLocalStorage<AccountContext>();

/**
 * 在账号作用域内执行 fn。
 *
 * 只影响 Prisma 扩展对 account_id 的注入，不承担鉴权职责——会话校验必须在调用前完成，
 * 否则「有上下文」会被误当成「已授权」。
 *
 * 必须是 async：Prisma 的查询是惰性的，只有真正 await 时才执行扩展回调。
 * 若用同步签名返回 Promise，查询会在 run 作用域之外才启动，上下文就丢了。
 */
export async function setAccountContext<T>(accountId: string, fn: () => T): Promise<Awaited<T>> {
  const result = storage.run({ accountId }, async () => fn());
  // storage.run 的返回类型无法自动展开 T 内部的 Promise，运行时由 async 自动展平
  return result as unknown as Promise<Awaited<T>>;
}

export function getAccountContext(): AccountContext | undefined {
  return storage.getStore();
}
