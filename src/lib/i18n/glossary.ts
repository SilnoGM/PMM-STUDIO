/**
 * 台湾用语基线表。
 *
 * twp 词库覆盖有限，产品与行业术语经常漏转。这张表有两个用途：
 * 1. 作为校对时的参考（页面上直接展示）
 * 2. 自动检查：繁体正文里如果还出现左侧的简体词，说明转换没生效，需要人工处理
 */
export interface GlossaryEntry {
  hans: string;
  hant: string;
}

export const TERM_BASELINE: GlossaryEntry[] = [
  { hans: "软件", hant: "軟體" },
  { hans: "硬件", hant: "硬體" },
  { hans: "硬盘", hant: "硬碟" },
  { hans: "内存", hant: "記憶體" },
  { hans: "网络", hant: "網路" },
  { hans: "信息", hant: "資訊" },
  { hans: "视频", hant: "影片" },
  { hans: "音频", hant: "音訊" },
  { hans: "文件", hant: "檔案" },
  { hans: "目录", hant: "目錄" },
  { hans: "默认", hant: "預設" },
  { hans: "设置", hant: "設定" },
  { hans: "打印", hant: "列印" },
  { hans: "登录", hant: "登入" },
  { hans: "质量", hant: "品質" },
  { hans: "用户", hant: "使用者" },
  { hans: "支持", hant: "支援" },
  { hans: "搜索", hant: "搜尋" },
  { hans: "数据", hant: "資料" },
  { hans: "界面", hant: "介面" },
];

/**
 * 找出繁体正文里残留的简体用语。
 * 只做提示、不做自动替换——术语是否需要替换取决于上下文，必须人工判断。
 */
export function auditTraditionalTerms(hantText: string): GlossaryEntry[] {
  return TERM_BASELINE.filter((entry) => hantText.includes(entry.hans));
}
