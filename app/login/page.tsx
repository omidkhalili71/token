import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "ورود | مدیریت توکن پرسنل" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold">ورود به سامانه</h1>
          <p className="mt-1.5 text-sm text-muted">با شماره موبایل و رمز عبور خود وارد شوید.</p>
        </div>
        <div className="rounded-card bg-card p-5 shadow-sm ring-1 ring-line sm:p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
