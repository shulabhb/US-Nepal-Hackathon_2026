import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Support dashboard",
  description:
    "A calm space to continue from your latest check-in—with support-focused summaries and a chat-style shell.",
};

function DashboardFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main id="dashboard-main" className="min-h-screen">
      <Suspense fallback={<DashboardFallback />}>
        <DashboardClient />
      </Suspense>
    </main>
  );
}
