import { publicUrl } from "@/lib/storage";

interface ImageLike {
  storageKey: string | null;
  variants: unknown;
}

/**
 * 从 media 记录中挑一张合适尺寸的图。
 * 依次退到更小的档位，最后才是主图，避免小卡片加载 3000px 大图。
 */
export function pickImageUrl(media: ImageLike | undefined, preferredWidth = 800): string | null {
  if (!media) {
    return null;
  }

  const variants = (media.variants ?? {}) as Record<string, { key?: string }>;
  const order = [preferredWidth, 1600, 800, 320];

  for (const width of order) {
    const key = variants[String(width)]?.key;
    if (key) {
      return publicUrl(key);
    }
  }

  return media.storageKey ? publicUrl(media.storageKey) : null;
}

/** 元数据里的 OG 图必须是绝对地址，爬虫不会解析相对路径 */
export function absoluteUrl(path: string | null): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith("http")) {
    return path;
  }

  const base = process.env.PUBLIC_BASE_URL ?? "";
  return base ? `${base.replace(/\/$/, "")}${path}` : undefined;
}
