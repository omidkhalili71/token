import { and, asc, eq, isNull, like, or } from "drizzle-orm";
import type { Db } from "../db";
import { employees, transactions } from "../db/schema";
import { balanceSql } from "./balance";
import { AppError } from "./errors";
import { toLatinDigits } from "../format";
import { expectedAmountToman, type EmployeeCreateInput, type EmployeeUpdateInput } from "../validation";
import type { EmployeeDto } from "../dto";

const notDeleted = isNull(employees.deletedAt);

const employeeColumns = {
  id: employees.id,
  fullName: employees.fullName,
  personnelCode: employees.personnelCode,
  avatarUrl: employees.avatarUrl,
  status: employees.status,
  balance: balanceSql,
} as const;

export function listEmployees(db: Db, query = ""): EmployeeDto[] {
  const q = toLatinDigits(query).trim();
  const search = q
    ? or(like(employees.fullName, `%${q}%`), like(employees.personnelCode, `%${q}%`))
    : undefined;

  return db
    .select(employeeColumns)
    .from(employees)
    .leftJoin(transactions, eq(transactions.employeeId, employees.id))
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
    .where(and(eq(employees.id, id), notDeleted))
    .groupBy(employees.id)
    .get();
  if (!row) throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);
  return row as EmployeeDto;
}

function rethrowUnique(error: unknown): never {
  const code = (error as { code?: string })?.code ?? "";
  if (String(code).includes("SQLITE_CONSTRAINT_UNIQUE")) {
    throw new AppError("duplicate_personnel_code", "این کد پرسنلی قبلاً ثبت شده است.", 409);
  }
  throw error;
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
    db.update(employees)
      .set({
        fullName: input.fullName,
        personnelCode: input.personnelCode,
        status: input.status,
        avatarUrl: input.avatarUrl ?? null,
      })
      .where(eq(employees.id, id))
      .run();
  } catch (error) {
    rethrowUnique(error);
  }

  return getEmployee(db, id);
}

export function deleteEmployee(db: Db, id: number): void {
  const changed = db
    .update(employees)
    .set({ deletedAt: new Date() })
    .where(and(eq(employees.id, id), notDeleted))
    .run();
  if (changed.changes === 0) throw new AppError("employee_not_found", "همکار مورد نظر پیدا نشد.", 404);
}
