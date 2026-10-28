"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

interface RichTextEditorProps {
  /** 表单字段名，保存时以 HTML 字符串提交 */
  name: string;
  initialHtml?: string;
}

const TOOLBAR = [
  { label: "粗体", action: (editor: Editor) => editor.chain().focus().toggleBold().run() },
  { label: "斜体", action: (editor: Editor) => editor.chain().focus().toggleItalic().run() },
  { label: "H2", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "H3", action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "列表", action: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "编号", action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: "引用", action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
  { label: "代码", action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run() },
] as const;

export function RichTextEditor({ name, initialHtml = "" }: RichTextEditorProps) {
  // TipTap 在 SSR 阶段没有真实 DOM，必须延后渲染，否则会出现 hydration 不匹配
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap min-h-48 px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => setHtml(instance.getHTML()),
  });

  return (
    <div className="overflow-hidden rounded-md border border-slate-300">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
        {TOOLBAR.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => editor && item.action(editor)}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
          >
            {item.label}
          </button>
        ))}
      </div>

      <EditorContent editor={editor} />

      {/* 真正提交给 Server Action 的是这段 HTML */}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
