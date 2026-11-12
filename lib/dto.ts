export type EmployeeStatus = "active" | "inactive";
export type TransactionType = "grant" | "spend";
export type UserRole = "admin" | "operator" | "viewer";

export type EmployeeDto = {
  id: number;
  fullName: string;
  personnelCode: string;
  mobile: string | null;
  role: UserRole | null;
  avatarUrl: string | null;
  status: EmployeeStatus;
  balance: number;
};

export type TransactionDto = {
  id: number;
  employeeId: number;
  employeeName: string;
  type: TransactionType;
  tokens: number;
  amountToman: number;
  description: string;
  createdAt: string;
};

export type StatsDto = {
  activeEmployees: number;
  grantedTokens: number;
  spentTokens: number;
  totalTokens: number;
};

export type ApiError = { error: { code: string; message: string } };

export type UserDto = {
  id: number;
  fullName: string;
  mobile: string;
  role: UserRole;
};

export type SessionDto = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  user: UserDto;
};
