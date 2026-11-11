import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const DATA_DIR = path.join(process.cwd(), "data");
/** تست‌های API با `DATABASE_FILE` به یک فایل موقت وصل می‌شوند. */
export const DB_FILE = process.env.DATABASE_FILE ?? path.join(DATA_DIR, "app.db");

/**
 * `drizzle()` علاوه بر خود کلاس، هندل خام SQLite را زیر `$client` می‌دهد
 * (برای بستن connection در تست‌ها لازم است)، پس در تایپ اینجا هم اعلام می‌شود.
 */
export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

/** یک connection تازه به فایل SQLite (یا DB در حافظه برای تست). */
export function openDatabase(file: string | ":memory:" = DB_FILE): Database.Database {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  // WAL خواندن/نوشتن همزمان را بدون بلاک کردن ممکن می‌کند؛ foreign keys برای یکپارچگی FK.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export function createDb(file: string | ":memory:" = DB_FILE): Db {
  return drizzle(openDatabase(file), { schema });
}

/**
 * در dev، هر request می‌تواند module را دوباره load کند؛ کش روی globalThis
 * از باز شدن چند connection به همان فایل جلوگیری می‌کند.
 */
const globalCache = globalThis as unknown as { __tokenDashboardDb?: Db };

export function getDb(): Db {
  if (!globalCache.__tokenDashboardDb) {
    globalCache.__tokenDashboardDb = createDb();
  }
  return globalCache.__tokenDashboardDb;
}

/** بستن connection کش‌شده (تست‌ها برای آزاد کردن فایل DB موقت به آن نیاز دارند). */
export function closeDb(): void {
  const db = globalCache.__tokenDashboardDb;
  if (!db) return;
  db.$client.close();
  delete globalCache.__tokenDashboardDb;
}
