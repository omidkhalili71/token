import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { DEFAULT_PASSWORD } from "@/lib/config";
import type { Db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ensureDefaultAdmin } from "@/lib/db/seed";
import { seedSampleData } from "./fixtures";
import type { SessionDto, UserDto } from "@/lib/dto";

let dir: string;
let loginRoute: typeof import("@/app/api/auth/login/route");
let refreshRoute: typeof import("@/app/api/auth/refresh/route");
let logoutRoute: typeof import("@/app/api/auth/logout/route");
let meRoute: typeof import("@/app/api/auth/me/route");
let passwordRoute: typeof import("@/app/api/auth/password/route");
let statsRoute: typeof import("@/app/api/stats/route");
let employeesRoute: typeof import("@/app/api/employees/route");

const url = (search: string) => `http://localhost/api${search}`;

async function jsonOf<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

function post(pathname: string, body: unknown, accessToken?: string) {
  return new Request(url(pathname), {
    method: "POST",
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
    body: JSON.stringify(body),
  });
}

function withToken(accessToken: string, method = "GET") {
  return (pathname: string) => new Request(url(pathname), { method, headers: { authorization: `Bearer ${accessToken}` } });
}

function changePasswordRequest(accessToken: string, body: unknown) {
  return new Request(url("/auth/password"), {
    method: "PATCH",
    headers: { authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
}

async function signInAsAdmin(): Promise<SessionDto> {
  const res = await loginRoute.POST(post("/auth/login", { identifier: "admin", password: DEFAULT_PASSWORD }));
  expect(res.status).toBe(200);
  return jsonOf<SessionDto>(res);
}

let spareToken: string | null = null;

async function createSpareAccount(mobile = "09123334455", fullName = "رضا کریمی", personnelCode = "1010"): Promise<string> {
  spareToken ??= (await signInAsAdmin()).accessToken;
  const res = await employeesRoute.POST(
    new Request(url("/employees"), {
      method: "POST",
      headers: { authorization: `Bearer ${spareToken}`, "content-type": "application/json" },
      body: JSON.stringify({ fullName, personnelCode, mobile, status: "active" }),
    }),
  );
  expect(res.status).toBe(201);
  return mobile;
}

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "token-auth-"));
  process.env.DATABASE_FILE = path.join(dir, "app.db");

  const { bootstrapDatabase } = await import("@/lib/db/bootstrap");
  const { db, sqlite } = bootstrapDatabase(process.env.DATABASE_FILE);
  seedSampleData(db);
  sqlite.close();

  loginRoute = await import("@/app/api/auth/login/route");
  refreshRoute = await import("@/app/api/auth/refresh/route");
  logoutRoute = await import("@/app/api/auth/logout/route");
  meRoute = await import("@/app/api/auth/me/route");
  passwordRoute = await import("@/app/api/auth/password/route");
  statsRoute = await import("@/app/api/stats/route");
  employeesRoute = await import("@/app/api/employees/route");
});

afterAll(async () => {
  const { closeDb } = await import("@/lib/db");
  closeDb();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("POST /api/auth/login", () => {
  it("با نام کاربری مدیر و رمز پیش‌فرض نشست می‌دهد", async () => {
    const session = await signInAsAdmin();
    expect(session.user.fullName).toBe("مدیر سیستم");
    expect(session.accessToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(session.refreshToken).not.toBe(session.accessToken);
  });

  it("رمز غلط 401 با پیام فارسی می‌دهد", async () => {
    const res = await loginRoute.POST(post("/auth/login", { identifier: "admin", password: "111111" }));
    expect(res.status).toBe(401);
    expect((await jsonOf<{ error: { code: string; message: string } }>(res)).error.code).toBe("invalid_credentials");
  });

  it("نام کاربری ناشناس همان خطای رمز غلط را می‌دهد", async () => {
    const res = await loginRoute.POST(post("/auth/login", { identifier: "09120000000", password: DEFAULT_PASSWORD }));
    expect(res.status).toBe(401);
    expect((await jsonOf<{ error: { code: string } }>(res)).error.code).toBe("invalid_credentials");
  });
});

describe("حریم خصوصی مسیرها", () => {
  it("بدون توکن 401 می‌دهد", async () => {
    const res = await employeesRoute.GET(new Request(url("/employees")));
    expect(res.status).toBe(401);
    expect((await jsonOf<{ error: { code: string } }>(res)).error.code).toBe("unauthorized");

    expect((await statsRoute.GET(new Request(url("/stats")))).status).toBe(401);
  });

  it("توکن بی‌اعتبار 401 می‌دهد", async () => {
    const res = await employeesRoute.GET(withToken("this-is-not-a-token")("/employees"));
    expect(res.status).toBe(401);
  });

  it("با توکن معتبر داده می‌دهد", async () => {
    const { accessToken } = await signInAsAdmin();
    const res = await employeesRoute.GET(withToken(accessToken)("/employees"));
    expect(res.status).toBe(200);
    expect((await jsonOf<{ items: unknown[] }>(res)).items.length).toBeGreaterThan(0);
  });
});

describe("GET /api/auth/me", () => {
  it("کاربر جاری را برمی‌گرداند", async () => {
    const { accessToken } = await signInAsAdmin();
    const user = await jsonOf<UserDto>(await meRoute.GET(withToken(accessToken)("/auth/me")));
    expect(user.fullName).toBe("مدیر سیستم");
  });
});

describe("چرخه‌ی نشست", () => {
  it("تازه‌سازی، جفت توکن قبلی را باطل می‌کند", async () => {
    const first = await signInAsAdmin();
    const rotated = await jsonOf<SessionDto>(
      await refreshRoute.POST(post("/auth/refresh", { refreshToken: first.refreshToken })),
    );

    expect(rotated.accessToken).not.toBe(first.accessToken);
    expect((await meRoute.GET(withToken(rotated.accessToken)("/auth/me"))).status).toBe(200);
    expect((await refreshRoute.POST(post("/auth/refresh", { refreshToken: first.refreshToken }))).status).toBe(401);
  });

  it("خروج، توکن دسترسی را باطل می‌کند و بی‌effect نیست", async () => {
    const { accessToken, refreshToken } = await signInAsAdmin();
    expect((await logoutRoute.POST(post("/auth/logout", {}, accessToken))).status).toBe(200);
    expect((await employeesRoute.GET(withToken(accessToken)("/employees"))).status).toBe(401);
    expect((await refreshRoute.POST(post("/auth/refresh", { refreshToken }))).status).toBe(401);
  });

  it("خروج بدون توکن هم 200 می‌دهد", async () => {
    expect((await logoutRoute.POST(new Request(url("/auth/logout"), { method: "POST" }))).status).toBe(200);
  });
});

describe("PATCH /api/auth/password", () => {
  it("رمز فعلی اشتباه 403 می‌دهد", async () => {
    const { accessToken } = await signInAsAdmin();
    const res = await passwordRoute.PATCH(
      new Request(url("/auth/password"), {
        method: "PATCH",
        headers: { authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ currentPassword: "wrong", newPassword: "new-password-7", confirmPassword: "new-password-7" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("رمز جدید کوتاه‌تر از ۷ کاراکتر 422 می‌دهد", async () => {
    const { accessToken } = await signInAsAdmin();
    const res = await passwordRoute.PATCH(
      new Request(url("/auth/password"), {
        method: "PATCH",
        headers: { authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ currentPassword: DEFAULT_PASSWORD, newPassword: "123456", confirmPassword: "123456" }),
      }),
    );
    expect(res.status).toBe(422);
    expect((await jsonOf<{ error: { message: string } }>(res)).error.message).toContain("بیشتر از");
  });

  it("پس از تغییر رمز، نشست‌های دیگر باطل می‌شوند و رمز جدید کار می‌کند", async () => {
    const account = await createSpareAccount();
    const current = await jsonOf<SessionDto>(
      await loginRoute.POST(post("/auth/login", { identifier: account, password: DEFAULT_PASSWORD })),
    );
    const other = await jsonOf<SessionDto>(
      await loginRoute.POST(post("/auth/login", { identifier: account, password: DEFAULT_PASSWORD })),
    );
    const next = "new-secret-77";

    const res = await passwordRoute.PATCH(
      changePasswordRequest(current.accessToken, {
        currentPassword: DEFAULT_PASSWORD,
        newPassword: next,
        confirmPassword: next,
      }),
    );
    expect(res.status).toBe(200);

    expect((await employeesRoute.GET(withToken(other.accessToken)("/employees"))).status).toBe(401);
    expect((await loginRoute.POST(post("/auth/login", { identifier: account, password: DEFAULT_PASSWORD }))).status).toBe(401);
    expect((await loginRoute.POST(post("/auth/login", { identifier: account, password: next }))).status).toBe(200);
  });
});

describe("حساب همکار تازه", () => {
  it("با موبایل ساخته می‌شود و با رمز پیش‌فرض وارد می‌شود", async () => {
    const mobile = await createSpareAccount("09121112233", "زهرا رضایی", "1009");
    const res = await loginRoute.POST(post("/auth/login", { identifier: "0912 111 2233", password: DEFAULT_PASSWORD }));
    expect(res.status).toBe(200);
    const session = await jsonOf<SessionDto>(res);
    expect(session.user.fullName).toBe("زهرا رضایی");
    expect((await meRoute.GET(withToken(session.accessToken)("/auth/me"))).status).toBe(200);
    expect(mobile).toBe("09121112233");
  });
});

describe("حساب پیش‌فرض مدیر", () => {
  it("اجرای دوباره‌ی seed مدیر دومی نمی‌سازد", async () => {
    const { bootstrapDatabase } = await import("@/lib/db/bootstrap");
    const fresh = bootstrapDatabase(":memory:");
    const before = countUsers(fresh.db);
    ensureDefaultAdmin(fresh.db);
    ensureDefaultAdmin(fresh.db);
    expect(countUsers(fresh.db)).toBe(before);
    fresh.sqlite.close();
  });
});

function countUsers(db: Db): number {
  return Number(db.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0);
}
