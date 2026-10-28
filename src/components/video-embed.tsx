"use client";

import { useState } from "react";

interface VideoEmbedProps {
  videoId: string;
  title?: string;
  poster?: string | null;
}

/**
 * YouTube 外链播放器。
 * 默认只渲染封面，点击后才挂载 iframe：避免首屏多下几百 KB，
 * 也避免用户没点就把 cookie 送进 YouTube。
 */
export function VideoEmbed({ videoId, title, poster }: VideoEmbedProps) {
  const [active, setActive] = useState(false);

  const posterUrl = poster ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  if (active) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&autoplay=1`}
          title={title ?? "视频"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      className="group relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
      aria-label="播放视频"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={posterUrl} alt={title ?? "视频封面"} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-slate-900">
          ▶
        </span>
      </span>
    </button>
  );
}
