"use server";

import { revalidatePath } from "next/cache";

import { requireAccount } from "@/lib/auth/guard";
import { specFieldInputSchema } from "@/lib/catalog/schema";
import { db, setAccountContext } from "@/lib/db";
import { toTraditionalTaiwan } from "@/lib/i18n/opencc";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createSpecField(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();

  const parsed = specFieldInputSchema.safeParse({
    key: formData.get("key"),
    labelHans: formData.get("labelHans"),
    labelHant: formData.get("labelHant"),
    unit: formData.get("unit"),
    type: formData.get("type") ?? "text",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { key, labelHans, unit, type } = parsed.data;
  const labelHant = parsed.data.labelHant || toTraditionalTaiwan(labelHans);

  try {
    await setAccountContext(session.accountId, () =>
      db.specField.create({
        data: {
          accountId: session.accountId,
          key,
          labelHans,
          labelHant,
          unit: unit || null,
          type,
        },
      }),
    );
  } catch {
    // key 有 (account_id, key) 唯一约束，重复创建会走到这里
    return { error: `参数 key「${key}」已存在` };
  }

  revalidatePath("/spec-fields");
  return { success: `已添加参数「${labelHant}」` };
}

export async function deleteSpecField(formData: FormData): Promise<void> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");

  await setAccountContext(session.accountId, () => db.specField.delete({ where: { id } }));

  revalidatePath("/spec-fields");
}
