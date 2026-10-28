"use client";

import { useActionState } from "react";

import { addYouTubeVideo, uploadProductVideo, type FormState } from "./actions";

export function VideoUploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadProductVideo, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <input type="hidden" name="productId" value={productId} />

      <div>
        <h3 className="text-sm font-semibold">上传本地视频</h3>
        <p className="mt-1 text-xs text-slate-500">
          自动转 720p H.264 并抽首帧做封面；单个 ≤ 200 MB、时长 ≤ 10 分钟，计入配额。
        </p>
      </div>

      <input
        type="file"
        name="file"
        accept="video/*"
        required
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
      />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "转码中…（可能需要 1-2 分钟）" : "上传视频"}
      </button>
    </form>
  );
}

export function YouTubeForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addYouTubeVideo, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <input type="hidden" name="productId" value={productId} />

      <div>
        <h3 className="text-sm font-semibold">添加 YouTube 外链</h3>
        <p className="mt-1 text-xs text-slate-500">
          只存 videoId，不占磁盘。视频需设为「未公开」，否则客户能搜到。
        </p>
      </div>

      <input
        name="url"
        type="url"
        required
        placeholder="https://www.youtube.com/watch?v=..."
        className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
      >
        {pending ? "添加中…" : "添加外链"}
      </button>
    </form>
  );
}
