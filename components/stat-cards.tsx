"use client";

import { AlertIcon, CartIcon, ChartIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { useStats } from "@/lib/client/queries";
import { formatNumber } from "@/lib/format";

const CARDS = [
  { key: "activeEmployees", label: "تعداد همکاران فعال", Icon: UsersIcon, tone: "bg-info-soft text-info" },
  { key: "grantedTokens", label: "توکن‌های ثبت شده", Icon: PlusIcon, tone: "bg-warn-soft text-warn" },
  { key: "spentTokens", label: "توکن‌های مصرف شده", Icon: CartIcon, tone: "bg-primary-soft text-primary" },
  { key: "totalTokens", label: "مجموع توکن‌ها", Icon: ChartIcon, tone: "bg-success-soft text-success" },
] as const;

export function StatCards() {
  const { data, isPending, isError, refetch } = useStats();

  if (isError) {
    return (
      <div className="rounded-card bg-card p-4 text-sm shadow-sm ring-1 ring-line">
        <p className="flex items-center gap-2 font-bold text-danger">
          <AlertIcon className="h-5 w-5" />
          عددهای خلاصه بارگیری نشد.
        </p>
        <button type="button" onClick={() => refetch()} className="mt-2 text-xs font-bold text-primary underline">
          تلاش دوباره
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {CARDS.map(({ key, label, Icon, tone }) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 rounded-card bg-card p-4 shadow-sm ring-1 ring-line sm:p-5"
        >
          <div className="min-w-0">
            <p className="text-2xl font-extrabold sm:text-3xl">
              {isPending || !data ? <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-canvas" /> : formatNumber(data[key])}
            </p>
            <p className="mt-1 truncate text-xs text-muted sm:text-[13px]">{label}</p>
          </div>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl sm:h-12 sm:w-12 ${tone}`}>
            <Icon className="h-6 w-6" />
          </span>
        </div>
      ))}
    </div>
  );
}
