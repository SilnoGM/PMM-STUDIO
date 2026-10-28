import { auth } from "@/auth";

export interface SessionAccount {
  accountId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export async function getSessionAccount(): Promise<SessionAccount | null> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return null;
  }

  return {
    accountId: user.id,
    email: user.email ?? "",
    displayName: user.name ?? "",
    isAdmin: Boolean(user.isAdmin),
  };
}
