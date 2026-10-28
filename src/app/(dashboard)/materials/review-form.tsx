"use client";

import { useActionState } from "react";

import { saveReviewedHant, type FormState } from "./actions";
import { RichTextEditor } from "./rich-text-editor";

interface ReviewFormProps {
  materialId: string;
  contentHant: string;
}

export function ReviewForm({ materialId, contentHant }: ReviewFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveReviewedHant, {});

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={materialId} />

      <RichTextEditor name="contentHant" initialHtml={contentHant} />

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
      >
        {pending ? "保存中…" : "保存并标记为已校对"}
      </button>
    </form>
  );
}
