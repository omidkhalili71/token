import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personnelCode: text("personnel_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  avatarUrl: text("avatar_url"),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    type: text("type", { enum: ["spend", "grant"] }).notNull(),
    tokens: integer("tokens").notNull(),
    amountToman: integer("amount_toman").notNull(),
    description: text("description").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("transactions_employee_created_idx").on(table.employeeId, table.createdAt),
    index("transactions_created_at_idx").on(table.createdAt),
  ],
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  mobile: text("mobile").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  employeeId: integer("employee_id").unique().references(() => employees.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    accessTokenHash: text("access_token_hash").notNull().unique(),
    refreshTokenHash: text("refresh_token_hash").notNull().unique(),
    accessExpiresAt: integer("access_expires_at", { mode: "timestamp_ms" }).notNull(),
    refreshExpiresAt: integer("refresh_expires_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export type EmployeeRow = typeof employees.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
