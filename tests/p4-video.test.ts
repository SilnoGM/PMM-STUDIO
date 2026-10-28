import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const execFileAsync = promisify(execFile);

const session = vi.hoisted(() => ({ accountId: "" }));

vi.mock("@/lib/auth/session", () => ({
  getSessionAccount: async () =>
    session.accountId
      ? { accountId: session.accountId, email: "v@test.local", displayName: "视频账号", isAdmin: false }
      : null,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { GET as mediaGet } from "@/app/media/[...key]/route";
import { addYouTubeVideo, uploadProductVideo } from "@/app/(dashboard)/products/actions";
import { prismaBase } from "@/lib/db/client";
import { parseYouTubeId, transcodeVideo } from "@/lib/media/video";
import { storage } from "@/lib/storage";

const suffix = randomUUID().slice(0, 8);
let accountId: string;
let brokeAccountId: string;
let productId: string;
let brokeProductId: string;
let sample: Buffer;

async function makeSampleVideo(): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "pmm-test-video-"));
  const path = join(dir, "sample.mp4");
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=duration=2:size=320x240:rate=15",
      "-pix_fmt",
      "yuv420p",
      path,
    ]);
    return await readFile(path);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

beforeAll(async () => {
  const account = await prismaBase.account.create({
    data: {
      email: `vid-${suffix}@test.local`,
      passwordHash: "x",
      slug: `vid-${suffix}`,
      displayName: "视频账号",
    },
  });
  accountId = account.id;

  const broke = await prismaBase.account.create({
    data: {
      email: `vidbroke-${suffix}@test.local`,
      passwordHash: "x",
      slug: `vidbroke-${suffix}`,
      displayName: "配额不足账号",
      storageQuotaBytes: 1024n,
    },
  });
  brokeAccountId = broke.id;

  const product = await prismaBase.product.create({
    data: { accountId, nameHans: "视频产品", nameHant: "影片產品", modelNo: `VID-${suffix}` },
  });
  productId = product.id;

  const brokeProduct = await prismaBase.product.create({
    data: {
      accountId: brokeAccountId,
      nameHans: "配额产品",
      nameHant: "配額產品",
      modelNo: `VIDB-${suffix}`,
    },
  });
  brokeProductId = brokeProduct.id;

  sample = await makeSampleVideo();
}, 120_000);

afterAll(async () => {
  await prismaBase.account.deleteMany({ where: { id: { in: [accountId, brokeAccountId] } } });
  await prismaBase.$disconnect();
});

describe("YouTube 链接解析", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?t=10&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("解析 %s", (url, expected) => {
    expect(parseYouTubeId(url)).toBe(expected);
  });

  it("非 YouTube 地址返回 null", () => {
    expect(parseYouTubeId("https://example.com/video.mp4")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});

describe("视频转码", () => {
  it("输出 720p 以内的 H.264 MP4 与封面", async () => {
    const result = await transcodeVideo(sample);

    expect(result.video.byteLength).toBeGreaterThan(0);
    expect(result.poster.byteLength).toBeGreaterThan(0);
    expect(result.durationSec).toBeGreaterThan(0);

    // MP4 的 ftyp box 出现在文件头部
    expect(result.video.subarray(4, 8).toString()).toBe("ftyp");
    // faststart：moov 应该在 mdat 之前
    const moovIndex = result.video.indexOf(Buffer.from("moov"));
    const mdatIndex = result.video.indexOf(Buffer.from("mdat"));
    expect(moovIndex).toBeGreaterThan(0);
    expect(moovIndex).toBeLessThan(mdatIndex);
  }, 60_000);

  it("非视频内容抛 InvalidVideoError", async () => {
    await expect(transcodeVideo(Buffer.from("not a video"))).rejects.toThrow(/视频/);
  }, 30_000);
});

describe("视频 Action", () => {
  it("上传本地视频后记录 mediaAsset 与配额用量", async () => {
    session.accountId = accountId;

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("file", new File([new Uint8Array(sample)], "demo.mp4", { type: "video/mp4" }));

    const result = await uploadProductVideo({}, formData);
    expect(result.error).toBeUndefined();
    expect(result.success).toBeTruthy();

    const asset = await prismaBase.mediaAsset.findFirstOrThrow({
      where: { accountId, kind: "video_local" },
    });

    expect(asset.productId).toBe(productId);
    expect(asset.storageKey).toBeTruthy();
    expect(asset.posterKey).toBeTruthy();
    expect(Number(asset.bytes)).toBeGreaterThan(0);

    const account = await prismaBase.account.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.storageUsedBytes).toBe(BigInt(Number(asset.bytes)));
  }, 90_000);

  it("配额不足时拒绝上传视频", async () => {
    session.accountId = brokeAccountId;

    const formData = new FormData();
    formData.set("productId", brokeProductId);
    formData.set("file", new File([new Uint8Array(sample)], "big.mp4", { type: "video/mp4" }));

    const result = await uploadProductVideo({}, formData);

    expect(result.error).toMatch(/存储空间不足/);
    expect(await prismaBase.mediaAsset.count({ where: { accountId: brokeAccountId } })).toBe(0);
  }, 90_000);

  it("添加 YouTube 外链只存 videoId，不占配额", async () => {
    session.accountId = accountId;

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("url", "https://youtu.be/dQw4w9WgXcQ");

    const result = await addYouTubeVideo({}, formData);
    expect(result.success).toBeTruthy();

    const asset = await prismaBase.mediaAsset.findFirstOrThrow({
      where: { accountId, kind: "video_external" },
    });

    expect(asset.externalId).toBe("dQw4w9WgXcQ");
    expect(asset.storageKey).toBeNull();
    expect(asset.bytes).toBeNull();
  });

  it("无法识别的链接给出明确错误", async () => {
    session.accountId = accountId;

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("url", "https://example.com/not-youtube");

    const result = await addYouTubeVideo({}, formData);
    expect(result.error).toMatch(/YouTube/);
  });
});

describe("媒体路由 Range 支持", () => {
  it("带 Range 头返回 206 与正确的 Content-Range", async () => {
    const key = `${accountId}/range-test.mp4`;
    const payload = Buffer.from("0123456789abcdef");
    await storage.save(key, payload);

    const partial = await mediaGet(
      new Request("http://localhost/media", { headers: { Range: "bytes=4-7" } }),
      { params: Promise.resolve({ key: key.split("/") }) },
    );

    expect(partial.status).toBe(206);
    expect(partial.headers.get("Content-Range")).toBe(`bytes 4-7/${payload.length}`);
    expect(Buffer.from(await partial.arrayBuffer()).toString()).toBe("4567");

    const full = await mediaGet(new Request("http://localhost/media"), {
      params: Promise.resolve({ key: key.split("/") }),
    });
    expect(full.status).toBe(200);
    expect(full.headers.get("Accept-Ranges")).toBe("bytes");
  });
});
