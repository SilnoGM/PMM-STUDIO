"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth/guard";
import { categoryInputSchema } from "@/lib/catalog/schema";
import { db, setAccountContext } from "@/lib/db";
import { toTraditionalTaiwan } from "@/lib/i18n/opencc";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createCategory(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();

  const parsed = categoryInputSchema.safeParse({
    nameHans: formData.get("nameHans"),
    nameHant: formData.get("nameHant"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const nameHans = parsed.data.nameHans;
  // 繁体留空时自动转换并标记待校对（校对状态在 P2 的校对流程中使用）
  const nameHant = parsed.data.nameHant || toTraditionalTaiwan(nameHans);

  await setAccountContext(session.accountId, () =>
    db.category.create({
      data: { accountId: session.accountId, nameHans, nameHant },
    }),
  );

  revalidatePath("/categories");
  return { success: `已添加分类「${nameHant}」` };
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");

  await setAccountContext(session.accountId, () => db.category.delete({ where: { id } }));

  revalidatePath("/categories");
}
