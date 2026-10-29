"use client";

import { useEffect } from "react";

import { translateDevtoolsText } from "@/lib/devtools-i18n";

/**
 * 把 Next.js 开发工具浮层翻译成简体中文。
 *
 * 浮层渲染在 <nextjs-portal> 的 open shadow root 里，document 上的观察器看不到，
 * 必须直接观察 shadow root。只在开发环境挂载，生产构建会被整段剔除。
 */
export function DevtoolsZh() {
  useEffect(() => {
    const attached = new WeakSet<ShadowRoot>();
    const observers: MutationObserver[] = [];

    const translateNode = (root: ShadowRoot): void => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();

      while (node) {
        const text = node.nodeValue;
        if (text) {
          const next = translateDevtoolsText(text);
          if (next !== text) {
            node.nodeValue = next;
          }
        }
        node = walker.nextNode();
      }

      for (const element of root.querySelectorAll("[title]")) {
        const title = element.getAttribute("title");
        if (!title) {
          continue;
        }
        const next = translateDevtoolsText(title);
        if (next !== title) {
          element.setAttribute("title", next);
        }
      }
    };

    const attach = (): void => {
      for (const portal of document.querySelectorAll("nextjs-portal")) {
        const shadow = portal.shadowRoot;
        if (!shadow || attached.has(shadow)) {
          continue;
        }

        attached.add(shadow);
        translateNode(shadow);

        const observer = new MutationObserver(() => {
          // 先断开再翻译，避免自己的写入又触发一轮回调
          observer.disconnect();
          translateNode(shadow);
          observer.observe(shadow, { childList: true, subtree: true, characterData: true });
        });

        observer.observe(shadow, { childList: true, subtree: true, characterData: true });
        observers.push(observer);
      }
    };

    attach();

    // 浮层是懒挂载的，出现晚于首次 effect
    const bodyObserver = new MutationObserver(attach);
    bodyObserver.observe(document.body, { childList: true });

    return () => {
      bodyObserver.disconnect();
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return null;
}
