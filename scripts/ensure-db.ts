import { existsSync } from "node:fs";
import { DB_FILE } from "../lib/db";
import { bootstrapDatabase } from "../lib/db/bootstrap";

const isNewDatabase = !existsSync(DB_FILE);

const { sqlite } = bootstrapDatabase();
sqlite.close();

console.log(isNewDatabase ? "✓ دیتابیس ساخته و با داده‌ی نمونه پر شد" : "✓ مهاجرت‌های دیتابیس اعمال شد");
