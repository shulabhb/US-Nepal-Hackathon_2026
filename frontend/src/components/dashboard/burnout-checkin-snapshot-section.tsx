"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { useGuidedTour } from "@/components/tour/guided-tour-provider";
import { CheckinsTabPanel } from "@/components/dashboard/checkins-tab-panel";
import { DASHBOARD_TOUR_STEPS } from "@/lib/onboarding/dashboard-tour-config";
import { riskLabelFromSnapshot } from "@/lib/dashboard/checkin-view-model";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse } from "@/types/api";

type Props = {
  checkin: CheckinDetailResponse;
  formattedLatestSavedAt: string;
  anonymousId: string;
};

function collapsedHint(c: CheckinDetailResponse): string {
  const risk = riskLabelFromSnapshot(c);
  const core = `Stress ${c.stress_level}/10 · Energy ${c.energy_level}/10`;
  return risk ? `${risk} · ${core}` : core;
}

export function BurnoutCheckinSnapshotSection({
  checkin,
  formattedLatestSavedAt,
  anonymousId,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const hint = collapsedHint(checkin);
  const tour = useGuidedTour();
  const tourStepId =
    tour?.isActive && tour.phase === "dashboard"
      ? (DASHBOARD_TOUR_STEPS[tour.stepIndex]?.id ?? null)
      : null;

  React.useLayoutEffect(() => {
    if (tourStepId === "burnout-snapshot-expanded") {
      setOpen(true);
      return;
    }
    if (tourStepId === "burnout-snapshot-collapsed") {
      setOpen(false);
    }
  }, [tourStepId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/55 bg-card/40 shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        id="burnout-snapshot-toggle"
        aria-controls="burnout-snapshot-panel"
        data-tour="dashboard-burnout-snapshot-toggle"
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
          "hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-heading text-sm font-semibold text-foreground">
            Snapshot and history
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
            <span className="font-medium text-foreground/85">
              Saved {formattedLatestSavedAt}
            </span>
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground/95 sm:text-xs">
            {hint}
          </p>
          {!open ? (
            <p className="text-[10px] italic text-muted-foreground/80">
              Expand for essentials — your latest fields and up to five prior
              saves.
            </p>
          ) : null}
        </div>
      </button>

      {open ? (
        <div
          id="burnout-snapshot-panel"
          role="region"
          aria-labelledby="burnout-snapshot-toggle"
          data-tour="dashboard-burnout-snapshot-panel"
          className="border-t border-border/50 px-3 pb-4 pt-2 sm:px-4"
        >
          <CheckinsTabPanel
            checkin={checkin}
            formattedLatestSavedAt={formattedLatestSavedAt}
            anonymousId={anonymousId}
            variant="essential"
          />
        </div>
      ) : null}
    </section>
  );
}
