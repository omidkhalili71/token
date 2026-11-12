import { and, asc, eq, isNull, like, or } from "drizzle-orm";
import type { Db } from "../db";
import { employees, sessions, transactions, users } from "../db/schema";
import { balanceSql } from "./balance";
import { AppError } from "./errors";
import { toLatinDigits } from "../format";
import { expectedAmountToman, type EmployeeCreateInput, type EmployeeUpdateInput } from "../validation";
import type { EmployeeDto } from "../dto";
import { createUserAccount } from "./auth";

const notDeleted = isNull(employees.deletedAt);

const employeeColumns = {
  id: employees.id,
  fullName: employees.fullName,
  personnelCode: employees.personnelCode,
  mobile: users.mobile,
  avatarUrl: employees.avatarUrl,
  status: employees.status,
  balance: balanceSql,
} as const;

type AccountWriter = Pick<Db, "insert" | "update" | "select">;

export function listEmployees(db: Db, query = ""): EmployeeDto[] {
  const q = toLatinDigits(query).trim();
  const search = q
    ? or(like(employees.fullName, `%${q}%`), like(employees.personnelCode, `%${q}%`))
    : undefined;

  return db
    .select(employeeColumns)
    .from(employees)
    .leftJoin(transactions, eq(transactions.employeeId, employees.id))
    .leftJoin(users, eq(users.employeeId, employees.id))
    .where(search ? and(notDeleted, search) : notDeleted)
    .groupBy(employees.id)
    .orderBy(asc(employees.personnelCode))
    .all() as EmployeeDto[];
}

export function getEmployee(db: Db, id: number): EmployeeDto {
  const row = db
    .select(employeeColumns)
    .from(employees)
    .leftJoin(transactions, eq(transactions.employeeId, employees.id))
    .leftJoin(users, eq(users.employeeId, employees.id))
    .where(and(eq(employees.id, id), notDeleted))
    .groupBy(employees.id)
    .get();
  if (!row) throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);
  return row as EmployeeDto;
}

function rethrowUnique(error: unknown): never {
  const code = String((error as { code?: string })?.code ?? "");
  const message = String((error as { message?: string })?.message ?? "");
  if (code.includes("SQLITE_CONSTRAINT_UNIQUE") && message.includes("users.mobile")) {
    throw new AppError("duplicate_mobile", "این شماره موبایل قبلاً ثبت شده است.", 409);
  }
  if (code.includes("SQLITE_CONSTRAINT_UNIQUE")) {
    throw new AppError("duplicate_personnel_code", "این کد پرسنلی قبلاً ثبت شده است.", 409);
  }
  throw error;
}

function syncEmployeeAccount(db: AccountWriter, employeeId: number, fullName: string, mobile: string | undefined): void {
  const account = db.select({ id: users.id }).from(users).where(eq(users.employeeId, employeeId)).get();

  if (account) {
    db.update(users)
      .set(mobile ? { fullName, mobile } : { fullName })
      .where(eq(users.id, account.id))
      .run();
    return;
  }

  if (mobile) createUserAccount(db, { fullName, mobile, employeeId });
}

export function createEmployee(db: Db, input: EmployeeCreateInput): EmployeeDto {
  let createdId = 0;
  try {
    db.transaction((tx) => {
      const inserted = tx
        .insert(employees)
        .values({
          fullName: input.fullName,
          personnelCode: input.personnelCode,
          status: input.status,
          avatarUrl: input.avatarUrl ?? null,
          createdAt: new Date(),
        })
        .returning({ id: employees.id })
        .all();
      createdId = inserted[0].id;

      syncEmployeeAccount(tx, createdId, input.fullName, input.mobile);

      const initial = input.initialTokens ?? 0;
      if (initial > 0) {
        tx.insert(transactions)
          .values({
            employeeId: createdId,
            type: "grant",
            tokens: initial,
            amountToman: expectedAmountToman(initial),
            description: "موجودی اولیه",
            createdAt: new Date(),
          })
          .run();
      }
    });
  } catch (error) {
    rethrowUnique(error);
  }

  return getEmployee(db, createdId);
}

export function updateEmployee(db: Db, id: number, input: EmployeeUpdateInput): EmployeeDto {
  const current = db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, id), notDeleted)).get();
  if (!current) throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);

  try {
    db.transaction((tx) => {
      tx.update(employees)
        .set({
          fullName: input.fullName,
          personnelCode: input.personnelCode,
          status: input.status,
          avatarUrl: input.avatarUrl ?? null,
        })
        .where(eq(employees.id, id))
        .run();

      syncEmployeeAccount(tx, id, input.fullName, input.mobile);
    });
  } catch (error) {
    rethrowUnique(error);
  }

  return getEmployee(db, id);
}

export function deleteEmployee(db: Db, id: number): void {
  const now = new Date();
  db.transaction((tx) => {
    const current = tx
      .select({ id: employees.id, fullName: employees.fullName })
      .from(employees)
      .where(and(eq(employees.id, id), notDeleted))
      .get();
    if (!current) throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);

    const balance = Number(
      tx
        .select({ balance: balanceSql })
        .from(transactions)
        .where(eq(transactions.employeeId, current.id))
        .get()?.balance ?? 0,
    );

    if (balance > 0) {
      tx.insert(transactions)
        .values({
          employeeId: current.id,
          type: "spend",
          tokens: balance,
          amountToman: expectedAmountToman(balance),
          description: `توکن‌های "${current.fullName}" به دلیل حذف کاربر پاک شد.`,
          createdAt: now,
        })
        .run();
    }

    const account = tx.select({ id: users.id }).from(users).where(eq(users.employeeId, current.id)).get();
    if (account) {
      tx.delete(sessions).where(eq(sessions.userId, account.id)).run();
      tx.delete(users).where(eq(users.id, account.id)).run();
    }

    tx.update(employees).set({ deletedAt: now }).where(eq(employees.id, current.id)).run();
  });
}
