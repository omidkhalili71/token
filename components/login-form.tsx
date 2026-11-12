"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Field, inputClass } from "@/components/field";
import { useToast } from "@/components/toast";
import { signIn } from "@/lib/client/session";
import { loginSchema } from "@/lib/validation";

type LoginForm = { identifier: string; password: string };

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const user = await signIn(values);
      toast("success", `${user.fullName}، وارد شدید.`);
      router.replace("/");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "ورود انجام نشد.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {serverError ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger ring-1 ring-danger/20"
        >
          {serverError}
        </p>
      ) : null}

      <Field label="شماره موبایل" htmlFor="identifier" required error={errors.identifier?.message}>
        <input
          id="identifier"
          autoComplete="username"
          inputMode="tel"
          dir="ltr"
          className={inputClass}
          {...register("identifier")}
        />
      </Field>

      <Field label="رمز عبور" htmlFor="password" required error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          className={inputClass}
          {...register("password")}
        />
      </Field>

      <button
        type="submit"
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover"
      >
        ورود
      </button>
    </form>
  );
}
