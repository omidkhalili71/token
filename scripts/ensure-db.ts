import { existsSync } from "node:fs";
import { DB_FILE } from "../lib/db";
import { bootstrapDatabase } from "../lib/db/bootstrap";

/**
 * معیار پذیرش spec: بعد از pnpm install بدون تنظیم دستی همه‌چیز بالا بیاید.
 * اگر فایل DB نبود، migration و seed خودکار اجرا می‌شود.
 */
if (!existsSync(DB_FILE)) {
  const { sqlite } = bootstrapDatabase();
  sqlite.close();
  console.log("✓ دیتابیس ساخته و با داده‌ی نمونه پر شد");
}
