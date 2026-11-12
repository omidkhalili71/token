import type { SessionDto, UserDto } from "@/lib/dto";

const ACCESS_KEY = "token-dashboard.access";
const REFRESH_KEY = "token-dashboard.refresh";
const USER_KEY = "token-dashboard.user";

export type AuthSnapshot = {
  status: "loading" | "anonymous" | "authenticated";
  user: UserDto | null;
};

const listeners = new Set<() => void>();

let snapshot: AuthSnapshot = { status: "loading", user: null };
let hydrated = false;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* localStorage در دسترس نیست */
  }
}

function publish(next: AuthSnapshot): void {
  snapshot = next;
  emit();
}

function hydrate(): AuthSnapshot {
  if (hydrated) return snapshot;
  hydrated = true;
  const accessToken = readStorage(ACCESS_KEY);
  const storedUser = readStorage(USER_KEY);
  const user = storedUser ? (JSON.parse(storedUser) as UserDto) : null;
  snapshot = accessToken && user ? { status: "authenticated", user } : { status: "anonymous", user: null };
  return snapshot;
}

export function getAuthSnapshot(): AuthSnapshot {
  if (typeof window === "undefined") return { status: "loading", user: null };
  return hydrate();
}

export function getServerAuthSnapshot(): AuthSnapshot {
  return { status: "loading", user: null };
}

export function accessToken(): string | null {
  return readStorage(ACCESS_KEY);
}

export function refreshToken(): string | null {
  return readStorage(REFRESH_KEY);
}

export function hasSession(): boolean {
  return Boolean(readStorage(ACCESS_KEY) && readStorage(REFRESH_KEY));
}

export function saveSession(session: SessionDto): void {
  hydrated = true;
  writeStorage(ACCESS_KEY, session.accessToken);
  writeStorage(REFRESH_KEY, session.refreshToken);
  writeStorage(USER_KEY, JSON.stringify(session.user));
  publish({ status: "authenticated", user: session.user });
}

export function saveTokens(accessTokenValue: string, refreshTokenValue: string): void {  hydrated = true;
  writeStorage(ACCESS_KEY, accessTokenValue);
  writeStorage(REFRESH_KEY, refreshTokenValue);
  emit();
}

export function setUser(user: UserDto): void {
  hydrated = true;
  writeStorage(USER_KEY, JSON.stringify(user));
  publish({ status: "authenticated", user });
}

export function clearSession(): void {
  hydrated = true;
  writeStorage(ACCESS_KEY, null);
  writeStorage(REFRESH_KEY, null);
  writeStorage(USER_KEY, null);
  publish({ status: "anonymous", user: null });
}
