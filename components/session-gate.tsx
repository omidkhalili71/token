"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/client/use-auth";
import { fetchCurrentUser } from "@/lib/client/session";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || validated) return;
    let active = true;
    fetchCurrentUser()
      .then(() => active && setValidated(true))
      .catch(() => active && setValidated(true));
    return () => {
      active = false;
    };
  }, [status, validated]);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !validated) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pt-8 sm:px-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
        <span className="sr-only">در حال بررسی نشست…</span>
      </div>
    );
  }

  return <>{children}</>;
}
