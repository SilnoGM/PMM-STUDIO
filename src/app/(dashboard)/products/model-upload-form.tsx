"use client";

import { useActionState } from "react";

import { uploadProductModel, type FormState } from "./actions";

export function ModelUploadForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadProductModel, {});

  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <input type="hidden" name="productId" value={productId} />

      <div>
        <h3 className="text-sm font-semibold">上传 3D 模型</h3>
        <p className="mt-1 text-xs text-slate-500">
          仅支持自包含的 .glb，单个 ≤ 30 MB，计入配额。.gltf + 外部贴图的组合请先合并为 .glb。
        </p>
      </div>

      <input
        type="file"
        name="file"
        accept=".glb,model/gltf-binary"
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
        {pending ? "上传中…" : "上传模型"}
      </button>
    </form>
  );
}
