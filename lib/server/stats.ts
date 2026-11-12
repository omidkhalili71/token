import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db";
import { employees, transactions } from "../db/schema";
import type { StatsDto } from "../dto";

function sumTokensOfType(type: "grant" | "spend") {
  return sql<number>`coalesce(sum(case when ${transactions.type} = ${type} then ${transactions.tokens} else 0 end), 0)`;
}

export function getStats(db: Db): StatsDto {
  const sums = db
    .select({ granted: sumTokensOfType("grant"), spent: sumTokensOfType("spend") })
    .from(transactions)
    .get();

  const active = db
    .select({ n: count() })
    .from(employees)
    .where(and(isNull(employees.deletedAt), eq(employees.status, "active")))
    .get();

  const grantedTokens = Number(sums?.granted ?? 0);
  const spentTokens = Number(sums?.spent ?? 0);

  return {
    activeEmployees: Number(active?.n ?? 0),
    grantedTokens,
    spentTokens,
    totalTokens: grantedTokens - spentTokens,
  };
}
