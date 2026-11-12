"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionMenu } from "@/components/action-menu";
import { Avatar } from "@/components/avatar";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { ChevronDownIcon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { signOut } from "@/lib/client/session";
import { useAuth } from "@/lib/client/use-auth";

export function DashboardHeader() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const name = user?.fullName ?? "همکار";

  async function onSignOut() {
    await signOut();
    toast("success", "از حساب کاربری خارج شدید.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-4 px-4 pt-6 sm:px-6 sm:pt-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">مدیریت توکن‌های پرسنل</h1>
        <p className="mt-1.5 text-sm text-muted sm:text-[15px]">
          مدیریت آسان توکن‌ها، ثبت تراکنش‌ها و مشاهده تاریخچه
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 pt-1">
        <Avatar name={name} size="md" />

        <ActionMenu
          label="منوی کاربر"
          icon={<ChevronDownIcon className="h-5 w-5" />}
          triggerClassName="rounded-full p-1.5 text-muted transition hover:bg-white/70"
          panelClassName="w-48"
          entries={[
            { label: "تغییر رمز عبور", run: () => setPasswordOpen(true) },
            { label: "خروج", danger: true, run: () => void onSignOut() },
          ]}
        />

        {passwordOpen ? <ChangePasswordModal onClose={() => setPasswordOpen(false)} /> : null}
      </div>
    </header>
  );
}
