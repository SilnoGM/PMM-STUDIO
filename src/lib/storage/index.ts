import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

/**
 * 存储抽象层。当前只有本地磁盘实现。
 * 换对象存储时只需新增一个 driver，业务代码通过 key 访问，不感知物理位置。
 */
export interface StorageDriver {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  size(key: string): Promise<number>;
}

const uploadRoot = resolve(process.env.UPLOAD_DIR ?? "./data/uploads");

/** 公开访问前缀。生产由 Caddy 直接服务，开发由 Next 路由代理 */
export const PUBLIC_MEDIA_PREFIX = "/media";

/**
 * 解析并校验 key，防止 `../` 之类的路径穿越。
 * 存储 key 只允许「账号目录/文件名」这种形式。
 */
export function resolveStoragePath(key: string): string {
  if (!key || key.includes("\0")) {
    throw new Error("非法的存储 key");
  }

  const normalized = key.replaceAll("\\", "/").replace(/^\/+/, "");

  if (normalized.split("/").some((segment) => segment === ".." || segment === ".")) {
    throw new Error("非法的存储 key");
  }

  const fullPath = resolve(uploadRoot, normalized);
  if (!fullPath.startsWith(uploadRoot + sep) && fullPath !== uploadRoot) {
    throw new Error("非法的存储 key");
  }

  return fullPath;
}

export const localDriver: StorageDriver = {
  async save(key, data) {
    const fullPath = resolveStoragePath(key);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
  },

  async read(key) {
    return readFile(resolveStoragePath(key));
  },

  async remove(key) {
    await rm(resolveStoragePath(key), { force: true });
  },

  async size(key) {
    const info = await stat(resolveStoragePath(key));
    return info.size;
  },
};

export const storage: StorageDriver = localDriver;

/**
 * 生成不可猜测的文件名：产品素材非机密，靠随机文件名 + 公开开关控制访问。
 * 扩展名由调用方显式给出——衍生图的格式与原始文件并不一致（原图 jpg、衍生 webp）。
 */
export function buildStorageKey(accountId: string, extension: string, suffix = ""): string {
  const normalized = extension.replace(/^\./, "").toLowerCase();
  const safeExtension = /^[a-z0-9]{1,5}$/.test(normalized) ? `.${normalized}` : "";
  return join(accountId, `${randomUUID()}${suffix}${safeExtension}`).replaceAll("\\", "/");
}

/** 站点内可用的资源地址；换 CDN 时只改这里 */
export function publicUrl(key: string): string {
  return `${PUBLIC_MEDIA_PREFIX}/${key}`;
}
