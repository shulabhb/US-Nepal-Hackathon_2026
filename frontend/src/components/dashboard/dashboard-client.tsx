"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SupportChatPanelHandle } from "@/components/chat/support-chat-panel";
import { SupportChatPanel } from "@/components/chat/support-chat-panel";
import { BurnoutSummarySection } from "@/components/dashboard/burnout-summary-section";
import { BurnoutCheckinSnapshotSection } from "@/components/dashboard/burnout-checkin-snapshot-section";
import { PlanTabPanel } from "@/components/dashboard/plan-tab-panel";
import { DashboardLanding } from "@/components/dashboard/dashboard-landing";
import { FirstCheckinGate } from "@/components/gates/first-checkin-gate";
import { AppShell } from "@/components/shell/app-shell";
import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import {
  CHAT_SEED_QUICK_PLAN,
  dashboardHref,
  isDashboardTabId,
  legacyDashboardTabRedirect,
  normalizeDashboardTab,
} from "@/lib/dashboard/dashboard-tab";
import { buildSeededAssistantMessage } from "@/lib/dashboard/seed-assistant-message";
import {
  deleteDeviceData,
  getLatestCheckinMaybe,
} from "@/lib/api/checkins";
import { emitDashboardPlansMutated } from "@/lib/api/plans";
import {
  clearAnonymousId,
  getOrCreateAnonymousId,
} from "@/lib/onboarding/anonymous-id";
import { clearOnboardingState } from "@/lib/onboarding/storage";
import type { CheckinDetailResponse } from "@/types/api";

function formatSavedAt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function riskLabelFrom(checkin: CheckinDetailResponse): string {
  const s = checkin.recommendation_snapshot;
  if (
    s &&
    typeof s === "object" &&
    typeof s.risk_label === "string" &&
    s.risk_label.trim()
  ) {
    return s.risk_label.trim();
  }
  return "Support focus";
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeDashboardTab(searchParams.get("tab"));

  const [phase, setPhase] = useState<"loading" | "needs_checkin" | "ready">(
    "loading",
  );
  const [checkin, setCheckin] = useState<CheckinDetailResponse | null>(null);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const [resetDeviceDataBusy, setResetDeviceDataBusy] = useState(false);
  const chatRef = useRef<SupportChatPanelHandle>(null);

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q == null || q === "") return;
    const legacy = legacyDashboardTabRedirect(q);
    if (legacy) {
      router.replace(dashboardHref(legacy));
      return;
    }
    if (!isDashboardTabId(q)) {
      router.replace(dashboardHref("overview"));
    }
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const row = await getLatestCheckinMaybe(getOrCreateAnonymousId());
        if (cancelled) return;
        if (row == null) {
          setGateNotice(null);
          setPhase("needs_checkin");
          return;
        }
        setCheckin(row);
        setPhase("ready");
      } catch {
        if (cancelled) return;
        setGateNotice(
          "We couldn’t load a saved check-in from the server. You can still start or continue check-in below.",
        );
        setPhase("needs_checkin");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const reload = useCallback(() => {
    setPhase("loading");
    void (async () => {
      try {
        const row = await getLatestCheckinMaybe(getOrCreateAnonymousId());
        if (row == null) {
          setGateNotice(null);
          setPhase("needs_checkin");
          return;
        }
        setCheckin(row);
        setPhase("ready");
      } catch {
        setGateNotice(
          "We couldn’t load a saved check-in from the server. You can still start or continue check-in below.",
        );
        setPhase("needs_checkin");
      }
    })();
  }, [router]);

  const handleRetake = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  const handleResetDeviceData = useCallback(async () => {
    if (
      !window.confirm(
        "Delete all check-ins and plans saved on this device, then go to the home page? This cannot be undone.",
      )
    ) {
      return;
    }
    setResetDeviceDataBusy(true);
    try {
      await deleteDeviceData(getOrCreateAnonymousId());
      clearOnboardingState();
      clearAnonymousId();
      emitDashboardPlansMutated();
      router.push("/");
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Could not reset data. Try again.",
      );
    } finally {
      setResetDeviceDataBusy(false);
    }
  }, [router]);

  const pushTab = useCallback(
    (tab: DashboardTabId, extra?: Record<string, string>) => {
      router.push(dashboardHref(tab, extra), { scroll: false });
    },
    [router],
  );

  const stripChatSeedFromUrl = useCallback(() => {
    router.replace(dashboardHref("chat"), { scroll: false });
  }, [router]);

  const chatSeedParam =
    activeTab === "chat" &&
    searchParams.get("chatSeed") === CHAT_SEED_QUICK_PLAN
      ? CHAT_SEED_QUICK_PLAN
      : null;

  if (phase === "loading") {
    return (
      <AppShell
        navVariant="minimal"
        onRetake={handleRetake}
        hasSavedCheckin={false}
        onResetDeviceData={handleResetDeviceData}
        resetDeviceDataBusy={resetDeviceDataBusy}
        viewportFill={activeTab === "chat"}
      >
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-20"
          aria-busy="true"
        >
          <p className="text-sm text-muted-foreground">Loading workspace…</p>
          <span className="sr-only">Loading</span>
        </div>
      </AppShell>
    );
  }

  if (phase === "needs_checkin") {
    return (
      <AppShell
        navVariant="minimal"
        onRetake={handleRetake}
        hasSavedCheckin={false}
        viewportFill={false}
      >
        <div className="relative flex min-h-[55vh] flex-1 flex-col items-center justify-center px-4 py-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-8%,oklch(0.76_0.06_215_/0.11),transparent),radial-gradient(ellipse_50%_40%_at_100%_35%,oklch(0.55_0.04_250_/0.05),transparent)]"
            aria-hidden
          />
          <FirstCheckinGate
            notice={gateNotice}
            title="Check-in first"
            description="To open the dashboard and workspace on this device, complete your first check-in. It helps us show where things stand so we can help you understand your picture—not a diagnosis, just a clearer snapshot."
            onStartCheckin={() => router.push("/onboarding")}
          />
        </div>
      </AppShell>
    );
  }

  if (!checkin) {
    return null;
  }

  const seeded = buildSeededAssistantMessage(checkin);
  const riskText = riskLabelFrom(checkin);

  return (
    <AppShell
      onRetake={handleRetake}
      hasSavedCheckin
      onResetDeviceData={handleResetDeviceData}
      resetDeviceDataBusy={resetDeviceDataBusy}
      viewportFill={activeTab === "chat"}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-8%,oklch(0.76_0.06_215_/0.11),transparent),radial-gradient(ellipse_50%_40%_at_100%_35%,oklch(0.55_0.04_250_/0.05),transparent)]"
          aria-hidden
        />

        {activeTab === "chat" ? (
          <div
            id="dashboard-main-content"
            className="relative z-0 mx-auto flex min-h-0 min-w-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-3 sm:py-4"
            role="tabpanel"
            aria-label="Support chat"
          >
            <SupportChatPanel
              ref={chatRef}
              key={checkin.id}
              anonymousId={getOrCreateAnonymousId()}
              checkin={checkin}
              initialAssistantMessage={seeded}
              onOpenBurnout={() => pushTab("burnout")}
              chatSeed={chatSeedParam}
              onChatSeedConsumed={stripChatSeedFromUrl}
            />
          </div>
        ) : (
          <div
            id="dashboard-main-content"
            className="relative z-0 mx-auto min-h-[55vh] w-full max-w-6xl px-4 py-6 sm:py-8"
          >
            {activeTab === "overview" ? (
              <div role="tabpanel" aria-label="Dashboard overview">
                <DashboardLanding
                  checkin={checkin}
                  anonymousId={getOrCreateAnonymousId()}
                  riskLabel={riskText}
                  onRetake={handleRetake}
                  onOpenChat={() => pushTab("chat")}
                  onOpenPlan={() => pushTab("plan")}
                  onPersonalizePlan={() =>
                    pushTab("chat", { chatSeed: CHAT_SEED_QUICK_PLAN })
                  }
                  onViewBurnout={() => pushTab("burnout")}
                />
              </div>
            ) : null}

            {activeTab === "plan" ? (
              <PlanTabPanel
                checkin={checkin}
                anonymousId={getOrCreateAnonymousId()}
              />
            ) : null}

            {activeTab === "burnout" ? (
              <div
                className="w-full space-y-8"
                role="tabpanel"
                aria-label="Burnout"
              >
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Burnout
                  </p>
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    Your burnout picture
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Summary and tabbed detail up top; expand{" "}
                    <span className="font-medium text-foreground/85">
                      Snapshot and history
                    </span>{" "}
                    below for essentials (latest fields and recent saves).
                  </p>
                </div>

                <BurnoutSummarySection
                  key={checkin.id}
                  checkin={checkin}
                  anonymousId={getOrCreateAnonymousId()}
                />

                <BurnoutCheckinSnapshotSection
                  checkin={checkin}
                  formattedLatestSavedAt={formatSavedAt(checkin.created_at)}
                  anonymousId={getOrCreateAnonymousId()}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
