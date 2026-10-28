import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createAccountSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  displayName: z.string().trim().min(1).max(60),
  // 公开页链接用，只允许小写字母数字与连字符，避免中文 URL 编码问题
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "slug 只能是小写字母、数字与连字符，长度 3-40"),
  password: z.string().min(10, "密码至少 10 位"),
});
