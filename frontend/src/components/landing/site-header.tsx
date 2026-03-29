"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  dashboardHref,
  normalizeDashboardTab,
  type DashboardTabId,
} from "@/lib/dashboard/dashboard-tab";
import { LANDING_CHECKIN_CTA } from "@/lib/landing-copy";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  className?: string;
};

const APP_NAV: { id: DashboardTabId; label: string; href: string }[] = [
  { id: "overview", label: "Dashboard", href: dashboardHref("overview") },
  { id: "chat", label: "Support Chat", href: dashboardHref("chat") },
  { id: "plan", label: "Plan", href: dashboardHref("plan") },
  { id: "burnout", label: "Burnout", href: dashboardHref("burnout") },
];

function SiteHeaderInner({ className }: SiteHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDashboard = pathname === "/dashboard";
  const activeTab = onDashboard
    ? normalizeDashboardTab(searchParams.get("tab"))
    : null;

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
            href="/"
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

        <nav
          className="-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          aria-label="Workspace"
          role="tablist"
        >
          {APP_NAV.map(({ id, label, href }) => {
            const isActive = onDashboard && activeTab === id;
            return (
              <Link
                key={id}
                href={href}
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

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-11 min-h-11 justify-center rounded-xl px-6 text-base font-semibold shadow-sm",
            )}
          >
            {LANDING_CHECKIN_CTA}
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteHeaderFallback({ className }: SiteHeaderProps) {
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
            href="/"
            className="font-heading text-base font-semibold tracking-tight text-foreground"
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
        <nav
          className="-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 pb-1 opacity-80 sm:flex-wrap sm:overflow-visible sm:pb-0"
          aria-label="Workspace"
          role="tablist"
        >
          {APP_NAV.map(({ id, label, href }) => (
            <Link
              key={id}
              href={href}
              scroll={false}
              role="tab"
              aria-selected="false"
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            href="/onboarding"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-11 min-h-11 justify-center rounded-xl px-6 text-base font-semibold shadow-sm",
            )}
          >
            {LANDING_CHECKIN_CTA}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <Suspense fallback={<SiteHeaderFallback className={className} />}>
      <SiteHeaderInner className={className} />
    </Suspense>
  );
}
