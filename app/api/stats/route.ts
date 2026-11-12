import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { getStats } from "@/lib/server/stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return route(() => {
    const db = getDb();
    requireSession(req, db);
    return Response.json(getStats(db));
  });
}
