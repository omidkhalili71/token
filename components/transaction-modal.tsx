"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Avatar } from "@/components/avatar";
import { Field, inputClass } from "@/components/field";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { useTransactionMutation } from "@/lib/client/queries";
import { TOKEN_VALUE_RIAL } from "@/lib/config";
import { formatNumber, formatRial } from "@/lib/format";
import { transactionCreateSchema, type TransactionCreateInput } from "@/lib/validation";
import type { EmployeeDto, TransactionType } from "@/lib/dto";

export function TransactionModal({
  employee,
  mode,
  onClose,
}: {
  employee: EmployeeDto;
  mode: TransactionType;
  onClose: () => void;
}) {
  const isSpend = mode === "spend";
  const maxTokens = isSpend ? employee.balance : 100000;
  const toast = useToast();
  const mutation = useTransactionMutation();
  /** تا کاربر مبلغ را دست نزده، مبلغ خودکار = تعداد × نرخ محاسبه می‌شود. */
  const [amountEdited, setAmountEdited] = useState(false);

  // سقف موجودی فقط سمت کلاینت معلوم است؛ سرور همان چک را دوباره انجام می‌دهد.
  const schema = useMemo(
    () =>
      transactionCreateSchema.superRefine((value, ctx) => {
        if (!isSpend) return;
        if (Number.isFinite(value.tokens) && value.tokens > employee.balance) {
          ctx.addIssue({
            code: "custom",
            path: ["tokens"],
            message: `موجودی کافی نیست؛ حداکثر ${formatNumber(employee.balance)} توکن.`,
          });
        }
        if (value.amountRial === undefined) {
          ctx.addIssue({ code: "custom", path: ["amountRial"], message: "مبلغ را وارد کنید." });
        }
      }),
    [isSpend, employee.balance],
  );

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionCreateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: employee.id,
      type: mode,
      tokens: 1,
      amountRial: isSpend ? TOKEN_VALUE_RIAL : undefined,
      description: "",
    },
  });

  const tokens = watch("tokens");

  useEffect(() => {
    if (!isSpend || amountEdited || !Number.isFinite(tokens)) return;
    setValue("amountRial", Math.max(1, Math.trunc(tokens)) * TOKEN_VALUE_RIAL);
  }, [isSpend, amountEdited, tokens, setValue]);

  function step(delta: number) {
    // getValues به‌جای مقدار watch: دو کلیک پشت‌هم نباید از closure کهنه بخوانند.
    const current = Number(getValues("tokens"));
    const next = Math.min(maxTokens, Math.max(1, (Number.isFinite(current) ? current : 0) + delta));
    setValue("tokens", next, { shouldValidate: true, shouldDirty: true });
  }

  const amountField = register("amountRial", { valueAsNumber: true });
  const pending = mutation.isPending;

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (result) => {
        const tokens = formatNumber(values.tokens);
        const balance = formatNumber(result.balanceAfter);
        toast(
          "success",
          isSpend
            ? `${tokens} توکن از موجودی ${employee.fullName} خرج شد. موجودی جدید: ${balance} توکن`
            : `${tokens} توکن به ${employee.fullName} اضافه شد. موجودی جدید: ${balance} توکن`,
        );
        onClose();
      },
      onError: (error) => toast("error", error.message),
    });
  });

  return (
    <Modal title={isSpend ? "خرج کردن توکن" : "ثبت توکن"} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* در RTL آیتم اول راست‌ترین ستون می‌شود: کارت همکار راست، تعداد توکن چپ (مطابق طراحی) */}
          <div className="order-1">
            <div className="flex h-full items-center gap-3 rounded-2xl bg-canvas/70 p-3 ring-1 ring-line">
              <Avatar name={employee.fullName} src={employee.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-bold">{employee.fullName}</p>
                <p className="mt-0.5 text-xs text-muted">
                  موجودی فعلی: <span className="font-bold text-ink">{formatNumber(employee.balance)}</span> توکن
                </p>
              </div>
            </div>
          </div>

          <div className="order-2">
            <Field
              label={isSpend ? `تعداد توکن (حداکثر ${formatNumber(employee.balance)})` : "تعداد توکن"}
              htmlFor="tokens"
              required
              error={errors.tokens?.message}
            >
              <div className="flex items-stretch gap-2">
                {/* + اول می‌آید تا در RTL سمت راست قرار بگیرد (− چپ) */}
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="یک توکن بیشتر"
                  className="grid w-11 shrink-0 place-items-center rounded-xl bg-canvas text-ink transition hover:bg-primary-soft"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <input
                  id="tokens"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxTokens}
                  step={1}
                  aria-invalid={Boolean(errors.tokens)}
                  className={`${inputClass} flex-1 text-center text-base font-bold`}
                  {...register("tokens", { valueAsNumber: true })}
                />
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="یک توکن کمتر"
                  className="grid w-11 shrink-0 place-items-center rounded-xl bg-canvas text-ink transition hover:bg-primary-soft"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
              </div>
            </Field>
          </div>

          <div className="order-3">
            <Field
              label="توضیحات تراکنش"
              htmlFor="description"
              required
              error={errors.description?.message}
              hint="حداکثر ۲۰۰ کاراکتر"
            >
              <textarea
                id="description"
                rows={3}
                maxLength={200}
                aria-invalid={Boolean(errors.description)}
                placeholder="مثلاً خرید بستنی در کافه شرکت"
                className={`${inputClass} resize-none`}
                {...register("description")}
              />
            </Field>
          </div>

          <div className="order-4">
            {isSpend ? (
              <Field label="مبلغ (ریال)" htmlFor="amountRial" required error={errors.amountRial?.message}>
                <input
                  {...amountField}
                  id="amountRial"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  aria-invalid={Boolean(errors.amountRial)}
                  className={inputClass}
                  onChange={(event) => {
                    setAmountEdited(true);
                    amountField.onChange(event);
                  }}
                />
              </Field>
            ) : (
              <Field label="مبلغ (ریال)" htmlFor="amount-preview">
                <output
                  id="amount-preview"
                  className="block w-full rounded-xl bg-canvas/70 px-4 py-2.5 text-sm font-bold ring-1 ring-line"
                >
                  {formatRial((Number.isFinite(tokens) ? Math.max(1, Math.trunc(tokens)) : 1) * TOKEN_VALUE_RIAL)}
                </output>
                <p className="mt-1.5 text-xs text-muted">مبلغ به‌صورت خودکار محاسبه و ثبت می‌شود.</p>
              </Field>
            )}
          </div>
        </div>

        {mutation.error ? (
          <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-xs font-bold text-danger">
            {mutation.error.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {/* دکمه‌ی اصلی اول می‌آید تا در RTL راست‌ترین باشد؛ در موبایل هم بالای «انصراف» قرار می‌گیرد */}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 sm:min-w-44"
          >
            {pending ? "در حال ثبت…" : "ثبت تراکنش"}
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
