import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns-jalali";
import { toPersianDigits } from "@/lib/format";

export const PERSIAN_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export type PersianRange = { from: Date; to: Date };

export function currentPersianMonth(reference = new Date()): PersianRange {
  return { from: startOfMonth(reference), to: endOfMonth(reference) };
}

export function formatJalaliDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return toPersianDigits(format(date, "yyyy/MM/dd - HH:mm"));
}

export function formatJalaliDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return toPersianDigits(format(date, "yyyy/MM/dd"));
}

export function formatJalaliMonthTitle(value: Date): string {
  return toPersianDigits(format(value, "MMMM yyyy"));
}

export function monthGrid(cursor: Date): { date: Date; outside: boolean }[] {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const gridStart = startOfWeek(first, { weekStartsOn: 6 });

  const leadingDays = differenceInCalendarDays(first, gridStart);
  const monthDays = getDaysInMonth(cursor);
  const cells = Math.ceil((leadingDays + monthDays) / 7) * 7;

  return Array.from({ length: cells }, (_, index) => {
    const date = addDays(gridStart, index);
    return { date, outside: date < first || date > last };
  });
}

export function shiftMonth(cursor: Date, delta: number): Date {
  return addMonths(cursor, delta);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWithinDay(value: Date, day: Date): boolean {
  return isSameDay(value, day);
}

export function dayToIso(day: Date): string {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}
