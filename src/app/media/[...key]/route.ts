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
 *
 * 这里手动实现 Range 是为了本地开发时视频能拖动进度条——否则每次跳转
 * 浏览器都要重新拉整个文件，体验与生产差异太大。
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key } = await context.params;
  const storageKey = key.join("/");
  const extension = storageKey.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  let buffer: Buffer;
  try {
    buffer = await storage.read(storageKey);
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const range = request.headers.get("range");

  if (range) {
    const matched = range.match(/bytes=(\d*)-(\d*)/);
    if (matched) {
      const start = matched[1] ? Number(matched[1]) : 0;
      const end = matched[2] ? Math.min(Number(matched[2]), buffer.length - 1) : buffer.length - 1;

      if (start > end || start >= buffer.length) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${buffer.length}` },
        });
      }

      const slice = buffer.subarray(start, end + 1);

      return new Response(new Uint8Array(slice), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
          "Content-Length": String(slice.length),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
