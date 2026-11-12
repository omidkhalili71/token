import { accessToken, clearSession, refreshToken, saveTokens } from "./tokens";

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

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken() }),
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as { accessToken: string; refreshToken: string };
      saveTokens(payload.accessToken, payload.refreshToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const token = accessToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  return fetch(path, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const sentToken = Boolean(accessToken());
  let response = await send(method, path, body);

  if (response.status === 401 && sentToken) {
    if (await refreshTokens()) response = await send(method, path, body);
    else clearSession();
  }

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
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
