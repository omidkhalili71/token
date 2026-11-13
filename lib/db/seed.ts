import { eq } from "drizzle-orm";
import { DEFAULT_ADMIN_FULL_NAME, DEFAULT_ADMIN_MOBILE, DEFAULT_PASSWORD } from "../config";
import type { Db } from "./index";
import { users } from "./schema";
import { hashPassword } from "../server/passwords";
import type { UserRole } from "../dto";

type AccountWriter = Pick<Db, "insert" | "select">;

export function ensureDefaultAdmin(db: Db, now = new Date()): void {
  ensureUserAccount(db, { fullName: DEFAULT_ADMIN_FULL_NAME, mobile: DEFAULT_ADMIN_MOBILE, role: "admin" }, now);
}

export function ensureUserAccount(
  db: AccountWriter,
  input: { fullName: string; mobile: string; role: UserRole; employeeId?: number | null },
  now = new Date(),
): void {
  const existing = db.select({ id: users.id }).from(users).where(eq(users.mobile, input.mobile)).get();
  if (existing) return;

  try {
    db.insert(users)
      .values({
        fullName: input.fullName,
        mobile: input.mobile,
        passwordHash: hashPassword(DEFAULT_PASSWORD),
        role: input.role,
        employeeId: input.employeeId ?? null,
        createdAt: now,
      })
      .run();
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? "");
    if (!code.includes("SQLITE_CONSTRAINT_UNIQUE")) throw error;
  }
}
