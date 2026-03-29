"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

import {
  DASHBOARD_TOUR_STEPS,
  dashboardTourStepIndexById,
  markDashboardTourDone,
  PENDING_DASHBOARD_TOUR_SESSION_KEY,
} from "@/lib/onboarding/dashboard-tour-config";
import {
  GUIDED_TOUR_SESSION_KEY,
  LANDING_TOUR_STEPS,
  ONBOARDING_TOUR_COPY,
  ONBOARDING_TOUR_UNLOCK_STEP_INDEX,
  pickAffirmation,
  type TourPhase,
  tourPhaseFromPath,
} from "@/lib/onboarding/guided-tour-config";
import { markWorkspaceTutorialCompleted } from "@/lib/onboarding/tutorial-storage";

import { GuidedTourPanel } from "./guided-tour-panel";
import { TourAffirmation } from "./tour-affirmation";
import { TourBackdrop } from "./tour-backdrop";
import { TourPointerArrow } from "./tour-pointer-arrow";
import {
  computeOnboardingTourPlacement,
  computeTourPanelPlacement,
  getPanelAnchorKey,
  queryTourAnchorEl,
  type TourPanelPlacement,
} from "./tour-panel-placement";
import { TourSpotlight } from "./tour-spotlight";

type Persisted = {
  active: boolean;
  phase: TourPhase;
  stepIndex: number;
};

function readPersisted(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GUIDED_TOUR_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function writePersisted(p: Persisted | null): void {
  if (typeof window === "undefined") return;
  if (!p) {
    sessionStorage.removeItem(GUIDED_TOUR_SESSION_KEY);
    return;
  }
  sessionStorage.setItem(GUIDED_TOUR_SESSION_KEY, JSON.stringify(p));
}

function clearHighlight(el: Element | null) {
  if (!el || !(el instanceof HTMLElement)) return;
  el.classList.remove(
    "ring-2",
    "ring-primary",
    "ring-offset-2",
    "ring-offset-background",
    "rounded-xl",
    "z-[195]",
    "relative",
    "transition-shadow",
    "duration-300",
  );
}

function applyHighlight(selector: string | null): () => void {
  if (!selector || typeof document === "undefined") {
    return () => {};
  }
  let el: Element | null = null;
  if (selector === "data-tour-submit") {
    el = document.querySelector("[data-tour-submit]");
  } else {
    el = document.querySelector(`[data-tour="${selector}"]`);
  }
  if (!el || !(el instanceof HTMLElement)) {
    return () => {};
  }
  el.classList.add(
    "ring-2",
    "ring-primary",
    "ring-offset-2",
    "ring-offset-background",
    "rounded-xl",
    "z-[195]",
    "relative",
    "transition-shadow",
    "duration-300",
  );
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  return () => clearHighlight(el);
}

export type GuidedTourContextValue = {
  isActive: boolean;
  phase: TourPhase | null;
  /** Step within the current phase. */
  stepIndex: number;
  startTour: () => void;
  /** First-time workspace walkthrough after check-in (from overview). */
  startDashboardTour: () => void;
  completeDashboardTour: () => void;
  /** After user taps “Open Plan page” from chat during the tour, jump to the Plan step. */
  syncDashboardAfterPlanLinkClick: () => void;
  cancelTour: () => void;
  prevStep: () => void;
  /** Advance one dashboard step (e.g. after plan generation completes). */
  advanceDashboardStep: () => void;
  runSubmitWithAffirmation: (phase: TourPhase, fn: () => void) => void;
};

const GuidedTourContext = React.createContext<GuidedTourContextValue | null>(
  null,
);

export function useGuidedTour(): GuidedTourContextValue | null {
  return React.useContext(GuidedTourContext);
}

/** Wrap a navigation/submit handler so the guided tour shows an affirmation first when active. */
export function useTourSubmit(phase: TourPhase) {
  const tour = useGuidedTour();
  return React.useCallback(
    (fn: () => void) => {
      if (!tour) {
        fn();
        return;
      }
      tour.runSubmitWithAffirmation(phase, fn);
    },
    [tour, phase],
  );
}

/** True while the opaque tour is on intro steps — form fields should be inert / dimmed. */
export function useTourFormFieldsLocked(formPhase: TourPhase): boolean {
  const tour = useGuidedTour();
  if (!tour?.isActive || tour.phase !== formPhase) return false;
  return tour.stepIndex < ONBOARDING_TOUR_UNLOCK_STEP_INDEX;
}

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isActive, setIsActive] = React.useState(false);
  const [phase, setPhase] = React.useState<TourPhase | null>(null);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [affirmation, setAffirmation] = React.useState<string | null>(null);
  const [panelPlacement, setPanelPlacement] =
    React.useState<TourPanelPlacement>("center");
  const clearHighlightRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    const p = readPersisted();
    const pathPhase = pathname ? tourPhaseFromPath(pathname) : null;

    if (pathname === "/dashboard") {
      if (p?.active && p.phase === "dashboard") {
        const max = DASHBOARD_TOUR_STEPS.length - 1;
        const safe = Math.min(Math.max(0, p.stepIndex), max);
        setPhase("dashboard");
        setStepIndex(safe);
        setIsActive(true);
        if (safe !== p.stepIndex) {
          writePersisted({ active: true, phase: "dashboard", stepIndex: safe });
        }
        return;
      }
      // Session no longer describes a dashboard tour (e.g. cleared after onboarding
      // submit), but React can still hold the last onboarding step — that strand
      // shows "You're set" / Scroll to actions on the dashboard with no submit row.
      clearHighlightRef.current?.();
      clearHighlightRef.current = null;
      writePersisted(null);
      setIsActive(false);
      setPhase(null);
      setStepIndex(0);
      setAffirmation(null);
      return;
    }

    if (!p?.active || !p.phase) {
      return;
    }

    if (!pathPhase) {
      writePersisted(null);
      setIsActive(false);
      setPhase(null);
      setStepIndex(0);
      return;
    }

    if (pathPhase !== p.phase) {
      writePersisted({ active: true, phase: pathPhase, stepIndex: 0 });
      setPhase(pathPhase);
      setStepIndex(0);
      setIsActive(true);
      return;
    }

    setPhase(p.phase);
    if (p.phase === "landing") {
      const max = LANDING_TOUR_STEPS.length - 1;
      const safe = Math.min(Math.max(0, p.stepIndex), max);
      setStepIndex(safe);
      if (safe !== p.stepIndex) {
        writePersisted({ active: true, phase: "landing", stepIndex: safe });
      }
    } else {
      setStepIndex(p.stepIndex);
    }
    setIsActive(true);
  }, [pathname]);

  React.useEffect(() => {
    clearHighlightRef.current?.();
    clearHighlightRef.current = null;
    if (!isActive || affirmation) return;

    if (phase === "landing") {
      const step = LANDING_TOUR_STEPS[stepIndex];
      if (step?.highlight) {
        const t = window.setTimeout(() => {
          clearHighlightRef.current = applyHighlight(step.highlight);
        }, 80);
        return () => {
          window.clearTimeout(t);
          clearHighlightRef.current?.();
          clearHighlightRef.current = null;
        };
      }
      return () => {
        clearHighlightRef.current?.();
        clearHighlightRef.current = null;
      };
    }

    if (phase === "dashboard") {
      const h = DASHBOARD_TOUR_STEPS[stepIndex]?.highlight;
      if (h) {
        const t = window.setTimeout(() => {
          clearHighlightRef.current = applyHighlight(h);
        }, 80);
        return () => {
          window.clearTimeout(t);
          clearHighlightRef.current?.();
          clearHighlightRef.current = null;
        };
      }
      return () => {
        clearHighlightRef.current?.();
        clearHighlightRef.current = null;
      };
    }

    if (phase) {
      if (stepIndex < ONBOARDING_TOUR_UNLOCK_STEP_INDEX) {
        const t = window.setTimeout(() => {
          clearHighlightRef.current = applyHighlight("onboarding-form");
        }, 80);
        return () => {
          window.clearTimeout(t);
          clearHighlightRef.current?.();
          clearHighlightRef.current = null;
        };
      }
      if (stepIndex === ONBOARDING_TOUR_UNLOCK_STEP_INDEX) {
        const t = window.setTimeout(() => {
          clearHighlightRef.current = applyHighlight("data-tour-submit");
        }, 120);
        return () => {
          window.clearTimeout(t);
          clearHighlightRef.current?.();
          clearHighlightRef.current = null;
        };
      }
    }
    return () => {
      clearHighlightRef.current?.();
      clearHighlightRef.current = null;
    };
  }, [isActive, phase, stepIndex, affirmation, pathname]);

  const persist = React.useCallback(
    (next: { active: boolean; phase: TourPhase; stepIndex: number }) => {
      writePersisted(next);
      setPhase(next.phase);
      setStepIndex(next.stepIndex);
      setIsActive(next.active);
    },
    [],
  );

  const startTour = React.useCallback(() => {
    persist({ active: true, phase: "landing", stepIndex: 0 });
  }, [persist]);

  const startDashboardTour = React.useCallback(() => {
    try {
      sessionStorage.removeItem(PENDING_DASHBOARD_TOUR_SESSION_KEY);
    } catch {
      /* ignore */
    }
    persist({ active: true, phase: "dashboard", stepIndex: 0 });
  }, [persist]);

  const completeDashboardTour = React.useCallback(() => {
    clearHighlightRef.current?.();
    clearHighlightRef.current = null;
    writePersisted(null);
    setIsActive(false);
    setPhase(null);
    setStepIndex(0);
    setAffirmation(null);
    markDashboardTourDone();
    markWorkspaceTutorialCompleted();
    try {
      sessionStorage.removeItem(PENDING_DASHBOARD_TOUR_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const syncDashboardAfterPlanLinkClick = React.useCallback(() => {
    const composerIdx = dashboardTourStepIndexById("chat-composer");
    const planIdx = dashboardTourStepIndexById("nav-plan");
    if (phase !== "dashboard" || composerIdx < 0 || planIdx < 0) return;
    if (stepIndex !== composerIdx) return;
    writePersisted({ active: true, phase: "dashboard", stepIndex: planIdx });
    setStepIndex(planIdx);
  }, [phase, stepIndex]);

  const cancelTour = React.useCallback(() => {
    clearHighlightRef.current?.();
    clearHighlightRef.current = null;
    writePersisted(null);
    setIsActive(false);
    setPhase(null);
    setStepIndex(0);
    setAffirmation(null);
    try {
      sessionStorage.removeItem(PENDING_DASHBOARD_TOUR_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const advanceDashboardStep = React.useCallback(() => {
    if (phase !== "dashboard") return;
    const last = DASHBOARD_TOUR_STEPS.length - 1;
    if (stepIndex >= last) return;
    const n = stepIndex + 1;
    writePersisted({ active: true, phase: "dashboard", stepIndex: n });
    setStepIndex(n);
  }, [phase, stepIndex]);

  const prevStep = React.useCallback(() => {
    if (!phase) return;
    if (phase === "landing") {
      if (stepIndex <= 0) return;
      const n = stepIndex - 1;
      persist({ active: true, phase: "landing", stepIndex: n });
      return;
    }
    if (phase === "dashboard") {
      if (stepIndex <= 0) return;
      const n = stepIndex - 1;
      persist({ active: true, phase: "dashboard", stepIndex: n });
      return;
    }
    if (stepIndex <= 0) return;
    const n = stepIndex - 1;
    persist({ active: true, phase, stepIndex: n });
  }, [phase, stepIndex, persist]);

  const nextStep = React.useCallback(() => {
    if (!phase) return;
    if (phase === "landing") {
      const last = LANDING_TOUR_STEPS.length - 1;
      if (stepIndex < last) {
        const n = stepIndex + 1;
        writePersisted({ active: true, phase: "landing", stepIndex: n });
        setStepIndex(n);
        return;
      }
      document
        .querySelector('[data-tour="landing-checkin-cta"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (phase === "dashboard") {
      const last = DASHBOARD_TOUR_STEPS.length - 1;
      if (stepIndex < last) {
        const n = stepIndex + 1;
        writePersisted({ active: true, phase: "dashboard", stepIndex: n });
        setStepIndex(n);
      }
      return;
    }
    if (stepIndex < ONBOARDING_TOUR_UNLOCK_STEP_INDEX) {
      const n = stepIndex + 1;
      writePersisted({ active: true, phase, stepIndex: n });
      setStepIndex(n);
      return;
    }
    document
      .querySelector("[data-tour-submit]")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [phase, stepIndex]);

  const runSubmitWithAffirmation = React.useCallback(
    (expectedPhase: TourPhase, fn: () => void) => {
      if (!isActive || phase !== expectedPhase) {
        fn();
        return;
      }
      if (expectedPhase === "dashboard") {
        fn();
        return;
      }
      if (
        expectedPhase !== "landing" &&
        stepIndex < ONBOARDING_TOUR_UNLOCK_STEP_INDEX
      ) {
        fn();
        return;
      }
      setAffirmation(pickAffirmation(expectedPhase));
      window.setTimeout(() => {
        setAffirmation(null);
        fn();
      }, 1350);
    },
    [isActive, phase, stepIndex],
  );

  const ctx = React.useMemo<GuidedTourContextValue>(
    () => ({
      isActive,
      phase,
      stepIndex,
      startTour,
      startDashboardTour,
      completeDashboardTour,
      syncDashboardAfterPlanLinkClick,
      cancelTour,
      prevStep,
      advanceDashboardStep,
      runSubmitWithAffirmation,
    }),
    [
      isActive,
      phase,
      stepIndex,
      startTour,
      startDashboardTour,
      completeDashboardTour,
      syncDashboardAfterPlanLinkClick,
      cancelTour,
      prevStep,
      advanceDashboardStep,
      runSubmitWithAffirmation,
    ],
  );

  const onboardingCopy =
    phase != null &&
    phase !== "landing" &&
    phase !== "dashboard"
      ? ONBOARDING_TOUR_COPY[phase]
      : null;

  const showPointerArrow =
    !affirmation &&
    isActive &&
    ((phase &&
      phase !== "landing" &&
      phase !== "dashboard" &&
      stepIndex >= ONBOARDING_TOUR_UNLOCK_STEP_INDEX) ||
      (phase === "landing" &&
        stepIndex === LANDING_TOUR_STEPS.length - 1));

  const pointerTarget: "submit" | "landing-cta" =
    phase === "landing" ? "landing-cta" : "submit";

  const spotlightHighlightKey: string | null = (() => {
    if (!isActive || affirmation || !phase) return null;
    if (phase === "dashboard") {
      return DASHBOARD_TOUR_STEPS[stepIndex]?.highlight ?? null;
    }
    if (phase === "landing") {
      return LANDING_TOUR_STEPS[stepIndex]?.highlight ?? null;
    }
    if (
      onboardingCopy != null &&
      stepIndex <= ONBOARDING_TOUR_UNLOCK_STEP_INDEX
    ) {
      return "onboarding-form";
    }
    return null;
  })();

  const showSpotlight = spotlightHighlightKey != null;

  const showFullBackdrop =
    isActive &&
    !affirmation &&
    ((phase === "landing" && !LANDING_TOUR_STEPS[stepIndex]?.highlight) ||
      (phase === "dashboard" && !DASHBOARD_TOUR_STEPS[stepIndex]?.highlight));

  const showPanel =
    isActive &&
    phase &&
    !affirmation &&
    (phase === "landing" ||
      (onboardingCopy != null &&
        stepIndex >= 0 &&
        stepIndex <= ONBOARDING_TOUR_UNLOCK_STEP_INDEX) ||
      (phase === "dashboard" &&
        stepIndex >= 0 &&
        stepIndex < DASHBOARD_TOUR_STEPS.length));

  React.useLayoutEffect(() => {
    if (!showPanel || !phase) {
      setPanelPlacement("center");
      return;
    }
    const update = () => {
      if (phase === "landing") {
        const anchor = getPanelAnchorKey(phase, stepIndex);
        const el = queryTourAnchorEl(anchor);
        setPanelPlacement(computeTourPanelPlacement(el));
        return;
      }
      if (phase === "dashboard") {
        const sid = DASHBOARD_TOUR_STEPS[stepIndex]?.id;
        if (sid?.startsWith("plan-")) {
          setPanelPlacement("right");
          return;
        }
        const key = DASHBOARD_TOUR_STEPS[stepIndex]?.highlight ?? null;
        const el = queryTourAnchorEl(key);
        setPanelPlacement(computeTourPanelPlacement(el));
        return;
      }
      setPanelPlacement(computeOnboardingTourPlacement());
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [showPanel, phase, stepIndex]);

  const canGoPrevious = stepIndex > 0;

  return (
    <GuidedTourContext.Provider value={ctx}>
      {children}
      {showFullBackdrop ? <TourBackdrop strength="heavy" /> : null}
      {showSpotlight && spotlightHighlightKey ? (
        <TourSpotlight active highlightKey={spotlightHighlightKey} />
      ) : null}
      {affirmation ? <TourAffirmation text={affirmation} /> : null}
      {showPointerArrow ? <TourPointerArrow target={pointerTarget} /> : null}
      {showPanel && phase ? (
        <GuidedTourPanel
          phase={phase}
          stepIndex={stepIndex}
          landingStep={
            phase === "landing"
              ? (LANDING_TOUR_STEPS[stepIndex] ?? null)
              : null
          }
          onboardingCopy={onboardingCopy ?? null}
          onNext={nextStep}
          onPrevious={prevStep}
          canGoPrevious={canGoPrevious}
          onCancel={cancelTour}
          isLastLandingStep={
            phase === "landing" &&
            stepIndex === LANDING_TOUR_STEPS.length - 1
          }
          placement={panelPlacement}
          onCompleteDashboard={completeDashboardTour}
        />
      ) : null}
    </GuidedTourContext.Provider>
  );
}
