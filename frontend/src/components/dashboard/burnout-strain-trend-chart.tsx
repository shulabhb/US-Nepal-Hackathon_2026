"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { StrainHistoryPoint } from "@/lib/burnout/burnout-history-series";
import type { BurnoutDimensionId } from "@/lib/burnout/burnout-view-model";

const DIM_ORDER: BurnoutDimensionId[] = [
  "overload",
  "depletion",
  "recovery",
  "functional_strain",
];

const SERIES: {
  key: "composite" | BurnoutDimensionId;
  label: string;
  className: string;
  legendDot: string;
}[] = [
  {
    key: "composite",
    label: "Overall strain",
    className: "stroke-foreground",
    legendDot: "bg-foreground",
  },
  {
    key: "overload",
    label: "Overload",
    className: "stroke-rose-500 dark:stroke-rose-400",
    legendDot: "bg-rose-500 dark:bg-rose-400",
  },
  {
    key: "depletion",
    label: "Depletion",
    className: "stroke-amber-600 dark:stroke-amber-400",
    legendDot: "bg-amber-600 dark:bg-amber-400",
  },
  {
    key: "recovery",
    label: "Recovery",
    className: "stroke-indigo-600 dark:stroke-indigo-400",
    legendDot: "bg-indigo-600 dark:bg-indigo-400",
  },
  {
    key: "functional_strain",
    label: "Functional strain",
    className: "stroke-violet-600 dark:stroke-violet-400",
    legendDot: "bg-violet-600 dark:bg-violet-400",
  },
];

function valueAt(
  p: StrainHistoryPoint,
  key: (typeof SERIES)[number]["key"],
): number {
  if (key === "composite") return p.composite;
  const hit = p.dimensions.find((d) => d.id === key);
  return hit?.score ?? 0;
}

type Props = {
  points: StrainHistoryPoint[];
  className?: string;
  /** Match parent column width (e.g. under strain-by-area); no centered max-width cap. */
  fullWidth?: boolean;
};

export function BurnoutStrainTrendChart({
  points,
  className,
  fullWidth = false,
}: Props) {
  const layout = useMemo(() => {
    const w = 360;
    const h = 158;
    const padL = 30;
    const padR = 8;
    const padT = 10;
    const padB = 34;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    return { w, h, padL, padR, padT, padB, innerW, innerH };
  }, []);

  const polylines = useMemo(() => {
    if (points.length < 2) return null;

    const n = points.length;
    const { padL, padT, innerW, innerH } = layout;

    const xAt = (i: number) => padL + (innerW * i) / Math.max(1, n - 1);
    const yAt = (v: number) => padT + innerH * (1 - Math.min(100, Math.max(0, v)) / 100);

    return SERIES.map((s) => {
      const pts = points
        .map((p, i) => `${xAt(i)},${yAt(valueAt(p, s.key))}`)
        .join(" ");
      return { ...s, points: pts };
    });
  }, [points, layout]);

  if (points.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        No saves yet—your first check-in will anchor this chart.
      </p>
    );
  }

  if (points.length === 1) {
    const p = points[0];
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          One dot in time so far. Add another save when you can—the line appears
          once two moments exist to connect (history keeps up to five recent
          logs).
        </p>
        <div
          className={cn(
            "grid gap-3 rounded-lg border border-border/50 bg-muted/15 p-4 sm:grid-cols-2",
            fullWidth ? "w-full max-w-none" : "max-w-lg",
          )}
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
              Overall
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
              {p.composite}
            </p>
          </div>
          {DIM_ORDER.map((id) => {
            const d = p.dimensions.find((x) => x.id === id);
            if (!d) return null;
            return (
              <div key={id}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {d.label}
                </p>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {d.score}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const { w, h, padL, padT, innerW, innerH } = layout;
  const n = points.length;
  const xLabel = (i: number) => padL + (innerW * i) / Math.max(1, n - 1);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "overflow-x-auto",
          fullWidth ? "w-full max-w-none" : "mx-auto max-w-[22rem] sm:max-w-md",
        )}
      >
        <svg
          className={cn(
            "h-auto w-full",
            fullWidth ? "max-h-[11rem] sm:max-h-[12rem]" : "max-h-[12rem] sm:max-h-[13rem]",
          )}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Strain over time: ${n} check-ins, overall and four areas`}
        >
          <title>Strain meters over time</title>
          <desc>
            Line chart of overall strain and four area scores across {n} saved
            check-ins.
          </desc>

          {/* Grid */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = padT + innerH * (1 - tick / 100);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={padL + innerW}
                  y1={y}
                  y2={y}
                  className="stroke-border/50"
                  strokeWidth={tick === 50 ? 1.2 : 0.75}
                  strokeDasharray={tick === 50 ? "0" : "4 6"}
                />
                <text
                  x={padL - 4}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[8px] font-medium tabular-nums sm:text-[9px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {polylines?.map((pl) => (
            <polyline
              key={pl.key}
              fill="none"
              strokeWidth={pl.key === "composite" ? 2.15 : 1.2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={pl.points}
              className={cn(pl.className)}
            />
          ))}

          {points.map((p, i) => {
            const cx = xLabel(i);
            return (
              <g key={p.id}>
                {SERIES.map((s) => {
                  const vy = valueAt(p, s.key);
                  const cy = padT + innerH * (1 - vy / 100);
                  return (
                    <circle
                      key={s.key}
                      cx={cx}
                      cy={cy}
                      r={s.key === "composite" ? 3 : 2.1}
                      className={cn(
                        "fill-background stroke-[1.75px]",
                        s.className,
                      )}
                    />
                  );
                })}
              </g>
            );
          })}

          {points.map((p, i) => (
            <text
              key={`${p.id}-lab`}
              x={xLabel(i)}
              y={h - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[8px] font-medium sm:text-[9px]"
            >
              {p.labelShort}
            </text>
          ))}
        </svg>
      </div>

      <ul
        className={cn(
          "flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground sm:text-xs",
          fullWidth
            ? "w-full justify-start gap-x-3"
            : "mx-auto max-w-md justify-center",
        )}
      >
        {SERIES.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block size-2 shrink-0 rounded-full ring-1 ring-background/80",
                s.legendDot,
              )}
              aria-hidden
            />
            <span className="text-foreground/80">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
