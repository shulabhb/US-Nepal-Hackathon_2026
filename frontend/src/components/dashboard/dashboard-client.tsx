"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";
import {
  dashboardHref,
  isDashboardTabId,
  legacyDashboardTabRedirect,
  normalizeDashboardTab,
} from "@/lib/dashboard/dashboard-tab";
import { buildSeededAssistantMessage } from "@/lib/dashboard/seed-assistant-message";
import { getLatestCheckin } from "@/lib/api/checkins";
import { getOrCreateAnonymousId } from "@/lib/onboarding/anonymous-id";
import {
  clearOnboardingState,
  getOnboardingResumePath,
  readOnboardingState,
} from "@/lib/onboarding/storage";
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

function summarySentenceFrom(checkin: CheckinDetailResponse): string {
  const s = checkin.recommendation_snapshot;
  if (
    s &&
    typeof s === "object" &&
    typeof s.summary === "string" &&
    s.summary.trim()
  ) {
    return s.summary.trim();
  }
  return "Your check-in is synced. Pick a tab when you need more depth.";
}

export function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = normalizeDashboardTab(searchParams.get("tab"));

  const [phase, setPhase] = useState<"loading" | "ready" | "empty">("loading");
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
    const state = readOnboardingState();
    const resume = getOnboardingResumePath(state);
    if (resume !== null) {
      router.replace(resume);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const row = await getLatestCheckin(getOrCreateAnonymousId());
        if (cancelled) return;
        setCheckin(row);
        setPhase("ready");
      } catch {
        if (cancelled) return;
        setCheckin(null);
        setPhase("empty");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const reload = () => {
    const state = readOnboardingState();
    const resume = getOnboardingResumePath(state);
    if (resume !== null) {
      router.replace(resume);
      return;
    }
    setPhase("loading");
    void (async () => {
      try {
        const row = await getLatestCheckin(getOrCreateAnonymousId());
        setCheckin(row);
        setPhase("ready");
      } catch {
        setCheckin(null);
        setPhase("empty");
      }
    })();
  };

  const handleRetake = useCallback(() => {
    clearOnboardingState();
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
      <AppShell navVariant="minimal">
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-20"
          aria-busy="true"
        >
          <p className="text-sm text-muted-foreground">Loading…</p>
          <span className="sr-only">Loading</span>
        </div>
      </AppShell>
    );
  }

  if (phase === "empty" || !checkin) {
    return (
      <AppShell navVariant="minimal">
        <div className="relative flex-1">
          <div
            className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.78_0.07_210_/0.12),transparent)]"
            aria-hidden
          />
          <div
            id="dashboard-main-content"
            className="relative mx-auto max-w-lg px-4 py-12"
          >
            <Card className="border-border/80 shadow-md">
              <CardHeader className="space-y-2">
                <CardTitle className="font-heading text-xl">
                  Sync your check-in first
                </CardTitle>
                <CardDescription className="text-sm">
                  Save from recommendations, then open the workspace again.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-xl">
                  <Link href="/recommendations">Recommendations</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => reload()}
                >
                  <RefreshCw className="mr-2 size-4" aria-hidden />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    );
  }

  const seeded = buildSeededAssistantMessage(checkin);
  const summaryText = summarySentenceFrom(checkin);

  return (
    <AppShell
      activeTab={activeTab}
      onRetake={handleRetake}
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
                  riskLabel={riskLabelFrom(checkin)}
                  summaryLine={summaryText}
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
                    Interpretation up top; your saved snapshot and history
                    stay below for context.
                  </p>
                </div>

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
                    Raw check-in detail—same latest and history views as before.
                  </p>
                </div>

                <CheckinsTabPanel
                  checkin={checkin}
                  formattedLatestSavedAt={formatSavedAt(checkin.created_at)}
                  anonymousId={getOrCreateAnonymousId()}
                />

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

            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/40 pt-8 text-center text-xs text-muted-foreground">
              <span>Not for crisis or clinical care.</span>
              <Link
                href="/recommendations"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Recommendations
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
