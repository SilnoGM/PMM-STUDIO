import * as OpenCC from "opencc-js";

/**
 * 简体 → 台湾正体（含词汇转换，如 内存 → 記憶體）。
 * 用 twp 而不是 tw：客户在台湾，需要的是当地用词而不只是字形。
 */
const toTaiwan = OpenCC.Converter({ from: "cn", to: "twp" });

export function toTraditionalTaiwan(text: string): string {
  return toTaiwan(text);
}

/**
 * 型号、slug、键名等标识类字段禁止转换：
 * 中文字在型号里被换字会改变含义（"大发" → "大發"），这类字段一律不走此函数。
 */
export function isTranslatableField(field: string): boolean {
  const blocked = new Set(["modelNo", "slug", "key", "storageKey", "posterKey"]);
  return !blocked.has(field);
}
