import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import { DashboardNav } from "@/components/shell/dashboard-nav";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  navVariant?: "full" | "minimal";
  activeTab?: DashboardTabId;
  onRetake?: () => void;
  /** When false, nav shows “Add a check-in”; when true, recheck prompt + “Check in again”. */
  hasSavedCheckin?: boolean;
  className?: string;
  /**
   * When true, the shell is exactly one viewport tall and does not grow with
   * content. The area below the nav is a bounded flex column (`flex-1 min-h-0`)
   * for workspaces that own their own scroll (e.g. Support Chat).
   */
  viewportFill?: boolean;
};

export function AppShell({
  children,
  navVariant = "full",
  activeTab = "overview",
  onRetake,
  hasSavedCheckin = false,
  className,
  viewportFill = false,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        viewportFill ? "h-dvh max-h-dvh overflow-hidden" : "min-h-screen",
        className,
      )}
    >
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
        hasSavedCheckin={hasSavedCheckin}
        className={viewportFill ? "shrink-0" : undefined}
      />
      {viewportFill ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
