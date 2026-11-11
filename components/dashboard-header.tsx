import { Avatar } from "@/components/avatar";
import { BellIcon, ChevronDownIcon } from "@/components/icons";

/** هدر صفحه: عنوان و زیرعنوان، به‌همراه آواتار ادمین و زنگ (فعلاً فقط ظاهری). */
export function DashboardHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">مدیریت توکن‌های پرسنل</h1>
        <p className="mt-1.5 text-sm text-muted sm:text-[15px]">
          مدیریت آسان توکن‌ها، ثبت تراکنش‌ها و مشاهده تاریخچه
        </p>
      </div>

      {/* ترتیب DOM در RTL: آواتار راست‌ترین، سپس زنگ، سپس فلش dropdown */}
      <div className="flex shrink-0 items-center gap-3 pt-1">
        <button
          type="button"
          className="rounded-full p-1.5 text-muted transition hover:bg-white/70"
          aria-haspopup="menu"
          aria-label="منوی کاربر"
          disabled
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="relative rounded-full p-1.5 text-muted transition hover:bg-white/70"
          aria-label="اعلان‌ها (به‌زودی)"
          disabled
        >
          <BellIcon className="h-6 w-6" />
          <span className="absolute end-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-canvas" />
        </button>

        <span className="flex items-center gap-2 rounded-full bg-card p-1 pe-3 shadow-sm ring-1 ring-line">
          <Avatar name="مدیر سیستم" size="sm" />
          <span className="hidden text-xs font-semibold text-muted sm:inline">مدیر سیستم</span>
        </span>
      </div>
    </header>
  );
}
