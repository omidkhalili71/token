import { getDb } from "@/lib/db";
import { transactionCreateSchema, transactionsQuerySchema } from "@/lib/validation";
import { requireCapability } from "@/lib/server/auth";
import { createTransaction, listTransactions } from "@/lib/server/transactions";
import { route } from "@/lib/server/errors";
import { parseQuery, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return route(() => {
    const db = getDb();
    requireCapability(req, db, "transaction:read");
    const { type, from, to, page } = parseQuery(req, transactionsQuerySchema);
    return Response.json(listTransactions(db, { type, from, to, page }));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const db = getDb();
    requireCapability(req, db, "transaction:write");
    const input = transactionCreateSchema.parse(await readJson(req));
    return Response.json(createTransaction(db, input), { status: 201 });
  });
}
