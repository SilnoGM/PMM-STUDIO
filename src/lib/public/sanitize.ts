import sanitizeHtml from "sanitize-html";

/**
 * 公开页渲染的是用户录入的富文本，必须按白名单清洗后再注入 DOM。
 * 白名单与 TipTap StarterKit 的输出能力对齐：只放行排版标签，不允许脚本、
 * 事件属性、style 与 iframe。
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "h2",
    "h3",
    "strong",
    "em",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "a",
    "hr",
  ],
  allowedAttributes: {
    // target/rel 必须放行，否则下面的 transformTags 补上的属性会被再次剔除
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
