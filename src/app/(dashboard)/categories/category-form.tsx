"use client";

import { useActionState } from "react";

import { createCategory, type FormState } from "./actions";

export function CategoryForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCategory, {});

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">新增分类</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          简体名称
          <input
            name="nameHans"
            required
            maxLength={60}
            placeholder="例如 配件"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          繁体名称（留空自动转换）
          <input
            name="nameHant"
            maxLength={60}
            placeholder="自動轉換"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "添加中…" : "添加分类"}
      </button>
    </form>
  );
}
