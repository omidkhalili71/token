"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { BoltIcon, CoinIcon, CoinPlusIcon, MoreIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Badge, SectionCard, StateMessage } from "@/components/ui";
import { useEmployees } from "@/lib/client/queries";
import { formatNumber, toPersianDigits } from "@/lib/format";
import type { EmployeeDto } from "@/lib/dto";

export type EmployeeActions = {
  onAdd: () => void;
  onEdit: (employee: EmployeeDto) => void;
  onDelete: (employee: EmployeeDto) => void;
  onSpend: (employee: EmployeeDto) => void;
  onGrant: (employee: EmployeeDto) => void;
};

const HEADERS = ["نام و نام خانوادگی", "کد پرسنلی", "تعداد توکن", "وضعیت", "عملیات"];

export function EmployeesSection({
  search,
  onSearchChange,
  actions,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  actions: EmployeeActions;
}) {
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
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
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
              <EmployeeRow key={employee.id} employee={employee} actions={actions} />
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function EmployeeRow({ employee, actions }: { employee: EmployeeDto; actions: EmployeeActions }) {
  const canSpend = employee.status === "active" && employee.balance > 0;

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
            aria-label={`ثبت توکن برای ${employee.fullName}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-danger-soft px-3 py-2 text-xs font-bold text-danger transition hover:brightness-95"
          >
            <CoinPlusIcon className="h-4 w-4" />
            ثبت توکن
          </button>

          <button
            type="button"
            onClick={() => actions.onSpend(employee)}
            disabled={!canSpend}
            aria-label={`خرج توکن برای ${employee.fullName}`}
            title={canSpend ? undefined : "موجودی این همکار صفر است یا غیرفعال است."}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-primary"
          >
            <BoltIcon className="h-4 w-4" />
            خرج توکن
          </button>

          <RowActionsMenu employee={employee} actions={actions} />
        </div>
      </td>
    </tr>
  );
}

const MENU_GAP = 6;
const EDGE_MARGIN = 8;

function RowActionsMenu({ employee, actions }: { employee: EmployeeDto; actions: EmployeeActions }) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const entries = [
    { label: "ویرایش", danger: false, run: () => actions.onEdit(employee) },
    { label: "حذف", danger: true, run: () => actions.onDelete(employee) },
  ];

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const panelWidth = panel.offsetWidth;
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const top =
      spaceBelow >= panelHeight || spaceBelow >= rect.top - MENU_GAP
        ? rect.bottom + MENU_GAP
        : rect.top - panelHeight - MENU_GAP;
    const left = Math.min(
      Math.max(rect.left, EDGE_MARGIN),
      Math.max(EDGE_MARGIN, window.innerWidth - panelWidth - EDGE_MARGIN),
    );
    setPosition({ top, left });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position) return;
    itemRefs.current[0]?.focus();
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === "ArrowDown") next = current < 0 ? 0 : (current + 1) % items.length;
    else if (event.key === "ArrowUp") next = current < 0 ? items.length - 1 : (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) setOpen(false);
        }}
        aria-label={`عملیات ${employee.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={`grid h-9 w-9 place-items-center rounded-xl transition ${
          open ? "bg-line/60 text-ink" : "bg-canvas text-muted hover:bg-line/60 hover:text-ink"
        }`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={`عملیات ${employee.fullName}`}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          style={position ? { top: position.top, left: position.left } : { visibility: "hidden" }}
          className="fixed z-40 w-40 rounded-xl bg-card p-1 shadow-lg ring-1 ring-line"
        >
          {entries.map((entry, index) => (
            <button
              key={entry.label}
              type="button"
              role="menuitem"
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              onClick={() => {
                setOpen(false);
                entry.run();
              }}
              className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-bold transition hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-primary ${
                entry.danger ? "text-danger" : "text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
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
