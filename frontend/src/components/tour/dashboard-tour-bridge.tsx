"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useGuidedTour } from "@/components/tour/guided-tour-provider";
import {
  DASHBOARD_TOUR_STEPS,
  isDashboardTourDone,
  PENDING_DASHBOARD_TOUR_SESSION_KEY,
} from "@/lib/onboarding/dashboard-tour-config";
import {
  CHAT_SEED_QUICK_PLAN,
  dashboardHref,
  normalizeDashboardTab,
} from "@/lib/dashboard/dashboard-tab";

/** Keeps URL tab in sync with the dashboard guided tour and starts the tour after onboarding. */
export function DashboardTourBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tour = useGuidedTour();
  const startedPendingRef = useRef(false);

  const activeTab = normalizeDashboardTab(searchParams.get("tab"));

  useEffect(() => {
    if (!tour) return;
    if (startedPendingRef.current) return;
    if (tour.isActive) return;
    if (isDashboardTourDone()) return;
    try {
      if (sessionStorage.getItem(PENDING_DASHBOARD_TOUR_SESSION_KEY) === "1") {
        startedPendingRef.current = true;
        tour.startDashboardTour();
      }
    } catch {
      /* ignore */
    }
  }, [tour]);

  useEffect(() => {
    if (!tour?.isActive || tour.phase !== "dashboard") return;
    const step = DASHBOARD_TOUR_STEPS[tour.stepIndex];
    if (!step) return;
    const targetTab = step.tab;
    if (targetTab === activeTab) return;

    const extra: Record<string, string> | undefined =
      targetTab === "chat" && step.id === "nav-chat"
        ? { chatSeed: CHAT_SEED_QUICK_PLAN }
        : undefined;

    router.push(dashboardHref(targetTab, extra), { scroll: false });
  }, [tour, tour?.isActive, tour?.phase, tour?.stepIndex, activeTab, router]);

  return null;
}
