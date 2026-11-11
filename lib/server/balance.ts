import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { transactions } from "../db/schema";

/**
 * موجودی هیچ‌جا ذخیره نمی‌شود؛ همین عبارت تنها منبع محاسبه است
 * تا لیست، مودال و تست‌ها همه یک فرمول داشته باشند.
 */
export const balanceSql = sql<number>`coalesce(sum(case when ${transactions.type} = 'grant' then ${transactions.tokens} else -${transactions.tokens} end), 0)`;

export function computeBalance(db: Db, employeeId: number): number {
  const row = db
    .select({ balance: balanceSql })
    .from(transactions)
    .where(eq(transactions.employeeId, employeeId))
    .get();
  return Number(row?.balance ?? 0);
}
