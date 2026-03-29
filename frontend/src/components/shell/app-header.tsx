"use client";

import { Eraser } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { CHECKIN_AGAIN_BUTTON, CHECKIN_INVITE } from "@/lib/app-copy";
import {
  dashboardHref,
  normalizeDashboardTab,
  type DashboardTabId,
} from "@/lib/dashboard/dashboard-tab";
import { LANDING_CHECKIN_CTA } from "@/lib/landing-copy";
import { cn } from "@/lib/utils";

const APP_NAV: { id: DashboardTabId; label: string; href: string }[] = [
  { id: "overview", label: "Dashboard", href: dashboardHref("overview") },
  { id: "chat", label: "Support Chat", href: dashboardHref("chat") },
  { id: "plan", label: "Plan", href: dashboardHref("plan") },
  { id: "burnout", label: "Burnout", href: dashboardHref("burnout") },
];

export type AppHeaderProps = {
  /** Marketing = landing CTA; workspace = check-in + Back home. */
  variant: "marketing" | "workspace";
  /** Only for `workspace`: full tab strip vs minimal message. */
  navVariant?: "full" | "minimal";
  onRetake?: () => void;
  hasSavedCheckin?: boolean;
  /** Clears server + local device data; shown only when `hasSavedCheckin` and `navVariant` is full. */
  onResetDeviceData?: () => void;
  resetDeviceDataBusy?: boolean;
  className?: string;
};

function BrandRow() {
  return (
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
  );
}

function TabNav({
  activeResolver,
}: {
  activeResolver: (id: DashboardTabId) => boolean;
}) {
  return (
    <nav
      className="-mx-1 flex items-center gap-0.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      aria-label="Workspace"
      role="tablist"
    >
      {APP_NAV.map(({ id, label, href }) => {
        const isActive = activeResolver(id);
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
  );
}

function AppHeaderInner({
  variant,
  navVariant = "full",
  onRetake,
  hasSavedCheckin = false,
  onResetDeviceData,
  resetDeviceDataBusy = false,
  className,
}: AppHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDashboard = pathname === "/dashboard";
  const activeTab = onDashboard
    ? normalizeDashboardTab(searchParams.get("tab"))
    : null;

  const isActive = (id: DashboardTabId) =>
    Boolean(onDashboard && activeTab === id);

  const headerClass = cn(
    "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl",
    className,
  );

  const rightMarketing = (
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
  );

  const rightWorkspace = (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      {navVariant === "full" && onRetake ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 rounded-lg text-xs text-muted-foreground"
          onClick={onRetake}
        >
          {hasSavedCheckin ? CHECKIN_AGAIN_BUTTON : CHECKIN_INVITE}
        </Button>
      ) : null}
      {navVariant === "full" &&
      hasSavedCheckin &&
      typeof onResetDeviceData === "function" ? (
        <div className="group relative inline-flex shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label="Reset this device"
            aria-describedby="reset-device-help"
            disabled={resetDeviceDataBusy}
            onClick={onResetDeviceData}
          >
            <Eraser className="size-4" aria-hidden />
          </Button>
          <div
            id="reset-device-help"
            role="region"
            aria-label="What reset does"
            className={cn(
              "pointer-events-none absolute right-0 top-full z-[60] flex w-max max-w-[min(18rem,calc(100vw-2rem))] flex-col items-end pt-2",
              "opacity-0 transition-opacity duration-150",
              "invisible group-hover:visible group-hover:opacity-100",
              "group-focus-within:visible group-focus-within:opacity-100",
            )}
          >
            <div className="rounded-lg border border-border/80 bg-popover px-3 py-2.5 text-left text-popover-foreground shadow-md">
              <p className="text-xs font-medium text-foreground">
                Reset this device
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Removes every check-in and plan we have for this browser, clears
                data stored on this device, and returns you to the home page.
                This cannot be undone.
              </p>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                Your browser will ask you to confirm before deleting.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "inline-flex h-8 items-center rounded-lg text-xs",
        )}
      >
        Back home
      </Link>
    </div>
  );

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <BrandRow />

        {variant === "marketing" || navVariant === "full" ? (
          <TabNav activeResolver={isActive} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Complete a check-in to unlock the workspace.
          </p>
        )}

        {variant === "marketing" ? rightMarketing : rightWorkspace}
      </div>
    </header>
  );
}

function AppHeaderFallback({
  variant,
  navVariant = "full",
  className,
}: AppHeaderProps) {
  const headerClass = cn(
    "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl",
    className,
  );

  return (
    <header className={headerClass}>
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <BrandRow />
        {variant === "marketing" || navVariant === "full" ? (
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
                aria-selected={false}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        ) : (
          <p className="text-xs text-muted-foreground opacity-80">
            Complete a check-in to unlock the workspace.
          </p>
        )}
        {variant === "marketing" ? (
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
        ) : (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {navVariant === "full" ? (
              <span className="inline-flex h-8 min-w-[7rem] items-center rounded-lg px-2 text-xs text-muted-foreground opacity-60">
                …
              </span>
            ) : null}
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex h-8 items-center rounded-lg text-xs opacity-90",
              )}
            >
              Back home
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <Suspense fallback={<AppHeaderFallback {...props} />}>
      <AppHeaderInner {...props} />
    </Suspense>
  );
}
