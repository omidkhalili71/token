# تصمیم‌های فنی

هر تصمیم مهم در ۲-۳ خط: چی انتخاب شد و چرا.

## پروژه در پوشه‌ی `Desktop/token` و در کنار `AGENT.md` ساخته می‌شود
ریشه‌ی پروژه همان پوشه‌ای است که spec در آن قرار دارد، تا `AGENT.md` و `design.png` به‌عنوان مستندات پروژه باقی بمانند و `pnpm install && pnpm dev` از همان‌جا اجرا شود.

## `pnpm-workspace.yaml` فقط برای اجازه‌ی build اسکریپت‌ها
pnpm 11 از نصب‌های جدید، اجرای اسکریپت build ماژول‌های native را بلاک می‌کند. چون `better-sqlite3` برای ساخت binding به آن نیاز دارد، این پکیج‌ها در `onlyBuiltDependencies` مجزا اجازه گرفته‌اند. بدون این فایل، `pnpm install` روی ماشین تمیز DB را می‌شکست.

## بدون ESLint
spec تست را با Vitest و build را معیار پذیرش قرار داده و درخواست lint نکرده؛ برای سبک نگه‌داشتن نصب و کاهش time-to-run، ESLint اضافه نشد. `pnpm build` تایپ‌چک کامل TypeScript را انجام می‌دهد.
