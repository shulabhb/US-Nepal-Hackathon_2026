"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";

import { bandFromComposite, type BurnoutRiskBand } from "@/lib/burnout/burnout-view-model";
import { cn } from "@/lib/utils";

export function ringTrackClass(band: BurnoutRiskBand): string {
  if (band === "low") return "text-emerald-500/18 dark:text-emerald-400/14";
  if (band === "emerging") return "text-sky-500/20 dark:text-sky-400/16";
  if (band === "moderate") return "text-amber-500/22 dark:text-amber-400/18";
  return "text-rose-500/20 dark:text-rose-400/16";
}

export function ringStrokeClass(band: BurnoutRiskBand): string {
  if (band === "low") return "stroke-emerald-500/70 dark:stroke-emerald-400/75";
  if (band === "emerging") return "stroke-sky-500/70 dark:stroke-sky-400/75";
  if (band === "moderate") return "stroke-amber-500/72 dark:stroke-amber-400/75";
  return "stroke-rose-500/70 dark:stroke-rose-400/75";
}

const RING_R_LG = 42;
/** Triple projection rings — slightly smaller than full-size single meter */
const RING_R_TRIPLE = 38;
/** Plan tab / compact strip — matches dashboard semantics, lighter footprint */
const RING_R_TRIPLE_SUBTLE = 32;

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function StrainMeterInfoTip({ description }: { description: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        type="button"
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          "text-muted-foreground/80 transition-colors",
          "hover:bg-muted/80 hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label="What this meter means"
      >
        <Info className="size-3.5 stroke-[2.25]" aria-hidden />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-50" side="bottom" sideOffset={6}>
          <Tooltip.Popup
            className={cn(
              "max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-border bg-popover px-3 py-2",
              "text-xs leading-snug text-popover-foreground shadow-md",
            )}
          >
            {description}
            <Tooltip.Arrow className="fill-popover stroke-border data-[side=bottom]:top-[-1px] data-[side=top]:bottom-[-1px]" />
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function StrainRingGauge({
  composite,
  label,
  variant = "lg",
  infoDescription,
  className,
}: {
  composite: number;
  label: string;
  variant?: "lg" | "triple" | "triple-subtle";
  /** Shown in an info tooltip beside the label (desktop hover / keyboard focus). */
  infoDescription?: string;
  className?: string;
}) {
  const { band } = bandFromComposite(composite);
  const r =
    variant === "lg"
      ? RING_R_LG
      : variant === "triple-subtle"
        ? RING_R_TRIPLE_SUBTLE
        : RING_R_TRIPLE;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clampPct(composite) / 100);
  const stroke =
    variant === "lg" ? 8 : variant === "triple-subtle" ? 5.5 : 7;
  const box =
    variant === "lg"
      ? "size-[6.25rem] sm:size-[7rem]"
      : variant === "triple-subtle"
        ? "size-[5.25rem] sm:size-[5.5rem]"
        : "size-[6.35rem] sm:size-[7.35rem]";
  const numClass =
    variant === "lg"
      ? "text-2xl sm:text-3xl"
      : variant === "triple-subtle"
        ? "text-lg sm:text-xl"
        : "text-xl sm:text-2xl";
  const suffixClass =
    variant === "lg"
      ? "text-[9px] sm:text-[10px]"
      : variant === "triple-subtle"
        ? "text-[7px] sm:text-[8px]"
        : "text-[9px] sm:text-[10px]";
  const labelClass =
    variant === "triple-subtle"
      ? "text-[9px] sm:text-[10px]"
      : "text-[11px]";

  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        variant === "triple-subtle" ? "gap-1.5" : "gap-2.5",
        className,
      )}
    >
      <div className={cn("relative", box)}>
        <svg
          className={cn("size-full -rotate-90", ringTrackClass(band))}
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out",
              ringStrokeClass(band),
            )}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-heading font-bold tabular-nums tracking-tight text-foreground",
              numClass,
            )}
          >
            {composite}
          </span>
          <span
            className={cn(
              "font-medium uppercase tracking-wide text-muted-foreground",
              suffixClass,
            )}
          >
            /100
          </span>
        </div>
      </div>
      <div className="flex min-w-0 max-w-[11rem] items-center justify-center gap-0.5 sm:max-w-[12rem] sm:gap-1">
        <p
          className={cn(
            "font-semibold uppercase tracking-wide text-muted-foreground",
            labelClass,
          )}
        >
          {label}
        </p>
        {infoDescription ? (
          <StrainMeterInfoTip description={infoDescription} />
        ) : null}
      </div>
    </div>
  );
}
