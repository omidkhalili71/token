"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { EmployeeDto, StatsDto, TransactionDto, TransactionType, UserRole } from "@/lib/dto";

export type TransactionFilters = {
  type?: TransactionType | "";
  from?: string;
  to?: string;
  page?: number;
};

export const queryKeys = {
  stats: ["stats"] as const,
  employees: (q: string) => ["employees", q] as const,
  transactions: (filters: TransactionFilters) => ["transactions", filters] as const,
};

function toQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.get<StatsDto>("/api/stats"),
  });
}

export function useEmployees(search: string) {
  return useQuery({
    queryKey: queryKeys.employees(search),
    queryFn: () => api.get<{ items: EmployeeDto[] }>(`/api/employees?q=${encodeURIComponent(search)}`),
  });
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () =>
      api.get<{ items: TransactionDto[]; page: number; pageSize: number; total: number }>(
        `/api/transactions${toQueryString(filters)}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export type TransactionPayload = {
  employeeId: number;
  type: TransactionType;
  tokens: number;
  amountToman?: number;
  description: string;
};

export function useTransactionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => api.post<{ balanceAfter: number }>("/api/transactions", payload),
    onSuccess: () => client.invalidateQueries(),
  });
}

export type EmployeePayload = {
  fullName: string;
  personnelCode: string;
  status: "active" | "inactive";
  avatarUrl?: string | null;
  initialTokens?: number;
  mobile?: string;
  role?: UserRole;
};

export function useEmployeeMutation(mode: "create" | "update", id?: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeePayload) =>
      mode === "create" ? api.post<EmployeeDto>("/api/employees", payload) : api.patch<EmployeeDto>(`/api/employees/${id}`, payload),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useEmployeeDelete() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<{ ok: true }>(`/api/employees/${id}`),
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useRefreshAll() {
  const client = useQueryClient();
  return useCallback(() => client.invalidateQueries(), [client]);
}
