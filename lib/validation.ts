/**
 * اسکیمای‌های Zod مشترک بین کلاینت و سرور (قانون ۶.۷ از spec).
 * هیچ import سمت سرور اینجا مجاز نیست.
 */
import { z } from "zod";
import { TOKEN_VALUE_RIAL } from "./config";
import { toLatinDigits } from "./format";

/** کد پرسنلی: فقط رقم (ارقام فارسی پذیرفته و نرمال می‌شوند). */
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

/** آدرس آواتار اختیاری: http(s) یا data URL. رشته‌ی خالی یعنی «ندارد». */
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
    status: statusField,
    avatarUrl: avatarUrlField,
    /** موجودی اولیه؛ اگر بزرگ‌تر از صفر باشد یک تراکنش grant ساخته می‌شود. */
    initialTokens: z.coerce
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
    status: statusField,
    avatarUrl: avatarUrlField,
  })
  .strict();

export const transactionCreateSchema = z
  .object({
    employeeId: z.coerce.number("شناسه‌ی همکار نامعتبر است.").int().positive(),
    type: z.enum(["spend", "grant"], "نوع تراکنش نامعتبر است."),
    tokens: z.coerce
      .number("تعداد توکن نامعتبر است.")
      .int("تعداد توکن باید عدد صحیح باشد.")
      .min(1, "تعداد توکن باید حداقل ۱ باشد.")
      .max(100000, "تعداد توکن حداکثر می‌تواند ۱۰۰٬۰۰۰ باشد."),
    /** برای grant سرور خودش محاسبه می‌کند؛ برای spend کاربر می‌تواند دستی وارد کند. */
    amountRial: z.coerce
      .number("مبلغ نامعتبر است.")
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
  /** ISO میلادی؛ تبدیل تقویم شمسی سمت کلاینت انجام می‌شود. */
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

/** مبلغ استاندارد یک تراکنش بر اساس تعداد توکن. */
export function expectedAmountRial(tokens: number): number {
  return tokens * TOKEN_VALUE_RIAL;
}
