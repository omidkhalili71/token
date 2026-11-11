import { addDays, differenceInCalendarDays, startOfMonth } from "date-fns-jalali";
import { sql, isNull } from "drizzle-orm";
import type { Db } from "./index";
import { employees, transactions } from "./schema";
import { expectedAmountRial } from "../validation";

type SeedEntry = { type: "grant" | "spend"; tokens: number; description: string };
type SeedEmployee = {
  fullName: string;
  personnelCode: string;
  status: "active" | "inactive";
  entries: SeedEntry[];
};

/**
 * همان پنج همکار طراحی. موجودی هر فرد تفاضل تراکنش‌هاست:
 * ۱۲، ۸، ۳۵، ۰ و ۲۱ → اهدا شده ۱۲۹، مصرف شده ۵۳، باقی‌مانده ۷۶.
 */
const SEED_EMPLOYEES: SeedEmployee[] = [
  {
    fullName: "علی رضایی",
    personnelCode: "1001",
    status: "active",
    entries: [
      { type: "grant", tokens: 20, description: "پاداش ماهانه" },
      { type: "spend", tokens: 8, description: "خرید بستنی در کافه شرکت" },
    ],
  },
  {
    fullName: "مریم احمدی",
    personnelCode: "1002",
    status: "active",
    entries: [
      { type: "grant", tokens: 18, description: "پاداش ماهانه" },
      { type: "spend", tokens: 10, description: "خرید نوشیدنی" },
    ],
  },
  {
    fullName: "سعید محمدی",
    personnelCode: "1003",
    status: "active",
    entries: [
      { type: "grant", tokens: 50, description: "تشویق بابت پروژه موفق" },
      { type: "spend", tokens: 15, description: "خرید نوشیدنی" },
    ],
  },
  {
    fullName: "ندا کریمی",
    personnelCode: "1004",
    status: "inactive",
    entries: [
      { type: "grant", tokens: 11, description: "تشویق بابت پروژه موفق" },
      { type: "spend", tokens: 11, description: "خرید شکلات" },
    ],
  },
  {
    fullName: "حامد اسدی",
    personnelCode: "1005",
    status: "active",
    entries: [
      { type: "grant", tokens: 30, description: "پاداش ماهانه" },
      { type: "spend", tokens: 9, description: "خرید بستنی در کافه شرکت" },
    ],
  },
];

/** ساعت‌های متنوع تا ترتیب تاریخچه در نمایش طبیعی به نظر برسد. */
const HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18, 13, 8, 19];

/**
 * تاریخ‌ها داخل ماه جاری شمسی می‌افتند: روزها بین اول ماه تا امروز تقسیم
 * می‌شوند و اگر ساعت از «الان» عبور کند، به عقب clamp می‌شود.
 */
export function spreadDatesWithinPersianMonth(count: number, now = new Date()): Date[] {
  const monthStart = startOfMonth(now);
  const span = Math.max(1, differenceInCalendarDays(now, monthStart) + 1);
  return Array.from({ length: count }, (_, i) => {
    const dayOffset = count === 1 ? 0 : Math.floor((i * (span - 1)) / (count - 1));
    const candidate = addDays(monthStart, dayOffset);
    candidate.setHours(HOURS[i % HOURS.length], (i * 7) % 60, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      candidate.setTime(now.getTime() - (count - i) * 60_000);
    }
    return candidate;
  });
}

/** تعداد همکاران حذف‌نشده. */
export function countAliveEmployees(db: Db): number {
  const row = db.select({ n: sql<number>`count(*)` }).from(employees).where(isNullDeleted()).get();
  return Number(row?.n ?? 0);
}

function isNullDeleted() {
  return sql`${employees.deletedAt} is null`;
}

/** درج داده‌ی نمونه. اگر همکار زنده‌ای وجود داشت، هیچ کاری نمی‌کند و false برمی‌گرداند. */
export function seedDatabase(db: Db, now = new Date()): boolean {
  if (countAliveEmployees(db) > 0) return false;

  const dates = spreadDatesWithinPersianMonth(SEED_EMPLOYEES.reduce((n, e) => n + e.entries.length, 0), now);
  let cursor = 0;

  db.transaction((tx) => {
    const ids = SEED_EMPLOYEES.map((employee) => {
      const inserted = tx
        .insert(employees)
        .values({
          fullName: employee.fullName,
          personnelCode: employee.personnelCode,
          status: employee.status,
          avatarUrl: null,
          createdAt: startOfMonth(now),
        })
        .returning({ id: employees.id })
        .all();
      return inserted[0].id;
    });

    SEED_EMPLOYEES.forEach((employee, employeeIndex) => {
      for (const entry of employee.entries) {
        tx.insert(transactions)
          .values({
            employeeId: ids[employeeIndex],
            type: entry.type,
            tokens: entry.tokens,
            amountRial: expectedAmountRial(entry.tokens),
            description: entry.description,
            createdAt: dates[cursor++],
          })
          .run();
      }
    });
  });

  return true;
}
