import { bootstrapDatabase } from "../lib/db/bootstrap";

const { db, sqlite, seeded } = bootstrapDatabase(process.argv[2]);
void db;
console.log(seeded ? "✓ داده‌ی نمونه ساخته شد" : "دیتابیس داده دارد — seed انجام نشد");
sqlite.close();
