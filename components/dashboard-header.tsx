import { Avatar } from "@/components/avatar";
import { ChevronDownIcon } from "@/components/icons";

export function DashboardHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">مدیریت توکن‌های پرسنل</h1>
        <p className="mt-1.5 text-sm text-muted sm:text-[15px]">
          مدیریت آسان توکن‌ها، ثبت تراکنش‌ها و مشاهده تاریخچه
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-1">
        <Avatar name="مدیر سیستم" size="md" />

        <button
          type="button"
          className="rounded-full p-1.5 text-muted transition hover:bg-white/70"
          aria-haspopup="menu"
          aria-label="منوی کاربر"
          disabled
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
