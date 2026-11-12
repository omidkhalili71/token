import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_PASSWORD } from "@/lib/config";
import { can, ROLE_LABELS } from "@/lib/permissions";
import type { EmployeeDto, SessionDto, UserRole } from "@/lib/dto";

let dir: string;

const url = (search: string) => `http://localhost/api${search}`;

async function jsonOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function callRoutes(method: string, pathname: string, init: RequestInit = {}): Promise<Response> {
  const req = new Request(url(pathname), {
    method,
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });

  if (pathname.startsWith("/employees/")) {
    const route = await import("@/app/api/employees/[id]/route");
    const params = { params: Promise.resolve({ id: pathname.split("/")[2] ?? "" }) };
    return method === "PATCH" ? route.PATCH(req, params) : route.DELETE(req, params);
  }

  if (pathname.startsWith("/employees")) {
    const route = await import("@/app/api/employees/route");
    return method === "GET" ? route.GET(req) : route.POST(req);
  }

  if (pathname.startsWith("/transactions")) {
    const route = await import("@/app/api/transactions/route");
    return method === "GET" ? route.GET(req) : route.POST(req);
  }

  if (pathname.startsWith("/stats")) {
    const route = await import("@/app/api/stats/route");
    return route.GET(req);
  }

  const route = await import("@/app/api/auth/login/route");
  return route.POST(req);
}

async function signIn(identifier: string): Promise<SessionDto> {
  const res = await callRoutes("POST", "/auth/login", { body: JSON.stringify({ identifier, password: DEFAULT_PASSWORD }) });
  expect(res.status).toBe(200);
  return jsonOf<SessionDto>(res);
}

type Call = (method: string, pathname: string, body?: unknown) => Promise<Response>;

function authorized(accessToken: string): Call {
  return async (method, pathname, body) =>
    callRoutes(method, pathname, {
      headers: { authorization: `Bearer ${accessToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
}

const tokens: Record<UserRole, string> = { admin: "", operator: "", viewer: "" };

const roleMobile: Record<Exclude<UserRole, "admin">, string> = {
  operator: "09120000001",
  viewer: "09120000002",
};

async function tokenFor(role: UserRole): Promise<string> {
  if (!tokens[role]) tokens[role] = (await signIn(role === "admin" ? "admin" : roleMobile[role])).accessToken;
  return tokens[role];
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "token-rbac-"));
  process.env.DATABASE_FILE = path.join(dir, "app.db");

  const { bootstrapDatabase } = await import("@/lib/db/bootstrap");
  bootstrapDatabase(process.env.DATABASE_FILE).sqlite.close();
});

afterAll(async () => {
  const { closeDb } = await import("@/lib/db");
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("ماتریس دسترسی‌ها", () => {
  it("مدیر همه‌ی capabilityها را دارد", () => {
    for (const capability of [
      "employee:read",
      "employee:create",
      "employee:update",
      "employee:delete",
      "transaction:read",
      "transaction:write",
    ] as const) {
      expect(can("admin", capability)).toBe(true);
    }
  });

  it("اپراتور فقط همکار را می‌خواند و تراکنش را می‌خواند و می‌نویسد", () => {
    expect(can("operator", "employee:read")).toBe(true);
    expect(can("operator", "transaction:read")).toBe(true);
    expect(can("operator", "transaction:write")).toBe(true);
    expect(can("operator", "employee:create")).toBe(false);
    expect(can("operator", "employee:update")).toBe(false);
    expect(can("operator", "employee:delete")).toBe(false);
  });

  it("بیننده فقط خواندنی است", () => {
    expect(can("viewer", "employee:read")).toBe(true);
    expect(can("viewer", "transaction:read")).toBe(true);
    expect(can("viewer", "transaction:write")).toBe(false);
    expect(can("viewer", "employee:create")).toBe(false);
  });

  it("نقش بدون مقدار هیچ دسترسی‌ای ندارد", () => {
    expect(can(undefined, "employee:read")).toBe(false);
    expect(can(null, "transaction:read")).toBe(false);
  });

  it("برچسب فارسی برای هر سه نقش هست", () => {
    expect(ROLE_LABELS.admin).toBe("مدیر سیستم");
    expect(ROLE_LABELS.operator).toBe("اپراتور");
    expect(ROLE_LABELS.viewer).toBe("بیننده");
  });
});

describe("احراز هویت با نقش", () => {
  it("مدیر پیش‌فرض با نقش admin وارد می‌شود", async () => {
    const session = await signIn("admin");
    expect(session.user.role).toBe("admin");
  });

  it("داده‌ی نمونه دو حساب اپراتور و بیننده می‌سازد", async () => {
    expect((await signIn("09120000001")).user.role).toBe("operator");
    expect((await signIn("09120000002")).user.role).toBe("viewer");
  });
});

describe("اجرای دسترسی در بک‌اند", () => {
  it("اپراتور همکار نمی‌سازد، ویرایش یا حذف نمی‌کند", async () => {
    const asOperator = authorized(await tokenFor("operator"));
    expect((await asOperator("POST", "/employees", { fullName: "تست اپراتور", personnelCode: "7001", status: "active" })).status).toBe(
      403,
    );
    expect((await asOperator("PATCH", "/employees/3", { fullName: "تغییر", personnelCode: "1003", status: "active" })).status).toBe(403);
    expect((await asOperator("DELETE", "/employees/3")).status).toBe(403);
  });

  it("اپراتور لیست، آمار و تراکنش را می‌بیند و توکن ثبت یا خرج می‌کند", async () => {
    const asOperator = authorized(await tokenFor("operator"));
    expect((await asOperator("GET", "/employees")).status).toBe(200);
    expect((await asOperator("GET", "/stats")).status).toBe(200);
    expect((await asOperator("GET", "/transactions")).status).toBe(200);

    const grant = await asOperator("POST", "/transactions", { employeeId: 3, type: "grant", tokens: 5, description: "پاداش اپراتور" });
    expect(grant.status).toBe(201);
    const spend = await asOperator("POST", "/transactions", { employeeId: 3, type: "spend", tokens: 2, description: "خرید اپراتور" });
    expect(spend.status).toBe(201);
  });

  it("بیننده هیچ نوشتنی انجام نمی‌دهد", async () => {
    const asViewer = authorized(await tokenFor("viewer"));
    expect((await asViewer("GET", "/employees")).status).toBe(200);
    expect((await asViewer("POST", "/transactions", { employeeId: 3, type: "grant", tokens: 4, description: "تلاش بیننده" })).status).toBe(
      403,
    );
    expect((await asViewer("POST", "/employees", { fullName: "تست بیننده", personnelCode: "7002", status: "active" })).status).toBe(403);
    expect((await asViewer("PATCH", "/employees/3", { fullName: "تغییر", personnelCode: "1003", status: "active" })).status).toBe(403);
    expect((await asViewer("DELETE", "/employees/3")).status).toBe(403);
  });

  it("پیام 403 فارسی و کد forbidden است", async () => {
    const asViewer = authorized(await tokenFor("viewer"));
    const body = await jsonOf<{ error: { code: string; message: string } }>(
      await asViewer("POST", "/transactions", { employeeId: 3, type: "grant", tokens: 1, description: "تست" }),
    );
    expect(body.error.code).toBe("forbidden");
    expect(body.error.message).toContain("نقش");
  });

  it("درخواست بی‌توکن پیش از بررسی نقش 401 می‌گیرد", async () => {
    const res = await callRoutes("GET", "/employees");
    expect(res.status).toBe(401);
  });
});

describe("انتشار نقش هنگام ثبت همکار", () => {
  it("مدیر هنگام ساخت همکار نقش انتخاب می‌کند و همان نقش ذخیره می‌شود", async () => {
    const asAdmin = authorized(await tokenFor("admin"));
    const created = await jsonOf<EmployeeDto>(
      await asAdmin("POST", "/employees", {
        fullName: "شیدا نوری",
        personnelCode: "7100",
        mobile: "09127778899",
        role: "operator",
        status: "active",
      }),
    );
    expect(created.role).toBe("operator");

    const session = await signIn("09127778899");
    expect(session.user.role).toBe("operator");
    expect((await authorized(session.accessToken)("POST", "/employees", { fullName: "خ", personnelCode: "7101", status: "active" })).status).toBe(
      403,
    );
  });

  it("ویرایش بعدی نقش حساب را عوض می‌کند", async () => {
    const asAdmin = authorized(await tokenFor("admin"));
    const list = await jsonOf<{ items: EmployeeDto[] }>(await asAdmin("GET", "/employees?q=7100"));
    const employee = list.items[0];
    expect(employee).toBeDefined();

    const updated = await jsonOf<EmployeeDto>(
      await asAdmin("PATCH", `/employees/${employee.id}`, {
        fullName: employee.fullName,
        personnelCode: employee.personnelCode,
        mobile: employee.mobile,
        role: "viewer",
        status: employee.status,
      }),
    );
    expect(updated.role).toBe("viewer");
    expect((await signIn("09127778899")).user.role).toBe("viewer");
  });

  it("ارتقای حساب به اپراتور همان نشست را فوراً اپراتور می‌کند", async () => {
    const asAdmin = authorized(await tokenFor("admin"));
    const created = await jsonOf<EmployeeDto>(
      await asAdmin("POST", "/employees", {
        fullName: "کامران شدی",
        personnelCode: "7300",
        mobile: "09123451122",
        role: "viewer",
        status: "active",
      }),
    );

    const session = await signIn("09123451122");
    const asNewUser = authorized(session.accessToken);
    expect((await asNewUser("POST", "/transactions", { employeeId: created.id, type: "grant", tokens: 2, description: "تست" })).status).toBe(403);

    await asAdmin("PATCH", `/employees/${created.id}`, {
      fullName: created.fullName,
      personnelCode: created.personnelCode,
      mobile: created.mobile,
      role: "operator",
      status: created.status,
    });

    const grant = await asNewUser("POST", "/transactions", { employeeId: created.id, type: "grant", tokens: 2, description: "تست" });
    expect(grant.status).toBe(201);
    expect((await asNewUser("POST", "/employees", { fullName: "نه", personnelCode: "7301", status: "active" })).status).toBe(403);
  });

  it("نقش مدیر روی حساب همکار هم قابل انتخاب است", async () => {
    const asAdmin = authorized(await tokenFor("admin"));
    const created = await jsonOf<EmployeeDto>(
      await asAdmin("POST", "/employees", {
        fullName: "مریم صدر",
        personnelCode: "7400",
        mobile: "09123453344",
        role: "admin",
        status: "active",
      }),
    );
    expect(created.role).toBe("admin");
    const session = await signIn("09123453344");
    expect((await authorized(session.accessToken)("POST", "/employees", { fullName: "همکار جدید", personnelCode: "7401", status: "active" })).status).toBe(201);
  });

  it("همکار بدون موبایل حساب و نقش ندارد", async () => {
    const asAdmin = authorized(await tokenFor("admin"));
    const created = await jsonOf<EmployeeDto>(
      await asAdmin("POST", "/employees", { fullName: "بی‌حساب", personnelCode: "7200", status: "active" }),
    );
    expect(created.role).toBeNull();
    expect(created.mobile).toBeNull();
  });
});
