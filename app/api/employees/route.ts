import { getDb } from "@/lib/db";
import { employeeCreateSchema, employeesQuerySchema } from "@/lib/validation";
import { createEmployee, listEmployees } from "@/lib/server/employees";
import { route } from "@/lib/server/errors";
import { parseQuery, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return route(() => {
    const { q } = parseQuery(req, employeesQuerySchema);
    return Response.json({ items: listEmployees(getDb(), q ?? "") });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const input = employeeCreateSchema.parse(await readJson(req));
    return Response.json(createEmployee(getDb(), input), { status: 201 });
  });
}
