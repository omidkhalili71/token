import { existsSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type Database from "better-sqlite3";
import { DB_FILE, openDatabase, type Db } from "./index";
import * as schema from "./schema";
import { ensureDefaultAdmin, seedDatabase } from "./seed";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function applyMigrations(sqlite: Database.Database): void {
  migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
}

export function bootstrapDatabase(file: string | ":memory:" = DB_FILE): {
  sqlite: Database.Database;
  db: Db;
  seeded: boolean;
} {
  const isNewDatabase = file === ":memory:" || !existsSync(file);
  const sqlite = openDatabase(file);
  applyMigrations(sqlite);
  const db = drizzle(sqlite, { schema }) as Db;
  let seeded = false;
  if (isNewDatabase) {
    seeded = seedDatabase(db);
  } else {
    ensureDefaultAdmin(db);
  }
  return { sqlite, db, seeded };
}
