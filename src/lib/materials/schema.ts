import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? undefined);

export const materialInputSchema = z.object({
  titleHans: z.string().trim().min(1, "简体标题不能为空").max(120),
  titleHant: optionalText(120),
  // 公开页地址的一部分，只用英文与数字，避免中文 URL 编码问题
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "slug 只能是小写字母、数字与连字符，长度 3-40"),
  productId: optionalText(60),
  // 富文本为空时 FormData 给的是 null，统一归一化成空串
  contentHans: z
    .string()
    .max(200_000)
    .nullish()
    .transform((value) => value ?? ""),
  isPublic: z.boolean(),
});

export type MaterialInput = z.infer<typeof materialInputSchema>;
