/** Demo-only simulated providers — not connected to real devices. */
export type WearableProviderId = "apple_watch" | "garmin" | "samsung" | "whoop";

export const WEARABLE_PROVIDERS: {
  id: WearableProviderId;
  label: string;
  shortLabel: string;
}[] = [
  { id: "apple_watch", label: "Apple Watch", shortLabel: "Apple" },
  { id: "garmin", label: "Garmin", shortLabel: "Garmin" },
  { id: "samsung", label: "Galaxy Watch", shortLabel: "Galaxy Watch" },
  { id: "whoop", label: "Whoop", shortLabel: "Whoop" },
];

export type DailySleepSample = {
  /** ISO date (local calendar day label). */
  date: string;
  sleep_hours: number;
  deep_hours: number;
  rem_hours: number;
  light_hours: number;
  awake_minutes: number;
};

export type WearableSimulationSnapshot = {
  provider: WearableProviderId;
  /** When this snapshot was generated (demo). */
  simulated_at: string;
  /** Last 7 nights, newest last. */
  days: DailySleepSample[];
  avg_sleep_hours: number;
  sleep_hours_std: number;
  resting_hr_bpm: number;
  /** Heart rate variability (night estimate). */
  avg_hrv_ms: number | null;
  /** SpO2 night average where applicable. */
  spo2_avg_pct: number | null;
  data_quality_note: string;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic per provider + salt so re-clicks still feel varied in dev. */
function rngFor(provider: WearableProviderId, salt: number): () => number {
  const base =
    provider.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + salt * 17;
  return mulberry32(base);
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Simulates one week of sleep + vitals for the Burnout tab (future charts).
 * Not medical data — demo only.
 */
export function generateWearableSimulation(
  provider: WearableProviderId,
  salt: number = Date.now() % 1_000_000,
): WearableSimulationSnapshot {
  const rand = rngFor(provider, salt);
  const days: DailySleepSample[] = [];

  for (let i = 6; i >= 0; i--) {
    // 5.0–9.0 hours inclusive-ish (0.1h resolution)
    const sleep_hours = Math.round((5 + rand() * 4) * 10) / 10;
    const deep = Math.round(sleep_hours * (0.12 + rand() * 0.12) * 10) / 10;
    const rem = Math.round(sleep_hours * (0.18 + rand() * 0.1) * 10) / 10;
    const awake_min = Math.round(15 + rand() * 45);
    const light = Math.max(
      0.2,
      Math.round((sleep_hours - deep - rem - awake_min / 60) * 10) / 10,
    );
    days.push({
      date: isoDateDaysAgo(i),
      sleep_hours,
      deep_hours: deep,
      rem_hours: rem,
      light_hours: light,
      awake_minutes: awake_min,
    });
  }

  const hrs = days.map((d) => d.sleep_hours);
  const avg_sleep_hours =
    Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10;
  const mean = avg_sleep_hours;
  const variance =
    hrs.reduce((acc, h) => acc + (h - mean) ** 2, 0) / hrs.length;
  const sleep_hours_std = Math.round(Math.sqrt(variance) * 100) / 100;

  const resting_hr_bpm = Math.round(52 + rand() * 18);
  const avg_hrv_ms =
    provider === "garmin" || provider === "whoop"
      ? Math.round(28 + rand() * 32)
      : Math.round(32 + rand() * 28);
  const spo2_avg_pct =
    provider === "samsung" || provider === "apple_watch"
      ? Math.round((95.5 + rand() * 3) * 10) / 10
      : null;

  return {
    provider,
    simulated_at: new Date().toISOString(),
    days,
    avg_sleep_hours,
    sleep_hours_std,
    resting_hr_bpm,
    avg_hrv_ms,
    spo2_avg_pct,
    data_quality_note:
      "Simulated demo metrics for UI development — not from a real wearable.",
  };
}

/** Map simulated averages into existing check-in buckets. */
export function bucketsFromSimulation(sim: WearableSimulationSnapshot): {
  duration: "lt_5" | "h_5_6" | "h_6_7" | "h_7_8" | "gt_8";
  quality: "poor" | "okay" | "good";
  consistency: "very_inconsistent" | "somewhat_consistent" | "consistent";
} {
  const { avg_sleep_hours, sleep_hours_std } = sim;

  let duration: "lt_5" | "h_5_6" | "h_6_7" | "h_7_8" | "gt_8";
  if (avg_sleep_hours < 5) duration = "lt_5";
  else if (avg_sleep_hours < 6) duration = "h_5_6";
  else if (avg_sleep_hours < 7) duration = "h_6_7";
  else if (avg_sleep_hours <= 8) duration = "h_7_8";
  else duration = "gt_8";

  let quality: "poor" | "okay" | "good";
  if (sleep_hours_std >= 1.15 || avg_sleep_hours < 6) quality = "poor";
  else if (sleep_hours_std >= 0.55) quality = "okay";
  else quality = "good";

  let consistency: "very_inconsistent" | "somewhat_consistent" | "consistent";
  if (sleep_hours_std >= 0.95) consistency = "very_inconsistent";
  else if (sleep_hours_std >= 0.45) consistency = "somewhat_consistent";
  else consistency = "consistent";

  return { duration, quality, consistency };
}
