"use client";

import {
  ClipboardList,
  MessageCircle,
  RotateCcw,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCheckinHistory } from "@/lib/api/checkins";
import { getPlans } from "@/lib/api/plans";
import {
  buildBurnoutViewModel,
  overviewBestServices,
  overviewTopDriverLine,
  pickOverviewNextMove,
  previousCheckinFromHistory,
  type BurnoutRiskBand,
  type OverviewNextMoveKind,
  type OverviewServiceRec,
} from "@/lib/burnout/burnout-view-model";
import {
  nextUnfinishedChecklistTask,
  planChecklistProgress,
} from "@/lib/dashboard/plan-checklist";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

function bandBadgeClass(band: BurnoutRiskBand): string {
  if (band === "low") {
    return "border-emerald-600/30 bg-emerald-600/[0.10] text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100";
  }
  if (band === "emerging") {
    return "border-sky-600/30 bg-sky-600/[0.10] text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/10 dark:text-sky-50";
  }
  if (band === "moderate") {
    return "border-amber-600/35 bg-amber-500/[0.12] text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-50";
  }
  return "border-rose-600/35 bg-rose-500/[0.12] text-rose-950 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-50";
}

function strainFillClass(band: BurnoutRiskBand): string {
  if (band === "low") return "bg-emerald-500/45 dark:bg-emerald-400/35";
  if (band === "emerging") return "bg-sky-500/45 dark:bg-sky-400/35";
  if (band === "moderate") return "bg-amber-500/50 dark:bg-amber-400/38";
  return "bg-rose-500/45 dark:bg-rose-400/35";
}

function ringTrackClass(band: BurnoutRiskBand): string {
  if (band === "low") return "text-emerald-500/18 dark:text-emerald-400/14";
  if (band === "emerging") return "text-sky-500/20 dark:text-sky-400/16";
  if (band === "moderate") return "text-amber-500/22 dark:text-amber-400/18";
  return "text-rose-500/20 dark:text-rose-400/16";
}

function ringStrokeClass(band: BurnoutRiskBand): string {
  if (band === "low") return "stroke-emerald-500/70 dark:stroke-emerald-400/75";
  if (band === "emerging") return "stroke-sky-500/70 dark:stroke-sky-400/75";
  if (band === "moderate") return "stroke-amber-500/72 dark:stroke-amber-400/75";
  return "stroke-rose-500/70 dark:stroke-rose-400/75";
}

const cardClass =
  "rounded-2xl border border-border/50 bg-card/75 p-4 shadow-sm backdrop-blur-sm sm:p-5";

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

type Props = {
  checkin: CheckinDetailResponse;
  anonymousId: string;
  riskLabel: string;
  summaryLine: string;
  onOpenChat: () => void;
  onOpenPlan: () => void;
  onOpenBurnout: () => void;
  onRetake: () => void;
};

export function DashboardOverviewBurnout({
  checkin,
  anonymousId,
  riskLabel,
  summaryLine,
  onOpenChat,
  onOpenPlan,
  onOpenBurnout,
  onRetake,
}: Props) {
  const [previousCheckin, setPreviousCheckin] =
    useState<CheckinDetailResponse | null>(null);
  const [plans, setPlans] = useState<StoredPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      getCheckinHistory(anonymousId),
      getPlans(anonymousId),
    ]).then((results) => {
      if (cancelled) return;
      const history =
        results[0].status === "fulfilled" ? results[0].value : [];
      const planRows =
        results[1].status === "fulfilled" ? results[1].value : [];
      setPlans(planRows);
      setPreviousCheckin(previousCheckinFromHistory(history, checkin.id));
    });
    return () => {
      cancelled = true;
    };
  }, [anonymousId, checkin.id]);

  const model = useMemo(
    () =>
      buildBurnoutViewModel(checkin, {
        previousCheckin,
        latestPlanChecklist: plans[0]?.checklist_items ?? null,
      }),
    [checkin, previousCheckin, plans],
  );

  const nextMove = useMemo(
    () => pickOverviewNextMove(model, plans),
    [model, plans],
  );

  const serviceRecs = useMemo(
    () => overviewBestServices(model, plans, nextMove).slice(0, 2),
    [model, plans, nextMove],
  );

  const driverLine = useMemo(() => overviewTopDriverLine(model), [model]);

  const trendHint =
    model.sinceLastCheckinLine ?? model.overallTrendHint ?? null;

  const signalExtra =
    trendHint ??
    (() => {
      const t = model.summaryLine.trim();
      if (t.length <= 96) return t;
      return `${t.slice(0, 93)}…`;
    })();

  const activePlan = plans[0];
  const planProgress = activePlan
    ? planChecklistProgress(activePlan.checklist_items)
    : { completed: 0, total: 0, percent: 0 };
  const nextTask = activePlan
    ? nextUnfinishedChecklistTask(activePlan.checklist_items)
    : null;

  const ringOffset = RING_C * (1 - model.composite / 100);

  const goService = (id: OverviewNextMoveKind) => {
    if (id === "chat") onOpenChat();
    else if (id === "plan") onOpenPlan();
    else if (id === "burnout") onOpenBurnout();
    else onRetake();
  };

  const serviceIcon = (id: OverviewNextMoveKind) => {
    if (id === "chat")
      return <MessageCircle className="size-4 shrink-0" aria-hidden />;
    if (id === "plan")
      return <ClipboardList className="size-4 shrink-0" aria-hidden />;
    if (id === "burnout") return <Target className="size-4 shrink-0" aria-hidden />;
    return <RotateCcw className="size-4 shrink-0" aria-hidden />;
  };

  const trimReason = (s: string) =>
    s.length > 88 ? `${s.slice(0, 85)}…` : s;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* A. Current state */}
        <section
          className={cn(cardClass)}
          aria-labelledby="overview-state-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant="live" className="text-[10px]">
                  Live
                </StatusBadge>
              </div>
              <h2
                id="overview-state-heading"
                className="font-heading text-lg font-semibold leading-snug text-foreground"
              >
                {riskLabel}
              </h2>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {summaryLine}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    bandBadgeClass(model.band),
                  )}
                >
                  {model.bandLabel}
                </span>
              </div>
              <div
                className="h-1.5 max-w-md overflow-hidden rounded-full bg-muted/80"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={model.composite}
                aria-label={`Overall strain ${model.composite} of 100, ${model.bandLabel}`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    strainFillClass(model.band),
                  )}
                  style={{ width: `${model.composite}%` }}
                />
              </div>
              <button
                type="button"
                onClick={onOpenBurnout}
                className="text-left text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                See full burnout picture →
              </button>
            </div>

            <div
              className="mx-auto flex shrink-0 flex-col items-center sm:mx-0"
              aria-label={`Burnout strain ${model.composite} of 100`}
            >
              <div className="relative size-[5.75rem] sm:size-24">
                <svg
                  className={cn("size-full -rotate-90", ringTrackClass(model.band))}
                  viewBox="0 0 100 100"
                  aria-hidden
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_R}
                    fill="none"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={ringOffset}
                    className={cn(
                      "transition-[stroke-dashoffset] duration-700 ease-out",
                      ringStrokeClass(model.band),
                    )}
                  />
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-heading text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                    {model.composite}
                  </span>
                  <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    /100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* B. Main signal */}
        <section
          className={cn(cardClass)}
          aria-labelledby="overview-signal-heading"
        >
          <h2
            id="overview-signal-heading"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Main signal
          </h2>
          <p className="mt-3 text-sm font-medium leading-snug text-foreground">
            {driverLine}
          </p>
          {signalExtra && signalExtra !== driverLine ? (
            <p className="mt-2 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
              {signalExtra}
            </p>
          ) : null}
        </section>

        {/* C. What helps now */}
        <section
          className={cn(cardClass, "flex flex-col")}
          aria-labelledby="overview-support-heading"
        >
          <h2
            id="overview-support-heading"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            What helps now
          </h2>
          <ul className="mt-3 flex flex-1 flex-col gap-3">
            {serviceRecs.map((rec: OverviewServiceRec, index: number) => (
              <li
                key={`${rec.id}-${index}`}
                className={cn(
                  "rounded-xl border p-3",
                  index === 0
                    ? "border-primary/30 bg-primary/[0.05]"
                    : "border-border/55 bg-background/30",
                )}
              >
                <Button
                  type="button"
                  variant={index === 0 ? "default" : "outline"}
                  size="sm"
                  className="h-9 w-full justify-start gap-2 rounded-lg px-3 text-left text-xs sm:text-sm"
                  onClick={() => goService(rec.id)}
                >
                  {serviceIcon(rec.id)}
                  <span className="truncate">{rec.title}</span>
                </Button>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  {trimReason(rec.reason)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* D. Active plan */}
      {activePlan && planProgress.total > 0 ? (
        <section
          className={cardClass}
          aria-labelledby="overview-plan-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2
                id="overview-plan-heading"
                className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Active plan
              </h2>
              <p className="mt-2 font-heading text-base font-semibold text-foreground sm:text-lg">
                {activePlan.title}
              </p>
              {nextTask ? (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  Next: {nextTask.label}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Checklist complete.
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-xl gap-2"
              onClick={onOpenPlan}
            >
              <ClipboardList className="size-4" aria-hidden />
              Open Plan
            </Button>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="tabular-nums font-medium text-foreground">
                {planProgress.percent}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width] duration-500"
                style={{ width: `${planProgress.percent}%` }}
                role="progressbar"
                aria-valuenow={planProgress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${planProgress.percent}% complete`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {planProgress.completed}/{planProgress.total} steps
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
