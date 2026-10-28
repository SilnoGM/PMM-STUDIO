import { z } from "zod";

// FormData 取不到字段时返回 null，zod 的 .optional() 只接受 undefined，
// 因此统一用 nullish + transform 归一化，避免「空表单提交就报 Invalid input」。
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value ?? undefined);

const bilingualName = (max: number) => ({
  nameHans: z.string().trim().min(1, "简体名称不能为空").max(max),
  nameHant: optionalText(max),
});

export const categoryInputSchema = z.object(bilingualName(60));

export const specFieldInputSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{0,39}$/, "key 只能是字母开头的英文小写、数字与下划线"),
  labelHans: z.string().trim().min(1, "简体标签不能为空").max(40),
  labelHant: optionalText(40),
  unit: optionalText(20),
  type: z.enum(["text", "number", "boolean"]),
});

export const productInputSchema = z.object({
  nameHans: z.string().trim().min(1, "简体名称不能为空").max(120),
  nameHant: optionalText(120),
  // 型号不参与简繁转换，且必须唯一（数据库有 account_id + model_no 唯一约束）
  modelNo: z.string().trim().min(1, "型号不能为空").max(60),
  categoryId: optionalText(60),
  isPublic: z.boolean(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type SpecFieldInput = z.infer<typeof specFieldInputSchema>;
