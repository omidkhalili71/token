import { existsSync } from "node:fs";
import { DB_FILE } from "../lib/db";
import { bootstrapDatabase } from "../lib/db/bootstrap";

if (!existsSync(DB_FILE)) {
  const { sqlite } = bootstrapDatabase();
  sqlite.close();
  console.log("✓ دیتابیس ساخته و با داده‌ی نمونه پر شد");
}
