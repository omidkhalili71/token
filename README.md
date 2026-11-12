# داشبورد مدیریت توکن‌های رفاهی پرسنل

یک اپ تک‌پروژه‌ای Next.js برای ثبت و رصد توکن‌های رفاهی همکاران: لیست پرسنل با موجودی،
ثبت/مصرف توکن با توضیح، و تاریخچه‌ی فیلترشدنی. رابط کاملاً راست‌به‌چپ و فارسی است
(اعداد فارسی، تاریخ شمسی، فونت وزیرمتن) و چیدمان آن از روی `design.png` ساخته شده.

## اجرا

```bash
pnpm install
pnpm dev
```

بعد از باز کردن http://localhost:3000 هیچ تنظیم دستی لازم نیست: اگر `data/app.db` وجود
نداشته باشد، `pnpm dev` (و `pnpm build`) خودش migration را اجرا و داده‌ی نمونه را seed می‌کند.

اسکریپت‌های دستی:

| دستور | کار |
| --- | --- |
| `pnpm db:migrate` | اعمال migration های `drizzle/` روی `data/app.db` |
| `pnpm db:seed` | درج داده‌ی نمونه (فقط اگر هیچ همکار حذف‌نشده‌ای نباشد، تا تکراری نشود) |
| `pnpm db:reset` | حذف `data/app.db` و ساخت دوباره‌ی آن با داده‌ی نمونه |
| `pnpm db:generate` | تولید migration از تغییر `lib/db/schema.ts` |
| `pnpm test` | اجرای تست‌ها با Vitest |
| `pnpm build` / `pnpm start` | بیلد پروداکشن و اجرای آن |

برای ریست کردن DB باید سرور dev خاموش باشد؛ در ویندوز فایل بازِ SQLite قفل است و حذف نمی‌شود.

## ساختار پوشه‌ها

```
app/          route handler ها و صفحه‌ی اصلی (App Router)
components/   همه‌ی تکه‌های UI (جدول‌ها، مودال‌ها، تقویم، toast)
lib/          منطق مشترک: اعتبارسنجی، DB، سرویس سرور، فرمت‌ها
drizzle/      فایل migration و snapshot متادیتای آن
data/app.db   دیتابیس SQLite (ساخته‌ی محلی، در repo نیست)
scripts/      ensure-db / migrate / seed / reset
tests/        تست‌های Vitest (قوانین کسب‌وکار، API، تقویم شمسی)
```

### `app/`

- `layout.tsx` — `dir="rtl"`، `lang="fa"`، فونت وزیرمتن و `Providers`.
- `page.tsx` — یک صفحه: `Dashboard`. سرور رندر می‌کند، داده را کلاینت می‌گیرد.
- `api/employees/route.ts` — `GET` لیست با `?search=`، `POST` افزودن همکار.
- `api/employees/[id]/route.ts` — `PATCH` ویرایش، `DELETE` حذف نرم.
- `api/transactions/route.ts` — `POST` ثبت تراکنش (خرج/افزایش)، `GET` تاریخچه با فیلتر نوع، بازه‌ی تاریخ و صفحه.
- `api/stats/route.ts` — جمع کارت‌های بالای صفحه.

هر route فقط ورودی/خروجی را تبدیل می‌کند؛ تصمیم‌های کسب‌وکار در `lib/server` است تا
بتوان همان تابع‌ها را مستقیم تست کرد. همه با `export const dynamic = "force-dynamic"`
روی SQLite نوشته می‌شوند (کش نشوند).

### `lib/`

- `validation.ts` — اسکیماهای Zod، مشترک بین فرم کلاینت و `parse` سرور (قانون: یک تعریف، دو مصرف).
- `db/schema.ts` — جداول `employees` و `transactions` (Drizzle).
- `db/index.ts` — connection تکی با WAL و `foreign_keys ON`.
- `db/bootstrap.ts` — اجرای migration و seed در هنگام استارت.
- `db/seed.ts` — داده‌ی نمونه: ۵ همکار + تراکنش‌های این ماه.
- `server/employees.ts`، `server/transactions.ts`، `server/stats.ts` — کوئری‌ها و قوانین.
- `server/balance.ts` — هسته‌ی قانون موجودی: خوانش و نوشتن داخل یک `db.transaction`.
- `server/errors.ts` — `AppError` و کدهای دامنه (`not_found`، `insufficient_balance`، …).
- `server/http.ts` — `readJson`/`parseQuery`/`parseId` و نگاشت `AppError` به `status` با پیام فارسی (`toErrorResponse`).
- `client/queries.ts` — هوک‌های TanStack Query (است، لیست، تاریخچه) و mutation ها.
- `client/api.ts` — `fetch` کوچک با تبدیل بدنه‌ی خطا به `ClientApiError`.
- `client/jalali.ts` — لایه‌ی شمسی: تبدیل UTC↔شمسی و شبکه‌ی ماه تقویم.
- `client/use-debounced-value.ts` — تأخیر ۳۰۰ms روی جستجو.
- `format.ts` — ارقام فارسی، جداکننده‌ی هزارگان، مبلغ تومان، تاریخ و ساعت شمسی.
- `config.ts` — نرخ توکن (`TOKEN_VALUE_TOMAN = 100000`) و اندازه‌ی صفحه‌ی تاریخچه.
- `dto.ts` — شکل داده‌ی exchanged بین API و UI.

### `components/`

- `dashboard.tsx` — مالح state صفحه: جستجو، فیلترها، صفحه‌بندی و اینکه کدام مودال باز است.
- `employees-section.tsx` / `transactions-section.tsx` — دو جدول اصلی.
- `stat-cards.tsx` — چهار کارت آماری.
- `transaction-modal.tsx` — خرج/ثبت توکن (stepper + توضیح الزامی + مبلغ تومانی).
- `employee-modal.tsx` — افزودن و ویرایش همکار (یک کامپوننت، دو حالت).
- `delete-employee-modal.tsx` — تأیید حذف نرم.
- `jalali-range-picker.tsx` — انتخاب بازه‌ی تاریخ شمسی با دو کلیک.
- `modal.tsx` / `field.tsx` / `toast.tsx` / `ui.tsx` / `avatar.tsx` / `icons.tsx` — قطعات پایه.
- `providers.tsx` — `QueryClientProvider` و `ToastProvider`.

## قوانینی که در سرور enforce می‌شوند

- موجودی نمی‌تواند منفی شود؛ درخواست مستقیم API هم رد می‌شود (`insufficient_balance`).
- تراکنش بدون توضیح رد می‌شود.
- مبلغ تومانیِ تراکنشِ افزایش را سرور محاسبه می‌کند (`توکن × ۱۰۰٬۰۰۰`)؛ کلاینت آن را ارسال نمی‌کند.
- حذف همکار «نرم» است: ردیف از لیست می‌رود ولی تراکنش‌هایش در تاریخچه می‌مانند. اگر موجودیِ مثبت داشته باشد، همان موجودی با یک تراکنش مصرف (به نام «پاک شدن به دلیل حذف کاربر») صفر می‌شود.
- کارت «تعداد همکاران فعال» فقط `active` و حذف‌نشده را می‌شمارد.
- «تا تاریخ» در فیلتر، شامل کل آن روز است (پایان روز به وقت محلی، ذخیره‌ی UTC).

تاریخ‌ها همیشه به صورت میلادیِ UTC در DB می‌مانند و فقط در نمایش شمسی می‌شوند.

## تست

```bash
pnpm test
```

۴۸ تست در سه فایل:

- `tests/business-rules.test.ts` — قوانین موجودی، حذف نرم، جستجو با هر دو نوع رقم، فیلترها.
- `tests/api.test.ts` — صدا زدن مستقیم route handler ها با `new Request(...)` روی یک DB موقت.
- `tests/jalali.test.ts` — شبکه‌ی ماه شمسی، مرزهای بازه و تبدیل‌ها.

## تصمیم‌های فنی

`DECISIONS.md` هر انتخاب مهم را در ۲–۳ خط با دلیل ثبت می‌کند. `AGENT.md` هم مرجعِ نیازمندی‌هاست.
