"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_TOUR_STEPS } from "@/lib/onboarding/dashboard-tour-config";
import type {
  LandingTourStep,
  OnboardingTourStep,
  TourPhase,
} from "@/lib/onboarding/guided-tour-config";
import { ONBOARDING_TOUR_UNLOCK_STEP_INDEX } from "@/lib/onboarding/guided-tour-config";
import { cn } from "@/lib/utils";

import type { TourPanelPlacement } from "./tour-panel-placement";

function RichLine({
  text,
  subtle,
}: {
  text: string;
  subtle?: boolean;
}) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <p
      className={cn(
        "leading-relaxed",
        subtle
          ? "text-[13px] text-muted-foreground/90"
          : "text-sm text-muted-foreground",
      )}
    >
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={i}
              className={cn(
                "font-semibold",
                subtle ? "text-foreground/88" : "text-foreground/95",
              )}
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

type Props = {
  phase: TourPhase;
  stepIndex: number;
  landingStep: LandingTourStep | null;
  onboardingCopy: OnboardingTourStep | null;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  onCancel: () => void;
  isLastLandingStep: boolean;
  placement: TourPanelPlacement;
  onCompleteDashboard?: () => void;
};

export function GuidedTourPanel({
  phase,
  stepIndex,
  landingStep,
  onboardingCopy,
  onNext,
  onPrevious,
  canGoPrevious,
  onCancel,
  isLastLandingStep,
  placement,
  onCompleteDashboard,
}: Props) {
  const isLanding = phase === "landing" && landingStep != null;

  const ob = onboardingCopy != null && phase !== "landing" && phase !== "dashboard";

  const db = phase === "dashboard";

  const dashboardStep = db ? (DASHBOARD_TOUR_STEPS[stepIndex] ?? null) : null;

  const isDashboardFinale = Boolean(db && dashboardStep?.id === "finale");

  const onboardingUnlocked =
    ob && stepIndex >= ONBOARDING_TOUR_UNLOCK_STEP_INDEX;

  /** Pulse + breathe on Next for every step except the dashboard finale actions. */
  const pulseNext = !isDashboardFinale;

  const title = isLanding
    ? landingStep.title
    : ob
      ? stepIndex === 0
        ? onboardingCopy.title
        : stepIndex === 1
          ? onboardingCopy.title
          : "You’re set"
      : db && dashboardStep
        ? dashboardStep.title
        : "Tour";

  const body = isLanding && landingStep ? (
    <RichLine text={landingStep.body} />
  ) : ob ? (
    stepIndex === 0 ? (
      <RichLine subtle text={onboardingCopy.intro} />
    ) : stepIndex === 1 ? (
      <RichLine subtle text={onboardingCopy.intro2} />
    ) : (
      <RichLine subtle text={onboardingCopy.actionHint} />
    )
  ) : db && dashboardStep ? (
    <RichLine subtle text={dashboardStep.body} />
  ) : null;

  const nextLabel =
    isLanding && isLastLandingStep
      ? "Scroll to Start check-in"
      : ob && stepIndex >= ONBOARDING_TOUR_UNLOCK_STEP_INDEX
        ? "Scroll to actions"
        : "Next";

  const workspaceRail = ob || db;

  /** Before layout effect runs, placement can be `center` — still use the workspace right rail. */
  const onboardingBottom = workspaceRail && placement === "bottom";
  const onboardingRightRail = workspaceRail && !onboardingBottom;

  return (
    <div
      className={cn(
        "pointer-events-none z-[200] flex max-h-[min(92vh,720px)]",
        onboardingRightRail &&
          "fixed inset-y-0 right-0 w-full max-w-[min(22rem,calc(100vw-0.75rem))] items-center justify-end overflow-y-auto pr-[max(0.5rem,env(safe-area-inset-right))] pl-2 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:max-w-[23rem] sm:pr-[max(1rem,env(safe-area-inset-right))]",
        onboardingBottom &&
          "fixed inset-x-0 bottom-0 justify-center overflow-y-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5",
        !workspaceRail &&
          "p-3 sm:p-5",
        placement === "center" &&
          !workspaceRail &&
          "fixed inset-0 items-center justify-center overflow-y-auto",
        placement === "top" &&
          !workspaceRail &&
          "fixed inset-x-0 top-0 justify-center overflow-y-auto pt-[max(0.75rem,env(safe-area-inset-top))] pb-2",
        placement === "bottom" &&
          !workspaceRail &&
          "fixed inset-x-0 bottom-0 justify-center overflow-y-auto pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2",
        placement === "left" &&
          !workspaceRail &&
          "fixed inset-y-0 left-0 items-center justify-center overflow-y-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-2",
        placement === "right" &&
          !workspaceRail &&
          "fixed inset-y-0 right-0 items-center justify-end overflow-y-auto pl-2 pr-[max(0.75rem,env(safe-area-inset-right))]",
      )}
      role="dialog"
      aria-labelledby="guided-tour-title"
    >
      <div
        className={cn(
          "pointer-events-auto w-full rounded-2xl border p-4 backdrop-blur-md sm:p-5",
          workspaceRail
            ? cn(
                "max-w-full min-h-[min(300px,42vh)] min-w-[min(19rem,100%)] rounded-xl border-border/35 bg-background/70 shadow-[0_12px_44px_-18px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.04] dark:bg-background/50 dark:shadow-black/30 dark:ring-white/[0.06]",
                db &&
                  "flex flex-col justify-between gap-3 sm:min-h-[min(308px,44vh)]",
                onboardingUnlocked &&
                  "border-primary/18 ring-primary/10 dark:border-primary/22",
              )
            : cn(
                "max-w-md border-border/80 bg-card/98 shadow-2xl sm:max-w-lg",
                "ring-1 ring-border/50",
                onboardingUnlocked && "max-w-sm border-primary/20 shadow-primary/10",
              ),
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-2.5 sm:gap-3",
            db && "min-h-0 flex-1",
          )}
        >
          <p
            id="guided-tour-title"
            className={cn(
              "font-heading font-semibold tracking-tight text-foreground",
              workspaceRail
                ? "text-[15px] leading-snug text-foreground/90"
                : "text-lg",
            )}
          >
            {title}
          </p>
          {stepIndex === 1 && ob ? (
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
              Part 2 of 2
            </p>
          ) : null}
          {body}
          {isLanding && landingStep?.id === "ready-checkin" ? (
            <p className="text-xs text-muted-foreground/90">
              One more <span className="font-medium">Next</span>, then we’ll
              highlight{" "}
              <strong className="text-foreground/90">Start check-in</strong>.
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center justify-between gap-2 sm:mt-5",
            workspaceRail
              ? "border-t border-border/25 pt-4"
              : "border-t border-border/50 pt-4",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "text-muted-foreground",
                workspaceRail && "h-8 text-xs text-muted-foreground/85",
              )}
              disabled={!canGoPrevious || isDashboardFinale}
              onClick={onPrevious}
              aria-disabled={!canGoPrevious || isDashboardFinale}
            >
              <ChevronLeft className="size-3.5 opacity-80" aria-hidden />
              Previous
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "text-muted-foreground",
                workspaceRail && "h-8 text-xs text-muted-foreground/85",
              )}
              onClick={onCancel}
            >
              Cancel tour
            </Button>
            {isDashboardFinale && onCompleteDashboard ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm"
                  onClick={() => {
                    onCompleteDashboard();
                  }}
                >
                  Maybe later
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1 rounded-xl px-4 text-sm font-semibold motion-safe:animate-guided-tour-next-pulse motion-safe:animate-guided-tour-next-breathe"
                  onClick={() => {
                    onCompleteDashboard();
                  }}
                >
                  Yes, let’s go
                  <ChevronRight className="size-3.5 opacity-80" aria-hidden />
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className={cn(
                  "gap-1 rounded-xl",
                  workspaceRail && "h-9 px-4 text-sm font-medium",
                  pulseNext &&
                    "motion-safe:animate-guided-tour-next-pulse motion-safe:animate-guided-tour-next-breathe",
                )}
                onClick={onNext}
              >
                {nextLabel}
                <ChevronRight className="size-3.5 opacity-80" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
