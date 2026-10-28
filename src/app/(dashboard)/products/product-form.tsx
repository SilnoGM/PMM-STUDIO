"use client";

import { useActionState } from "react";

import { createProduct, updateProduct, type FormState } from "./actions";

export interface CatalogOption {
  id: string;
  nameHans: string;
  nameHant: string;
}

export interface SpecFieldOption {
  key: string;
  labelHans: string;
  labelHant: string;
  unit: string | null;
  type: string;
}

export interface ProductFormValue {
  id: string;
  nameHans: string;
  nameHant: string;
  modelNo: string;
  categoryId: string | null;
  isPublic: boolean;
  specs: Record<string, string>;
}

interface ProductFormProps {
  categories: CatalogOption[];
  specFields: SpecFieldOption[];
  product?: ProductFormValue;
}

export function ProductForm({ categories, specFields, product }: ProductFormProps) {
  const isEdit = Boolean(product);
  const action = isEdit ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">{isEdit ? "编辑产品" : "新建产品"}</h2>

      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          简体名称
          <input
            name="nameHans"
            required
            maxLength={120}
            defaultValue={product?.nameHans}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          繁体名称（留空自动转换）
          <input
            name="nameHant"
            maxLength={120}
            defaultValue={product?.nameHant}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          型号（不参与简繁转换）
          <input
            name="modelNo"
            required
            maxLength={60}
            defaultValue={product?.modelNo}
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          分类
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          >
            <option value="">未分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.nameHans}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublic" defaultChecked={product?.isPublic ?? false} />
        在公开页展示（客户可见）
      </label>

      {specFields.length > 0 ? (
        <fieldset className="flex flex-col gap-3 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-xs text-slate-500">参数</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {specFields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm">
                {field.labelHans}
                {field.unit ? <span className="text-xs text-slate-400">（{field.unit}）</span> : null}
                <input
                  name={`spec__${field.key}`}
                  defaultValue={product?.specs[field.key] ?? ""}
                  className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-xs text-slate-500">
          还没有定义参数，可先到「参数字典」添加，例如内存、重量。
        </p>
      )}

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "保存中…" : isEdit ? "保存修改" : "创建产品"}
      </button>
    </form>
  );
}
