"use client";

import { WearableBrandIcon } from "@/components/onboarding/wearable-provider-icons";
import {
  bucketsFromSimulation,
  generateWearableSimulation,
  WEARABLE_PROVIDERS,
  type WearableProviderId,
  type WearableSimulationSnapshot,
} from "@/lib/onboarding/wearable-simulation";
import { cn } from "@/lib/utils";
import type {
  SleepConsistencyLevel,
  SleepDurationBucket,
  SleepQualityLevel,
} from "@/lib/onboarding/step-three";

type Props = {
  activeProvider: WearableProviderId | null;
  simulation: WearableSimulationSnapshot | null;
  onConnect: (payload: {
    provider: WearableProviderId;
    simulation: WearableSimulationSnapshot;
    duration: SleepDurationBucket;
    quality: SleepQualityLevel;
    consistency: SleepConsistencyLevel;
  }) => void;
  onDisconnect: () => void;
};

export function WearableConnectPanel({
  activeProvider,
  simulation,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <div className="rounded-xl border border-dashed border-border/90 bg-muted/25 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Optional: sample wearable data
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Demo only—simulates a week of sleep and vitals when you pick a
            brand. Not connected to Apple Watch, Garmin, Galaxy Watch, Whoop, or any
            device.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEARABLE_PROVIDERS.map((p) => {
            const active = activeProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const sim = generateWearableSimulation(p.id);
                  const buckets = bucketsFromSimulation(sim);
                  onConnect({
                    provider: p.id,
                    simulation: sim,
                    ...buckets,
                  });
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary/[0.08] text-foreground shadow-sm"
                    : "border-border/80 bg-background/60 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "text-muted-foreground",
                    active && "text-primary",
                  )}
                >
                  <WearableBrandIcon id={p.id} />
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {p.label}
                </span>
                {active ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Linked (demo)
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    Simulate
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeProvider && simulation ? (
          <div className="space-y-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5 text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Active:{" "}
              {WEARABLE_PROVIDERS.find((x) => x.id === activeProvider)?.label}
            </p>
            <p className="tabular-nums">
              7-night avg sleep ≈ {simulation.avg_sleep_hours}h · resting HR ≈{" "}
              {simulation.resting_hr_bpm} bpm
              {simulation.avg_hrv_ms != null
                ? ` · HRV ≈ ${simulation.avg_hrv_ms} ms`
                : ""}
              {simulation.spo2_avg_pct != null
                ? ` · SpO₂ ≈ ${simulation.spo2_avg_pct}%`
                : ""}
            </p>
            <p className="text-[11px] leading-snug">{simulation.data_quality_note}</p>
            <button
              type="button"
              onClick={onDisconnect}
              className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Disconnect demo wearable
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
