import sharp from "sharp";

import { getPublicAccount, publicQueries } from "@/lib/public/queries";
import { storage } from "@/lib/storage";

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * 动态 OG 图。
 *
 * 刻意不放文字：CJK 文字需要内嵌中文字体（Noto Sans TC 数 MB），
 * 否则 Satori 会渲染成方框。用产品主图的 1200×630 裁切既能保证观感，
 * 又不引入字体文件；无图时退化为品牌色底图。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; model: string }> },
): Promise<Response> {
  const { slug, model } = await context.params;
  const account = await getPublicAccount(slug);

  if (!account) {
    return new Response("Not Found", { status: 404 });
  }

  const product = await publicQueries(account.id).product(decodeURIComponent(model));

  if (!product) {
    return new Response("Not Found", { status: 404 });
  }

  const source = product.media.find((asset) => asset.storageKey)?.storageKey;
  const original = source ? await storage.read(source).catch(() => null) : null;

  const image = original
    ? await sharp(original)
        .rotate()
        .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
        .png()
        .toBuffer()
    : await sharp({
        create: {
          width: WIDTH,
          height: HEIGHT,
          channels: 3,
          background: { r: 15, g: 23, b: 42 },
        },
      })
        .png()
        .toBuffer();

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      // 产品图可能被替换，缓存不宜过长
      "Cache-Control": "public, max-age=3600",
    },
  });
}
