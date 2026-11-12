"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, inputClass } from "@/components/field";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { changeCurrentPassword } from "@/lib/client/session";
import { changePasswordSchema } from "@/lib/validation";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changeCurrentPassword(values);
      toast("success", "رمز عبور با موفقیت تغییر کرد.");
      onClose();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "تغییر رمز عبور انجام نشد.");
    }
  });

  return (
    <Modal title="تغییر رمز عبور" onClose={onClose} size="sm">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Field label="رمز عبور فعلی" htmlFor="currentPassword" required error={errors.currentPassword?.message}>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className={inputClass}
            {...register("currentPassword")}
          />
        </Field>

        <Field
          label="رمز عبور جدید"
          htmlFor="newPassword"
          required
          error={errors.newPassword?.message}
          hint="باید بیشتر از ۶ کاراکتر باشد."
        >
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            {...register("newPassword")}
          />
        </Field>

        <Field
          label="تکرار رمز عبور جدید"
          htmlFor="confirmPassword"
          required
          error={errors.confirmPassword?.message}
        >
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            {...register("confirmPassword")}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 sm:min-w-44"
          >
            {isSubmitting ? "در حال ذخیره…" : "ذخیره‌ی رمز جدید"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-canvas px-6 py-3 text-sm font-bold text-ink transition hover:bg-line/60"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
}
