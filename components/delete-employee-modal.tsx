"use client";

import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { useEmployeeDelete } from "@/lib/client/queries";
import { formatNumber, toPersianDigits } from "@/lib/format";
import type { EmployeeDto } from "@/lib/dto";

/**
 * تأیید حذف (بخش ۴.۳). حذف از نوع soft delete است، پس به کاربر گفته می‌شود
 * که تراکنش‌های این فرد در تاریخچه می‌ماند و فقط از لیست بیرون می‌رود.
 */
export function DeleteEmployeeModal({
  employee,
  onClose,
}: {
  employee: EmployeeDto;
  onClose: () => void;
}) {
  const toast = useToast();
  const mutation = useEmployeeDelete();
  const pending = mutation.isPending;

  function confirm() {
    mutation.mutate(employee.id, {
      onSuccess: () => {
        toast("success", `${employee.fullName} از لیست حذف شد؛ تاریخچه‌ی تراکنش‌هایش باقی ماند.`);
        onClose();
      },
      onError: (error) => toast("error", error.message),
    });
  }

  return (
    <Modal title="حذف همکار" onClose={onClose} size="sm">
      <p className="text-sm leading-7">
        آیا از حذف <span className="font-bold">{employee.fullName}</span> (کد پرسنلی{" "}
        <span className="font-bold">{toPersianDigits(employee.personnelCode)}</span>) مطمئن هستید؟
      </p>
      <p className="mt-2 text-xs text-muted">
        این همکار از لیست بیرون می‌رود و دیگر نمی‌توان برای او توکن خرج کرد، ولی تراکنش‌های ثبت‌شده در تاریخچه
        باقی می‌مانند.
      </p>
      {employee.balance > 0 ? (
        <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-xs font-bold text-warn">
          {formatNumber(employee.balance)} توکن باقی‌مانده در حساب این همکار است.
        </p>
      ) : null}

      {mutation.error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger">
          {mutation.error.message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl bg-canvas px-5 py-3 text-sm font-bold text-muted transition hover:text-ink disabled:opacity-50"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="rounded-xl bg-danger px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-70 sm:min-w-44"
        >
          {pending ? "در حال حذف…" : "حذف همکار"}
        </button>
      </div>
    </Modal>
  );
}
