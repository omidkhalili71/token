import { getDb } from "@/lib/db";
import { route } from "@/lib/server/errors";
import { getStats } from "@/lib/server/stats";

/** داده‌ی زنده از فایل SQLite خوانده می‌شود، پس کش نمی‌شود. */
export const dynamic = "force-dynamic";

export function GET() {
  return route(() => Response.json(getStats(getDb())));
}
