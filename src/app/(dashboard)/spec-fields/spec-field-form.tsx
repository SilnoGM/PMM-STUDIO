"use client";

import { useActionState } from "react";

import { createSpecField, type FormState } from "./actions";

export function SpecFieldForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createSpecField, {});

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">新增参数</h2>
      <p className="text-xs text-slate-500">
        参数定义后，产品表单会为每个参数生成一个输入框；表头文案同样需要简繁两套。
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          参数 key（英文）
          <input
            name="key"
            required
            pattern="[a-z][a-z0-9_]*"
            placeholder="memory"
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          类型
          <select
            name="type"
            defaultValue="text"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          >
            <option value="text">文本</option>
            <option value="number">数字</option>
            <option value="boolean">是/否</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          简体标签
          <input
            name="labelHans"
            required
            maxLength={40}
            placeholder="内存"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          繁体标签（留空自动转换）
          <input
            name="labelHant"
            maxLength={40}
            placeholder="記憶體"
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          单位（可选）
          <input
            name="unit"
            maxLength={20}
            placeholder="GB"
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
        {pending ? "添加中…" : "添加参数"}
      </button>
    </form>
  );
}
