"use client";

import { useState } from "react";
import { EmployeesSection } from "@/components/employees-section";
import { StatCards } from "@/components/stat-cards";
import { useDebouncedValue } from "@/lib/client/use-debounced-value";

export function Dashboard() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  // مودال‌ها در مراحل ۵ و ۷ وصل می‌شوند.
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
          onSpend: notWiredYet,
          onGrant: notWiredYet,
        }}
      />
      <span className="sr-only" aria-live="polite">
        {debouncedSearch ? `نتیجه‌ها برای «${debouncedSearch}»` : ""}
      </span>
    </div>
  );
}
