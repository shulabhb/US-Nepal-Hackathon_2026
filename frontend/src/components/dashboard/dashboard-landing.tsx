"use client";

import {
  MessageCircle,
  PenLine,
  Route,
  Target,
} from "lucide-react";

import { DashboardOverviewBurnout } from "@/components/dashboard/dashboard-overview-burnout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse } from "@/types/api";

type Props = {
  checkin: CheckinDetailResponse;
  anonymousId: string;
  riskLabel: string;
  summaryLine: string;
  onRetake: () => void;
  onOpenChat: () => void;
  onOpenPlan: () => void;
  onViewBurnout: () => void;
};

export function DashboardLanding({
  checkin,
  anonymousId,
  riskLabel,
  summaryLine,
  onRetake,
  onOpenChat,
  onOpenPlan,
  onViewBurnout,
}: Props) {
  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-10">
      <DashboardOverviewBurnout
        checkin={checkin}
        anonymousId={anonymousId}
        riskLabel={riskLabel}
        summaryLine={summaryLine}
        onOpenChat={onOpenChat}
        onOpenPlan={onOpenPlan}
        onOpenBurnout={onViewBurnout}
        onRetake={onRetake}
      />

      {/* Quick access — last section */}
      <section
        aria-labelledby="overview-quick-heading"
        className={cn(
          "rounded-2xl border border-border/45 bg-muted/10 p-4 shadow-sm sm:p-5",
        )}
      >
        <h2
          id="overview-quick-heading"
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Quick access
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 rounded-xl gap-2 shadow-sm"
            onClick={onOpenChat}
          >
            <MessageCircle className="size-4" aria-hidden />
            Support chat
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 rounded-xl gap-2 shadow-sm"
            onClick={onOpenPlan}
          >
            <Route className="size-4" aria-hidden />
            Plan
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 rounded-xl gap-2 shadow-sm"
            onClick={onViewBurnout}
          >
            <Target className="size-4" aria-hidden />
            Burnout
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 rounded-xl gap-2 shadow-sm"
            onClick={onRetake}
          >
            <PenLine className="size-4" aria-hidden />
            New check-in
          </Button>
        </div>
      </section>
    </div>
  );
}
