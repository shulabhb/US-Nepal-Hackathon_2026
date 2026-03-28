import type { OnboardingPersistedState } from "@/lib/onboarding/storage";
import { isOnboardingComplete } from "@/lib/onboarding/storage";
import type { OnboardingGoal, OnboardingPressure } from "@/lib/onboarding/step-one";
import {
  HELP_NEED_OPTION_VALUES,
  PRESSURE_OPTION_VALUES,
} from "@/lib/onboarding/step-one";
import type {
  OnboardingSymptom,
  OnboardingStep2,
} from "@/lib/onboarding/step-two";
import type { OnboardingStep3 } from "@/lib/onboarding/step-three";

import {
  type RiskBandId,
  computeBurnoutScore,
} from "./burnout-score";

const PRESSURE_IDS_FOR_HINTS = new Set<string>(
  PRESSURE_OPTION_VALUES.filter((v) => v !== "other"),
);

const HELP_IDS_FOR_HINTS = new Set<string>(
  HELP_NEED_OPTION_VALUES.filter((v) => v !== "other"),
);

/** First selected value that has scripted hints; else a safe default. */
function primaryPressure(pressures: string[]): OnboardingPressure {
  for (const p of pressures) {
    if (PRESSURE_IDS_FOR_HINTS.has(p)) return p as OnboardingPressure;
  }
  return "workload";
}

function primaryGoal(helpNeeds: string[]): OnboardingGoal {
  for (const g of helpNeeds) {
    if (HELP_IDS_FOR_HINTS.has(g)) return g as OnboardingGoal;
  }
  return "less_overwhelmed";
}

export type RecommendationResult = {
  riskScore: number;
  riskLabel: string;
  bandId: RiskBandId;
  summary: string;
  reasons: string[];
  immediateActions: string[];
  next72HourPlan: string[];
  supportRoute?: string[];
  importedFromWearable: boolean;
};

function sleepIsRough(step3: OnboardingStep3): boolean {
  return (
    step3.duration === "lt_5" ||
    step3.duration === "h_5_6" ||
    step3.quality === "poor" ||
    step3.consistency === "very_inconsistent"
  );
}

function hasSymptom(symptoms: OnboardingSymptom[], key: OnboardingSymptom) {
  return symptoms.includes(key);
}

function buildSummary(
  bandId: RiskBandId,
  step2: OnboardingStep2,
  step3: OnboardingStep3,
): string {
  const stressHigh = step2.stressLevel >= 8;
  const energyLow = step2.energyLevel <= 5;
  const roughSleep = sleepIsRough(step3);

  if (bandId === "mild") {
    return "Your check-in points to mostly workable strain—worth tuning a few habits before pressure creeps higher.";
  }

  const drivers: string[] = [];
  if (stressHigh) drivers.push("notably high stress");
  if (energyLow) drivers.push("lower energy");
  if (roughSleep) drivers.push("shakier sleep and recovery");

  const driverText =
    drivers.length > 0
      ? drivers.join(", ")
      : "several overlapping day-to-day strain signals";

  if (bandId === "support") {
    return `Your check-in pattern suggests ${driverText}—a mix that often means you need both practical relief and human support soon.`;
  }

  if (bandId === "high") {
    return `Your answers suggest rising burnout risk driven by ${driverText}. You’re not imagining the weight—small resets plus intentional support can help.`;
  }

  if (bandId === "rising") {
    return `Your check-in suggests ${driverText} are starting to stack. This is a good moment to protect recovery before the slide picks up speed.`;
  }

  return `Your check-in suggests ${driverText} are beginning to show. Gentle load shifts and steadier sleep often move the needle here.`;
}

function pressureHint(pressure: OnboardingPressure): string[] {
  const map: Record<OnboardingPressure, string[]> = {
    academics: [
      "Pick one assignment or lecture block tomorrow where “good enough” is the target—perfection can wait one day.",
      "Send a short note to a TA or professor if you’re behind; most people respond better to early honesty than silent spiral.",
    ],
    workload: [
      "Name one commitment you can pause, shorten, or delegate this week—no guilt, just capacity math.",
      "Block 45 minutes on your calendar labeled “no new tasks” so email stops expanding your day.",
    ],
    job_search: [
      "Cap applications or outreach to a fixed block of time so rejection fatigue doesn’t eat whole days.",
      "Write a two-line win list from the last month—job search brain forgets evidence fast.",
    ],
    career_uncertainty: [
      "Spend 20 minutes listing questions you actually want answered about your next step—not decisions, just clarity targets.",
      "Talk once with someone a few years ahead in a path you’re curious about; low stakes, high perspective.",
    ],
    family_expectations: [
      "Choose one boundary you can state kindly this week (“I can’t make that, but I can do this”).",
      "Share with one trusted person how heavy expectations feel—naming it usually trims its volume.",
    ],
    money: [
      "List fixed costs and one discretionary lever you can trim for two weeks—small relief still counts.",
      "Use your school or community financial-wellness resource if you have one; money stress loves isolation.",
    ],
    sleep_issues: [
      "Set a non-negotiable wind-down: same drink, same low light, same boring podcast for three nights.",
      "Move one late scroll or work block earlier by 15 minutes—tiny shifts train your brain back toward sleep.",
    ],
    burnout_exhaustion: [
      "Swap one “push through” block this week for a genuine recovery block—even a short one.",
      "Tell someone you trust you’re running on fumes; you don’t need a solution talk, just reality reflected back.",
    ],
    relationships: [
      "Name one conversation you’ve been postponing and choose a low-stakes first sentence—clarity often beats rumination.",
      "Protect one evening this week from conflict-processing; you can return to hard topics after a real break.",
    ],
    health_concerns: [
      "If something physical has been worrying you, book one concrete step (nurse line, visit, trusted clinician)—uncertainty costs energy too.",
      "Pair medical to-dos with something gentle afterward so your body isn’t only in “fix it” mode.",
    ],
  };
  return map[pressure];
}

function goalHint(goal: OnboardingGoal): string[] {
  const map: Record<OnboardingGoal, string[]> = {
    sleep_better: [
      "Tonight, pick a target bedtime 30 minutes earlier than your average this week—no heroics, just one step.",
    ],
    focus_better: [
      "Tomorrow, use one 25-minute timer on a single task with notifications off—the momentum matters more than the finish.",
    ],
    less_overwhelmed: [
      "Brain-dump every open loop onto paper for five minutes; park the list outside your head before bed.",
    ],
    manage_burnout: [
      "Choose one obligation this week you’ll attend at 80% effort on purpose—protect a little capacity.",
    ],
    get_a_plan: [
      "Write three priorities for the next 72 hours only—everything else goes on a “later” list without shame.",
    ],
    talk_to_someone_safely: [
      "Identify one person who listens without fixing; send a short “I’m fried, could we catch up?” message.",
    ],
    improve_routine: [
      "Anchor one tiny repeating block (same breakfast window, same walk, same wind-down) for three days—routine heals in repetitions, not intensity.",
    ],
    calm_now: [
      "Try 90 seconds of slow exhale-focused breathing; lengthen the exhale just a bit more than the inhale.",
    ],
  };
  return map[goal];
}

function symptomHint(symptoms: OnboardingSymptom[]): string[] {
  const out: string[] = [];
  if (hasSymptom(symptoms, "poor_sleep") || hasSymptom(symptoms, "panic_before_deadlines")) {
    out.push(
      "If nights or deadlines spike adrenaline, try box breathing for two minutes before you open email or books.",
    );
  }
  if (hasSymptom(symptoms, "difficulty_focusing")) {
    out.push(
      "Use a single-tab rule for your next work session—split attention quietly taxes already-low reserves.",
    );
  }
  if (hasSymptom(symptoms, "irritability")) {
    out.push(
      "When irritability spikes, step outside for five minutes of natural light; it’s a small nervous-system reset.",
    );
  }
  if (hasSymptom(symptoms, "lack_of_motivation")) {
    out.push(
      "Lower the first step of your hardest task until it feels almost silly—starting is the whole battle sometimes.",
    );
  }
  if (hasSymptom(symptoms, "overthinking")) {
    out.push(
      "Set a 10-minute “worry window” tonight; when thoughts intrude outside it, gently postpone them to that slot.",
    );
  }
  return out;
}

function sleepHint(step3: OnboardingStep3): string[] {
  const out: string[] = [];
  if (step3.duration === "lt_5" || step3.duration === "h_5_6") {
    out.push(
      "Aim for one extra 30–45 minutes in bed (not on a screen) for three nights—borrow from the easiest evening task.",
    );
  }
  if (step3.quality === "poor") {
    out.push(
      "Keep caffeine before noon and dim screens an hour before your target sleep time when you can.",
    );
  }
  if (step3.consistency !== "consistent") {
    out.push(
      "Pick a consistent wake time for three days, even if bedtime wobbles—anchors help rhythm more than perfection.",
    );
  }
  return out;
}

function uniqueFirst(strings: string[], limit: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of strings) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
    if (result.length >= limit) break;
  }
  return result;
}

function pickImmediateActions(
  pressure: OnboardingPressure,
  goal: OnboardingGoal,
  step2: OnboardingStep2,
  step3: OnboardingStep3,
): string[] {
  const pool: string[] = [
    ...pressureHint(pressure),
    ...goalHint(goal),
    ...symptomHint(step2.symptoms),
    ...sleepHint(step3),
    "Drink water and eat something steady within the next few hours—basic care still shifts stress chemistry.",
    "Text someone “still here, pretty tired” if isolation has crept in—that’s a whole skill, not small talk.",
    "Move your body gently for 10 minutes without a performance goal—walk, stretch, anything non-punishing.",
  ];
  const picked = uniqueFirst(pool, 3);
  return picked.length >= 3
    ? picked
    : [
        ...picked,
        "After you finish reading, take one three-minute break with no inputs.",
      ].slice(0, 3);
}

function pick72HourPlan(
  pressure: OnboardingPressure,
  goal: OnboardingGoal,
  bandId: RiskBandId,
  step3: OnboardingStep3,
): string[] {
  if (bandId === "high" || bandId === "support") {
    return [
      "In the next 24 hours: tell a trusted person or counselor you’re stretched thin—even a short message counts.",
      "Within 48 hours: carve one protected recovery block (sleep, food, quiet) before saying yes to anything new.",
      "Within 72 hours: if nothing feels lighter, book or research one professional or campus wellness contact.",
    ];
  }

  const pool: string[] = [
    "Tonight: write one sentence about what drained you most today—no fixes, just naming it.",
    "Tomorrow morning: handle your smallest worry-inducing task before opening messages, if you can.",
    "In the next three days: schedule one screen-free break that actually resets your body, not your feed.",
    ...pressureHint(pressure),
    ...goalHint(goal),
    ...sleepHint(step3),
  ];
  const picked = uniqueFirst(pool, 3);
  return picked.length >= 3
    ? picked
    : [
        ...picked,
        "Three nights from now, check whether bedtime crept 15 minutes earlier—small wins still count.",
      ].slice(0, 3);
}

function buildSupportRoutes(
  bandId: RiskBandId,
  stressLevel: number,
): string[] | undefined {
  if (bandId === "support") {
    return [
      "If you’re able, consider reaching out this week to a counselor, campus mental health service, or employee assistance program—asking early is a strength, not a red flag.",
      "A mentor, supervisor, or professor you trust may help rebalance expectations or deadlines before things harden.",
      "If you ever feel unsafe with yourself or others, contact local emergency services or a crisis line right away—not later, not alone.",
    ];
  }
  if (bandId === "high") {
    return [
      "This is a good window to message a counselor, mentor, or trusted adult about how stretched you feel—even one conversation can change the trajectory.",
      "If you have access to campus or workplace mental health resources, booking a single exploratory session is a practical next step.",
    ];
  }
  if (bandId === "rising" && stressLevel >= 7) {
    return [
      "If stress keeps climbing, plan a low-barrier chat with a counselor or advisor soon so support isn’t only a last resort.",
    ];
  }
  return undefined;
}

export function buildRecommendations(
  state: OnboardingPersistedState,
): RecommendationResult | null {
  if (!isOnboardingComplete(state)) {
    return null;
  }

  const step1 = state.step1;
  const step2 = state.step2;
  const step3 = state.step3;
  if (!step1 || !step2 || !step3) {
    return null;
  }

  const scored = computeBurnoutScore(step2, step3);

  const summary = buildSummary(scored.bandId, step2, step3);
  const pressure = primaryPressure(step1.pressures);
  const goal = primaryGoal(step1.help_needs);

  const immediateActions = pickImmediateActions(
    pressure,
    goal,
    step2,
    step3,
  );
  const next72HourPlan = pick72HourPlan(
    pressure,
    goal,
    scored.bandId,
    step3,
  );
  const supportRoute = buildSupportRoutes(scored.bandId, step2.stressLevel);

  return {
    riskScore: scored.score,
    riskLabel: scored.riskLabel,
    bandId: scored.bandId,
    summary,
    reasons: scored.reasons,
    immediateActions,
    next72HourPlan,
    supportRoute,
    importedFromWearable: step3.importedFromWearable,
  };
}
