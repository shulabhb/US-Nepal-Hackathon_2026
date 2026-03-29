"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import {
  ClipboardList,
  Loader2,
  Lock,
  MessageCircle,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getCheckinHistory } from "@/lib/api/checkins";
import {
  DASHBOARD_PLANS_MUTATED_EVENT,
  getPlans,
} from "@/lib/api/plans";
import {
  CHECKIN_AGAIN_BUTTON,
  CHECKIN_INVITE,
} from "@/lib/app-copy";
import {
  buildBurnoutViewModel,
  buildDashboardAlignedBurnoutViewModel,
  emptyBurnoutViewModel,
  overviewBestServices,
  overviewChatReason,
  planCompletionReliefComposite,
  previousCheckinFromHistory,
  type OverviewNextMoveKind,
} from "@/lib/burnout/burnout-view-model";
import { OverviewStatusSection } from "@/components/dashboard/overview-status-section";
import { StrainRingGauge } from "@/components/dashboard/strain-ring-gauge";
import { computeBurnoutTaskProjection } from "@/lib/dashboard/burnout-projection";
import { buildOverviewSupportSurface } from "@/lib/dashboard/overview-support-surface";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

/** Frosted overlay + CTA — same visual system as unlocked card; `compact` for the two-ring projection strip only. */
function StrainMetersLockOverlay({
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  planAction = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** Narrower padding when overlay covers only “If not paced” + “With your plan”. */
  compact?: boolean;
  /** Primary + clipboard icon, consistent with Plan shortcuts and “Tailored plan”. */
  planAction?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex rounded-lg",
        compact
          ? "items-center justify-center overflow-hidden px-1 py-1.5 sm:px-2 sm:py-2"
          : "items-center justify-center overflow-hidden px-2 py-4 sm:px-4 sm:py-5",
      )}
      role="region"
      aria-label={title}
    >
      <div
        className="absolute inset-0 rounded-lg bg-background/45 backdrop-blur-[8px] dark:bg-background/50"
        aria-hidden
      />
      <div
        className={cn(
          "relative z-[1] flex flex-col items-center gap-1.5 overflow-y-auto px-2 text-center sm:gap-2",
          compact
            ? "max-h-[min(100%,9.5rem)] w-full max-w-[13rem] sm:max-h-[min(100%,10rem)]"
            : "max-h-[min(100%,12rem)] max-w-[16rem] sm:gap-2.5 md:max-w-[17rem]",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto flex shrink-0 items-center justify-center rounded-full border border-border/55 bg-background/70 shadow-md backdrop-blur-md ring-1 ring-border/35 dark:bg-card/75",
            compact ? "size-9" : "size-11",
          )}
          aria-hidden
        >
          <Lock
            className={cn(
              "text-muted-foreground",
              compact ? "size-3.5" : "size-5",
            )}
            strokeWidth={2.25}
          />
        </div>
        <p className="pointer-events-auto shrink-0 text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
          {title}
        </p>
        <p
          className={cn(
            "pointer-events-auto min-h-0 w-full overflow-y-auto text-[10px] leading-snug text-muted-foreground sm:text-[11px] sm:leading-relaxed",
            compact ? "max-h-[3.75rem] sm:max-h-[4rem]" : "max-h-[5.25rem] sm:max-h-[5.75rem]",
          )}
        >
          {description}
        </p>
        {planAction ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            className={cn(
              "pointer-events-auto gap-2 rounded-xl font-semibold shadow-sm",
              compact
                ? "h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm"
                : "h-9 px-4 text-sm sm:h-10",
            )}
            onClick={onAction}
          >
            {compact ? (
              <ClipboardList className="size-3.5 shrink-0 sm:size-4" aria-hidden />
            ) : (
              <ClipboardList className="size-4 shrink-0" aria-hidden />
            )}
            {actionLabel}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="pointer-events-auto rounded-xl shadow-sm"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

type Props = {
  checkin: CheckinDetailResponse | null;
  anonymousId: string;
  riskLabel: string;
  onOpenChat: () => void;
  onOpenPlan: () => void;
  /** “Personalize a plan” — open chat with guided plan flow. */
  onPersonalizePlan: () => void;
  onOpenBurnout: () => void;
  onRetake: () => void;
};

export function DashboardOverviewBurnout({
  checkin,
  anonymousId,
  riskLabel,
  onOpenChat,
  onOpenPlan,
  onPersonalizePlan,
  onOpenBurnout,
  onRetake,
}: Props) {
  const hasCheckin = checkin != null;
  const [previousCheckin, setPreviousCheckin] =
    useState<CheckinDetailResponse | null>(null);
  const [plans, setPlans] = useState<StoredPlan[]>([]);
  /** False until history + plans load so strain matches one pipeline (no flash). */
  const [planContextReady, setPlanContextReady] = useState(() => !hasCheckin);

  useEffect(() => {
    let cancelled = false;

    if (!checkin?.id) {
      setPlans([]);
      setPreviousCheckin(null);
      setPlanContextReady(true);
      return;
    }

    setPlanContextReady(false);
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
      setPlanContextReady(true);
    });

    const onPlansMutated = () => {
      void getPlans(anonymousId)
        .then((rows) => {
          if (!cancelled) setPlans(rows);
        })
        .catch(() => {
          if (!cancelled) setPlans([]);
        });
    };
    window.addEventListener(DASHBOARD_PLANS_MUTATED_EVENT, onPlansMutated);
    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_PLANS_MUTATED_EVENT, onPlansMutated);
    };
  }, [anonymousId, checkin?.id]);

  const modelRaw = useMemo(() => {
    if (!checkin) return emptyBurnoutViewModel();
    return buildBurnoutViewModel(checkin, {
      previousCheckin,
      latestPlanChecklist: plans[0]?.checklist_items ?? null,
    });
  }, [checkin, previousCheckin, plans]);

  const model = useMemo(() => {
    if (!checkin) return emptyBurnoutViewModel();
    return buildDashboardAlignedBurnoutViewModel(checkin, {
      previousCheckin,
      plans,
    });
  }, [checkin, previousCheckin, plans]);

  const serviceRecs = useMemo(
    () =>
      overviewBestServices(model, plans, checkin?.created_at ?? null).slice(
        0,
        3,
      ),
    [model, plans, checkin?.created_at],
  );

  const supportSurface = useMemo(
    () =>
      checkin
        ? buildOverviewSupportSurface(checkin, model, plans, riskLabel)
        : null,
    [checkin, model, plans, riskLabel],
  );

  const taskProjection = useMemo(() => {
    if (!checkin) {
      return {
        hasSignal: false,
        current: 0,
        ifNeglected: 0,
        withTailoredPlan: 0,
        loadLine: null as string | null,
      };
    }
    const proj = computeBurnoutTaskProjection({
      checkin,
      plans,
      composite: modelRaw.composite,
    });
    const relief = planCompletionReliefComposite(
      checkin,
      plans,
      modelRaw.composite,
    );
    if (relief == null) return proj;
    return {
      ...proj,
      current: relief,
      ifNeglected: relief,
      withTailoredPlan: relief,
    };
  }, [checkin, plans, modelRaw.composite]);

  const goService = (id: OverviewNextMoveKind) => {
    if (id === "chat") onOpenChat();
    else if (id === "plan") onOpenPlan();
    else if (id === "burnout") onOpenBurnout();
    else onRetake();
  };

  const blurb = (s: string, max = 240) => {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
  };

  const planRec = serviceRecs.find((r) => r.id === "plan");
  const chatRec = serviceRecs.find((r) => r.id === "chat");

  const planReasonFallback =
    planRec?.reason ??
    "Shape steps from your check-in so strain has somewhere practical to go.";
  const planReason = hasCheckin
    ? planReasonFallback
    : "You can sketch a plan anytime. Add a check-in later if you want steps aligned with how you feel.";
  const chatTitle = chatRec?.title ?? "Support chat";
  const chatReason = chatRec?.reason ?? overviewChatReason(model);

  const planServiceBlurb = blurb(planReason);
  const chatServiceBlurb = blurb(chatReason);
  const burnoutServiceBlurb =
    "See interpreted strain, dimension detail, and your saved check-ins in one place—useful when you want depth beyond the overview rings and heatmap-style summaries.";
  const checkinServiceBlurb = hasCheckin
    ? blurb(
        "Refresh when life shifts—your snapshot keeps rings and guidance aligned with how you are now.",
        280,
      )
    : "A short, anonymous snapshot of stress, sleep, energy, and pressures—updates your Now ring and keeps Plan, Chat, and burnout views grounded in how you’re doing now.";

  const showStrainUi = !hasCheckin || planContextReady;

  const allMetersLocked = !hasCheckin;
  const projectionPairLocked =
    showStrainUi && hasCheckin && !taskProjection.hasSignal;

  /** “Now” uses check-in + latest plan checklist (follow-through) via the view model; full triple projections need My tasks. */
  const nowComposite =
    showStrainUi && hasCheckin ? taskProjection.current : 0;
  const neglectComposite =
    showStrainUi && taskProjection.hasSignal
      ? taskProjection.ifNeglected
      : 0;
  const withPlanComposite =
    showStrainUi && taskProjection.hasSignal
      ? taskProjection.withTailoredPlan
      : 0;

  const pairDimmed = allMetersLocked || projectionPairLocked;

  return (
    <div className="space-y-4">
      {/* What helps now — full-width horizontal band */}
      <section
        className={cn(
          "rounded-2xl border border-primary/25 bg-card/90 shadow-lg shadow-primary/[0.07] ring-1 ring-primary/10 backdrop-blur-sm",
          "relative z-[1] flex flex-col p-5 sm:p-6 lg:p-6",
        )}
        aria-labelledby="overview-support-heading"
      >
        <div className="flex flex-col gap-8 border-b border-border/50 pb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1 lg:max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              What helps now
            </p>
            <h2
              id="overview-support-heading"
              className="font-heading mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[1.75rem] lg:leading-tight xl:text-4xl xl:leading-[1.1]"
            >
              {hasCheckin
                ? "Turn today’s signals into action"
                : "Your workspace—no check-in required"}
            </h2>
            <div className="mt-3 max-w-xl space-y-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
              {!hasCheckin ? (
                <p className="text-balance">
                  Open Plan or Chat anytime. The three rings match your dashboard
                  layout; add a check-in when you want them to light up—optional
                  and private.
                </p>
              ) : !showStrainUi ? (
                <p className="text-balance">
                  Loading saved plans and history so the strain readout matches
                  your workspace—one calculation, no jump.
                </p>
              ) : taskProjection.hasSignal ? (
                <>
                  <p className="text-balance">
                    Three illustrative strain rings from your check-in and saved
                    tasks—not a medical score.
                  </p>
                  <p className="text-balance">
                    Hover or focus each info icon beside a label for what that
                    ring means.
                  </p>
                </>
              ) : (
                <p className="text-balance">
                  The three projection rings preview at zero until your saved plan
                  includes tasks in{" "}
                  <span className="font-medium text-foreground">My tasks</span>.
                  Your overall strain below still reflects your latest check-in.
                </p>
              )}
              {hasCheckin && showStrainUi ? (
                <p className="mt-3 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
                  Has things changed since your last check-in?{" "}
                  <Link
                    href="/onboarding"
                    className="font-medium text-primary underline decoration-primary/45 underline-offset-[3px] transition-colors hover:text-primary/90 hover:decoration-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Re-check-in
                  </Link>{" "}
                  to update your snapshot.
                </p>
              ) : null}
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-[min(100%,26.5rem)] xl:w-[min(100%,28.5rem)]">
            <div
              className={cn(
                "rounded-2xl border border-border/50 px-4 py-5 shadow-md shadow-black/[0.04]",
                "bg-gradient-to-b from-card via-card to-muted/15 ring-1 ring-border/35 sm:px-5 sm:py-6",
              )}
            >
              <p
                className="mb-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85 sm:text-[11px]"
                id="overview-burnout-meters-heading"
              >
                Burnout meters
              </p>
              <div className="relative rounded-lg">
                {hasCheckin && !planContextReady ? (
                  <div
                    className="flex min-h-[10.25rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8"
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2
                      className="size-7 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                    <p className="text-center text-xs text-muted-foreground sm:text-sm">
                      Aligning strain with your saved plans…
                    </p>
                  </div>
                ) : (
                  <Tooltip.Provider delay={150} closeDelay={80}>
                    <div
                      className={cn(
                        "-mx-1 flex min-h-[8.75rem] min-w-0 flex-nowrap items-start gap-x-4 pb-2 pt-0.5 sm:min-h-[10.25rem] sm:gap-x-6 md:gap-x-7",
                        /* overflow-x makes overflow-y clip absolute overlays; only scroll when scenarios are unlocked */
                        projectionPairLocked && !allMetersLocked
                          ? "overflow-x-visible overflow-y-visible"
                          : "overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden",
                      )}
                      role="group"
                      aria-labelledby="overview-burnout-meters-heading"
                      aria-describedby={
                        allMetersLocked || projectionPairLocked
                          ? "meters-lock-help"
                          : undefined
                      }
                    >
                      <div
                        className={cn(
                          "shrink-0 transition-[opacity,filter] duration-200",
                          allMetersLocked &&
                            "opacity-[0.42] saturate-[0.9]",
                        )}
                      >
                        <StrainRingGauge
                          composite={nowComposite}
                          label="Now"
                          variant="triple"
                          infoDescription={
                            hasCheckin
                              ? "Blended strain from your latest check-in plus follow-through on your saved plan checklist—open demanding steps tend to raise this readout; completed restorative or pacing steps tend to ease it."
                              : "Lights up after a saved check-in: stress, energy, sleep, and how you’re keeping up with plan checklist steps."
                          }
                        />
                      </div>

                      <div className="relative flex shrink-0 flex-nowrap items-start gap-x-4 sm:gap-x-6 md:gap-x-7">
                        <div
                          className={cn(
                            "shrink-0 transition-[opacity,filter] duration-200",
                            pairDimmed &&
                              "opacity-[0.42] saturate-[0.9]",
                          )}
                        >
                          <StrainRingGauge
                            composite={neglectComposite}
                            label="If not paced"
                            variant="triple"
                            infoDescription={
                              taskProjection.hasSignal
                                ? "A rough illustration if the tasks and times you listed stay on full blast without pacing or boundaries. Based on your task list and energy signal—not a prediction."
                                : "Needs a saved plan with tasks in My tasks—illustrates strain if workload stays at full blast without pacing."
                            }
                          />
                        </div>
                        <div
                          className={cn(
                            "shrink-0 transition-[opacity,filter] duration-200",
                            pairDimmed &&
                              "opacity-[0.42] saturate-[0.9]",
                          )}
                        >
                          <StrainRingGauge
                            composite={withPlanComposite}
                            label="With your plan"
                            variant="triple"
                            infoDescription={
                              taskProjection.hasSignal
                                ? "Illustrative strain if you follow pacing and the steps in your saved plan (including recovery-style items). For motivation, not precision."
                                : "Needs a saved plan with tasks in My tasks—motivational strain readout if you follow pacing and saved steps."
                            }
                          />
                        </div>

                        {projectionPairLocked && !allMetersLocked ? (
                          <StrainMetersLockOverlay
                            compact
                            planAction
                            title="Scenario rings locked"
                            description="Personalize a plan with tasks in My tasks to unlock these two projections—they use your task list and energy signal."
                            actionLabel="Personalize a plan"
                            onAction={onPersonalizePlan}
                          />
                        ) : null}
                      </div>
                    </div>
                  </Tooltip.Provider>
                )}

                {showStrainUi && (allMetersLocked || projectionPairLocked) ? (
                  <p id="meters-lock-help" className="sr-only">
                    {allMetersLocked
                      ? "All three rings are previews at zero until you add a check-in."
                      : "Now reflects your saved check-in and plan checklist. Add tasks in My tasks to unlock If not paced and With your plan."}
                  </p>
                ) : null}

                {showStrainUi && allMetersLocked ? (
                  <StrainMetersLockOverlay
                    title="Meters locked"
                    description="Add a check-in to unlock your Now ring and the summary below. Task scenarios unlock once you save a plan with My tasks."
                    actionLabel={CHECKIN_INVITE}
                    onAction={onRetake}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {hasCheckin && planContextReady && supportSurface ? (
          <OverviewStatusSection
            surface={supportSurface}
            disclaimer={model.disclaimer}
            onNavigate={goService}
            onPersonalizePlan={onPersonalizePlan}
          />
        ) : null}

        <div className="mt-6 sm:mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What can help?
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Each workspace area has a different job—pick where you need relief,
            structure, or a place to think out loud. None of this replaces
            professional care or crisis support.
          </p>
          {!showStrainUi && hasCheckin ? (
            <ul
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
              aria-hidden
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[9.5rem] animate-pulse rounded-xl border border-border/40 bg-muted/30"
                />
              ))}
            </ul>
          ) : null}
          {showStrainUi || !hasCheckin ? (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <li className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left shadow-sm",
                  "transition-colors hover:border-primary/35 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={() => goService("plan")}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <ClipboardList className="size-[1.125rem]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      Plan
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-primary/90">
                      Checklists & My tasks
                    </span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {planServiceBlurb}
                </p>
              </button>
            </li>
            <li className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left shadow-sm",
                  "transition-colors hover:border-violet-500/40 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={() => goService("chat")}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-700 dark:text-violet-300">
                    <MessageCircle className="size-[1.125rem]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      Support chat
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium leading-snug text-violet-700 dark:text-violet-300">
                      {blurb(chatTitle, 90)}
                    </span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {chatServiceBlurb}
                </p>
              </button>
            </li>
            <li className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left shadow-sm",
                  "transition-colors hover:border-amber-500/40 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={() => goService("burnout")}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-800 dark:text-amber-200">
                    <Target className="size-[1.125rem]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      Burnout
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-200/90">
                      Full snapshot & history
                    </span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {burnoutServiceBlurb}
                </p>
              </button>
            </li>
            <li className="min-w-0">
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col gap-3 rounded-xl border border-border/50 bg-card/60 p-4 text-left shadow-sm",
                  "transition-colors hover:border-sky-500/40 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                onClick={() => goService("retake")}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-800 dark:text-sky-200">
                    <RotateCcw className="size-[1.125rem]" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {hasCheckin ? CHECKIN_AGAIN_BUTTON : CHECKIN_INVITE}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-sky-800/90 dark:text-sky-200/90">
                      {hasCheckin ? "Refresh your snapshot" : "Optional & private"}
                    </span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {checkinServiceBlurb}
                </p>
              </button>
            </li>
          </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
