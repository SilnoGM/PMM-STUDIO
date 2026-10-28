import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // 账号隔离的红线：任何绕过 Prisma 扩展的入口都必须显式报错
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name=/^\\$(queryRaw|queryRawUnsafe|executeRaw|executeRawUnsafe)$/]",
          message:
            "禁止使用裸 SQL：Prisma 扩展无法注入 account_id，会造成跨账号数据泄露。确需使用时，在 src/lib/db/exemptions.ts 中显式豁免并补充越权测试。",
        },
      ],
    },
  },
  {
    // 业务代码只能通过封装后的 db 访问数据，不能直接构造 PrismaClient
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              allowTypeImports: true,
              message: "只能从 @/lib/db 导入 db；直接依赖 PrismaClient 会绕过账号作用域。",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
