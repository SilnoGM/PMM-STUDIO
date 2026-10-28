"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAccount } from "@/lib/auth/guard";
import { productInputSchema } from "@/lib/catalog/schema";
import { db, setAccountContext } from "@/lib/db";
import { toTraditionalTaiwan } from "@/lib/i18n/opencc";
import {
  IMAGE_MAX_BYTES,
  InvalidImageError,
  persistImage,
  removeImageFiles,
  renderImage,
} from "@/lib/media/image";
import {
  InvalidVideoError,
  VIDEO_MAX_BYTES,
  parseYouTubeId,
  transcodeVideo,
} from "@/lib/media/video";
import { buildStorageKey, storage } from "@/lib/storage";
import { QuotaExceededError, addUsage, assertQuota, subtractUsage } from "@/lib/quota";

export interface FormState {
  error?: string;
  success?: string;
}

/** 产品参数以 spec__<key> 的形式提交，只收集非空值 */
function collectSpecs(formData: FormData): Record<string, string> {
  const specs: Record<string, string> = {};

  for (const [field, value] of formData.entries()) {
    if (!field.startsWith("spec__") || typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      specs[field.slice("spec__".length)] = trimmed;
    }
  }

  return specs;
}

export async function createProduct(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();

  const parsed = productInputSchema.safeParse({
    nameHans: formData.get("nameHans"),
    nameHant: formData.get("nameHant"),
    modelNo: formData.get("modelNo"),
    categoryId: formData.get("categoryId"),
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { nameHans, modelNo, isPublic } = parsed.data;
  const nameHant = parsed.data.nameHant || toTraditionalTaiwan(nameHans);
  const specs = collectSpecs(formData);

  let productId: string;
  try {
    const created = await setAccountContext(session.accountId, () =>
      db.product.create({
        data: {
          accountId: session.accountId,
          nameHans,
          nameHant,
          modelNo,
          categoryId: parsed.data.categoryId || null,
          isPublic,
          specs: specs as Prisma.InputJsonValue,
        },
        select: { id: true },
      }),
    );
    productId = created.id;
  } catch {
    return { error: `型号「${modelNo}」已存在` };
  }

  revalidatePath("/products");
  redirect(`/products/${productId}`);
}

export async function updateProduct(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");

  const parsed = productInputSchema.safeParse({
    nameHans: formData.get("nameHans"),
    nameHant: formData.get("nameHant"),
    modelNo: formData.get("modelNo"),
    categoryId: formData.get("categoryId"),
    isPublic: formData.get("isPublic") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }

  const { nameHans, modelNo, isPublic } = parsed.data;
  const nameHant = parsed.data.nameHant || toTraditionalTaiwan(nameHans);
  const specs = collectSpecs(formData);

  try {
    const updated = await setAccountContext(session.accountId, () =>
      db.product.updateMany({
        where: { id },
        data: {
          nameHans,
          nameHant,
          modelNo,
          categoryId: parsed.data.categoryId || null,
          isPublic,
          specs: specs as Prisma.InputJsonValue,
        },
      }),
    );

    if (updated.count === 0) {
      return { error: "产品不存在" };
    }
  } catch {
    return { error: `型号「${modelNo}」已存在` };
  }

  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  return { success: "已保存" };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");

  const assets = await setAccountContext(session.accountId, () =>
    db.mediaAsset.findMany({ where: { productId: id }, select: { storageKey: true, variants: true } }),
  );

  const files: string[] = [];
  for (const asset of assets) {
    if (asset.storageKey) {
      files.push(asset.storageKey);
    }
    const variants = (asset.variants ?? {}) as Record<string, { key?: string }>;
    for (const variant of Object.values(variants)) {
      if (variant?.key) {
        files.push(variant.key);
      }
    }
  }

  await removeImageFiles(files);

  await setAccountContext(session.accountId, () => db.product.delete({ where: { id } }));
  revalidatePath("/products");
}

export async function uploadProductImage(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "请选择图片文件" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "只支持图片文件" };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { error: "单张图片不能超过 20 MB" };
  }

  const product = await setAccountContext(session.accountId, () =>
    db.product.findFirst({ where: { id: productId }, select: { id: true } }),
  );

  if (!product) {
    return { error: "产品不存在" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rendered;
  try {
    rendered = await renderImage(buffer);
  } catch (error) {
    if (error instanceof InvalidImageError) {
      return { error: error.message };
    }
    throw error;
  }

  // 配额校验必须在写磁盘之前：主图 + 衍生图的总和才是真实占用
  try {
    await assertQuota(session.accountId, rendered.totalBytes);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { error: error.message };
    }
    throw error;
  }

  const processed = await persistImage(session.accountId, rendered);

  await setAccountContext(session.accountId, () =>
    db.mediaAsset.create({
      data: {
        accountId: session.accountId,
        productId,
        kind: "image",
        storageKey: processed.masterKey,
        bytes: BigInt(processed.totalBytes),
        width: processed.width,
        height: processed.height,
        variants: processed.variants,
        isPublic: true,
      },
    }),
  );

  await addUsage(session.accountId, processed.totalBytes);

  revalidatePath(`/products/${productId}`);
  return { success: "图片已上传" };
}

export async function deleteMedia(formData: FormData): Promise<void> {
  const session = await requireAccount();
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");

  const asset = await setAccountContext(session.accountId, () =>
    db.mediaAsset.findFirst({ where: { id } }),
  );

  // 越权与不存在都保持静默：不向调用方泄露资源是否存在
  if (!asset) {
    return;
  }

  const files: Array<string | null> = [asset.storageKey, asset.posterKey];
  const variants = (asset.variants ?? {}) as Record<string, { key?: string }>;
  for (const variant of Object.values(variants)) {
    files.push(variant?.key ?? null);
  }

  await removeImageFiles(files);

  await setAccountContext(session.accountId, () => db.mediaAsset.delete({ where: { id } }));
  await subtractUsage(session.accountId, Number(asset.bytes ?? 0n));

  revalidatePath(`/products/${productId}`);
}

export async function uploadProductVideo(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "请选择视频文件" };
  }
  if (!file.type.startsWith("video/")) {
    return { error: "只支持视频文件" };
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return { error: "单个视频不能超过 200 MB" };
  }

  const product = await setAccountContext(session.accountId, () =>
    db.product.findFirst({ where: { id: productId }, select: { id: true } }),
  );

  if (!product) {
    return { error: "产品不存在" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let transcoded;
  try {
    transcoded = await transcodeVideo(buffer);
  } catch (error) {
    if (error instanceof InvalidVideoError) {
      return { error: error.message };
    }
    throw error;
  }

  const totalBytes = transcoded.video.byteLength + transcoded.poster.byteLength;

  try {
    await assertQuota(session.accountId, totalBytes);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return { error: error.message };
    }
    throw error;
  }

  const videoKey = buildStorageKey(session.accountId, "mp4", "-video");
  const posterKey = buildStorageKey(session.accountId, "jpg", "-poster");

  await storage.save(videoKey, transcoded.video);
  await storage.save(posterKey, transcoded.poster);

  await setAccountContext(session.accountId, () =>
    db.mediaAsset.create({
      data: {
        accountId: session.accountId,
        productId,
        kind: "video_local",
        storageKey: videoKey,
        posterKey,
        bytes: BigInt(totalBytes),
        durationSec: transcoded.durationSec,
        width: transcoded.width,
        height: transcoded.height,
        isPublic: true,
      },
    }),
  );

  await addUsage(session.accountId, totalBytes);

  revalidatePath(`/products/${productId}`);
  return { success: "视频已转码并保存（720p H.264）" };
}

export async function addYouTubeVideo(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAccount();
  const productId = String(formData.get("productId") ?? "");
  const url = String(formData.get("url") ?? "");

  const externalId = parseYouTubeId(url);
  if (!externalId) {
    return { error: "无法识别 YouTube 链接，请粘贴完整视频地址" };
  }

  const product = await setAccountContext(session.accountId, () =>
    db.product.findFirst({ where: { id: productId }, select: { id: true } }),
  );

  if (!product) {
    return { error: "产品不存在" };
  }

  // 外链视频不占磁盘，因此不走配额校验
  await setAccountContext(session.accountId, () =>
    db.mediaAsset.create({
      data: {
        accountId: session.accountId,
        productId,
        kind: "video_external",
        provider: "youtube",
        externalId,
        isPublic: true,
      },
    }),
  );

  revalidatePath(`/products/${productId}`);
  return { success: "已添加 YouTube 视频" };
}
