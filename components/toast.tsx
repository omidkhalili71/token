"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertIcon, CheckIcon, CloseIcon } from "@/components/icons";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** Toast های ساده و self-dismiss برای تأیید ثبت تراکنش و خطاها. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, kind, message }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ring-1 ${
              t.kind === "success" ? "bg-success-soft text-success ring-success/20" : "bg-danger-soft text-danger ring-danger/20"
            }`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70">
              {t.kind === "success" ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-full p-1 opacity-60 transition hover:opacity-100"
              aria-label="بستن پیام"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
