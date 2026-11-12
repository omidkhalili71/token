import { getDb } from "@/lib/db";
import { route } from "@/lib/server/errors";
import { getStats } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export function GET() {
  return route(() => Response.json(getStats(getDb())));
}
