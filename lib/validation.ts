import { z } from "zod";
import { MIN_PASSWORD_LENGTH, TOKEN_VALUE_TOMAN } from "./config";
import { toLatinDigits } from "./format";

export function normalizeMobile(value: string): string | null {
  let digits = toLatinDigits(value).replace(/\D/g, "");
  if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith("98")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^9\d{9}$/.test(digits) ? `0${digits}` : null;
}

export function normalizeLoginIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase();
  return normalizeMobile(trimmed) ?? trimmed;
}

const mobileField = z
  .string({ error: "شماره موبایل الزامی است." })
  .trim()
  .transform((value) => normalizeMobile(value))
  .refine((value): value is string => value !== null, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");

const passwordField = (message: string) =>
  z
    .string({ error: message })
    .min(1, message)
    .refine((value) => value.trim().length > 0, "رمز عبور نمی‌تواند فقط فاصله باشد.");

const personnelCodeField = z
  .string({ error: "کد پرسنلی الزامی است." })
  .trim()
  .transform(toLatinDigits)
  .refine((v) => /^\d{3,10}$/.test(v), "کد پرسنلی باید ۳ تا ۱۰ رقم باشد.");

const fullNameField = z
  .string({ error: "نام و نام خانوادگی الزامی است." })
  .trim()
  .min(2, "نام باید حداقل ۲ کاراکتر باشد.")
  .max(60, "نام حداکثر می‌تواند ۶۰ کاراکتر باشد.");

const statusField = z.enum(["active", "inactive"], "وضعیت نامعتبر است.");

const avatarUrlField = z
  .string()
  .trim()
  .max(300, "آدرس تصویر خیلی بلند است.")
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^https?:\/\/.+/.test(v) || /^data:image\/[a-z]+;base64,.+/i.test(v),
    "آدرس تصویر باید با http، https یا data:image شروع شود.",
  );

const descriptionField = z
  .string({ error: "توضیحات تراکنش الزامی است." })
  .trim()
  .min(1, "توضیحات تراکنش الزامی است.")
  .max(200, "توضیحات حداکثر می‌تواند ۲۰۰ کاراکتر باشد.");

export const employeeCreateSchema = z
  .object({
    fullName: fullNameField,
    personnelCode: personnelCodeField,
    mobile: mobileField.optional(),
    status: statusField,
    avatarUrl: avatarUrlField,
    initialTokens: z
      .number("موجودی اولیه باید عدد باشد.")
      .int("موجودی اولیه باید عدد صحیح باشد.")
      .min(0, "موجودی اولیه نمی‌تواند منفی باشد.")
      .max(100000, "موجودی اولیه حداکثر می‌تواند ۱۰۰٬۰۰۰ باشد.")
      .optional(),
  })
  .strict();

export const employeeUpdateSchema = z
  .object({
    fullName: fullNameField,
    personnelCode: personnelCodeField,
    mobile: mobileField.optional(),
    status: statusField,
    avatarUrl: avatarUrlField,
  })
  .strict();

export const loginSchema = z
  .object({
    identifier: z
      .string({ error: "شماره موبایل الزامی است." })
      .trim()
      .min(1, "شماره موبایل الزامی است.")
      .transform(normalizeLoginIdentifier),
    password: passwordField("رمز عبور الزامی است."),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: passwordField("رمز عبور فعلی الزامی است."),
    newPassword: passwordField("رمز عبور جدید الزامی است.").min(
      MIN_PASSWORD_LENGTH,
      "رمز عبور جدید باید بیشتر از ۶ کاراکتر باشد.",
    ),
    confirmPassword: passwordField("تکرار رمز عبور جدید الزامی است."),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "تکرار رمز عبور جدید با رمز جدید مطابقت ندارد.",
    path: ["confirmPassword"],
  });

export const refreshSchema = z
  .object({ refreshToken: z.string({ error: "توکن تازه‌سازی الزامی است." }).trim().min(1) })
  .strict();

export const transactionCreateSchema = z
  .object({
    employeeId: z.number("شناسه‌ی همکار نامعتبر است.").int().positive(),
    type: z.enum(["spend", "grant"], "نوع تراکنش نامعتبر است."),
    tokens: z
      .number("تعداد توکن باید عدد باشد.")
      .int("تعداد توکن باید عدد صحیح باشد.")
      .min(1, "تعداد توکن باید حداقل ۱ باشد.")
      .max(100000, "تعداد توکن حداکثر می‌تواند ۱۰۰٬۰۰۰ باشد."),
    amountToman: z
      .number("مبلغ باید عدد باشد.")
      .int("مبلغ باید عدد صحیح باشد.")
      .min(1, "مبلغ باید بزرگ‌تر از صفر باشد.")
      .max(1000000000, "مبلغ خیلی زیاد است.")
      .optional(),
    description: descriptionField,
  })
  .strict();

export const employeesQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
});

export const transactionsQuerySchema = z.object({
  type: z.enum(["spend", "grant"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function expectedAmountToman(tokens: number): number {
  return tokens * TOKEN_VALUE_TOMAN;
}
