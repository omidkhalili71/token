"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon } from "@/components/icons";
import {
  PERSIAN_WEEKDAYS,
  formatJalaliDate,
  formatJalaliMonthTitle,
  isSameDay,
  monthGrid,
  shiftMonth,
  type PersianRange,
} from "@/lib/client/jalali";

/**
 * انتخاب بازه‌ی تاریخ در تقویم شمسی: کلیک اول «از»، کلیک دوم «تا».
 * پیش‌فرض روی ماه جاری شمسی است (بخش ۴.۴ از spec).
 */
export function JalaliRangePicker({
  range,
  onChange,
}: {
  range: PersianRange;
  onChange: (range: PersianRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => range.from);
  const [pendingFrom, setPendingFrom] = useState<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setPendingFrom(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setPendingFrom(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => monthGrid(cursor), [cursor]);
  const today = new Date();

  function pickDay(day: Date) {
    if (!pendingFrom) {
      setPendingFrom(day);
      return;
    }
    const [from, to] = pendingFrom.getTime() <= day.getTime() ? [pendingFrom, day] : [day, pendingFrom];
    onChange({ from, to });
    setPendingFrom(null);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-2 rounded-xl bg-card px-3.5 py-2.5 text-xs font-bold text-ink ring-1 ring-line transition hover:ring-primary sm:w-auto sm:text-[13px]"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted" />
        <span className="whitespace-nowrap">
          از تاریخ {formatJalaliDate(range.from)} - {formatJalaliDate(range.to)}
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="انتخاب بازه‌ی تاریخ شمسی"
          className="absolute z-30 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-card p-3 shadow-xl ring-1 ring-line"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCursor((value) => shiftMonth(value, -1))}
              aria-label="ماه قبل"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
            >
              ›
            </button>
            <p className="text-sm font-extrabold">{formatJalaliMonthTitle(cursor)}</p>
            <button
              type="button"
              onClick={() => setCursor((value) => shiftMonth(value, 1))}
              aria-label="ماه بعد"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
            >
              ‹
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted">
            {PERSIAN_WEEKDAYS.map((weekday) => (
              <span key={weekday} className="py-1">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map(({ date, outside }) => {
              const isPendingStart = pendingFrom ? isSameDay(date, pendingFrom) : false;
              const isEdge =
                isPendingStart || isSameDay(date, range.from) || isSameDay(date, range.to);
              const inRange = !pendingFrom && date > range.from && date < range.to;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => pickDay(date)}
                  aria-pressed={isEdge}
                  // متن دکمه فقط شماره‌ی روز است، پس تاریخ کامل را به مرورگر می‌گوییم.
                  aria-label={formatJalaliDate(date)}
                  className={`h-8 rounded-lg text-xs font-bold transition ${
                    outside ? "text-muted/40" : "text-ink"
                  } ${
                    isPendingStart
                      ? "bg-primary text-white"
                      : isEdge
                        ? "bg-primary-soft text-primary-ink"
                        : inRange
                          ? "bg-canvas"
                          : "hover:bg-canvas"
                  } ${isSameDay(date, today) && !isEdge && !isPendingStart ? "ring-1 ring-primary" : ""}`}
                >
                  {formatJalaliDate(date).split("/").pop()}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-center text-[11px] text-muted">
            {pendingFrom ? "روز پایانی را انتخاب کنید" : "یک روز را برای شروع بازه انتخاب کنید"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
