import { getDb } from "@/lib/db";
import { requireCapability } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { getStats } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return route(() => {
    const db = getDb();
    requireCapability(req, db, "transaction:read");
    return Response.json(getStats(db));
  });
}
