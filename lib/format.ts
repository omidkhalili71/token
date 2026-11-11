/** توابع نمایش: ارقام فارسی، جداکننده‌ی هزارگان و تاریخ شمسی. */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** تبدیل ارقام انگلیسی متن به فارسی. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** تبدیل ارقام فارسی/عربی متن به انگلیسی (برای ورودی کاربر). */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** مبلغ با جداکننده‌ی هزارگان و ارقام فارسی: ۱۵٬۰۰۰ */
export function formatRial(amount: number): string {
  return toPersianDigits(amount.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** عدد ساده با ارقام فارسی و هزارگان. */
export function formatNumber(value: number): string {
  return toPersianDigits(value.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** حروف اول نام برای آواتار متنی: «مریم احمدی» → «م‌ا» */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}‌${parts[parts.length - 1][0]}`;
}
