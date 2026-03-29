"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SupportChatPanelHandle } from "@/components/chat/support-chat-panel";
import { SupportChatPanel } from "@/components/chat/support-chat-panel";
import { BurnoutSummarySection } from "@/components/dashboard/burnout-summary-section";
import { CheckinsTabPanel } from "@/components/dashboard/checkins-tab-panel";
import { PlanTabPanel } from "@/components/dashboard/plan-tab-panel";
import { DashboardLanding } from "@/components/dashboard/dashboard-landing";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import {
  dashboardHref,
  isDashboardTabId,
  legacyDashboardTabRedirect,
  normalizeDashboardTab,
} from "@/lib/dashboard/dashboard-tab";
import { buildSeededAssistantMessage } from "@/lib/dashboard/seed-assistant-message";
import { getLatestCheckinMaybe } from "@/lib/api/checkins";
import { CHECKIN_INVITE } from "@/lib/app-copy";
import { getOrCreateAnonymousId } from "@/lib/onboarding/anonymous-id";
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

function TabNeedCheckin({
  title,
  description,
  onAddCheckin,
}: {
  title: string;
  description: string;
  onAddCheckin: () => void;
}) {
  return (
    <div
      className="mx-auto max-w-md rounded-2xl border border-border/55 bg-card/85 px-6 py-10 text-center shadow-sm"
      role="region"
      aria-labelledby="need-checkin-title"
    >
      <h2
        id="need-checkin-title"
        className="font-heading text-lg font-semibold tracking-tight text-foreground"
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6 rounded-xl"
        onClick={onAddCheckin}
      >
        {CHECKIN_INVITE}
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        Optional—you can keep browsing the rest of the dashboard.
      </p>
    </div>
  );
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeDashboardTab(searchParams.get("tab"));

  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [checkin, setCheckin] = useState<CheckinDetailResponse | null>(null);
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
        setCheckin(row);
      } catch {
        if (cancelled) return;
        setCheckin(null);
      } finally {
        if (!cancelled) setPhase("ready");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(() => {
    setPhase("loading");
    void (async () => {
      try {
        const row = await getLatestCheckinMaybe(getOrCreateAnonymousId());
        setCheckin(row);
      } catch {
        setCheckin(null);
      } finally {
        setPhase("ready");
      }
    })();
  }, []);

  const handleRetake = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  const pushTab = useCallback(
    (tab: DashboardTabId) => {
      router.push(dashboardHref(tab), { scroll: false });
    },
    [router],
  );

  if (phase === "loading") {
    return (
      <AppShell
        activeTab={activeTab}
        onRetake={handleRetake}
        hasSavedCheckin={false}
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

  const seeded = checkin ? buildSeededAssistantMessage(checkin) : "";
  const riskText = checkin ? riskLabelFrom(checkin) : "";

  return (
    <AppShell
      activeTab={activeTab}
      onRetake={handleRetake}
      hasSavedCheckin={checkin != null}
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
            {checkin ? (
              <SupportChatPanel
                ref={chatRef}
                key={checkin.id}
                anonymousId={getOrCreateAnonymousId()}
                checkin={checkin}
                initialAssistantMessage={seeded}
                onOpenBurnout={() => pushTab("burnout")}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center py-12">
                <TabNeedCheckin
                  title="Chat is open—check-in optional"
                  description="A saved check-in gives the assistant a bit more context (not clinical). Add one when you want, or stay here and start talking."
                  onAddCheckin={handleRetake}
                />
              </div>
            )}
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
                    Interpretation up top; your saved snapshot and history stay
                    below for context.
                  </p>
                </div>

                {checkin ? (
                  <>
                    <BurnoutSummarySection
                      key={checkin.id}
                      checkin={checkin}
                      anonymousId={getOrCreateAnonymousId()}
                    />

                    <div className="space-y-2">
                      <h3 className="font-heading text-sm font-semibold text-foreground">
                        Snapshot & history
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Raw check-in detail—same latest and history views as
                        before.
                      </p>
                    </div>

                    <CheckinsTabPanel
                      checkin={checkin}
                      formattedLatestSavedAt={formatSavedAt(checkin.created_at)}
                      anonymousId={getOrCreateAnonymousId()}
                    />
                  </>
                ) : (
                  <TabNeedCheckin
                    title="Burnout detail appears after a check-in"
                    description="Meters, trends, and history need one saved snapshot—it’s private, optional, and you can pause anytime."
                    onAddCheckin={handleRetake}
                  />
                )}

                <div className="max-w-xl space-y-3 rounded-xl border border-border/65 bg-card/50 p-4 shadow-sm">
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    Insights
                  </h3>
                  <StatusBadge variant="soon">Coming soon</StatusBadge>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Plain-language patterns across sleep, stress, and energy.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Charts and longer trends — coming later.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
