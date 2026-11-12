"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Avatar } from "@/components/avatar";
import { Field, inputClass } from "@/components/field";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { useEmployeeMutation, type EmployeePayload } from "@/lib/client/queries";
import { TOKEN_VALUE_TOMAN } from "@/lib/config";
import { formatNumber, formatToman, toLatinDigits } from "@/lib/format";
import { employeeCreateSchema } from "@/lib/validation";
import type { EmployeeDto, EmployeeStatus } from "@/lib/dto";

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

type EmployeeForm = z.input<typeof employeeCreateSchema>;

export function EmployeeModal({
  employee,
  onClose,
}: {
  employee?: EmployeeDto;
  onClose: () => void;
}) {
  const isCreate = employee === undefined;
  const toast = useToast();
  const mutation = useEmployeeMutation(isCreate ? "create" : "update", employee?.id);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: {
      fullName: employee?.fullName ?? "",
      personnelCode: employee?.personnelCode ?? "",
      status: employee?.status ?? "active",
      avatarUrl: employee?.avatarUrl ?? "",
    },
  });

  const [previewName, previewAvatar] = watch(["fullName", "avatarUrl"]);

  const onSubmit = handleSubmit((values) => {
    const payload: EmployeePayload = isCreate
      ? values
      : {
          fullName: values.fullName,
          personnelCode: values.personnelCode,
          status: values.status,
          avatarUrl: values.avatarUrl,
        };

    mutation.mutate(payload, {
      onSuccess: (saved) => {
        toast(
          "success",
          isCreate
            ? `${saved.fullName} اضافه شد. موجودی: ${formatNumber(saved.balance)} توکن`
            : `اطلاعات ${saved.fullName} به‌روزرسانی شد.`,
        );
        onClose();
      },
      onError: (error) => toast("error", error.message),
    });
  });

  const pending = mutation.isPending;

  return (
    <Modal title={isCreate ? "افزودن همکار" : "ویرایش همکار"} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex items-center gap-3 rounded-2xl bg-canvas/70 p-3 ring-1 ring-line">
          <Avatar name={previewName || "همکار"} src={previewAvatar} size="lg" />
          <p className="text-xs text-muted">
            اگر آدرس تصویر وارد نکنید، حروف اول نام به‌جای آواتار نمایش داده می‌شود.
          </p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی" htmlFor="fullName" required error={errors.fullName?.message}>
            <input
              id="fullName"
              autoComplete="off"
              aria-invalid={Boolean(errors.fullName)}
              placeholder="مثلاً علی رضایی"
              className={inputClass}
              {...register("fullName")}
            />
          </Field>

          <Field label="کد پرسنلی" htmlFor="personnelCode" required error={errors.personnelCode?.message}>
            <input
              id="personnelCode"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(errors.personnelCode)}
              placeholder="مثلاً ۱۰۰۶"
              className={inputClass}
              {...register("personnelCode")}
            />
          </Field>

          <Field label="وضعیت" htmlFor="status" required>
            <select id="status" className={inputClass} {...register("status")}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {isCreate ? (
            <Field
              label="موجودی اولیه (اختیاری)"
              htmlFor="initialTokens"
              error={errors.initialTokens?.message}
              hint={`هر توکن ${formatToman(TOKEN_VALUE_TOMAN)}؛ اگر وارد کنید یک تراکنش افزایش با توضیح «موجودی اولیه» ثبت می‌شود.`}
            >
              <input
                id="initialTokens"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={Boolean(errors.initialTokens)}
                placeholder="۰"
                className={inputClass}
                {...register("initialTokens", {
                  setValueAs: (value) => {
                    const digits = toLatinDigits(String(value ?? "").trim());
                    return digits === "" ? undefined : Number(digits);
                  },
                })}
              />
            </Field>
          ) : null}

          <div className="sm:col-span-2">
            <Field label="آدرس تصویر آواتار (اختیاری)" htmlFor="avatarUrl" error={errors.avatarUrl?.message}>
              <input
                id="avatarUrl"
                type="url"
                autoComplete="off"
                dir="ltr"
                aria-invalid={Boolean(errors.avatarUrl)}
                placeholder="https://…"
                className={`${inputClass} text-start`}
                {...register("avatarUrl")}
              />
            </Field>
          </div>
        </div>

        {mutation.error ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger">
            {mutation.error.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 sm:min-w-44"
          >
            {pending ? "در حال ثبت…" : isCreate ? "افزودن همکار" : "ذخیره‌ی تغییرات"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl bg-canvas px-5 py-3 text-sm font-bold text-muted transition hover:text-ink disabled:opacity-50"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
}
