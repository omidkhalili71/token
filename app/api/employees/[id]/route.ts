import { getDb } from "@/lib/db";
import { employeeUpdateSchema } from "@/lib/validation";
import { deleteEmployee, updateEmployee } from "@/lib/server/employees";
import { route } from "@/lib/server/errors";
import { parseId, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    const input = employeeUpdateSchema.parse(await readJson(req));
    return Response.json(updateEmployee(getDb(), parseId(id), input));
  });
}

export async function DELETE(_req: Request, { params }: Context) {
  return route(async () => {
    const { id } = await params;
    deleteEmployee(getDb(), parseId(id));
    return Response.json({ ok: true });
  });
}
