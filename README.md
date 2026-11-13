# داشبورد مدیریت توکن‌های رفاهی پرسنل

یک اپ تک‌پروژه‌ای Next.js برای ثبت و رصد توکن‌های رفاهی همکاران: لیست پرسنل با موجودی،
ثبت/مصرف توکن با توضیح، و تاریخچه‌ی فیلترشدنی. رابط کاملاً راست‌به‌چپ و فارسی است
(اعداد فارسی، تاریخ شمسی، فونت وزیرمتن) و چیدمان آن از روی `design.png` ساخته شده.

## اجرا

```bash
pnpm install
pnpm dev
```

بعد از باز کردن http://localhost:3000 هیچ تنظیم دستی لازم نیست: برنامه خودش migration را اجرا
می‌کند و حساب پیش‌فرض مدیر با نام کاربری `admin` و رمز `123456` را همیشه تضمین می‌کند. هیچ داده‌ی
نمونه‌ای ساخته نمی‌شود؛ جدول‌ها از همان ابتدا خالی‌اند و با هر بار اجرا خالی می‌مانند. صفحه‌ی
`/login` کاربر را می‌خواهد و تنها حساب موجود همان `admin` است.

> رمز پیش‌فرض فقط برای محیط توسعه است؛ در محیط واقعی آن را عوض کنید.

اسکریپت‌های دستی:

| دستور | کار |
| --- | --- |
| `pnpm db:migrate` | اعمال migration های `drizzle/` روی `data/app.db` |
| `pnpm db:reset` | حذف `data/app.db` و ساخت دوباره‌ی آن (خالی، فقط حساب مدیر) |
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
scripts/      ensure-db / migrate / reset
tests/        تست‌های Vitest (قوانین کسب‌وکار، API، احراز هویت، نقش‌ها، تقویم شمسی)
```

### `app/`

- `layout.tsx` — `dir="rtl"`، `lang="fa"`، فونت وزیرمتن و `Providers`.
- `page.tsx` — داشبورد، داخل `SessionGate`؛ بدون نشست معتبر به `/login` می‌رود.
- `login/page.tsx` — صفحه‌ی ورود (موبایل و رمز عبور).
- `api/auth/login/route.ts` — `POST` ورود؛ جفت Access/Refresh Token می‌دهد.
- `api/auth/refresh/route.ts` — `POST` تازه‌سازی؛ نشست قبلی را باطل و جفت جدید می‌سازد.
- `api/auth/logout/route.ts` — `POST` خروج؛ نشست را باطل می‌کند (بدون توکن هم ۲۰۰ می‌دهد).
- `api/auth/me/route.ts` — `GET` کاربر جاری.
- `api/auth/password/route.ts` — `PATCH` تغییر رمز؛ رمز فعلی را سمت سرور می‌سنجد.
- `api/employees/route.ts` — `GET` لیست با `?search=`، `POST` افزودن همکار.
- `api/employees/[id]/route.ts` — `PATCH` ویرایش، `DELETE` حذف نرم.
- `api/transactions/route.ts` — `POST` ثبت تراکنش (خرج/افزایش)، `GET` تاریخچه با فیلتر نوع، بازه‌ی تاریخ و صفحه.
- `api/stats/route.ts` — جمع کارت‌های بالای صفحه.
- `globals.css` — توکن‌های رنگ و فونت، و قاعده‌ی `button:not(:disabled) { cursor: pointer }`؛ preflight تیلویند v4 نشانگر دکمه‌ها را `default` گذاشته و این خط همان را برای کل برنامه برمی‌گرداند.

هر route فقط ورودی/خروجی را تبدیل می‌کند؛ تصمیم‌های کسب‌وکار در `lib/server` است تا
بتوان همان تابع‌ها را مستقیم تست کرد. مسیرهای غیر از `api/auth/login` و `api/auth/refresh`
با `requireCapability` محافظت می‌شوند: اول توکن و نشست سنجیده می‌شود (`401`) و بعد نقش
کاربر (`403`). همه با `export const dynamic = "force-dynamic"`
روی SQLite نوشته می‌شوند (کش نشوند).

### `lib/`

- `validation.ts` — اسکیماهای Zod، مشترک بین فرم کلاینت و `parse` سرور (قانون: یک تعریف، دو مصرف). نرمال‌سازی موبایل به فرم `09xxxxxxxxx` اینجا است.
- `db/schema.ts` — جداول `employees`، `transactions`، `users` و `sessions` (Drizzle). ستون `users.role` نقش را نگه می‌دارد.
- `db/index.ts` — connection تکی با WAL و `foreign_keys ON`.
- `db/bootstrap.ts` — اجرای migration و تضمین حساب مدیر در هنگام استارت (بدون داده‌ی نمونه).
- `db/seed.ts` — تضمین حساب مدیر پیش‌فرض (`ensureDefaultAdmin`) و ساخت حساب کاربری (`ensureUserAccount`، idempotent). داده‌ی نمونه‌ای در برنامه نیست.
- `permissions.ts` — ماتریس نقش‌به‌دسترسی (`MATRIX`، `can`) و برچسب فارسی نقش‌ها؛ هم سرور هم UI از همین یک فایل استفاده می‌کند.
- `server/employees.ts`، `server/transactions.ts`، `server/stats.ts` — کوئری‌ها و قوانین. `employees` حساب کاربری همکار (`users.mobile`) را هم می‌خواند و هم می‌سازد.
- `server/auth.ts` — `authenticate`/`refreshSession`/`logout`/`changePassword` و `requireSession`/`requireCapability`.
- `server/sessions.ts` — توکن‌های تصادفی ۲۵۶ بیتی؛ فقط هش SHA-۲۵6 آن‌ها در DB می‌ماند.
- `server/passwords.ts` — هش `scrypt` با پارامترهای ذخیره‌شده در رشته، و مقایسه‌ی زمان‌ثابت (برای کاربر ناشناس هم padding می‌شود تا زمان ورود oneof نشود).
- `server/balance.ts` — هسته‌ی قانون موجودی: خوانش و نوشتن داخل یک `db.transaction`.
- `server/errors.ts` — `AppError` و کدهای دامنه (`unauthorized`، `insufficient_balance`، …).
- `server/http.ts` — `readJson`/`parseQuery`/`parseId` و نگاشت `AppError` به `status` با پیام فارسی (`toErrorResponse`).
- `client/queries.ts` — هوک‌های TanStack Query (است، لیست، تاریخچه) و mutation ها.
- `client/api.ts` — `fetch` کوچک با `Authorization: Bearer`، یک تلاش مجدد بعد از `401` و تازه‌سازی single-flight.
- `client/tokens.ts` — نگه‌داری نشست در `localStorage` و انتشار تغییر وضعیت برای `useSyncExternalStore`.
- `client/session.ts` — اکشن‌های `signIn`/`signOut`/`fetchCurrentUser`/`changeCurrentPassword`.
- `client/use-auth.ts` — هوک وضعیت نشست.
- `client/jalali.ts` — لایه‌ی شمسی: تبدیل UTC↔شمسی و شبکه‌ی ماه تقویم.
- `client/use-debounced-value.ts` — تأخیر ۳۰۰ms روی جستجو.
- `format.ts` — ارقام فارسی، جداکننده‌ی هزارگان، مبلغ تومان، تاریخ و ساعت شمسی.
- `config.ts` — نرخ توکن (`TOKEN_VALUE_TOMAN = 100000`)، اندازه‌ی صفحه‌ی تاریخچه، TTL دو توکن (۷۲ ساعت)، حساب و رمز پیش‌فرض، حداقل طول رمز (`MIN_PASSWORD_LENGTH = 7`).
- `dto.ts` — شکل داده‌ی exchanged بین API و UI (`EmployeeDto`، `UserDto`، `SessionDto`، …).

### `components/`

- `dashboard.tsx` — مالح state صفحه: جستجو، فیلترها، صفحه‌بندی و اینکه کدام مودال باز است.
- `dashboard-header.tsx` — عنوان و منوی کاربر بالای صفحه (تغییر رمز عبور، خروج) با نام و نقش کاربر جاری.
- `session-gate.tsx` — تا نشست با `/api/auth/me` تأیید نشود داشبورد را نشان نمی‌دهد؛ بدون نشست به `/login` می‌رود.
- `login-form.tsx` — فرم ورود (موبایل و رمز) با پیام خطای سرور.
- `change-password-modal.tsx` — رمز فعلی، رمز جدید و تکرار آن؛ اعتبارسنجی در فرم و مجدد سمت سرور.
- `action-menu.tsx` — منوی کشویی مشترک (موقعیت `fixed` با اصلاح اختلاف مبدأ در RTL، Esc و کلیدهای جهت‌دار، بستن با کلیک بیرون یا اسکرول).
- `employees-section.tsx` / `transactions-section.tsx` — دو جدول اصلی. در جدول همکاران، «ویرایش» و «حذف» در منوی سه‌نقطه‌ی انتهای هر ردیف هستند؛ اگر نقش جاری هیچ‌کدام را نداشته باشد کل منو نمایش داده نمی‌شود.
- `stat-cards.tsx` — چهار کارت آماری.
- `transaction-modal.tsx` — خرج/ثبت توکن (stepper + توضیح الزامی + مبلغ تومانی).
- `employee-modal.tsx` — افزودن و ویرایش همکار (یک کامپوننت، دو حالت)؛ موبایل و نقش کاربری اینجا انتخاب می‌شود و نقش روی همان حساب اعمال می‌شود (بی‌موبایل حسابی ساخته نمی‌شود).
- `delete-employee-modal.tsx` — تأیید حذف نرم.
- `jalali-range-picker.tsx` — انتخاب بازه‌ی تاریخ شمسی با دو کلیک.
- `modal.tsx` / `field.tsx` / `toast.tsx` / `ui.tsx` / `avatar.tsx` / `icons.tsx` — قطعات پایه.
- `providers.tsx` — `QueryClientProvider` و `ToastProvider`.

## قوانینی که در سرور enforce می‌شوند

- هر مسیر غیر از `login` و `refresh` بدون Access Token معتبر `401` با کد `unauthorized` می‌دهد؛ محدود کردن فقط در UI کافی نیست.
- نقش، منبع واقعی دسترسی است: `admin` همه‌کار، `operator` فقط خواندن همکار و ثبت/خرج توکن، `viewer` فقط خواندن. هر درخواستِ خارج از ماتریس `403` با کد `forbidden` می‌گیرد، حتی اگر UI مربوطه باز باشد.
- نقش فقط هنگام ساخت یا ویرایش همکار و فقط توسط مدیر (دارای `employee:create`/`employee:update`) قابل انتخاب است.
- تغییر رمز عبور، رمز فعلی را سمت سرور می‌سنجد (`invalid_credentials` با `403`) و بقیه‌ی نشست‌های همان کاربر را باطل می‌کند.
- با حذف همکار، حساب کاربری و نشست‌های او هم پاک می‌شوند؛ تراکنش‌هایش می‌ماند.
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

۸۴ تست در پنج فایل:

- `tests/business-rules.test.ts` — قوانین موجودی، حذف نرم، جستجو با هر دو نوع رقم، فیلترها.
- `tests/api.test.ts` — صدا زدن مستقیم route handler ها با `new Request(...)` و هدر `Authorization` روی یک DB موقت.
- `tests/auth.test.ts` — ورود، `401` بدون توکن، تازه‌سازی و باطل شدن جفت قبلی، خروج، تغییر رمز و اثر آن روی نشست‌های دیگر، حساب خودکار همکار.
- `tests/rbac.test.ts` — ماتریس `can`، `403` برای نقش‌های پایین‌تر روی هر endpoint، ساخت همکار با نقش، ارتقا/تنزل نقش و اثر فوری آن روی نشست صادرشده.
- `tests/jalali.test.ts` — شبکه‌ی ماه شمسی، مرزهای بازه و تبدیل‌ها.

داده‌ی نمونه‌ی تست‌ها در `tests/fixtures.ts` (`seedSampleData`) است و فقط تست‌ها آن را می‌سازند؛ برنامه هیچ داده‌ی نمونه‌ای تولید نمی‌کند.

## تصمیم‌های فنی

`DECISIONS.md` هر انتخاب مهم را در ۲–۳ خط با دلیل ثبت می‌کند. `AGENT.md` هم مرجعِ نیازمندی‌هاست.
