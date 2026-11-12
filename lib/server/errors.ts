import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ErrorCode =
  | "invalid_input"
  | "employee_not_found"
  | "duplicate_personnel_code"
  | "insufficient_balance"
  | "employee_inactive"
  | "employee_deleted"
  | "internal_error";

export function errorBody(code: ErrorCode, message: string) {
  return { error: { code, message } };
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(errorBody(error.code, error.message), { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first?.message ?? "ورودی نامعتبر است.";
    return Response.json(errorBody("invalid_input", message), { status: 422 });
  }
  console.error("[api] خطای غیرمنتظره:", error);
  return Response.json(errorBody("internal_error", "خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید."), { status: 500 });
}

export async function route(handler: () => Response | Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}
