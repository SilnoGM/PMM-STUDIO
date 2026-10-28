"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAccount } from "@/lib/auth/guard";
import { db, setAccountContext } from "@/lib/db";
import { convertHtmlToTraditional } from "@/lib/i18n/html";
import { toTraditionalTaiwan } from "@/lib/i18n/opencc";
import { materialInputSchema } from "@/lib/materials/schema";

export interface FormState {
  error?: string;
  success?: string;
}

function parseForm(formData: FormData) {
  return materialInputSchema.safeParse({
    titleHans: formData.get("titleHans"),
    titleHant: formData.get("titleHant"),
    slug: formData.get("slug"),
    productId: formData.get("productId"),
    contentHans: formData.get("contentHans"),
    isPublic: formData.get("isPublic") === "on",
  });
}

export async function createMaterial(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { titleHans, slug, contentHans, isPublic } = parsed.data;
  const titleHant = parsed.data.titleHant || toTraditionalTaiwan(titleHans);
  const contentHant = convertHtmlToTraditional(contentHans);

  let materialId: string;
  try {
    const created = await setAccountContext(session.accountId, () =>
      db.material.create({
        data: {
          accountId: session.accountId,
          productId: parsed.data.productId || null,
          titleHans,
          titleHant,
          slug,
          contentHans,
          contentHant,
          isPublic,
          // 自动转换的内容未经人工核对，必须保持待校对状态
          hantReviewed: false,
        },
        select: { id: true },
      }),
    );
    materialId = created.id;
  } catch {
    return { error: `slug「${slug}」已被占用` };
  }

  revalidatePath("/materials");
  redirect(`/materials/${materialId}`);
}

export async function updateMaterial(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { titleHans, slug, contentHans, isPublic } = parsed.data;

  const existing = await setAccountContext(session.accountId, () =>
    db.material.findFirst({ where: { id }, select: { contentHans: true } }),
  );

  if (!existing) {
    return { error: "资料不存在" };
  }

  // 简体正文变了，繁体就不再可信：重新转换并退回待校对
  const contentChanged = existing.contentHans !== contentHans;
  const contentHant = contentChanged
    ? convertHtmlToTraditional(contentHans)
    : undefined;

  try {
    const updated = await setAccountContext(session.accountId, () =>
      db.material.updateMany({
        where: { id },
        data: {
          productId: parsed.data.productId || null,
          titleHans,
          titleHant: parsed.data.titleHant || toTraditionalTaiwan(titleHans),
          slug,
          contentHans,
          isPublic,
          ...(contentChanged ? { contentHant, hantReviewed: false } : {}),
        },
      }),
    );

    if (updated.count === 0) {
      return { error: "资料不存在" };
    }
  } catch {
    return { error: `slug「${slug}」已被占用` };
  }

  revalidatePath(`/materials/${id}`);
  revalidatePath("/materials");
  return { success: contentChanged ? "已保存，正文有改动，需重新校對" : "已保存" };
}

/** 校对：保存人工修正后的繁体正文，并标记为已校对 */
export async function saveReviewedHant(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");
  const contentHant = String(formData.get("contentHant") ?? "");

  const updated = await setAccountContext(session.accountId, () =>
    db.material.updateMany({
      where: { id },
      data: { contentHant, hantReviewed: true },
    }),
  );

  if (updated.count === 0) {
    return { error: "资料不存在" };
  }

  revalidatePath(`/materials/${id}`);
  revalidatePath("/materials");
  return { success: "已标记为校对完成" };
}

export async function deleteMaterial(formData: FormData): Promise<void> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");

  await setAccountContext(session.accountId, () => db.material.delete({ where: { id } }));
  revalidatePath("/materials");
}
