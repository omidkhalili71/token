import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return route(() => Response.json(requireSession(req, getDb()).user));
}
