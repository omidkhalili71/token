import { AppError } from "./errors";

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("invalid_input", "بدنه‌ی درخواست قابل خواندن نیست.", 422);
  }
}

export function parseQuery<T>(req: Request, schema: { parse: (value: unknown) => T }): T {
  const params = new URL(req.url).searchParams;
  return schema.parse(Object.fromEntries(params));
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError("invalid_input", "شناسه‌ی همکار نامعتبر است.", 422);
  }
  return id;
}
