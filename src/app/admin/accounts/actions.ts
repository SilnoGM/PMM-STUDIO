"use server";

import { hash } from "argon2";
import { revalidatePath } from "next/cache";

import { getSessionAccount } from "@/lib/auth/session";
import { createAccountSchema } from "@/lib/auth/schema";
import { prismaBase } from "@/lib/db/client";

export interface CreateAccountState {
  error?: string;
  success?: string;
}

export async function createAccount(
  _previous: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const session = await getSessionAccount();

  // 管理员才能建号；这里必须显式判断，不能只依赖页面隐藏入口
  if (!session?.isAdmin) {
    return { error: "只有管理员可以创建账号" };
  }

  const parsed = createAccountSchema.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    slug: formData.get("slug"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { email, displayName, slug, password } = parsed.data;

  const existing = await prismaBase.account.findFirst({
    where: { OR: [{ email }, { slug }] },
    select: { email: true, slug: true },
  });

  if (existing) {
    return { error: existing.email === email ? "该邮箱已存在" : "该 slug 已被占用" };
  }

  await prismaBase.account.create({
    data: {
      email,
      displayName,
      slug,
      passwordHash: await hash(password),
    },
  });

  revalidatePath("/admin/accounts");
  return { success: `已创建账号 ${email}` };
}
