import { eq } from "drizzle-orm";
import { DEFAULT_PASSWORD } from "../config";
import type { Db } from "../db";
import { users } from "../db/schema";
import type { SessionDto, UserDto } from "../dto";
import type { ChangePasswordInput, LoginInput } from "../validation";
import { AppError } from "./errors";
import { hashPassword, verifyPassword, verifyPasswordOrPad } from "./passwords";
import {
  issueSession,
  resolveAccessToken,
  resolveRefreshToken,
  revokeOtherSessions,
  revokeSession,
  type AuthenticatedSession,
} from "./sessions";

export function bearerToken(req: Request): string | null {
  const [scheme, token] = (req.headers.get("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export function requireSession(req: Request, db: Db, now = new Date()): AuthenticatedSession {
  const token = bearerToken(req);
  const session = token ? resolveAccessToken(db, token, now) : null;
  if (!session) {
    throw new AppError("unauthorized", "برای این کار باید وارد حساب کاربری شوید.", 401);
  }
  return session;
}

export function authenticate(db: Db, input: LoginInput, now = new Date()): SessionDto {
  const row = db
    .select({ id: users.id, fullName: users.fullName, mobile: users.mobile, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.mobile, input.identifier))
    .get();

  const passwordMatches = verifyPasswordOrPad(input.password, row?.passwordHash ?? null);
  if (!row || !passwordMatches) {
    throw new AppError("invalid_credentials", "شماره موبایل یا رمز عبور اشتباه است.", 401);
  }

  const user: UserDto = { id: row.id, fullName: row.fullName, mobile: row.mobile };
  return { ...issueSession(db, user.id, now), user };
}

export function refreshSession(db: Db, refreshToken: string, now = new Date()): SessionDto {
  const current = resolveRefreshToken(db, refreshToken, now);
  if (!current) {
    throw new AppError("unauthorized", "نشست شما منقضی شده است؛ دوباره وارد شوید.", 401);
  }
  revokeSession(db, current.sessionId, now);
  return { ...issueSession(db, current.user.id, now), user: current.user };
}

export function logout(db: Db, session: AuthenticatedSession, now = new Date()): void {
  revokeSession(db, session.sessionId, now);
}

export function changePassword(
  db: Db,
  session: AuthenticatedSession,
  input: ChangePasswordInput,
  now = new Date(),
): void {
  const row = db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

  if (!row) {
    throw new AppError("unauthorized", "حساب کاربری شما پیدا نشد.", 401);
  }
  if (!verifyPassword(input.currentPassword, row.passwordHash)) {
    throw new AppError("invalid_credentials", "رمز عبور فعلی اشتباه است.", 403);
  }

  db.update(users)
    .set({ passwordHash: hashPassword(input.newPassword) })
    .where(eq(users.id, session.user.id))
    .run();

  revokeOtherSessions(db, session.user.id, session.sessionId, now);
}

export function createUserAccount(
  db: Pick<Db, "insert">,
  input: { fullName: string; mobile: string; employeeId?: number | null; password?: string; now?: Date },
): void {
  db.insert(users)
    .values({
      fullName: input.fullName,
      mobile: input.mobile,
      passwordHash: hashPassword(input.password ?? DEFAULT_PASSWORD),
      employeeId: input.employeeId ?? null,
      createdAt: input.now ?? new Date(),
    })
    .run();
}
