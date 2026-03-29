"use client";

import { DashboardOverviewBurnout } from "@/components/dashboard/dashboard-overview-burnout";
import type { CheckinDetailResponse } from "@/types/api";

type Props = {
  checkin: CheckinDetailResponse | null;
  anonymousId: string;
  riskLabel: string;
  onRetake: () => void;
  onOpenChat: () => void;
  onOpenPlan: () => void;
  /** Opens Support Chat with “Help me make a quick plan” to start the guided flow. */
  onPersonalizePlan: () => void;
  onViewBurnout: () => void;
};

export function DashboardLanding({
  checkin,
  anonymousId,
  riskLabel,
  onRetake,
  onOpenChat,
  onOpenPlan,
  onPersonalizePlan,
  onViewBurnout,
}: Props) {
  return (
    <div className="mx-auto max-w-5xl pb-10">
      <DashboardOverviewBurnout
        checkin={checkin}
        anonymousId={anonymousId}
        riskLabel={riskLabel}
        onOpenChat={onOpenChat}
        onOpenPlan={onOpenPlan}
        onPersonalizePlan={onPersonalizePlan}
        onOpenBurnout={onViewBurnout}
        onRetake={onRetake}
      />
    </div>
  );
}
