import type { UserRole } from "./dto";

export type Capability =
  | "employee:read"
  | "employee:create"
  | "employee:update"
  | "employee:delete"
  | "transaction:read"
  | "transaction:write";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مدیر سیستم",
  operator: "اپراتور",
  viewer: "بیننده",
};

export const ASSIGNABLE_ROLES: UserRole[] = ["admin", "operator", "viewer"];

const MATRIX: Record<UserRole, readonly Capability[]> = {
  admin: [
    "employee:read",
    "employee:create",
    "employee:update",
    "employee:delete",
    "transaction:read",
    "transaction:write",
  ],
  operator: ["employee:read", "transaction:read", "transaction:write"],
  viewer: ["employee:read", "transaction:read"],
};

export function can(role: UserRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[role].includes(capability);
}
