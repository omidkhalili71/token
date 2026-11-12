import { Dashboard } from "@/components/dashboard";
import { DashboardHeader } from "@/components/dashboard-header";
import { Providers } from "@/components/providers";
import { SessionGate } from "@/components/session-gate";

export default function Home() {
  return (
    <Providers>
      <SessionGate>
        <DashboardHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
          <Dashboard />
        </main>
      </SessionGate>
    </Providers>
  );
}
