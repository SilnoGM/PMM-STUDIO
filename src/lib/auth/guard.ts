import { redirect } from "next/navigation";

import { getSessionAccount, type SessionAccount } from "@/lib/auth/session";

/** 页面与 Server Action 的统一入口：没有会话直接跳登录页 */
export async function requireAccount(): Promise<SessionAccount> {
  const session = await getSessionAccount();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionAccount> {
  const session = await requireAccount();
  if (!session.isAdmin) {
    redirect("/dashboard");
  }
  return session;
}
