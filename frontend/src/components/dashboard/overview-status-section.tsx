"use client";

import { ClipboardList } from "lucide-react";

import type {
  BurnoutRiskBand,
  OverviewNextMoveKind,
} from "@/lib/burnout/burnout-view-model";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CurrentStateSummary,
  FrictionBlock,
  OverviewSupportSurface,
  PlanFollowThroughRow,
} from "@/lib/dashboard/overview-support-surface";

function bandBadgeClass(band: BurnoutRiskBand): string {
  if (band === "low") {
    return "border-emerald-600/28 bg-emerald-600/[0.09] text-emerald-950 dark:border-emerald-400/32 dark:bg-emerald-500/10 dark:text-emerald-100";
  }
  if (band === "emerging") {
    return "border-sky-600/28 bg-sky-600/[0.09] text-sky-950 dark:border-sky-400/32 dark:bg-sky-500/10 dark:text-sky-50";
  }
  if (band === "moderate") {
    return "border-amber-600/32 bg-amber-500/[0.10] text-amber-950 dark:border-amber-400/38 dark:bg-amber-500/10 dark:text-amber-50";
  }
  return "border-rose-600/32 bg-rose-500/[0.10] text-rose-950 dark:border-rose-400/38 dark:bg-rose-500/10 dark:text-rose-50";
}

function statusQuietBarClass(band: BurnoutRiskBand): string {
  if (band === "low") return "bg-emerald-500/35";
  if (band === "emerging") return "bg-sky-500/35";
  if (band === "moderate") return "bg-amber-500/40";
  return "bg-rose-500/38";
}

/** Fixed height so “Next best step” and “Plan follow-through” match in every state. */
const PAIR_CARD_OUTER_H =
  "h-[13.75rem] min-h-[13.75rem] max-h-[13.75rem] sm:h-[14.25rem] sm:min-h-[14.25rem] sm:max-h-[14.25rem]";

/** Shared content well for “Next best step” + “Plan follow-through” (empty & with plan). */
const PAIR_CARD_INNER =
  "mt-2.5 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-dashed border-primary/22 bg-background/55 px-3 py-2.5 shadow-sm shadow-black/[0.03] ring-1 ring-primary/5 sm:mt-3 sm:px-3.5 sm:py-3 dark:bg-background/35";

const PAIR_SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/85";

const PAIR_PRIMARY_BTN =
  "h-9 gap-2 rounded-lg px-3 text-sm font-semibold shadow-sm sm:px-4";

/** Status band + focus + plain insight + “what we’re noticing” — single cohesive card. */
function OverviewStatusAndNoticingCard({
  state,
  friction,
}: {
  state: CurrentStateSummary;
  friction: FrictionBlock;
}) {
  return (
    <div
      data-tour="dashboard-how-now"
      className={cn(
        "rounded-xl border border-border/45 bg-muted/[0.04] px-4 py-5 ring-1 ring-black/[0.02]",
        "sm:px-5 sm:py-5",
      )}
    >
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p
            id="overview-status-main-heading"
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            How you&apos;re doing right now
          </p>
          <span
            className={cn(
              "inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums",
              bandBadgeClass(state.band),
            )}
          >
            {state.bandLabel}
          </span>
        </div>
        <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {state.primaryFocus}
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
          {state.plainInsight}
        </p>
      </header>

      <div className="mt-5 border-t border-border/30 pt-5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {friction.title}
        </h4>
        <ul className="mt-3 space-y-3">
          {friction.bullets.map((line, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed text-foreground/95"
            >
              <span
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/45"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MiniPlanProgressRing({
  percent,
  completed,
  total,
  label,
}: {
  percent: number;
  completed: number;
  total: number;
  label: string;
}) {
  const r = 13;
  const vb = 34;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(100, Math.max(0, percent)) : 0;
  const dashOffset = c * (1 - pct / 100);

  return (
    <div
      className="relative size-9 shrink-0"
      role="img"
      aria-label={`${label}: ${completed} of ${total} steps, ${pct} percent`}
    >
      <svg
        className="size-full -rotate-90 text-muted/25"
        viewBox={`0 0 ${vb} ${vb}`}
        aria-hidden
      >
        <circle
          cx={vb / 2}
          cy={vb / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <circle
          cx={vb / 2}
          cy={vb / 2}
          r={r}
          fill="none"
          className="text-primary/75 transition-[stroke-dashoffset] duration-500"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </div>
  );
}

function PlanFollowThroughList({
  rows,
  savedPlanCount,
  onPersonalizePlan,
}: {
  rows: PlanFollowThroughRow[];
  savedPlanCount: number;
  onPersonalizePlan: () => void;
}) {
  const overflow = savedPlanCount - rows.length;

  if (rows.length === 0) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col justify-center"
        role="status"
      >
        <p className="font-heading text-sm font-semibold leading-snug text-foreground">
          No saved plans yet.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          When you save a plan, you&apos;ll see a light snapshot of progress
          here—no pressure, just clarity.
        </p>
        <Button
          type="button"
          size="sm"
          variant="default"
          data-tour="dashboard-personalize"
          className={cn(PAIR_PRIMARY_BTN, "mt-3 w-full shrink-0 sm:w-auto")}
          onClick={onPersonalizePlan}
        >
          <ClipboardList className="size-3.5 shrink-0" aria-hidden />
          Personalize a plan
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0" role="list">
      {rows.map((row, i) => {
        const barPct = row.total > 0 ? (row.completed / row.total) * 100 : 0;
        return (
          <div
            key={row.id}
            role="listitem"
            className={cn(
              "flex min-h-0 items-stretch gap-2 py-2",
              i > 0 && "border-t border-border/35",
            )}
          >
            <MiniPlanProgressRing
              percent={row.percent}
              completed={row.completed}
              total={row.total}
              label={row.title}
            />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-xs font-semibold leading-tight text-foreground">
                {row.title}
              </p>
              <p className="mt-1 text-[10px] tabular-nums tracking-wide text-muted-foreground/90">
                <span className="font-medium text-muted-foreground/75">
                  {row.percent}%
                </span>
                <span className="text-muted-foreground/55"> · </span>
                <span>
                  {row.completed}/{row.total} steps
                </span>
              </p>
              <div
                className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/50"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-primary/55 transition-[width] duration-300"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
      {overflow > 0 ? (
        <p className="mt-1 shrink-0 text-[10px] text-muted-foreground/80">
          +{overflow} more saved — newest-first, same order as the Plan tab list.
        </p>
      ) : null}
    </div>
  );
}

type Props = {
  surface: OverviewSupportSurface;
  disclaimer: string;
  onNavigate: (kind: OverviewNextMoveKind) => void;
  onPersonalizePlan: () => void;
};

export function OverviewStatusSection({
  surface,
  disclaimer,
  onNavigate,
  onPersonalizePlan,
}: Props) {
  const { state, friction, planFollowThroughRows, savedPlanCount, nextStep } =
    surface;

  return (
    <section
      className={cn(
        "mt-6 overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm",
        "sm:mt-8",
      )}
      aria-labelledby="overview-status-main-heading"
    >
      <div className="h-1 w-full shrink-0 rounded-full">
        <div
          className={cn(
            "h-full w-full rounded-full opacity-90",
            statusQuietBarClass(state.band),
          )}
          aria-hidden
        />
      </div>

      <div className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6">
        <OverviewStatusAndNoticingCard state={state} friction={friction} />

        {/* Next step + plan follow-through — side by side on large screens */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-col gap-0">
            <div
              data-tour="dashboard-next-best"
              className={cn(
                "flex flex-col overflow-hidden rounded-xl border border-primary/18 bg-primary/[0.04] px-3 py-3",
                "shadow-sm shadow-black/[0.03] sm:px-4 sm:py-4",
                PAIR_CARD_OUTER_H,
              )}
            >
              <h4 className={PAIR_SECTION_LABEL}>Next best step</h4>
              <div className={PAIR_CARD_INNER}>
                <p className="font-heading text-sm font-semibold leading-snug text-foreground sm:text-[0.9375rem]">
                  {nextStep.headline}
                </p>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {nextStep.body}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-3.5">
              <Button
                type="button"
                size="sm"
                variant="default"
                className={PAIR_PRIMARY_BTN}
                onClick={() => onNavigate(nextStep.kind)}
              >
                {nextStep.actionLabel}
              </Button>
              {nextStep.backup ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-9 rounded-lg border px-3 text-sm shadow-sm",
                    "border-rose-200/55 bg-rose-100/[0.42] text-rose-950/80",
                    "hover:border-rose-300/60 hover:bg-rose-100/65 hover:text-rose-950",
                    "dark:border-rose-400/18 dark:bg-rose-950/28 dark:text-rose-50/85",
                    "dark:hover:border-rose-400/28 dark:hover:bg-rose-950/40 dark:hover:text-rose-50",
                  )}
                  onClick={() => onNavigate(nextStep.backup!.kind)}
                >
                  {nextStep.backup.label}
                </Button>
              ) : null}
            </div>
          </div>

          <div
            data-tour="dashboard-no-plans"
            className={cn(
              "flex flex-col overflow-hidden rounded-xl border border-primary/18 bg-primary/[0.04] px-3 py-3",
              "shadow-sm shadow-black/[0.03] sm:px-4 sm:py-4",
              PAIR_CARD_OUTER_H,
            )}
          >
            <h4 className={PAIR_SECTION_LABEL}>Plan follow-through</h4>
            <div className={PAIR_CARD_INNER}>
              <PlanFollowThroughList
                rows={planFollowThroughRows}
                savedPlanCount={savedPlanCount}
                onPersonalizePlan={onPersonalizePlan}
              />
            </div>
          </div>
        </div>

        <p className="border-t border-border/30 pt-4 text-center text-[10px] leading-relaxed text-muted-foreground/95 sm:text-left">
          {disclaimer}
        </p>
      </div>
    </section>
  );
}
