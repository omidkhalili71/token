import { Dashboard } from "@/components/dashboard";
import { DashboardHeader } from "@/components/dashboard-header";
import { Providers } from "@/components/providers";

export default function Home() {
  return (
    <>
      <DashboardHeader />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
        <Providers>
          <Dashboard />
        </Providers>
      </main>
    </>
  );
}
