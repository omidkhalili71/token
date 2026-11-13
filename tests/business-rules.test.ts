import { beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { seedSampleData } from "./fixtures";
import { transactions } from "@/lib/db/schema";
import type { Db } from "@/lib/db";
import { AppError } from "@/lib/server/errors";
import { computeBalance } from "@/lib/server/balance";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "@/lib/server/employees";
import { createTransaction, listTransactions } from "@/lib/server/transactions";
import { getStats } from "@/lib/server/stats";
import { transactionCreateSchema, employeeCreateSchema } from "@/lib/validation";
import { TOKEN_VALUE_TOMAN } from "@/lib/config";

let db: Db;

function employeeByCode(code: string) {
  const found = listEmployees(db).find((e) => e.personnelCode === code);
  if (!found) throw new Error(`همکار ${code} پیدا نشد`);
  return found;
}

function spend(employeeId: number, tokens: number, description = "خرید بستنی در کافه شرکت") {
  return createTransaction(db, { employeeId, type: "spend", tokens, description });
}

function transactionCount(): number {
  return Number(db.select({ n: sql<number>`count(*)` }).from(transactions).get()?.n ?? 0);
}

beforeAll(() => {
  db = bootstrapDatabase(":memory:").db;
  seedSampleData(db);
});

describe("داده‌ی seed و فرمول کارت‌ها", () => {
  it("موجودی‌ها دقیقاً ۱۲، ۸، ۳۵، ۰ و ۲۱ است", () => {
    expect(listEmployees(db).map((e) => e.balance)).toEqual([12, 8, 35, 0, 21]);
  });

  it("مجموع توکن‌ها = اهدا شده − مصرف شده = مجموع موجودی‌ها", () => {
    const stats = getStats(db);
    const balances = listEmployees(db).reduce((sum, e) => sum + e.balance, 0);
    expect(stats.grantedTokens).toBe(129);
    expect(stats.spentTokens).toBe(53);
    expect(stats.totalTokens).toBe(stats.grantedTokens - stats.spentTokens);
    expect(stats.totalTokens).toBe(balances);
  });

  it("همکار غیرفعال در لیست هست ولی در «همکاران فعال» شمارده نمی‌شود", () => {
    expect(listEmployees(db).some((e) => e.personnelCode === "1004")).toBe(true);
    expect(getStats(db).activeEmployees).toBe(4);
  });
});

describe("قانون ۱ — سقف موجودی در مصرف", () => {
  it("مصرف تا سقف موجودی مجاز است", () => {
    const maryam = employeeByCode("1002");
    expect(maryam.balance).toBe(8);
    const result = spend(maryam.id, 8);
    expect(result.balanceAfter).toBe(0);
    expect(computeBalance(db, maryam.id)).toBe(0);
  });

  it("مصرف بیشتر از موجودی رد می‌شود و ردیفی اضافه نمی‌کند", () => {
    const ali = employeeByCode("1001");
    const before = transactionCount();
    expect(thrownCode(() => spend(ali.id, ali.balance + 1))).toBe("insufficient_balance");
    expect(transactionCount()).toBe(before);
    expect(computeBalance(db, ali.id)).toBe(ali.balance);
  });

  it("خطای موجودی ناکافی کد و پیام فارسی با status 409 دارد", () => {
    const ali = employeeByCode("1001");
    try {
      spend(ali.id, ali.balance + 1);
      expect.unreachable("باید خطا می‌داد");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe("insufficient_balance");
      expect(appError.status).toBe(409);
      expect(appError.message).toContain("موجودی کافی نیست");
    }
  });

  it("تعداد توکن صفر، منفی یا اعشاری از همان اسکیمای Zod رد می‌شود", () => {
    const ali = employeeByCode("1001");
    for (const tokens of [0, -3, 2.5]) {
      expect(() => transactionCreateSchema.parse({ employeeId: ali.id, type: "spend", tokens, description: "تست" })).toThrow();
    }
  });
});

describe("قانون ۲ — همکار غیرفعال یا حذف‌شده", () => {
  it("خرج توکن روی همکار غیرفعال رد می‌شود", () => {
    const neda = employeeByCode("1004");
    expect(neda.status).toBe("inactive");
    expect(() => spend(neda.id, 1)).toThrowError(/غیرفعال/);
  });

  it("خرج توکن روی همکار حذف‌شده رد می‌شود", () => {
    const hamed = employeeByCode("1005");
    deleteEmployee(db, hamed.id);
    expect(() => spend(hamed.id, 1)).toThrowError(/پیدا نشد/);
  });

  it("اهدای توکن روی همکار غیرفعال مجاز است (تصمیم: فقط مصرف محدود می‌شود)", () => {
    const neda = employeeByCode("1004");
    const before = neda.balance;
    const result = createTransaction(db, { employeeId: neda.id, type: "grant", tokens: 5, description: "پاداش" });
    expect(result.balanceAfter).toBe(before + 5);
  });
});

describe("قانون ۳ — ثبت و چک موجودی در یک transaction", () => {
  it("دو مصرف پشت‌هم روی همان snapshot نمی‌توانند موجودی را منفی کنند", () => {
    const said = employeeByCode("1003");
    const initial = said.balance;
    const results = [spend(said.id, 20), spend(said.id, 15)];
    expect(results.map((r) => r.balanceAfter)).toEqual([initial - 20, initial - 35]);
    expect(computeBalance(db, said.id)).toBe(0);
    expect(() => spend(said.id, 1)).toThrowError(/موجودی کافی نیست/);
  });

  it("خطای داخل transaction باعث می‌شود هیچ ردیفی نوشته نشود", () => {
    const ali = employeeByCode("1001");
    const before = transactionCount();
    expect(() => spend(ali.id, ali.balance + 5)).toThrow();
    expect(transactionCount()).toBe(before);
  });

  it("همکار با موجودی اولیه، grant را در همان transaction می‌نویسد", () => {
    const created = createEmployee(db, {
      fullName: "زهرا کاظمی",
      personnelCode: "1006",
      status: "active",
      avatarUrl: undefined,
      initialTokens: 7,
    });
    expect(created.balance).toBe(7);
    const history = listTransactions(db, { pageSize: 500 }).items.filter((t) => t.employeeId === created.id);
    expect(history).toHaveLength(1);
    expect(history[0].description).toBe("موجودی اولیه");
    expect(history[0].type).toBe("grant");
  });
});

describe("قانون ۴ — یکتا بودن کد پرسنلی", () => {
  it("ساخت همکار با کد تکراری خطای duplicate_personnel_code می‌دهد", () => {
    expect(() =>
      createEmployee(db, {
        fullName: "تکراری",
        personnelCode: "1001",
        status: "active",
        avatarUrl: undefined,
      }),
    ).toThrowError(/کد پرسنلی قبلاً/);
  });

  it("کد پرسنلی با ارقام فارسی نرمال می‌شود و همان تکرار شناسایی می‌شود", () => {
    const input = employeeCreateSchema.parse({
      fullName: "تکراری فارسی",
      personnelCode: "۱۰۰۱",
      status: "active",
    });
    expect(input.personnelCode).toBe("1001");
    expect(() => createEmployee(db, input)).toThrowError(/کد پرسنلی قبلاً/);
  });

  it("ویرایش به کد تکراری رد می‌شود و ردیف جدیدی ساخته نمی‌شود", () => {
    const zahra = employeeByCode("1006");
    expect(() =>
      updateEmployee(db, zahra.id, {
        fullName: zahra.fullName,
        personnelCode: "1002",
        status: "active",
        avatarUrl: undefined,
      }),
    ).toThrowError(/کد پرسنلی قبلاً/);
    expect(employeeByCode("1006").personnelCode).toBe("1006");
  });
});

describe("قانون ۵ — توضیحات اجباری و حداکثر ۲۰۰ کاراکتر", () => {
  it("توضیحات خالی یا بلند رد می‌شود", () => {
    const ali = employeeByCode("1001");
    expect(() => transactionCreateSchema.parse({ employeeId: ali.id, type: "spend", tokens: 1, description: "   " })).toThrow();
    expect(() =>
      transactionCreateSchema.parse({ employeeId: ali.id, type: "spend", tokens: 1, description: "ب".repeat(201) }),
    ).toThrow();
  });

  it("۲۰۰ کاراکتر پذیرفته می‌شود", () => {
    const parsed = transactionCreateSchema.parse({
      employeeId: employeeByCode("1001").id,
      type: "spend",
      tokens: 1,
      description: "ب".repeat(200),
    });
    expect(parsed.description).toHaveLength(200);
  });
});

describe("قانون ۶ — تراکنش‌ها غیرقابل ویرایش و حذف", () => {
  it("پوشه‌ی سرویس تراکنش فقط تابع ثبت و خواندن export دارد", async () => {
    const module = await import("@/lib/server/transactions");
    const mutations = Object.keys(module).filter((name) => /update|delete|edit|patch/i.test(name));
    expect(mutations).toEqual([]);
  });

  it("حذف همکار تراکنش‌های او را پاک نمی‌کند", () => {
    const before = transactionCount();
    const created = createEmployee(db, {
      fullName: "رضا نوری",
      personnelCode: "1007",
      status: "active",
      avatarUrl: undefined,
      initialTokens: 3,
    });
    deleteEmployee(db, created.id);
    expect(transactionCount()).toBe(before + 2);
    expect(listEmployees(db).some((e) => e.id === created.id)).toBe(false);
    const history = listTransactions(db, { pageSize: 500 }).items.filter((t) => t.employeeId === created.id);
    expect(history.map((t) => t.type).sort()).toEqual(["grant", "spend"]);
  });
});

describe("حذف همکار — پاک شدن توکن‌های باقی‌مانده", () => {
  it("موجودی باقی‌مانده با یک تراکنش مصرف صفر می‌شود و در گزارش می‌ماند", () => {
    const created = createEmployee(db, {
      fullName: "مینا صادقی",
      personnelCode: "1008",
      status: "active",
      avatarUrl: undefined,
      initialTokens: 6,
    });
    const statsBefore = getStats(db);

    deleteEmployee(db, created.id);

    expect(computeBalance(db, created.id)).toBe(0);
    const history = listTransactions(db, { pageSize: 500 }).items.filter((t) => t.employeeId === created.id);
    expect(history).toHaveLength(2);
    const clearing = history.find((t) => t.type === "spend");
    expect(clearing?.description).toBe('توکن‌های "مینا صادقی" به دلیل حذف کاربر پاک شد.');
    expect(clearing?.tokens).toBe(6);
    expect(clearing?.amountToman).toBe(6 * TOKEN_VALUE_TOMAN);

    const statsAfter = getStats(db);
    expect(statsAfter.grantedTokens).toBe(statsBefore.grantedTokens);
    expect(statsAfter.spentTokens).toBe(statsBefore.spentTokens + 6);
    expect(statsAfter.totalTokens).toBe(statsBefore.totalTokens - 6);
    expect(listEmployees(db).reduce((sum, e) => sum + e.balance, 0)).toBe(statsAfter.totalTokens);
  });

  it("همکار با موجودی صفر، ردیف تراکنش اضافی نمی‌سازد", () => {
    const created = createEmployee(db, {
      fullName: "سمانه قاسمی",
      personnelCode: "1009",
      status: "active",
      avatarUrl: undefined,
    });
    const before = transactionCount();
    deleteEmployee(db, created.id);
    expect(transactionCount()).toBe(before);
  });

  it("همکار غیرفعال با موجودی مثبت هم با حذف صفر می‌شود", () => {
    const neda = employeeByCode("1004");
    const clearedTokens = neda.balance + 4;
    createTransaction(db, { employeeId: neda.id, type: "grant", tokens: 4, description: "پاداش" });

    deleteEmployee(db, neda.id);

    expect(computeBalance(db, neda.id)).toBe(0);
    const clearing = listTransactions(db, { pageSize: 500 }).items.find(
      (t) => t.employeeId === neda.id && t.description.includes("حذف کاربر"),
    );
    expect(clearing?.tokens).toBe(clearedTokens);
  });

  it("حذف دوباره 404 می‌دهد و ردیف تکراری پاک‌سازی نمی‌سازد", () => {
    const created = createEmployee(db, {
      fullName: "طهره امینی",
      personnelCode: "1010",
      status: "active",
      avatarUrl: undefined,
      initialTokens: 2,
    });
    deleteEmployee(db, created.id);
    const before = transactionCount();
    expect(() => deleteEmployee(db, created.id)).toThrowError(/پیدا نشد/);
    expect(transactionCount()).toBe(before);
  });
});

function thrownCode(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof AppError ? error.code : null;
  }
}
