"use client";

import { useEffect } from "react";

/**
 * 3D 模型预览。
 *
 * 用 Google 的 <model-viewer> web component：
 * 自带轨道相机、自动旋转与模型加载器，不用手写 three.js 场景。
 * 动态 import 是为了不把 loader 打进首屏包。
 */
export function ModelViewer({ src, alt }: { src: string; alt?: string }) {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  // React 19 会原样透传自定义元素的属性，无需 JSX 类型声明
  const Tag = "model-viewer" as unknown as React.ElementType;

  return (
    <Tag
      src={src}
      alt={alt ?? "3D 模型"}
      camera-controls=""
      auto-rotate=""
      touch-action="pan-y"
      shadow-intensity="1"
      style={{
        width: "100%",
        height: "420px",
        backgroundColor: "#f8fafc",
        borderRadius: "0.5rem",
        border: "1px solid #e2e8f0",
      }}
    />
  );
}
