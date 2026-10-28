/**
 * CSV 序列化。
 *
 * 三个容易踩的坑都在这里处理：
 * 1. 字段含逗号、引号、换行时必须整体加引号
 * 2. 引号要写成两个（"" 转义）
 * 3. Excel 打开 UTF-8 CSV 会乱码，必须加 BOM
 */
export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const escape = (value: string | number | null): string => {
    const text = value === null || value === undefined ? "" : String(value);

    if (/[",\n\r]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }

    return text;
  };

  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];

  return `\uFEFF${lines.join("\r\n")}`;
}
