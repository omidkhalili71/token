import { describe, expect, it } from "vitest";
import { format } from "date-fns-jalali";
import {
  PERSIAN_WEEKDAYS,
  currentPersianMonth,
  dayToIso,
  formatJalaliDateTime,
  isSameDay,
  monthGrid,
  shiftMonth,
} from "@/lib/client/jalali";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { seedSampleData } from "./fixtures";
import { listTransactions } from "@/lib/server/transactions";

describe("تقویم شمسی", () => {
  it("بازه‌ی پیش‌فرض، ماه جاری شمسی است", () => {
    const { from, to } = currentPersianMonth(new Date("2026-11-11T10:00:00"));
    expect(format(from, "yyyy/MM/dd")).toBe("1405/08/01");
    expect(format(to, "yyyy/MM/dd")).toBe("1405/08/30");
  });

  it("شبکه‌ی ماه با شنبه شروع می‌شود و همه‌ی روزهای ماه را پوشش می‌دهد", () => {
    const cursor = new Date("2026-11-11T10:00:00");
    const cells = monthGrid(cursor);
    expect(cells.length % 7).toBe(0);
    expect(cells.length / 7).toBeGreaterThanOrEqual(5);
    expect(PERSIAN_WEEKDAYS[0]).toBe("ش");

    const inside = cells.filter((cell) => !cell.outside);
    expect(inside).toHaveLength(30);
    expect(format(inside[0].date, "yyyy/MM/dd")).toBe("1405/08/01");
    expect(format(inside[inside.length - 1].date, "yyyy/MM/dd")).toBe("1405/08/30");
  });

  it("هفته‌ی بعدی/قبلی ماه را جابه‌جا می‌کند", () => {
    const cursor = new Date("2026-11-11T10:00:00");
    expect(format(shiftMonth(cursor, 1), "yyyy/MM")).toBe("1405/09");
    expect(format(shiftMonth(cursor, -1), "yyyy/MM")).toBe("1405/07");
  });

  it("نمایش تاریخ و ساعت، فارسی و با فرمت spec است", () => {
    const rendered = formatJalaliDateTime("2026-11-11T10:00:00.000Z");
    expect(rendered).toMatch(/^۱۴۰۵\/۰۸\/۲۰ - [۰-۹]{2}:[۰-۹]{2}$/);
  });

  it("dayToIso نیمه‌ی شب محلی را می‌دهد", () => {
    const iso = dayToIso(new Date("2026-11-11T18:30:00"));
    const parsed = new Date(iso);
    expect(parsed.getHours()).toBe(0);
    expect(isSameDay(parsed, new Date("2026-11-11T18:30:00"))).toBe(true);
  });
});

describe("فیلتر پیش‌فرض تاریخچه روی داده‌ی seed", () => {
  const monthRange = () => {
    const { from, to } = currentPersianMonth();
    return { from: new Date(dayToIso(from)), to: new Date(dayToIso(to)), pageSize: 500 };
  };

  it("همه‌ی تراکنش‌های seed داخل ماه جاری شمسی هستند", () => {
    const { db } = bootstrapDatabase(":memory:");
    seedSampleData(db);
    const all = listTransactions(db, { pageSize: 500 });
    const inMonth = listTransactions(db, monthRange());

    expect(all.total).toBeGreaterThan(0);
    expect(inMonth.total).toBe(all.total);
  });

  it("فیلتر نوع، فقط همان نوع را برمی‌گرداند و با بازه‌ی ماه جمع می‌شود", () => {
    const { db } = bootstrapDatabase(":memory:");
    seedSampleData(db);
    const range = monthRange();
    const spends = listTransactions(db, { ...range, type: "spend" });
    const grants = listTransactions(db, { ...range, type: "grant" });

    expect(spends.items.every((t) => t.type === "spend")).toBe(true);
    expect(grants.items.every((t) => t.type === "grant")).toBe(true);
    expect(spends.total + grants.total).toBe(listTransactions(db, range).total);
  });
});
