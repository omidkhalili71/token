/** خطای سمت کلاینت با پیام فارسی آماده‌ی نمایش. */
export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

type ErrorBody = { error?: { code?: string; message?: string } };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload: (T & ErrorBody) | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ClientApiError(
      payload?.error?.message ?? "خطایی رخ داد. دوباره تلاش کنید.",
      payload?.error?.code ?? "internal_error",
      response.status,
    );
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
