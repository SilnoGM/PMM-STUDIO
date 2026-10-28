"use client";

import { useActionState } from "react";

import type { ProductOption } from "@/lib/materials/types";
import { createMaterial, updateMaterial, type FormState } from "./actions";
import { RichTextEditor } from "./rich-text-editor";

export interface MaterialFormValue {
  id: string;
  titleHans: string;
  titleHant: string;
  slug: string;
  productId: string | null;
  isPublic: boolean;
  contentHans: string;
}

interface MaterialFormProps {
  products: ProductOption[];
  material?: MaterialFormValue;
}

export function MaterialForm({ products, material }: MaterialFormProps) {
  const isEdit = Boolean(material);
  const action = isEdit ? updateMaterial : createMaterial;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">{isEdit ? "编辑资料" : "新建资料"}</h2>

      {material ? <input type="hidden" name="id" value={material.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          简体标题
          <input
            name="titleHans"
            required
            maxLength={120}
            defaultValue={material?.titleHans}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          繁体标题（留空自动转换）
          <input
            name="titleHant"
            maxLength={120}
            defaultValue={material?.titleHant}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          公开页 slug
          <input
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
            defaultValue={material?.slug}
            placeholder="install-guide"
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          关联产品（可选）
          <select
            name="productId"
            defaultValue={material?.productId ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          >
            <option value="">不关联</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.nameHans}（{product.modelNo}）
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublic" defaultChecked={material?.isPublic ?? false} />
        在公开页展示
      </label>

      <div className="flex flex-col gap-1 text-sm">
        正文（简体）
        <RichTextEditor name="contentHans" initialHtml={material?.contentHans ?? ""} />
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "保存中…" : isEdit ? "保存修改" : "创建资料"}
      </button>
    </form>
  );
}
