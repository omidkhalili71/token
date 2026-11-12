import { getDb } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validation";
import { changePassword, requireSession } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return route(async () => {
    const db = getDb();
    const input = changePasswordSchema.parse(await readJson(req));
    changePassword(db, requireSession(req, db), input);
    return Response.json({ ok: true });
  });
}
