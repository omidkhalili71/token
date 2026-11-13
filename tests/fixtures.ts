import { addDays, differenceInCalendarDays, startOfMonth } from "date-fns-jalali";
import type { Db } from "@/lib/db";
import { employees, transactions } from "@/lib/db/schema";
import { ensureUserAccount } from "@/lib/db/seed";
import { expectedAmountToman } from "@/lib/validation";
import type { UserRole } from "@/lib/dto";

type SeedEntry = { type: "grant" | "spend"; tokens: number; description: string };
type SeedEmployee = {
  fullName: string;
  personnelCode: string;
  status: "active" | "inactive";
  entries: SeedEntry[];
  account?: { mobile: string; role: UserRole };
};

const SEED_EMPLOYEES: SeedEmployee[] = [
  {
    fullName: "علی رضایی",
    personnelCode: "1001",
    status: "active",
    account: { mobile: "09120000001", role: "operator" },
    entries: [
      { type: "grant", tokens: 20, description: "پاداش ماهانه" },
      { type: "spend", tokens: 8, description: "خرید بستنی در کافه شرکت" },
    ],
  },
  {
    fullName: "مریم احمدی",
    personnelCode: "1002",
    status: "active",
    account: { mobile: "09120000002", role: "viewer" },
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

const HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18, 13, 8, 19];

function spreadDatesWithinPersianMonth(count: number, now: Date): Date[] {
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

export function seedSampleData(db: Db, now = new Date()): void {
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
      if (employee.account) {
        ensureUserAccount(
          tx,
          {
            fullName: employee.fullName,
            mobile: employee.account.mobile,
            role: employee.account.role,
            employeeId: ids[employeeIndex],
          },
          now,
        );
      }

      for (const entry of employee.entries) {
        tx.insert(transactions)
          .values({
            employeeId: ids[employeeIndex],
            type: entry.type,
            tokens: entry.tokens,
            amountToman: expectedAmountToman(entry.tokens),
            description: entry.description,
            createdAt: dates[cursor++],
          })
          .run();
      }
    });
  });
}