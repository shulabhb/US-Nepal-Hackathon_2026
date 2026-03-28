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
  onOpenFullSnapshot,
}: Props) {
  const risk = riskLabelFromSnapshot(item);
  const summary = historyCardSummaryLine(item);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/70 bg-card/50 px-4 py-4 shadow-sm backdrop-blur-sm",
        isLatest && "ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <p className="text-xs text-muted-foreground">Saved</p>
          <p className="text-sm font-medium text-foreground">{formattedCreatedAt}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isLatest ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              Latest
            </span>
          ) : null}
          {risk ? (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
              {risk}
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-snug text-foreground/90">{summary}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
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
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/40 pt-3 text-xs">
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
        <div className="mt-3 border-t border-border/40 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Symptoms
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.symptoms.slice(0, 8).map((id) => (
              <MiniChip key={id}>{labelSymptom(id)}</MiniChip>
            ))}
            {item.symptoms.length > 8 ? (
              <span className="self-center text-[11px] text-muted-foreground">
                +{item.symptoms.length - 8} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLatest && onOpenFullSnapshot ? (
        <div className="mt-3 border-t border-border/40 pt-3">
          <button
            type="button"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            onClick={onOpenFullSnapshot}
          >
            View full snapshot
          </button>
        </div>
      ) : null}
    </article>
  );
}
