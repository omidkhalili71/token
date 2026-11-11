import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "../db";
import { employees, transactions } from "../db/schema";
import { TRANSACTIONS_PAGE_SIZE } from "../config";
import { expectedAmountRial, type TransactionCreateInput } from "../validation";
import { AppError } from "./errors";
import { balanceSql } from "./balance";
import type { TransactionDto } from "../dto";

const transactionColumns = {
  id: transactions.id,
  employeeId: transactions.employeeId,
  employeeName: employees.fullName,
  type: transactions.type,
  tokens: transactions.tokens,
  amountRial: transactions.amountRial,
  description: transactions.description,
  createdAt: transactions.createdAt,
} as const;

export type TransactionFilters = {
  type?: "grant" | "spend";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

/**
 * تاریخچه با جدیدترین اول. تراکنش همکار حذف‌شده هم نمایش داده می‌شود،
 * چون soft delete دقیقاً برای حفظ همین تاریخچه است.
 */
export function listTransactions(
  db: Db,
  filters: TransactionFilters = {},
): { items: TransactionDto[]; page: number; pageSize: number; total: number } {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? TRANSACTIONS_PAGE_SIZE;

  const conditions = [];
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from) conditions.push(gte(transactions.createdAt, filters.from));
  // «تا تاریخ» شامل کل آن روز است: مرز بالا به اولین لحظه‌ی روز بعد می‌رسد.
  if (filters.to) conditions.push(lte(transactions.createdAt, endOfDay(filters.to)));

  const where = conditions.length ? and(...conditions) : undefined;

  const total = Number(
    db
      .select({ n: sql<number>`count(*)` })
      .from(transactions)
      .where(where)
      .get()?.n ?? 0,
  );

  const items = db
    .select(transactionColumns)
    .from(transactions)
    .innerJoin(employees, eq(employees.id, transactions.employeeId))
    .where(where)
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all()
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return { items, page, pageSize, total };
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export type CreateTransactionResult = {
  id: number;
  employeeId: number;
  type: "grant" | "spend";
  tokens: number;
  amountRial: number;
  description: string;
  createdAt: string;
  /** موجودی بعد از ثبت، برای refresh نکردن کامل لیست هم لازم است. */
  balanceAfter: number;
};

/**
 * ثبت تراکنش. چک موجودی و درج ردیف در یک transaction DB انجام می‌شود
 * (قانون ۶.۳) تا دو درخواست همزمان نتوانند بیش از موجودی مصرف کنند.
 */
export function createTransaction(db: Db, input: TransactionCreateInput, now = new Date()): CreateTransactionResult {
  return db.transaction((tx) => {
    /** خواندن موجودی داخل همان transaction، با همان فرمول مشترک. */
    const readBalance = (employeeId: number) =>
      Number(
        tx
          .select({ balance: balanceSql })
          .from(transactions)
          .where(eq(transactions.employeeId, employeeId))
          .get()?.balance ?? 0,
      );

    const employee = tx
      .select({ id: employees.id, status: employees.status, deletedAt: employees.deletedAt })
      .from(employees)
      .where(eq(employees.id, input.employeeId))
      .get();

    if (!employee || employee.deletedAt) {
      throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);
    }

    if (input.type === "spend") {
      if (employee.status !== "active") {
        throw new AppError("employee_inactive", "روی همکار غیرفعال نمی‌شود توکن خرج کرد.", 409);
      }
      const balance = readBalance(input.employeeId);
      if (input.tokens > balance) {
        throw new AppError(
          "insufficient_balance",
          `موجودی کافی نیست. موجودی فعلی ${balance} توکن است.`,
          409,
        );
      }
    }

    // grant همیشه به نرخ استاندارد؛ spend می‌تواند مبلغ دستی کاربر را داشته باشد.
    const amountRial =
      input.type === "grant" || input.amountRial === undefined
        ? expectedAmountRial(input.tokens)
        : input.amountRial;

    const inserted = tx
      .insert(transactions)
      .values({
        employeeId: employee.id,
        type: input.type,
        tokens: input.tokens,
        amountRial,
        description: input.description,
        createdAt: now,
      })
      .returning({ id: transactions.id })
      .all();

    return {
      id: inserted[0].id,
      employeeId: employee.id,
      type: input.type,
      tokens: input.tokens,
      amountRial,
      description: input.description,
      createdAt: now.toISOString(),
      balanceAfter: readBalance(employee.id),
    };
  });
}
