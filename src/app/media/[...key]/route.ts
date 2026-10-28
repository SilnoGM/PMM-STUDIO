import { storage } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  glb: "model/gltf-binary",
};

/**
 * 开发环境的上传文件服务。
 * 生产环境由 Caddy 直接服务 /media/*（自带 Range 与 ETag），不会走到这里。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await context.params;
  const storageKey = key.join("/");
  const extension = storageKey.split(".").pop()?.toLowerCase() ?? "";

  try {
    const buffer = await storage.read(storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
