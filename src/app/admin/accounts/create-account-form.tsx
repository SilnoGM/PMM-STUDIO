"use client";

import { useActionState } from "react";

import { createAccount, type CreateAccountState } from "./actions";

const initialState: CreateAccountState = {};

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createAccount, initialState);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold">新建账号</h2>

      <label className="flex flex-col gap-1 text-sm">
        显示名称
        <input
          name="displayName"
          required
          maxLength={60}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        邮箱
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        公开页 slug
        <input
          name="slug"
          required
          pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]"
          placeholder="例如 acme-tools"
          className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-slate-500"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        初始密码
        <input
          name="password"
          type="password"
          required
          minLength={10}
          className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
        />
      </label>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建账号"}
      </button>
    </form>
  );
}
