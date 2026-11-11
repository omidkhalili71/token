import path from "node:path";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type Database from "better-sqlite3";
import { DB_FILE, openDatabase, type Db } from "./index";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/** اعمال migration های SQL موجود در پوشه‌ی drizzle/ (بدون وابستگی به drizzle-kit در runtime). */
export function applyMigrations(sqlite: Database.Database): void {
  migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
}

/**
 * DB را آماده می‌کند: migration و در صورت نیاز seed.
 * برای تست با `:memory:` هم دقیقاً همان migration های واقعی اجرا می‌شود.
 */
export function bootstrapDatabase(file: string | ":memory:" = DB_FILE): {
  sqlite: Database.Database;
  db: Db;
  seeded: boolean;
} {
  const sqlite = openDatabase(file);
  applyMigrations(sqlite);
  const db = drizzle(sqlite, { schema }) as BetterSQLite3Database<typeof schema>;
  const seeded = seedDatabase(db);
  return { sqlite, db, seeded };
}
