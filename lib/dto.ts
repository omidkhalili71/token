/** شکل داده‌هایی که بین API و کلاینت رد و بدل می‌شود. */

export type EmployeeStatus = "active" | "inactive";
export type TransactionType = "grant" | "spend";

export type EmployeeDto = {
  id: number;
  fullName: string;
  personnelCode: string;
  avatarUrl: string | null;
  status: EmployeeStatus;
  /** همیشه محاسبه‌شده: SUM(grant) − SUM(spend) */
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
  /** ISO میلادی؛ تبدیل شمسی سمت کلاینت */
  createdAt: string;
};

export type StatsDto = {
  activeEmployees: number;
  grantedTokens: number;
  spentTokens: number;
  totalTokens: number;
};

export type ApiError = { error: { code: string; message: string } };
