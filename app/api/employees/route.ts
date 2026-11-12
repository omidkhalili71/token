import { getDb } from "@/lib/db";
import { employeeCreateSchema, employeesQuerySchema } from "@/lib/validation";
import { requireCapability } from "@/lib/server/auth";
import { createEmployee, listEmployees } from "@/lib/server/employees";
import { route } from "@/lib/server/errors";
import { parseQuery, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return route(() => {
    const db = getDb();
    requireCapability(req, db, "employee:read");
    const { q } = parseQuery(req, employeesQuerySchema);
    return Response.json({ items: listEmployees(db, q ?? "") });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const db = getDb();
    requireCapability(req, db, "employee:create");
    const input = employeeCreateSchema.parse(await readJson(req));
    return Response.json(createEmployee(db, input), { status: 201 });
  });
}
