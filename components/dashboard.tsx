"use client";

import { useState } from "react";
import { DeleteEmployeeModal } from "@/components/delete-employee-modal";
import { EmployeeModal } from "@/components/employee-modal";
import { EmployeesSection } from "@/components/employees-section";
import { StatCards } from "@/components/stat-cards";
import { TransactionModal } from "@/components/transaction-modal";
import { TransactionsSection } from "@/components/transactions-section";
import { useDebouncedValue } from "@/lib/client/use-debounced-value";
import type { EmployeeDto, TransactionType } from "@/lib/dto";

type TransactionTarget = { employee: EmployeeDto; mode: TransactionType };
type EmployeeTarget = { mode: "create" } | { mode: "edit"; employee: EmployeeDto };

export function Dashboard() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [transactionTarget, setTransactionTarget] = useState<TransactionTarget | null>(null);
  const [employeeTarget, setEmployeeTarget] = useState<EmployeeTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDto | null>(null);

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards />
      <EmployeesSection
        search={search}
        onSearchChange={setSearch}
        actions={{
          onAdd: () => setEmployeeTarget({ mode: "create" }),
          onEdit: (employee) => setEmployeeTarget({ mode: "edit", employee }),
          onDelete: (employee) => setDeleteTarget(employee),
          onSpend: (employee) => setTransactionTarget({ employee, mode: "spend" }),
          onGrant: (employee) => setTransactionTarget({ employee, mode: "grant" }),
        }}
      />
      <TransactionsSection />
      <p className="sr-only" aria-live="polite">
        {debouncedSearch ? `جستجو: ${debouncedSearch}` : ""}
      </p>

      {transactionTarget ? (
        <TransactionModal
          key={`${transactionTarget.employee.id}-${transactionTarget.mode}`}
          employee={transactionTarget.employee}
          mode={transactionTarget.mode}
          onClose={() => setTransactionTarget(null)}
        />
      ) : null}

      {employeeTarget ? (
        <EmployeeModal
          key={employeeTarget.mode === "edit" ? `edit-${employeeTarget.employee.id}` : "create"}
          employee={employeeTarget.mode === "edit" ? employeeTarget.employee : undefined}
          onClose={() => setEmployeeTarget(null)}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteEmployeeModal key={deleteTarget.id} employee={deleteTarget} onClose={() => setDeleteTarget(null)} />
      ) : null}
    </div>
  );
}
