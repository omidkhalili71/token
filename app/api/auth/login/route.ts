import { getDb } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { authenticate } from "@/lib/server/auth";
import { route } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return route(async () => {
    const input = loginSchema.parse(await readJson(req));
    return Response.json(authenticate(getDb(), input));
  });
}
