import type { SessionDto, UserDto } from "@/lib/dto";
import type { ChangePasswordInput, LoginInput } from "@/lib/validation";
import { api } from "./api";
import { clearSession, saveSession, setUser } from "./tokens";

export async function signIn(input: LoginInput): Promise<UserDto> {
  const session = await api.post<SessionDto>("/api/auth/login", input);
  saveSession(session);
  return session.user;
}

export async function signOut(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } catch {
    /* نشست از قبل باطل شده است */
  }
  clearSession();
}

export async function fetchCurrentUser(): Promise<UserDto> {
  const user = await api.get<UserDto>("/api/auth/me");
  setUser(user);
  return user;
}

export async function changeCurrentPassword(input: ChangePasswordInput): Promise<void> {
  await api.patch("/api/auth/password", input);
}
