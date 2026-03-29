import {
  LANDING_TOUR_STEPS,
  ONBOARDING_TOUR_UNLOCK_STEP_INDEX,
  type TourPhase,
} from "@/lib/onboarding/guided-tour-config";

export type TourPanelPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "center";

export function queryTourAnchorEl(
  highlightKey: string | null,
): HTMLElement | null {
  if (!highlightKey || typeof document === "undefined") return null;
  if (highlightKey === "data-tour-submit") {
    return document.querySelector("[data-tour-submit]");
  }
  return document.querySelector(`[data-tour="${highlightKey}"]`) as HTMLElement | null;
}

/** Picks a side with the most free space so the tour card stays off the focused region. */
export function computeTourPanelPlacement(
  el: HTMLElement | null,
): TourPanelPlacement {
  if (!el || typeof window === "undefined") return "center";
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estH = 260;
  const estW = 400;
  const gap = 24;

  const below = vh - r.bottom - gap;
  const above = r.top - gap;
  const rightSpace = vw - r.right - gap;
  const leftSpace = r.left - gap;

  if (below >= estH && below >= above) return "bottom";
  if (above >= estH && above > below) return "top";
  if (rightSpace >= estW && rightSpace >= leftSpace) return "right";
  if (leftSpace >= estW) return "left";
  return "bottom";
}

const ONBOARDING_RAIL_MIN_WIDTH = 520;

/**
 * Onboarding check-in steps: keep the tour card on the **right** so the form
 * and Continue stay visible; on very narrow viewports fall back to bottom.
 */
export function computeOnboardingTourPlacement(): TourPanelPlacement {
  if (typeof window === "undefined") return "right";
  return window.innerWidth >= ONBOARDING_RAIL_MIN_WIDTH ? "right" : "bottom";
}

export function getPanelAnchorKey(
  phase: TourPhase | null,
  stepIndex: number,
): string | null {
  if (!phase || phase === "dashboard") return null;
  if (phase === "landing") {
    return LANDING_TOUR_STEPS[stepIndex]?.highlight ?? null;
  }
  if (stepIndex <= ONBOARDING_TOUR_UNLOCK_STEP_INDEX) {
    return stepIndex === ONBOARDING_TOUR_UNLOCK_STEP_INDEX
      ? "data-tour-submit"
      : "onboarding-form";
  }
  return null;
}
