"use client";

import type { ReactNode } from "react";

import type { CheckinHistoryItem } from "@/types/api";
import {
  historyCardSummaryLine,
  labelSleepConsistency,
  labelSleepDuration,
  labelSleepQuality,
  labelSymptom,
  riskLabelFromSnapshot,
} from "@/lib/dashboard/checkin-view-model";
import { labelForStoredGoal, labelForStoredPressure } from "@/lib/dashboard/stored-labels";
import { cn } from "@/lib/utils";

type Props = {
  item: CheckinHistoryItem;
  formattedCreatedAt: string;
  isLatest: boolean;
  /** Tighter padding and type — used under Burnout essential snapshot. */
  compact?: boolean;
  /** When set and this row is the current latest, jumps to the full Latest tab view. */
  onOpenFullSnapshot?: () => void;
};

function MiniChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full truncate rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[11px] text-foreground/90">
      {children}
    </span>
  );
}

export function CheckinHistoryCompactCard({
  item,
  formattedCreatedAt,
  isLatest,
  compact = false,
  onOpenFullSnapshot,
}: Props) {
  const risk = riskLabelFromSnapshot(item);
  const summary = historyCardSummaryLine(item);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card/50 shadow-sm backdrop-blur-sm",
        compact ? "px-3 py-3" : "px-4 py-4",
        isLatest && "ring-1 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-2 border-b border-border/40",
          compact ? "pb-2" : "pb-3",
        )}
      >
        <div>
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            Saved
          </p>
          <p
            className={cn(
              "font-medium text-foreground",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {formattedCreatedAt}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLatest ? (
            <span
              className={cn(
                "rounded-full bg-primary/10 font-medium uppercase tracking-wide text-primary",
                compact
                  ? "px-2 py-0.5 text-[9px]"
                  : "px-2.5 py-0.5 text-[10px]",
              )}
            >
              Latest
            </span>
          ) : null}
          {risk ? (
            <span
              className={cn(
                "rounded-full bg-muted font-medium text-foreground",
                compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs",
              )}
            >
              {risk}
            </span>
          ) : null}
        </div>
      </div>

      <p
        className={cn(
          "leading-snug text-foreground/90",
          compact ? "mt-2 line-clamp-3 text-xs" : "mt-3 text-sm",
        )}
      >
        {summary}
      </p>

      <div
        className={cn(
          "grid grid-cols-2 gap-x-3 text-xs sm:grid-cols-3",
          compact ? "mt-2 gap-y-1" : "mt-3 gap-x-4 gap-y-1.5",
        )}
      >
        <div>
          <span className="text-muted-foreground">Stress</span>
          <p className="font-medium text-foreground">{item.stress_level}/10</p>
        </div>
        <div>
          <span className="text-muted-foreground">Energy</span>
          <p className="font-medium text-foreground">{item.energy_level}/10</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-muted-foreground">Sleep · duration</span>
          <p className="font-medium text-foreground">
            {labelSleepDuration(item.sleep_duration)}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Quality</span>
          <p className="font-medium text-foreground">
            {labelSleepQuality(item.sleep_quality)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-muted-foreground">Consistency</span>
          <p className="font-medium text-foreground">
            {labelSleepConsistency(item.sleep_consistency)}
          </p>
        </div>
      </div>

      {(item.pressure || item.goal) && (
        <div
          className={cn(
            "flex flex-wrap gap-x-3 gap-y-1 border-t border-border/40 text-xs",
            compact ? "mt-2 pt-2" : "mt-3 pt-3",
          )}
        >
          {item.pressure ? (
            <p>
              <span className="text-muted-foreground">Pressure · </span>
              <span className="text-foreground">
                {labelForStoredPressure(item.pressure)}
              </span>
            </p>
          ) : null}
          {item.goal ? (
            <p>
              <span className="text-muted-foreground">Help · </span>
              <span className="text-foreground">
                {labelForStoredGoal(item.goal)}
              </span>
            </p>
          ) : null}
        </div>
      )}

      {item.symptoms.length > 0 ? (
        <div
          className={cn(
            "border-t border-border/40",
            compact ? "mt-2 pt-2" : "mt-3 pt-3",
          )}
        >
          <p
            className={cn(
              "font-medium uppercase tracking-wide text-muted-foreground",
              compact ? "mb-1.5 text-[9px]" : "mb-2 text-[10px]",
            )}
          >
            Symptoms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.symptoms.slice(0, compact ? 5 : 8).map((id) => (
              <MiniChip key={id}>{labelSymptom(id)}</MiniChip>
            ))}
            {item.symptoms.length > (compact ? 5 : 8) ? (
              <span className="self-center text-[11px] text-muted-foreground">
                +{item.symptoms.length - (compact ? 5 : 8)} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLatest && onOpenFullSnapshot ? (
        <div
          className={cn(
            "border-t border-border/40",
            compact ? "mt-2 pt-2" : "mt-3 pt-3",
          )}
        >
          <button
            type="button"
            className={cn(
              "font-medium text-primary underline-offset-4 hover:underline",
              compact ? "text-[11px]" : "text-xs",
            )}
            onClick={onOpenFullSnapshot}
          >
            Open Latest tab
          </button>
        </div>
      ) : null}
    </article>
  );
}
