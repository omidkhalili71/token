import { openDatabase } from "../lib/db";
import { applyMigrations } from "../lib/db/bootstrap";

const file = process.argv[2] ?? undefined;
const sqlite = openDatabase(file);
applyMigrations(sqlite);
console.log("✓ migration اعمال شد");
sqlite.close();
