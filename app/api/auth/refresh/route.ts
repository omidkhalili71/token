import { getDb } from "@/lib/db";
import { refreshSchema } from "@/lib/validation";
import { refreshSession } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return route(async () => {
    const { refreshToken } = refreshSchema.parse(await readJson(req));
    return Response.json(refreshSession(getDb(), refreshToken));
  });
}
