"use client";

import { useState } from "react";
import { EmployeesSection } from "@/components/employees-section";
import { StatCards } from "@/components/stat-cards";
import { TransactionModal } from "@/components/transaction-modal";
import { useDebouncedValue } from "@/lib/client/use-debounced-value";
import type { EmployeeDto, TransactionType } from "@/lib/dto";

type TransactionTarget = { employee: EmployeeDto; mode: TransactionType };

export function Dashboard() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [transactionTarget, setTransactionTarget] = useState<TransactionTarget | null>(null);

  // مودال‌های افزودن/ویرایش/حذف در مرحله ۷ وصل می‌شوند.
  const notWiredYet = () => {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <StatCards />
      <EmployeesSection
        search={search}
        onSearchChange={setSearch}
        actions={{
          onAdd: notWiredYet,
          onEdit: notWiredYet,
          onDelete: notWiredYet,
          onSpend: (employee) => setTransactionTarget({ employee, mode: "spend" }),
          onGrant: (employee) => setTransactionTarget({ employee, mode: "grant" }),
        }}
      />
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
    </div>
  );
}
