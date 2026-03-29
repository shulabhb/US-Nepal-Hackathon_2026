"use client";

import { Activity, Loader2, Moon, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BurnoutInsightTabs } from "@/components/dashboard/burnout-insight-tabs";
import { getCheckinHistory } from "@/lib/api/checkins";
import { getPlans } from "@/lib/api/plans";
import { buildStrainHistorySeries } from "@/lib/burnout/burnout-history-series";
import {
  buildDashboardAlignedBurnoutViewModel,
  previousCheckinFromHistory,
  type BurnoutRiskBand,
  type RawMetricTrend,
} from "@/lib/burnout/burnout-view-model";
import { cn } from "@/lib/utils";
import type {
  CheckinDetailResponse,
  CheckinHistoryItem,
  StoredPlan,
} from "@/types/api";

const CHECKIN_HISTORY_CAP = 5;

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

function compositeMeterClass(band: BurnoutRiskBand): string {
  if (band === "low") return "from-emerald-500/90 to-emerald-600/70 dark:from-emerald-400/85 dark:to-emerald-500/65";
  if (band === "emerging") return "from-sky-500/90 to-sky-600/70 dark:from-sky-400/85 dark:to-sky-500/65";
  if (band === "moderate") return "from-amber-500/90 to-amber-600/70 dark:from-amber-400/85 dark:to-amber-500/65";
  return "from-rose-500/90 to-rose-600/70 dark:from-rose-400/85 dark:to-rose-500/65";
}

function ringTrackClass(band: BurnoutRiskBand): string {
  if (band === "low") return "text-emerald-500/25 dark:text-emerald-400/20";
  if (band === "emerging") return "text-sky-500/25 dark:text-sky-400/20";
  if (band === "moderate") return "text-amber-500/30 dark:text-amber-400/25";
  return "text-rose-500/25 dark:text-rose-400/20";
}

function ringProgressStrokeClass(band: BurnoutRiskBand): string {
  if (band === "low") return "stroke-emerald-500 dark:stroke-emerald-400";
  if (band === "emerging") return "stroke-sky-500 dark:stroke-sky-400";
  if (band === "moderate") return "stroke-amber-500 dark:stroke-amber-400";
  return "stroke-rose-500 dark:stroke-rose-400";
}

function stressTrendPhrase(t: RawMetricTrend | null): string {
  if (t === "up") return "Higher than last save";
  if (t === "down") return "Lower than last save";
  return "About the same as last";
}

function energyTrendPhrase(t: RawMetricTrend | null): string {
  if (t === "up") return "Stronger than last save";
  if (t === "down") return "Softer than last save";
  return "About the same as last";
}

type Props = {
  checkin: CheckinDetailResponse;
  anonymousId: string;
};

export function BurnoutSummarySection({ checkin, anonymousId }: Props) {
  const [previousCheckin, setPreviousCheckin] =
    useState<CheckinDetailResponse | null>(null);
  const [savedPlans, setSavedPlans] = useState<StoredPlan[]>([]);
  const [historyRows, setHistoryRows] = useState<CheckinHistoryItem[]>([]);
  const [planContextReady, setPlanContextReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlanContextReady(false);

    void Promise.all([
      getCheckinHistory(anonymousId).catch(() => []),
      getPlans(anonymousId).catch(() => []),
    ]).then(([history, plans]) => {
      if (cancelled) return;
      setHistoryRows(history);
      setPreviousCheckin(previousCheckinFromHistory(history, checkin.id));
      setSavedPlans(plans);
      setPlanContextReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [anonymousId, checkin.id]);

  const rowsForStrainSeries = useMemo(() => {
    const byId = new Map<string, CheckinDetailResponse>();
    for (const row of historyRows) {
      byId.set(row.id, row);
    }
    byId.set(checkin.id, checkin);
    return [...byId.values()].sort(
      (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
    );
  }, [historyRows, checkin]);

  const strainPoints = useMemo(
    () => buildStrainHistorySeries(rowsForStrainSeries),
    [rowsForStrainSeries],
  );

  const model = useMemo(() => {
    return buildDashboardAlignedBurnoutViewModel(checkin, {
      previousCheckin,
      plans: savedPlans,
    });
  }, [checkin, previousCheckin, savedPlans]);

  const noPrev = model.previousComposite == null;
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - model.composite / 100);

  return (
    <section
      className="space-y-8 rounded-2xl border border-border/70 bg-gradient-to-b from-card/80 to-card/40 p-4 shadow-sm backdrop-blur-sm sm:p-8"
      aria-labelledby="burnout-summary-heading"
    >
      {/* A. Overall state */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Burnout signal
          </p>
          <h2
            id="burnout-summary-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            How things look right now
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            A simple strain read from your latest save—not a clinical score.
          </p>
        </div>

        {!planContextReady ? (
          <div
            className="flex min-h-[12rem] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 sm:min-h-[10rem] lg:flex-1"
            role="status"
            aria-live="polite"
          >
            <Loader2
              className="size-8 animate-spin text-muted-foreground"
              aria-hidden
            />
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              Aligning strain with your saved plans and check-in history…
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
              <div
                className="relative flex size-36 shrink-0 items-center justify-center sm:size-40"
                data-tour="dashboard-burnout-strain-dial"
              >
                <svg
                  className={cn(
                    "size-full -rotate-90",
                    ringTrackClass(model.band),
                  )}
                  viewBox="0 0 120 120"
                  aria-hidden
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className={cn(
                      "transition-[stroke-dashoffset] duration-700 ease-out",
                      ringProgressStrokeClass(model.band),
                    )}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="font-heading text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
                    {model.composite}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Strain
                  </p>
                </div>
              </div>

              <div className="max-w-xs space-y-3 text-center sm:text-left">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    bandBadgeClass(model.band),
                  )}
                >
                  {model.bandLabel} concern
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">
                  Overall burnout-related strain (rule-based blend of four areas).
                </p>
                {model.overallTrendHint ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {model.overallTrendHint}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Save another check-in later to see how this moves over time.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {planContextReady ? (
        <>
          {/* Linear meter — quick scan */}
          <div className="space-y-2" data-tour="dashboard-burnout-strain-meter">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Strain meter</span>
              {model.previousComposite != null ? (
                <span className="tabular-nums">
                  Last save · {model.previousComposite}
                </span>
              ) : null}
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={model.composite}
              aria-label="Overall burnout-related strain"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r shadow-sm transition-[width] duration-700 ease-out",
                  compositeMeterClass(model.band),
                )}
                style={{ width: `${model.composite}%` }}
              />
            </div>
          </div>

          {/* B. Since last check-in */}
          {model.sinceLastCheckinLine ? (
            <div className="rounded-xl border border-border/60 bg-accent/20 px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Since last check-in
              </p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
                {model.sinceLastCheckinLine}
              </p>
            </div>
          ) : null}

          {/* Raw stress / energy hint row */}
          {!noPrev ? (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                <Zap className="size-3.5 shrink-0 text-amber-600/80 dark:text-amber-400/80" aria-hidden />
                Stress · {stressTrendPhrase(model.stressTrend)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                <Activity className="size-3.5 shrink-0 text-sky-600/80 dark:text-sky-400/80" aria-hidden />
                Energy · {energyTrendPhrase(model.energyTrend)}
              </span>
              {model.recoveryStrainTrend ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
                  <Moon className="size-3.5 shrink-0 text-indigo-600/80 dark:text-indigo-400/80" aria-hidden />
                  Recovery strain ·{" "}
                  {model.recoveryStrainTrend === "worsening"
                    ? "Higher"
                    : model.recoveryStrainTrend === "improving"
                      ? "Lower"
                      : "About the same"}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Narrative summary */}
          <p className="text-sm leading-relaxed text-foreground">
            {model.summaryLine}
          </p>

          <BurnoutInsightTabs
            model={model}
            noPrev={noPrev}
            strainPoints={strainPoints}
            checkinCount={rowsForStrainSeries.length}
            historyCap={CHECKIN_HISTORY_CAP}
          />

          <p className="text-xs leading-relaxed text-muted-foreground/90">
            {model.disclaimer}
          </p>
        </>
      ) : null}
    </section>
  );
}
