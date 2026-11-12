export type EmployeeStatus = "active" | "inactive";
export type TransactionType = "grant" | "spend";

export type EmployeeDto = {
  id: number;
  fullName: string;
  personnelCode: string;
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
  amountRial: number;
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
