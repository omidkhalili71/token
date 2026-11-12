import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../config";
import type { Db } from "../db";
import { sessions, users } from "../db/schema";
import type { UserDto } from "../dto";

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
};

export type AuthenticatedSession = {
  user: UserDto;
  sessionId: number;
};

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function issueSession(db: Db, userId: number, now = new Date()): IssuedTokens {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);

  db.insert(sessions)
    .values({
      userId,
      accessTokenHash: tokenHash(accessToken),
      refreshTokenHash: tokenHash(refreshToken),
      accessExpiresAt,
      refreshExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      createdAt: now,
    })
    .run();

  return { accessToken, refreshToken, accessExpiresAt: accessExpiresAt.toISOString() };
}

export function resolveAccessToken(db: Db, token: string, now = new Date()): AuthenticatedSession | null {
  const row = db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      fullName: users.fullName,
      mobile: users.mobile,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.accessTokenHash, tokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.accessExpiresAt, now),
      ),
    )
    .get();

  return row
    ? { sessionId: row.sessionId, user: { id: row.userId, fullName: row.fullName, mobile: row.mobile, role: row.role } }
    : null;
}

export function resolveRefreshToken(db: Db, token: string, now = new Date()): AuthenticatedSession | null {
  const row = db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      fullName: users.fullName,
      mobile: users.mobile,
      role: users.role,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.refreshTokenHash, tokenHash(token)),
        isNull(sessions.revokedAt),
        gt(sessions.refreshExpiresAt, now),
      ),
    )
    .get();

  return row
    ? { sessionId: row.sessionId, user: { id: row.userId, fullName: row.fullName, mobile: row.mobile, role: row.role } }
    : null;
}

export function revokeSession(db: Db, sessionId: number, now = new Date()): void {
  db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, sessionId)).run();
}

export function revokeOtherSessions(db: Db, userId: number, keepSessionId: number, now = new Date()): void {
  db.update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), ne(sessions.id, keepSessionId)))
    .run();
}
