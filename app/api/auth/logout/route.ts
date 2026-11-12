import { getDb } from "@/lib/db";
import { bearerToken } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { resolveAccessToken, revokeSession } from "@/lib/server/sessions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return route(() => {
    const db = getDb();
    const token = bearerToken(req);
    const session = token ? resolveAccessToken(db, token) : null;
    if (session) revokeSession(db, session.sessionId);
    return Response.json({ ok: true });
  });
}
