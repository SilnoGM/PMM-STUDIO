/**
 * Next.js 开发工具浮层的文案映射。
 *
 * 官方没有提供本地化选项（`devIndicators` 只支持位置与 false），
 * 因此这里做运行时文本替换；匹配不上时就保持英文，不会破坏浮层功能。
 *
 * 顺序很重要：先长后短，避免 "Route" 命中 "Route Info" 的一部分。
 */
export const DEVTOOLS_TRANSLATIONS: ReadonlyArray<readonly [string, string]> = [
  ["Route Info", "路由信息"],
  ["Static Route", "静态路由"],
  ["Dynamic Route", "动态路由"],
  ["Try Turbopack", "启用 Turbopack"],
  ["Preferences", "偏好设置"],
  ["Turbopack is enabled.", "Turbopack 已启用。"],
  ["Learn about Turbopack and how to enable it in your application.", "了解 Turbopack，以及如何在应用中启用它。"],
  ["Restarts the development server without needing to leave the browser.", "无需离开浏览器即可重启开发服务器。"],
  ["Clears the bundler cache and restarts the dev server. Helpful if you are seeing stale errors or changes are not appearing.", "清空打包缓存并重启开发服务器；出现陈旧报错或改动不生效时可用。"],
  ["Route", "渲染方式"],
  ["Enabled", "已启用"],
  ["Disabled", "已禁用"],
  ["Static", "静态"],
  ["Dynamic", "动态"],
  ["Issues", "问题"],
];

export function translateDevtoolsText(text: string): string {
  let result = text;

  for (const [from, to] of DEVTOOLS_TRANSLATIONS) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }

  return result;
}
