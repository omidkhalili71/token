"use client";

import { useMemo, useState } from "react";
import { HistoryIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { JalaliRangePicker } from "@/components/jalali-range-picker";
import { Badge, SectionCard, StateMessage } from "@/components/ui";
import { currentPersianMonth, dayToIso, formatJalaliDateTime } from "@/lib/client/jalali";
import { useTransactions } from "@/lib/client/queries";
import { formatNumber, formatRial, toPersianDigits } from "@/lib/format";
import type { TransactionType } from "@/lib/dto";

const TYPE_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "همه تراکنش‌ها" },
  { value: "spend", label: "مصرف" },
  { value: "grant", label: "افزایش" },
];

const HEADERS = ["تاریخ", "نام فرد", "نوع تراکنش", "مبلغ (ریال)", "توضیحات"];

export function TransactionsSection() {
  const [type, setType] = useState<TransactionType | "">("");
  const [range, setRange] = useState(currentPersianMonth);
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      type: type || undefined,
      from: dayToIso(range.from),
      to: dayToIso(range.to),
      page,
    }),
    [type, range, page],
  );

  const { data, isPending, isError, refetch } = useTransactions(filters);
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));

  return (
    <SectionCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="ms-auto flex items-center gap-2 text-lg font-extrabold">
          <HistoryIcon className="h-5 w-5 text-primary" />
          تاریخچه تراکنش‌ها
        </h2>

        <JalaliRangePicker
          range={range}
          onChange={(next) => {
            setRange(next);
            setPage(1);
          }}
        />

        <label className="sr-only" htmlFor="transaction-type">
          فیلتر نوع تراکنش
        </label>
        <select
          id="transaction-type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as TransactionType | "");
            setPage(1);
          }}
          className="w-full rounded-xl bg-card px-3.5 py-2.5 text-xs font-bold outline-none ring-1 ring-line transition focus:ring-2 focus:ring-primary sm:w-auto"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="thin-scroll mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-canvas/70 text-xs text-muted">
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-3 text-start font-bold first:rounded-s-xl last:rounded-e-xl">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending ? <LoadingRows /> : null}

            {isError && !isPending ? (
              <tr>
                <td colSpan={HEADERS.length}>
                  <StateMessage
                    tone="error"
                    title="تاریخچه بارگیری نشد."
                    description="اتصال به سرور برقرار نشد؛ یک بار دیگر تلاش کنید."
                    action={
                      <button type="button" onClick={() => refetch()} className="text-xs font-bold text-primary underline">
                        تلاش دوباره
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : null}

            {!isPending && !isError && items.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length}>
                  <StateMessage
                    title="تراکنشی در این بازه پیدا نشد."
                    description="بازه‌ی تاریخ یا نوع تراکنش را تغییر دهید؛ پیش‌فرض روی ماه جاری شمسی است."
                  />
                </td>
              </tr>
            ) : null}

            {items.map((transaction) => (
              <tr key={transaction.id} className="border-t border-line transition hover:bg-canvas/50">
                <td className="whitespace-nowrap px-3 py-3 text-xs text-muted">
                  {formatJalaliDateTime(transaction.createdAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-bold">{transaction.employeeName}</td>
                <td className="px-3 py-3">
                  {transaction.type === "spend" ? (
                    <Badge variant="danger" icon={<MinusIcon className="h-3.5 w-3.5" />}>
                      مصرف
                    </Badge>
                  ) : (
                    <Badge variant="success" icon={<PlusIcon className="h-3.5 w-3.5" />}>
                      افزایش
                    </Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">{formatRial(transaction.amountRial)}</td>
                <td className="px-3 py-3 text-muted">{transaction.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">
            {formatNumber(data?.total ?? 0)} تراکنش — صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-xl bg-canvas px-4 py-2 text-xs font-bold transition hover:text-primary disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
              className="rounded-xl bg-canvas px-4 py-2 text-xs font-bold transition hover:text-primary disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} className="border-t border-line">
          {HEADERS.map((header) => (
            <td key={header} className="px-3 py-4">
              <span className="block h-4 w-24 animate-pulse rounded-lg bg-canvas" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
