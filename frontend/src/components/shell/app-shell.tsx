import { AppHeader } from "@/components/shell/app-header";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  navVariant?: "full" | "minimal";
  onRetake?: () => void;
  /** When false, nav shows “Add a check-in”; when true, “Check in again”. */
  hasSavedCheckin?: boolean;
  onResetDeviceData?: () => void;
  resetDeviceDataBusy?: boolean;
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
  onRetake,
  hasSavedCheckin = false,
  onResetDeviceData,
  resetDeviceDataBusy = false,
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
      <AppHeader
        variant="workspace"
        navVariant={navVariant}
        onRetake={onRetake}
        hasSavedCheckin={hasSavedCheckin}
        onResetDeviceData={onResetDeviceData}
        resetDeviceDataBusy={resetDeviceDataBusy}
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
