import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import { DashboardNav } from "@/components/shell/dashboard-nav";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  navVariant?: "full" | "minimal";
  activeTab?: DashboardTabId;
  onRetake?: () => void;
  className?: string;
};

export function AppShell({
  children,
  navVariant = "full",
  activeTab = "overview",
  onRetake,
  className,
}: Props) {
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", className)}>
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to workspace
      </a>
      <DashboardNav
        variant={navVariant}
        activeTab={navVariant === "full" ? activeTab : undefined}
        onRetake={onRetake}
      />
      {children}
    </div>
  );
}
