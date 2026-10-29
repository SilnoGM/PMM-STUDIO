import { describe, expect, it } from "vitest";

import { translateDevtoolsText } from "@/lib/devtools-i18n";

describe("开发工具浮层翻译", () => {
  it.each([
    ["Route Info", "路由信息"],
    ["Preferences", "偏好设置"],
    ["Route", "渲染方式"],
    ["Dynamic", "动态"],
    ["Static", "静态"],
    ["Enabled", "已启用"],
    ["Disabled", "已禁用"],
    ["Issues", "问题"],
  ])("%s → %s", (input, expected) => {
    expect(translateDevtoolsText(input)).toBe(expected);
  });

  it("长词优先，Route Info 不会被 Route 规则拆坏", () => {
    expect(translateDevtoolsText("Route Info")).toBe("路由信息");
    expect(translateDevtoolsText("Dynamic Route")).toBe("动态路由");
    expect(translateDevtoolsText("Static Route")).toBe("静态路由");
  });

  it("已是中文时保持不变（幂等）", () => {
    const once = translateDevtoolsText("Route Info");
    expect(translateDevtoolsText(once)).toBe(once);
  });

  it("未收录的英文原样保留", () => {
    expect(translateDevtoolsText("Segment Explorer")).toBe("Segment Explorer");
  });
});
