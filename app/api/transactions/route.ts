import { getDb } from "@/lib/db";
import { transactionCreateSchema, transactionsQuerySchema } from "@/lib/validation";
import { createTransaction, listTransactions } from "@/lib/server/transactions";
import { route } from "@/lib/server/errors";
import { parseQuery, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return route(() => {
    const { type, from, to, page } = parseQuery(req, transactionsQuerySchema);
    return Response.json(listTransactions(getDb(), { type, from, to, page }));
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const input = transactionCreateSchema.parse(await readJson(req));
    return Response.json(createTransaction(getDb(), input), { status: 201 });
  });
}
