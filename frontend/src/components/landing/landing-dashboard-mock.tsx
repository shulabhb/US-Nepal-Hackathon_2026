import {
  ClipboardList,
  MessageCircle,
  RotateCcw,
  Target,
} from "lucide-react";

import {
  bandFromComposite,
  type BurnoutRiskBand,
} from "@/lib/burnout/burnout-view-model";
import { cn } from "@/lib/utils";

type LandingDashboardMockProps = {
  className?: string;
};

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

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

const RING_R = 38;

function MockStrainRing({
  composite,
  label,
}: {
  composite: number;
  label: string;
}) {
  const { band } = bandFromComposite(composite);
  const c = 2 * Math.PI * RING_R;
  const offset = c * (1 - clampPct(composite) / 100);
  const stroke = 7;

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative size-[4.35rem] shrink-0 sm:size-[4.85rem]">
        <svg
          className={cn("size-full -rotate-90", ringTrackClass(band))}
          viewBox="0 0 100 100"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          <circle
            cx="50"
            cy="50"
            r={RING_R}
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
          <span className="font-heading text-lg font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
            {composite}
          </span>
          <span className="font-medium uppercase tracking-wide text-[8px] text-muted-foreground sm:text-[9px]">
            /100
          </span>
        </div>
      </div>
      <p className="max-w-[5.5rem] text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

/** Decorative-only: burnout meters + four “What can help?” tiles (not live data). */
export function LandingDashboardMock({ className }: LandingDashboardMockProps) {
  return (
    <div
      className={cn(
        "pointer-events-none w-full select-none overflow-hidden rounded-2xl border border-border/40 bg-card/80 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-sm",
        className,
      )}
      role="img"
      aria-label="Example dashboard preview: illustrative burnout meters and four help areas. Not real data."
    >
      <div className="h-1 w-full shrink-0 rounded-full bg-amber-500/40" />
      <div className="space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-5">
        <p className="text-center text-[9px] font-medium uppercase tracking-wider text-muted-foreground/90">
          Example dashboard · not your data
        </p>

        {/* Burnout meters — same shell as dashboard overview */}
        <div
          className={cn(
            "rounded-2xl border border-border/50 px-3 py-3.5 shadow-md shadow-black/[0.04] sm:px-4 sm:py-4",
            "bg-gradient-to-b from-card via-card to-muted/15 ring-1 ring-border/35",
          )}
        >
          <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85 sm:text-[10px]">
            Burnout meters
          </p>
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            Three illustrative strain rings—example numbers only; your real
            workspace updates after a check-in.
          </p>
          <div
            className="-mx-0.5 flex flex-nowrap justify-center gap-3 sm:gap-5"
            aria-hidden
          >
            <MockStrainRing composite={44} label="Now" />
            <MockStrainRing composite={62} label="If not paced" />
            <MockStrainRing composite={38} label="With your plan" />
          </div>
        </div>

        {/* What can help? — four services (layout + accents match dashboard) */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">
            What can help?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            Each area has a different job—structure, a place to talk, depth on
            strain, or a fresh snapshot.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-4">
            <li className="min-w-0">
              <div
                className={cn(
                  "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card/60 px-2 py-2.5 text-center shadow-sm sm:px-2.5 sm:py-3",
                  "border-primary/22",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary sm:size-10">
                  <ClipboardList className="size-[1rem] sm:size-[1.05rem]" aria-hidden />
                </span>
                <span className="mt-2 min-w-0 space-y-0.5 px-0.5">
                  <span className="block text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
                    Better plan your life
                  </span>
                  <span className="block text-[8px] font-medium uppercase leading-snug tracking-wide text-primary/85 sm:text-[9px]">
                    Checklists &amp; My tasks
                  </span>
                </span>
              </div>
            </li>
            <li className="min-w-0">
              <div
                className={cn(
                  "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card/60 px-2 py-2.5 text-center shadow-sm sm:px-2.5 sm:py-3",
                  "border-violet-500/25",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-700 dark:text-violet-300 sm:size-10">
                  <MessageCircle className="size-[1rem] sm:size-[1.05rem]" aria-hidden />
                </span>
                <span className="mt-2 min-w-0 space-y-0.5 px-0.5">
                  <span className="block text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
                    Support chat
                  </span>
                  <span className="block text-[8px] font-medium leading-snug text-violet-700/95 dark:text-violet-300/95 sm:text-[9px]">
                    Think out loud, calmly
                  </span>
                </span>
              </div>
            </li>
            <li className="min-w-0">
              <div
                className={cn(
                  "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card/60 px-2 py-2.5 text-center shadow-sm sm:px-2.5 sm:py-3",
                  "border-amber-500/25",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-800 dark:text-amber-200 sm:size-10">
                  <Target className="size-[1rem] sm:size-[1.05rem]" aria-hidden />
                </span>
                <span className="mt-2 min-w-0 space-y-0.5 px-0.5">
                  <span className="block text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
                    Prevent burnout
                  </span>
                  <span className="block text-[8px] font-medium uppercase leading-snug tracking-wide text-amber-800/88 dark:text-amber-200/88 sm:text-[9px]">
                    Full snapshot &amp; history
                  </span>
                </span>
              </div>
            </li>
            <li className="min-w-0">
              <div
                className={cn(
                  "flex h-full flex-col items-center rounded-xl border border-border/50 bg-card/60 px-2 py-2.5 text-center shadow-sm sm:px-2.5 sm:py-3",
                  "border-sky-500/25",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-800 dark:text-sky-200 sm:size-10">
                  <RotateCcw className="size-[1rem] sm:size-[1.05rem]" aria-hidden />
                </span>
                <span className="mt-2 min-w-0 space-y-0.5 px-0.5">
                  <span className="block text-balance text-[10px] font-semibold leading-tight text-foreground sm:text-[11px]">
                    Re check in as you get better
                  </span>
                  <span className="block text-[8px] font-medium uppercase leading-snug tracking-wide text-sky-800/88 dark:text-sky-200/88 sm:text-[9px]">
                    Refresh your snapshot
                  </span>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
