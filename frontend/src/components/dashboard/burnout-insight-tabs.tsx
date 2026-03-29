"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Info,
  Minus,
} from "lucide-react";
import { useId, useState } from "react";

import { BurnoutStrainTrendChart } from "@/components/dashboard/burnout-strain-trend-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StrainHistoryPoint } from "@/lib/burnout/burnout-history-series";
import {
  labelDimensionTrend,
  type BurnoutDimensionId,
  type BurnoutDimensionTrend,
  type BurnoutViewModel,
} from "@/lib/burnout/burnout-view-model";

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
  compact = false,
}: {
  t: BurnoutDimensionTrend | undefined;
  noPrev: boolean;
  compact?: boolean;
}) {
  const ic = compact ? "size-2.5" : "size-3";
  if (noPrev) {
    return <Minus className={cn(ic, "opacity-70")} aria-hidden />;
  }
  if (t === "rising") {
    return <ArrowUp className={ic} aria-hidden />;
  }
  if (t === "easing") {
    return <ArrowDown className={ic} aria-hidden />;
  }
  return <ArrowRight className={cn(ic, "opacity-80")} aria-hidden />;
}

const TAB_LABEL = {
  areas: "Strain by area",
  driving: "What’s driving this",
  okay: "What looks okay",
  attention: "Needs a little attention",
  timeline: "Strain over time",
} as const;

type SectionId = keyof typeof TAB_LABEL;

const TAB_INTRO: Record<
  SectionId,
  { accent: string; kicker: string; body?: string }
> = {
  areas: {
    accent: "border-sky-500/25",
    kicker:
      "Four channels on one dial—overload, depletion, recovery, day-to-day function.",
    body: "Higher means more strain in that lane, not a separate diagnosis. Arrows compare to your previous save when one exists.",
  },
  driving: {
    accent: "border-rose-500/20",
    kicker:
      "What surfaced loudest from this snapshot—the rest of life still exists; it just didn’t win the microphone.",
    body: "Patterns inferred from your answers, not a full inventory of stressors.",
  },
  okay: {
    accent: "border-emerald-500/25",
    kicker:
      "Footholds where something is still working—even small ones count when the week feels loud.",
    body: "Nothing here is “toxic positivity”—just signals that aren’t drowning yet.",
  },
  attention: {
    accent: "border-amber-500/30",
    kicker: "Soft nudges worth a second glance—gentle, not alarm bells.",
    body: "Use as a pause prompt, not a scorecard of failure.",
  },
  timeline: {
    accent: "border-indigo-500/25",
    kicker:
      "Your recent saves, left to right—each point is a moment you chose to log.",
  },
};

function TabIntro({
  accent,
  kicker,
  body,
  embedded,
}: {
  accent: string;
  kicker: string;
  body?: string;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1 border-l-2 py-1 pl-3",
        embedded
          ? "border-0 bg-transparent pl-0"
          : ["mb-4 pl-3.5", "bg-gradient-to-r from-muted/40 to-transparent", accent],
      )}
    >
      <p
        className={cn(
          "font-heading italic leading-relaxed text-foreground/85",
          embedded ? "text-xs sm:text-sm" : "text-sm sm:text-[15px]",
        )}
      >
        {kicker}
      </p>
      {body ? (
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            embedded ? "text-[11px] sm:text-xs" : "text-sm sm:text-[15px]",
          )}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

function InsightSectionCard({
  sectionId,
  title,
  intro,
  children,
  className,
  contentClassName,
  tall,
}: {
  sectionId: SectionId;
  title: string;
  intro: { accent: string; kicker: string; body?: string };
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  tall?: boolean;
}) {
  const [showIntro, setShowIntro] = useState(false);
  const headingId = useId();
  const panelId = `${sectionId}-panel`;

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-border/55 bg-card/50 shadow-sm ring-1 ring-border/30",
        tall && "min-h-[200px] lg:min-h-[240px]",
        className,
      )}
    >
      <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 space-y-0 border-b border-border/45 bg-muted/15 px-3 py-2.5 sm:px-4">
        <CardTitle
          id={headingId}
          className="font-heading text-sm font-semibold leading-snug text-foreground sm:text-base"
        >
          {title}
        </CardTitle>
        <button
          type="button"
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-expanded={showIntro}
          aria-controls={panelId}
          aria-label={`About: ${title}`}
          onClick={() => setShowIntro((v) => !v)}
        >
          <Info className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </CardHeader>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!showIntro}
        className="shrink-0 border-b border-border/40 bg-muted/10 px-3 py-2 sm:px-4"
      >
        <TabIntro {...intro} embedded />
      </div>
      <CardContent
        className={cn(
          "min-h-0 flex-1 p-3 sm:p-4",
          tall && "flex flex-col",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

type Props = {
  model: BurnoutViewModel;
  noPrev: boolean;
  strainPoints: StrainHistoryPoint[];
  checkinCount: number;
  historyCap: number;
};

export function BurnoutInsightTabs({
  model,
  noPrev,
  strainPoints,
  checkinCount,
  historyCap,
}: Props) {
  const timelineIntro = {
    ...TAB_INTRO.timeline,
    body: `Same index as the rings—${checkinCount} save${checkinCount === 1 ? "" : "s"} in this chart, up to ${historyCap} stored per device. The line draws once two or more saves exist.`,
  };

  return (
    <div className="space-y-4" data-tour="dashboard-burnout-insight-tabs">
      <div className="border-b border-border/40 pb-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Break it down
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          All sections at once—tap the info button on a card when you want the
          short interpretation notes. Chart uses {checkinCount} save
          {checkinCount === 1 ? "" : "s"} (up to {historyCap} kept).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 lg:items-start">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-8 lg:gap-4">
          <InsightSectionCard
            sectionId="areas"
            title={TAB_LABEL.areas}
            intro={TAB_INTRO.areas}
            tall
            contentClassName="pt-3"
          >
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-2.5">
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
                  <CardHeader className="space-y-1 p-3 pb-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="font-heading text-sm font-semibold leading-tight">
                          {d.label}
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-xs leading-snug text-muted-foreground">
                          {d.hint}
                        </CardDescription>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                          trendChipClass(trend, noPrev),
                        )}
                      >
                        <DimensionTrendIcon
                          t={trend}
                          noPrev={noPrev}
                          compact
                        />
                        {labelDimensionTrend(trend, noPrev)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5 p-3 pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
                        {d.score}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
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
          </InsightSectionCard>

          <InsightSectionCard
            sectionId="timeline"
            title={TAB_LABEL.timeline}
            intro={timelineIntro}
            contentClassName="flex flex-col gap-2 pt-3"
          >
            <BurnoutStrainTrendChart points={strainPoints} fullWidth />
          </InsightSectionCard>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <InsightSectionCard
            sectionId="driving"
            title={TAB_LABEL.driving}
            intro={TAB_INTRO.driving}
            contentClassName="text-sm leading-relaxed sm:text-[15px]"
          >
            {model.topDrivers.length > 0 ? (
              <ul className="list-inside list-disc space-y-1.5 text-muted-foreground marker:text-foreground/45">
                {model.topDrivers.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Nothing dominated the signal this time—the blend in your answers
                still shapes the strain readout above.
              </p>
            )}
          </InsightSectionCard>

          <InsightSectionCard
            sectionId="okay"
            title={TAB_LABEL.okay}
            intro={TAB_INTRO.okay}
            contentClassName="text-sm leading-relaxed sm:text-[15px]"
          >
            {model.helping.length > 0 ? (
              <ul className="space-y-1.5 text-muted-foreground">
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
              <p className="text-muted-foreground">
                No bright spots jumped out—common when several threads feel heavy
                at once.
              </p>
            )}
          </InsightSectionCard>

          <InsightSectionCard
            sectionId="attention"
            title={TAB_LABEL.attention}
            intro={TAB_INTRO.attention}
            contentClassName="text-sm leading-relaxed sm:text-[15px]"
          >
            {model.needsAttention.length > 0 ? (
              <ul className="space-y-1.5 text-muted-foreground">
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
              <p className="text-muted-foreground">
                Nothing extra stood out beyond your usual watch areas—the
                snapshot and history below have the raw fields.
              </p>
            )}
          </InsightSectionCard>
        </div>
      </div>
    </div>
  );
}
