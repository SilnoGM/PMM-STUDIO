"use client";

import { useActionState } from "react";

import { uploadProductImage, type FormState } from "./actions";

export function UploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadProductImage, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <input type="hidden" name="productId" value={productId} />
      <label className="flex flex-col gap-1 text-sm">
        上传图片
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
        />
      </label>
      <p className="text-xs text-slate-500">
        单张上限 20 MB；系统会自动生成主图（长边 3000px）与 1600 / 800 / 320 三档 WebP，计入配额。
      </p>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "处理中…" : "上传"}
      </button>
    </form>
  );
}
