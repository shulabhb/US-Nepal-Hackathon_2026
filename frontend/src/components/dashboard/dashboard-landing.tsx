"use client";

import { CalendarClock, MessageCircle, RotateCcw, Wind } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  labelForStoredGoal,
  labelForStoredPressure,
} from "@/lib/dashboard/stored-labels";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse } from "@/types/api";

type Props = {
  checkin: CheckinDetailResponse;
  riskLabel: string;
  summaryLine: string;
  focusLine: string;
  formattedSavedAt: string;
  onPlan: () => void;
  onCalm: () => void;
  onRetake: () => void;
  onOpenChat: () => void;
  onViewCheckIns: () => void;
  className?: string;
};

export function DashboardLanding({
  checkin,
  riskLabel,
  summaryLine,
  focusLine,
  formattedSavedAt,
  onPlan,
  onCalm,
  onRetake,
  onOpenChat,
  onViewCheckIns,
  className,
}: Props) {
  const stress = checkin.stress_level;
  const energy = checkin.energy_level;
  const sleepBits = [
    checkin.sleep_duration,
    checkin.sleep_quality,
  ].join(" · ");

  const metrics = [
    { label: "Today's focus", value: focusLine },
    { label: "Pressure", value: labelForStoredPressure(checkin.pressure) },
    { label: "Goal", value: labelForStoredGoal(checkin.goal) },
  ] as const;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Overview
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="live">Live</StatusBadge>
          <span className="text-base font-semibold text-foreground sm:text-lg">
            {riskLabel}
          </span>
        </div>
        <p className="line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {summaryLine}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-xl gap-2"
          onClick={onPlan}
        >
          <CalendarClock className="size-4" aria-hidden />
          Make a plan
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-9 rounded-xl gap-2"
          onClick={onCalm}
        >
          <Wind className="size-4" aria-hidden />
          Calm down now
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-xl gap-2"
          onClick={onRetake}
        >
          <RotateCcw className="size-4" aria-hidden />
          Retake
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <Card
            key={m.label}
            className="border-border/65 bg-card/80 py-0 shadow-sm backdrop-blur-sm"
          >
            <CardContent className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-1.5 line-clamp-3 text-sm font-medium leading-snug text-foreground">
                {m.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/65 bg-card/80 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Latest check-in
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Saved</span>{" "}
              {formattedSavedAt}
            </p>
            <p className="text-muted-foreground">
              Stress <span className="font-medium text-foreground">{stress}</span>
              {" · "}
              Energy{" "}
              <span className="font-medium text-foreground">{energy}</span>
            </p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{sleepBits}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={onViewCheckIns}
          >
            View check-ins
          </Button>
        </CardContent>
      </Card>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full rounded-xl gap-2 sm:w-auto sm:min-w-[14rem]"
        onClick={onOpenChat}
      >
        <MessageCircle className="size-4" aria-hidden />
        Open support chat
      </Button>
    </div>
  );
}
