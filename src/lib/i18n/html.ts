import { toTraditionalTaiwan } from "./opencc";

/**
 * 富文本转繁体：只转文本节点，标签与属性原样保留。
 *
 * 三类内容必须跳过：
 * - <code> / <pre> 内的技术内容（型号、命令、代码）被换字会改变语义
 * - 标签属性（href、src、alt）是资源引用，不能动
 */
export function convertHtmlToTraditional(html: string): string {
  // 以标签为分隔符切分，奇数位是标签，偶数位是文本
  const tokens = html.split(/(<[^>]+>)/g);
  let skipDepth = 0;

  return tokens
    .map((token) => {
      if (token.startsWith("<")) {
        const tag = token.toLowerCase();

        if (/^<(code|pre)[\s>]/.test(tag)) {
          skipDepth += 1;
        } else if (/^<\/(code|pre)\s*>/.test(tag)) {
          skipDepth = Math.max(0, skipDepth - 1);
        }

        return token;
      }

      return skipDepth > 0 ? token : toTraditionalTaiwan(token);
    })
    .join("");
}

/** 提取纯文本，用于校对时的术语检查与列表摘要 */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
