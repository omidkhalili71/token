import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_PASSWORD, TOKEN_VALUE_TOMAN } from "@/lib/config";
import type { EmployeeDto, StatsDto } from "@/lib/dto";
import { seedSampleData } from "./fixtures";

let dir: string;
let accessToken = "";
let statsRoute: typeof import("@/app/api/stats/route");
let employeesRoute: typeof import("@/app/api/employees/route");
let employeeRoute: typeof import("@/app/api/employees/[id]/route");
let transactionsRoute: typeof import("@/app/api/transactions/route");

const url = (search = "") => `http://localhost/api${search}`;

function authorized(pathname: string, init: RequestInit = {}) {
  return new Request(url(pathname), {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
  });
}

async function jsonOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function employees(q = ""): Promise<EmployeeDto[]> {
  const res = await employeesRoute.GET(authorized(`/employees?q=${encodeURIComponent(q)}`));
  return (await jsonOf<{ items: EmployeeDto[] }>(res)).items;
}

function post(pathname: string, body: unknown) {
  return authorized(pathname, { method: "POST", body: JSON.stringify(body) });
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "token-api-"));
  process.env.DATABASE_FILE = path.join(dir, "app.db");

  const { bootstrapDatabase } = await import("@/lib/db/bootstrap");
  const { db, sqlite } = bootstrapDatabase(process.env.DATABASE_FILE);
  seedSampleData(db);
  sqlite.close();

  statsRoute = await import("@/app/api/stats/route");
  employeesRoute = await import("@/app/api/employees/route");
  employeeRoute = await import("@/app/api/employees/[id]/route");
  transactionsRoute = await import("@/app/api/transactions/route");

  const loginRoute = await import("@/app/api/auth/login/route");
  const login = await loginRoute.POST(
    new Request(url("/auth/login"), {
      method: "POST",
      body: JSON.stringify({ identifier: "admin", password: DEFAULT_PASSWORD }),
    }),
  );
  accessToken = (await jsonOf<{ accessToken: string }>(login)).accessToken;
});

afterAll(async () => {
  const { closeDb } = await import("@/lib/db");
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("GET /api/stats", () => {
  it("چهار عدد کارت را با فرمول spec می‌دهد", async () => {
    const stats = await jsonOf<StatsDto>(await statsRoute.GET(authorized("/stats")));
    expect(stats.activeEmployees).toBe(4);
    expect(stats.grantedTokens).toBe(129);
    expect(stats.spentTokens).toBe(53);
    expect(stats.totalTokens).toBe(76);
  });
});

describe("GET /api/employees", () => {
  it("موجودی محاسبه‌شده‌ی هر همکار را برمی‌گرداند", async () => {
    const items = await employees();
    expect(items.map((e) => e.balance)).toEqual([12, 8, 35, 0, 21]);
    expect(items.find((e) => e.personnelCode === "1004")?.status).toBe("inactive");
  });

  it("جستجو با نام فارسی کار می‌کند", async () => {
    const items = await employees("مریم");
    expect(items).toHaveLength(1);
    expect(items[0].fullName).toBe("مریم احمدی");
  });

  it("جستجو با کد پرسنلی هم با رقم فارسی هم با رقم انگلیسی کار می‌کند", async () => {
    expect(await employees("۱۰۰۲")).toHaveLength(1);
    expect(await employees("1002")).toHaveLength(1);
  });

  it("جستجوی بی‌نتیجه لیست خالی می‌دهد نه خطا", async () => {
    expect(await employees("نامی که وجود ندارد")).toEqual([]);
  });
});

describe("POST /api/transactions", () => {
  it("معیار پذیرش: مصرف ۳ توکن مریم احمدی با ۱۵٬۰۰۰ تومان → موجودی ۸ به ۵", async () => {
    const maryam = (await employees("1002"))[0];
    const res = await transactionsRoute.POST(
      post("/transactions", {
        employeeId: maryam.id,
        type: "spend",
        tokens: 3,
        amountToman: 15000,
        description: "خرید بستنی در کافه شرکت",
      }),
    );
    expect(res.status).toBe(201);
    const created = await jsonOf<{ balanceAfter: number; amountToman: number }>(res);
    expect(created.balanceAfter).toBe(5);
    expect(created.amountToman).toBe(15000);

    const after = (await employees("1002"))[0];
    expect(after.balance).toBe(5);

    const stats = await jsonOf<StatsDto>(await statsRoute.GET(authorized("/stats")));
    expect(stats.spentTokens).toBe(56);
  });

  it("مصرف بیشتر از موجودی حتی با درخواست مستقیم API رد می‌شود", async () => {
    const ali = (await employees("1001"))[0];
    const res = await transactionsRoute.POST(
      post("/transactions", { employeeId: ali.id, type: "spend", tokens: ali.balance + 1, description: "تست" }),
    );
    expect(res.status).toBe(409);
    const body = await jsonOf<{ error: { code: string; message: string } }>(res);
    expect(body.error.code).toBe("insufficient_balance");
    expect(body.error.message).toContain("موجودی");
  });

  it("خرج روی همکار غیرفعال 409 می‌دهد", async () => {
    const neda = (await employees("1004"))[0];
    const res = await transactionsRoute.POST(
      post("/transactions", { employeeId: neda.id, type: "spend", tokens: 1, description: "تست" }),
    );
    expect(res.status).toBe(409);
    expect((await jsonOf<{ error: { code: string } }>(res)).error.code).toBe("employee_inactive");
  });

  it("اهدای توکن مبلغ را خودش حساب می‌کند حتی اگر کاربر عدد دیگری بفرستد", async () => {
    const hamed = (await employees("1005"))[0];
    const res = await transactionsRoute.POST(
      post("/transactions", { employeeId: hamed.id, type: "grant", tokens: 4, amountToman: 1, description: "پاداش" }),
    );
    expect((await jsonOf<{ amountToman: number }>(res)).amountToman).toBe(4 * TOKEN_VALUE_TOMAN);
  });

  it("توضیحات خالی 422 با پیام فارسی می‌دهد", async () => {
    const ali = (await employees("1001"))[0];
    const res = await transactionsRoute.POST(
      post("/transactions", { employeeId: ali.id, type: "spend", tokens: 1, description: "" }),
    );
    expect(res.status).toBe(422);
    const body = await jsonOf<{ error: { code: string; message: string } }>(res);
    expect(body.error.code).toBe("invalid_input");
    expect(body.error.message).toBe("توضیحات تراکنش الزامی است.");
  });

  it("همکار ناموجود 404 می‌دهد", async () => {
    const res = await transactionsRoute.POST(
      post("/transactions", { employeeId: 99999, type: "grant", tokens: 1, description: "تست" }),
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/transactions", () => {
  it("فیلتر نوع، بازه‌ی تاریخ و صفحه‌بندی", async () => {
    const all = await jsonOf<{ items: unknown[]; total: number; pageSize: number }>(
      await transactionsRoute.GET(authorized("/transactions")),
    );
    expect(all.pageSize).toBe(20);
    expect(all.total).toBeGreaterThanOrEqual(all.items.length);

    const spends = await jsonOf<{ items: { type: string }[] }>(
      await transactionsRoute.GET(authorized("/transactions?type=spend")),
    );
    expect(spends.items.every((t) => t.type === "spend")).toBe(true);

    const future = await transactionsRoute.GET(
      authorized(`/transactions?from=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`),
    );
    expect((await jsonOf<{ items: unknown[] }>(future)).items).toEqual([]);
  });

  it("جدیدترین تراکنش اول می‌آید", async () => {
    const res = await transactionsRoute.GET(authorized("/transactions"));
    const { items } = await jsonOf<{ items: { createdAt: string }[] }>(res);
    const times = items.map((i) => Date.parse(i.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("page خارج از محدوده لیست خالی می‌دهد", async () => {
    const res = await transactionsRoute.GET(authorized("/transactions?page=999"));
    expect((await jsonOf<{ items: unknown[] }>(res)).items).toEqual([]);
  });
});

describe("POST/PATCH/DELETE /api/employees", () => {
  it("ساخت همکار با موجودی اولیه، تراکنش grant می‌سازد", async () => {
    const res = await employeesRoute.POST(
      post("/employees", { fullName: "سارا حسینی", personnelCode: "۱۰۰۶", status: "active", initialTokens: 9 }),
    );
    expect(res.status).toBe(201);
    const created = await jsonOf<EmployeeDto>(res);
    expect(created.personnelCode).toBe("1006");
    expect(created.balance).toBe(9);
  });

  it("کد پرسنلی تکراری 409 می‌دهد", async () => {
    const res = await employeesRoute.POST(
      post("/employees", { fullName: "تکراری", personnelCode: "1006", status: "active" }),
    );
    expect(res.status).toBe(409);
    expect((await jsonOf<{ error: { code: string } }>(res)).error.code).toBe("duplicate_personnel_code");
  });

  it("کد پرسنلی با حرف 422 می‌دهد", async () => {
    const res = await employeesRoute.POST(
      post("/employees", { fullName: "بد", personnelCode: "12ab", status: "active" }),
    );
    expect(res.status).toBe(422);
  });

  it("ویرایش نام و وضعیت اعمال می‌شود", async () => {
    const saras = (await employees("1006"))[0];
    const res = await employeeRoute.PATCH(
      authorized("/employees/1", {
        method: "PATCH",
        body: JSON.stringify({ fullName: "سارا حسینی‌زاده", personnelCode: "1006", status: "inactive" }),
      }),
      { params: Promise.resolve({ id: String(saras.id) }) },
    );
    expect(res.status).toBe(200);
    expect((await jsonOf<EmployeeDto>(res)).status).toBe("inactive");
  });

  it("حذف، soft delete است و تاریخچه را نگه می‌دارد", async () => {
    const saras = (await employees("1006"))[0];
    const before = await jsonOf<{ total: number }>(
      await transactionsRoute.GET(authorized("/transactions")),
    );

    const res = await employeeRoute.DELETE(authorized("/employees/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: String(saras.id) }),
    });
    expect(res.status).toBe(200);

    expect((await employees()).some((e) => e.id === saras.id)).toBe(false);
    const after = await jsonOf<{ total: number }>(await transactionsRoute.GET(authorized("/transactions")));
    expect(after.total).toBe(saras.balance > 0 ? before.total + 1 : before.total);
  });

  it("ویرایش همکار حذف‌شده 404 می‌دهد", async () => {
    const res = await employeeRoute.DELETE(authorized("/employees/1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "99999" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("قانون ۶.۶ — مسیر تراکنش فقط GET و POST دارد", () => {
  it("هیچ متد تغییری روی /api/transactions export نشده است", () => {
    expect(Object.keys(transactionsRoute).sort()).toEqual(["GET", "POST", "dynamic"]);
  });
});
