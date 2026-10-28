import sharp, { type Metadata } from "sharp";

import { buildStorageKey, storage } from "@/lib/storage";

/** 单张图片上限 20 MB，见 docs/技术选型方案.md §4.4 */
export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/** 主图长边。不保留相机原始大图，否则 5 GB 配额会被几张照片吃掉 */
const MASTER_LONG_EDGE = 3000;

const VARIANT_WIDTHS = [1600, 800, 320] as const;

export interface ImageVariant {
  key: string;
  bytes: number;
  width: number;
}

export interface ProcessedImage {
  masterKey: string;
  width: number;
  height: number;
  /** 主图 + 所有衍生图的总字节，用于配额计数 */
  totalBytes: number;
  variants: Record<string, ImageVariant>;
}

/**
 * 先在内存里完成渲染，再落盘。
 * 拆成两步是为了「先算体积、后写磁盘」——否则配额不足时文件已经写进去了。
 */
export interface RenderedImage {
  master: { buffer: Buffer; width: number; height: number };
  variants: Array<{ width: number; buffer: Buffer }>;
  totalBytes: number;
}

export class InvalidImageError extends Error {}

/**
 * 图片渲染：主图统一转 3000px JPEG，再生成三档 WebP。
 *
 * 不生成 AVIF：sharp 的 AVIF 编码在 2 vCPU 上单张要 1–3 秒，
 * 会明显拖慢上传，而体积收益有限。需要时在 VARIANT_WIDTHS 旁扩展格式即可。
 */
export async function renderImage(input: Buffer): Promise<RenderedImage> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw new InvalidImageError("无法识别的图片格式");
  }

  if (!metadata.width || !metadata.height) {
    throw new InvalidImageError("无法读取图片尺寸");
  }

  const master = await sharp(input)
    // 手机照片常带 EXIF 旋转，先摆正再缩放
    .rotate()
    .resize({
      width: MASTER_LONG_EDGE,
      height: MASTER_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const variants: RenderedImage["variants"] = [];
  let totalBytes = master.data.byteLength;

  for (const width of VARIANT_WIDTHS) {
    const buffer = await sharp(master.data)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const info = await sharp(buffer).metadata();
    variants.push({ width: info.width ?? width, buffer });
    totalBytes += buffer.byteLength;
  }

  return {
    master: {
      buffer: master.data,
      width: master.info.width ?? metadata.width,
      height: master.info.height ?? metadata.height,
    },
    variants,
    totalBytes,
  };
}

/** 落盘并返回可用于记录的元数据 */
export async function persistImage(
  accountId: string,
  rendered: RenderedImage,
): Promise<ProcessedImage> {
  const masterKey = buildStorageKey(accountId, "jpg", "-master");
  await storage.save(masterKey, rendered.master.buffer);

  const variants: Record<string, ImageVariant> = {};

  for (const variant of rendered.variants) {
    const key = buildStorageKey(accountId, "webp", `-${variant.width}`);
    await storage.save(key, variant.buffer);
    variants[String(variant.width)] = {
      key,
      bytes: variant.buffer.byteLength,
      width: variant.width,
    };
  }

  return {
    masterKey,
    width: rendered.master.width,
    height: rendered.master.height,
    totalBytes: rendered.totalBytes,
    variants,
  };
}

/** 删除素材时清理所有衍生文件；单个文件失败不应阻断整体删除 */
export async function removeImageFiles(keys: Array<string | null | undefined>): Promise<void> {
  await Promise.all(
    keys
      .filter((key): key is string => Boolean(key))
      .map((key) => storage.remove(key).catch(() => undefined)),
  );
}
