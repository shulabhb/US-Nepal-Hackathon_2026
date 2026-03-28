"use client";

import Link from "next/link";

import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import { dashboardHref } from "@/lib/dashboard/dashboard-tab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRIMARY_TABS: { id: DashboardTabId; label: string }[] = [
  { id: "overview", label: "Dashboard" },
  { id: "chat", label: "Support Chat" },
  { id: "plan", label: "Plan" },
  { id: "checkins", label: "Check-ins" },
  { id: "insights", label: "Insights" },
];

type Props = {
  activeTab?: DashboardTabId;
  variant?: "full" | "minimal";
  onRetake?: () => void;
  className?: string;
};

export function DashboardNav({
  activeTab = "overview",
  variant = "full",
  onRetake,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center justify-between gap-3 sm:justify-start">
          <Link
            href={dashboardHref("overview")}
            className="font-heading text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            Burnout Radar
          </Link>
          <span className="rounded-full border border-border/80 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
            Private
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
            Anonymous · this device
          </span>
        </div>

        {variant === "full" ? (
          <nav
            className="-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
            aria-label="Workspace"
            role="tablist"
          >
            {PRIMARY_TABS.map(({ id, label }) => {
              const isActive = activeTab === id;
              return (
                <Link
                  key={id}
                  href={dashboardHref(id)}
                  scroll={false}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-muted/90 text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <p className="text-xs text-muted-foreground">
            Complete a check-in to unlock the workspace.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {variant === "full" && onRetake ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg text-xs text-muted-foreground"
              onClick={onRetake}
            >
              Retake check-in
            </Button>
          ) : null}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
          >
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
