"use client";

import dynamic from "next/dynamic";

/**
 * 翻译器单独打成一个 chunk，由 next/dynamic 懒加载。
 * 生产环境 layout 不会渲染这个组件，因此该 chunk 永远不会被下载，
 * 避免把开发工具的文案打进首屏包。
 */
const Translator = dynamic(() => import("./devtools-zh").then((mod) => mod.DevtoolsZh), {
  ssr: false,
});

export function DevtoolsZhLoader() {
  return <Translator />;
}
