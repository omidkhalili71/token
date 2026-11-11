import { DashboardHeader } from "@/components/dashboard-header";
import { Providers } from "@/components/providers";

export default function Home() {
  return (
    <>
      <DashboardHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
        <Providers>
          {/* بخش‌های داشبورد در مراحل بعدی ساخته می‌شوند. */}
          <div className="rounded-card bg-card p-8 text-center text-sm text-muted shadow-sm ring-1 ring-line">
            داشبورد در حال ساخت است…
          </div>
        </Providers>
      </main>
    </>
  );
}
