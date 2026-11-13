import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type Database from "better-sqlite3";
import { DB_FILE, openDatabase, type Db } from "./index";
import * as schema from "./schema";
import { ensureDefaultAdmin } from "./seed";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function applyMigrations(sqlite: Database.Database): void {
  migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
}

export function bootstrapDatabase(file: string | ":memory:" = DB_FILE): {
  sqlite: Database.Database;
  db: Db;
} {
  const sqlite = openDatabase(file);
  applyMigrations(sqlite);
  const db = drizzle(sqlite, { schema }) as Db;
  ensureDefaultAdmin(db);
  return { sqlite, db };
}
