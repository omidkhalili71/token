import fs from "node:fs";
import { DB_FILE } from "../lib/db";
import { bootstrapDatabase } from "../lib/db/bootstrap";

/** حذف فایل DB و ساخت دوباره با داده‌ی نمونه. */
for (const suffix of ["", "-wal", "-shm", "-journal"]) {
  fs.rmSync(DB_FILE + suffix, { force: true });
}
const { sqlite } = bootstrapDatabase();
sqlite.close();
console.log("✓ دیتابیس بازنشانی شد");
