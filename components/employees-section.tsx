"use client";

import { ActionMenu } from "@/components/action-menu";
import { Avatar } from "@/components/avatar";
import { BoltIcon, CoinIcon, CoinPlusIcon, MoreIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Badge, SectionCard, StateMessage } from "@/components/ui";
import { useEmployees } from "@/lib/client/queries";
import { useCan } from "@/lib/client/use-auth";
import { formatNumber, toPersianDigits } from "@/lib/format";
import type { EmployeeDto } from "@/lib/dto";

export type EmployeeActions = {
  onAdd: () => void;
  onEdit: (employee: EmployeeDto) => void;
  onDelete: (employee: EmployeeDto) => void;
  onSpend: (employee: EmployeeDto) => void;
  onGrant: (employee: EmployeeDto) => void;
};

type RowPermissions = {
  canWrite: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const HEADERS = ["نام و نام خانوادگی", "کد پرسنلی", "تعداد توکن", "وضعیت", "عملیات"];

const NO_CREATE_TITLE = "افزودن همکار فقط برای نقش «مدیر سیستم» فعال است.";
const NO_WRITE_TITLE = "با نقش کنونی شما امکان ثبت یا خرج توکن وجود ندارد.";

export function EmployeesSection({
  search,
  onSearchChange,
  actions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  actions: EmployeeActions;
}) {
  const canCreate = useCan("employee:create");
  const permissions: RowPermissions = {
    canWrite: useCan("transaction:write"),
    canUpdate: useCan("employee:update"),
    canDelete: useCan("employee:delete"),
  };
  const { data, isPending, isError, refetch } = useEmployees(search);
  const items = data?.items ?? [];

  return (
    <SectionCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="me-auto text-lg font-extrabold">لیست همکاران</h2>

        <label className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
          <span className="sr-only">جستجوی همکار</span>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="جستجو بر اساس نام یا کد پرسنلی..."
            className="w-full rounded-xl bg-card py-2.5 pe-4 ps-11 text-sm outline-none ring-1 ring-line transition focus:ring-2 focus:ring-primary"
          />
        </label>

        <button
          type="button"
          onClick={actions.onAdd}
          disabled={!canCreate}
          title={canCreate ? undefined : NO_CREATE_TITLE}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-primary"
        >
          <PlusIcon className="h-4 w-4" />
          افزودن همکار
        </button>
      </div>

      <div className="thin-scroll mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-canvas/70 text-xs text-muted">
              {HEADERS.map((header) => (
                <th key={header} scope="col" className="px-3 py-3 text-start font-bold first:rounded-s-xl last:rounded-e-xl">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isPending ? <LoadingRows /> : null}

            {isError && !isPending ? (
              <tr>
                <td colSpan={HEADERS.length}>
                  <StateMessage
                    tone="error"
                    title="لیست همکاران بارگیری نشد."
                    description="اتصال به سرور برقرار نشد؛ یک بار دیگر تلاش کنید."
                    action={
                      <button type="button" onClick={() => refetch()} className="text-xs font-bold text-primary underline">
                        تلاش دوباره
                      </button>
                    }
                  />
                </td>
              </tr>
            ) : null}

            {!isPending && !isError && items.length === 0 ? (
              <tr>
                <td colSpan={HEADERS.length}>
                  <StateMessage
                    title={search ? "همکاری با این جستجو پیدا نشد." : "هنوز همکاری ثبت نشده است."}
                    description={
                      search
                        ? "نام یا کد پرسنلی را بررسی کنید؛ هر دو نوع رقم فارسی و انگلیسی پذیرفته می‌شود."
                        : "با دکمه‌ی «افزودن همکار» اولین همکار را ثبت کنید."
                    }
                  />
                </td>
              </tr>
            ) : null}

            {items.map((employee) => (
              <EmployeeRow key={employee.id} employee={employee} actions={actions} permissions={permissions} />
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function EmployeeRow({
  employee,
  actions,
  permissions,
}: {
  employee: EmployeeDto;
  actions: EmployeeActions;
  permissions: RowPermissions;
}) {
  const canSpend = permissions.canWrite && employee.status === "active" && employee.balance > 0;
  const spendTitle = permissions.canWrite
    ? canSpend
      ? undefined
      : "موجودی این همکار صفر است یا غیرفعال است."
    : NO_WRITE_TITLE;

  return (
    <tr className="border-t border-line transition hover:bg-canvas/50">
      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={employee.fullName} src={employee.avatarUrl} size="sm" />
          <span className="whitespace-nowrap font-bold">{employee.fullName}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-muted">{toPersianDigits(employee.personnelCode)}</td>
      <td className="px-3 py-3">
        <Badge variant="primary" icon={<CoinIcon className="h-3.5 w-3.5" />}>
          {formatNumber(employee.balance)}
        </Badge>
      </td>
      <td className="px-3 py-3">
        {employee.status === "active" ? (
          <Badge variant="success" dot="success">
            فعال
          </Badge>
        ) : (
          <Badge variant="neutral" dot="neutral">
            غیرفعال
          </Badge>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => actions.onGrant(employee)}
            disabled={!permissions.canWrite}
            aria-label={`ثبت توکن برای ${employee.fullName}`}
            title={permissions.canWrite ? undefined : NO_WRITE_TITLE}
            className="inline-flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
          >
            <CoinPlusIcon className="h-4 w-4" />
            ثبت توکن
          </button>

          <button
            type="button"
            onClick={() => actions.onSpend(employee)}
            disabled={!canSpend}
            aria-label={`خرج توکن برای ${employee.fullName}`}
            title={spendTitle}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-primary"
          >
            <BoltIcon className="h-4 w-4" />
            خرج توکن
          </button>

          <RowActionsMenu employee={employee} actions={actions} permissions={permissions} />
        </div>
      </td>
    </tr>
  );
}

function RowActionsMenu({
  employee,
  actions,
  permissions,
}: {
  employee: EmployeeDto;
  actions: EmployeeActions;
  permissions: RowPermissions;
}) {
  const entries = [
    permissions.canUpdate ? { label: "ویرایش", run: () => actions.onEdit(employee) } : null,
    permissions.canDelete ? { label: "حذف", danger: true, run: () => actions.onDelete(employee) } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return null;

  return (
    <ActionMenu
      label={`عملیات ${employee.fullName}`}
      icon={<MoreIcon className="h-4 w-4" />}
      triggerClassName="ms-auto grid h-9 w-9 place-items-center rounded-xl transition bg-canvas text-muted hover:bg-line/60 hover:text-ink"
      entries={entries}
    />
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} className="border-t border-line">
          <td className="px-3 py-4">
            <div className="flex items-center gap-3">
              <span className="h-9 w-9 animate-pulse rounded-full bg-canvas" />
              <span className="h-4 w-28 animate-pulse rounded-lg bg-canvas" />
            </div>
          </td>
          <td className="px-3 py-4">
            <span className="h-4 w-14 animate-pulse rounded-lg bg-canvas" />
          </td>
          <td className="px-3 py-4">
            <span className="h-6 w-16 animate-pulse rounded-full bg-canvas" />
          </td>
          <td className="px-3 py-4">
            <span className="h-6 w-16 animate-pulse rounded-full bg-canvas" />
          </td>
          <td className="px-3 py-4">
            <span className="h-8 w-56 animate-pulse rounded-xl bg-canvas" />
          </td>
        </tr>
      ))}
    </>
  );
}
