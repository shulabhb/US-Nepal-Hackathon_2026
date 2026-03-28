"use client";

import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Minus,
  Moon,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCheckinHistory } from "@/lib/api/checkins";
import { getPlans } from "@/lib/api/plans";
import {
  buildBurnoutViewModel,
  labelDimensionTrend,
  previousCheckinFromHistory,
  type BurnoutDimensionId,
  type BurnoutDimensionTrend,
  type BurnoutRiskBand,
  type RawMetricTrend,
} from "@/lib/burnout/burnout-view-model";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, PlanChecklistItem } from "@/types/api";

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

function dimensionShellClass(score: number): string {
  if (score < 40) {
    return "border-emerald-600/15 bg-emerald-500/[0.04] dark:border-emerald-400/20";
  }
  if (score < 60) {
    return "border-amber-600/20 bg-amber-500/[0.05] dark:border-amber-400/20";
  }
  return "border-rose-600/20 bg-rose-500/[0.06] dark:border-rose-400/20";
}

function dimensionBarClass(score: number): string {
  if (score < 40) return "bg-emerald-500/70 dark:bg-emerald-400/75";
  if (score < 60) return "bg-amber-500/75 dark:bg-amber-400/75";
  return "bg-rose-500/75 dark:bg-rose-400/75";
}

function trendChipClass(t: BurnoutDimensionTrend | undefined, noPrev: boolean) {
  if (noPrev) {
    return "border-border/70 bg-muted/40 text-muted-foreground";
  }
  if (t === "rising") {
    return "border-amber-500/30 bg-amber-500/[0.10] text-amber-950 dark:border-amber-400/35 dark:text-amber-50";
  }
  if (t === "easing") {
    return "border-emerald-600/30 bg-emerald-600/[0.10] text-emerald-950 dark:border-emerald-400/35 dark:text-emerald-100";
  }
  return "border-border/80 bg-muted/50 text-muted-foreground";
}

function DimensionTrendIcon({
  t,
  noPrev,
}: {
  t: BurnoutDimensionTrend | undefined;
  noPrev: boolean;
}) {
  if (noPrev) {
    return <Minus className="size-3 opacity-70" aria-hidden />;
  }
  if (t === "rising") {
    return <ArrowUp className="size-3" aria-hidden />;
  }
  if (t === "easing") {
    return <ArrowDown className="size-3" aria-hidden />;
  }
  return <ArrowRight className="size-3 opacity-80" aria-hidden />;
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
  const [latestPlanChecklist, setLatestPlanChecklist] = useState<
    PlanChecklistItem[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getCheckinHistory(anonymousId).catch(() => []),
      getPlans(anonymousId).catch(() => []),
    ]).then(([history, plans]) => {
      if (cancelled) return;
      setPreviousCheckin(previousCheckinFromHistory(history, checkin.id));
      setLatestPlanChecklist(plans[0]?.checklist_items ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [anonymousId, checkin.id]);

  const model = useMemo(
    () =>
      buildBurnoutViewModel(checkin, {
        previousCheckin,
        latestPlanChecklist,
      }),
    [checkin, previousCheckin, latestPlanChecklist],
  );

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

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative flex size-36 shrink-0 items-center justify-center sm:size-40">
            <svg
              className={cn("size-full -rotate-90", ringTrackClass(model.band))}
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
      </div>

      {/* Linear meter — quick scan */}
      <div className="space-y-2">
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
      <p className="text-sm leading-relaxed text-foreground">{model.summaryLine}</p>

      {/* C. Dimensions */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/40 pb-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Strain by area
          </h3>
          <p className="text-xs text-muted-foreground">
            Higher = more load in that area (not a medical measure).
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {model.dimensions.map((d) => {
            const trend = model.dimensionTrends[d.id as BurnoutDimensionId];
            return (
              <Card
                key={d.id}
                className={cn(
                  "border py-0 shadow-none backdrop-blur-sm",
                  dimensionShellClass(d.score),
                )}
              >
                <CardHeader className="space-y-2 p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="font-heading text-sm font-semibold">
                        {d.label}
                      </CardTitle>
                      <CardDescription className="text-xs leading-snug">
                        {d.hint}
                      </CardDescription>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        trendChipClass(trend, noPrev),
                      )}
                    >
                      <DimensionTrendIcon t={trend} noPrev={noPrev} />
                      {labelDimensionTrend(trend, noPrev)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">
                      {d.score}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      strain index
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        dimensionBarClass(d.score),
                      )}
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* D. Drivers + rest */}
      {model.topDrivers.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            What seems to be driving this
          </h3>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground marker:text-foreground/50">
            {model.topDrivers.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            What looks okay
          </h3>
          {model.helping.length > 0 ? (
            <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {model.helping.map((t) => (
                <li key={t} className="flex gap-2">
                  <span
                    className="text-emerald-600/90 dark:text-emerald-400/90"
                    aria-hidden
                  >
                    ·
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No standout “bright spots” in this pass—totally normal when
              several things feel heavy.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            What needs a little attention
          </h3>
          {model.needsAttention.length > 0 ? (
            <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {model.needsAttention.map((t) => (
                <li key={t} className="flex gap-2">
                  <span
                    className="text-amber-600/90 dark:text-amber-400/90"
                    aria-hidden
                  >
                    ·
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing obvious beyond your usual watch areas—use the snapshot
              below for detail.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground/90">
        {model.disclaimer}
      </p>
    </section>
  );
}
