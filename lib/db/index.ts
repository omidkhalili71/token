import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export const DATA_DIR = path.join(process.cwd(), "data");
export const DB_FILE = process.env.DATABASE_FILE ?? path.join(DATA_DIR, "app.db");

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

export function openDatabase(file: string | ":memory:" = DB_FILE): Database.Database {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

export function createDb(file: string | ":memory:" = DB_FILE): Db {
  return drizzle(openDatabase(file), { schema });
}

const globalCache = globalThis as unknown as { __tokenDashboardDb?: Db };

export function getDb(): Db {
  if (!globalCache.__tokenDashboardDb) {
    globalCache.__tokenDashboardDb = createDb();
  }
  return globalCache.__tokenDashboardDb;
}

export function closeDb(): void {
  const db = globalCache.__tokenDashboardDb;
  if (!db) return;
  db.$client.close();
  delete globalCache.__tokenDashboardDb;
}
