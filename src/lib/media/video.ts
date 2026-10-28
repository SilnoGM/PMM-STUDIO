import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);

/** 生产镜像内 ffmpeg 在 PATH 上；测试可用环境变量指向本地二进制 */
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH ?? "ffprobe";

/** 单文件上限 200 MB、时长上限 10 分钟，见 docs/技术选型方案.md §4.4 */
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const VIDEO_MAX_DURATION_SEC = 600;

/** 输出统一为 720p，兼顾清晰度与体积（约 15 MB/分钟） */
const TARGET_HEIGHT = 720;
const POSTER_MAX_WIDTH = 1600;

export class InvalidVideoError extends Error {}

export interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
}

export interface TranscodedVideo {
  video: Buffer;
  poster: Buffer;
  durationSec: number;
  width: number;
  height: number;
}

export async function probeVideo(path: string): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    path,
  ]);

  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ width?: number; height?: number }>;
    format?: { duration?: string };
  };

  const stream = parsed.streams?.[0];
  const durationSec = Number(parsed.format?.duration ?? 0);

  if (!stream?.width || !stream.height || !Number.isFinite(durationSec)) {
    throw new InvalidVideoError("无法读取视频信息，可能不是有效的视频文件");
  }

  return { durationSec, width: stream.width, height: stream.height };
}

/**
 * 视频标准化：统一转 720p H.264 + faststart，并抽首帧做封面。
 *
 * 不透传原文件的原因：
 * - iPhone 默认 HEVC/.MOV，Chrome 与 Firefox 播不了
 * - 4K 素材原样入库会瞬间击穿配额
 * - 没有 faststart 时浏览器要下完整个文件才能起播
 */
export async function transcodeVideo(input: Buffer): Promise<TranscodedVideo> {
  const workDir = await mkdtemp(join(tmpdir(), "pmm-video-"));

  try {
    const inputPath = join(workDir, "input");
    await writeFile(inputPath, input);

    let metadata: VideoMetadata;
    try {
      metadata = await probeVideo(inputPath);
    } catch (error) {
      if (error instanceof InvalidVideoError) {
        throw error;
      }
      throw new InvalidVideoError("无法解析该视频文件");
    }

    if (metadata.durationSec > VIDEO_MAX_DURATION_SEC) {
      throw new InvalidVideoError(
        `视频时长 ${Math.round(metadata.durationSec)} 秒，超过 ${VIDEO_MAX_DURATION_SEC / 60} 分钟上限`,
      );
    }

    const outputPath = join(workDir, "output.mp4");
    await execFileAsync(
      FFMPEG,
      [
        "-y",
        "-i",
        inputPath,
        // -2 保证宽高比，同时让宽度为偶数（H.264 要求）
        "-vf",
        `scale=-2:${TARGET_HEIGHT}`,
        "-c:v",
        "libx264",
        "-crf",
        "23",
        "-preset",
        "veryfast",
        // 索引前置，浏览器才能边下边播
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        outputPath,
      ],
      { maxBuffer: 32 * 1024 * 1024 },
    );

    const framePath = join(workDir, "frame.png");
    await execFileAsync(
      FFMPEG,
      ["-y", "-ss", "0.5", "-i", inputPath, "-frames:v", "1", framePath],
      { maxBuffer: 32 * 1024 * 1024 },
    );

    const poster = await sharp(await readFile(framePath))
      .resize({ width: POSTER_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const video = await readFile(outputPath);

    return {
      video,
      poster,
      durationSec: Math.round(metadata.durationSec * 10) / 10,
      width: metadata.width,
      height: metadata.height,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/**
 * 解析 YouTube 链接，只接受官方几种形式。
 * 返回 null 表示不是可识别的 YouTube 地址，调用方应给出明确错误。
 */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/shorts\/([\w-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/live\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const matched = trimmed.match(pattern);
    if (matched) {
      return matched[1];
    }
  }

  return null;
}

/** 视频封面地址：本地视频用自存封面，外链视频用 YouTube 缩略图 */
export function posterUrlFor(asset: {
  kind: string;
  posterKey: string | null;
  externalId: string | null;
}): string | null {
  if (asset.posterKey) {
    return `/media/${asset.posterKey}`;
  }

  if (asset.kind === "video_external" && asset.externalId) {
    return `https://i.ytimg.com/vi/${asset.externalId}/hqdefault.jpg`;
  }

  return null;
}
