export type TourPhase =
  | "landing"
  | "onboarding-1"
  | "onboarding-2"
  | "onboarding-3"
  | "onboarding-4"
  | "onboarding-5a"
  | "onboarding-5b"
  | "dashboard";

export const GUIDED_TOUR_SESSION_KEY = "burnout-radar-guided-tour-v1";

/** Intro steps 0–1: modal + locked fields. Step 2: unlock + pointer arrow. */
export const ONBOARDING_TOUR_UNLOCK_STEP_INDEX = 2;

export function tourPhaseFromPath(pathname: string): TourPhase | null {
  if (pathname === "/") return "landing";
  if (pathname === "/onboarding") return "onboarding-1";
  if (pathname === "/onboarding/step-2") return "onboarding-2";
  if (pathname === "/onboarding/step-3") return "onboarding-3";
  if (pathname === "/onboarding/step-4") return "onboarding-4";
  if (pathname === "/onboarding/step-5") return "onboarding-5a";
  if (pathname === "/onboarding/step-5/questions") return "onboarding-5b";
  if (pathname === "/dashboard") return "dashboard";
  return null;
}

export type LandingTourStep = {
  id: string;
  title: string;
  body: string;
  /** data-tour attribute on page, or null for intro-only */
  highlight: string | null;
};

/** Tour starts here—skips hero/mock (users often read those first). */
export const LANDING_TOUR_STEPS: LandingTourStep[] = [
  {
    id: "trust",
    title: "At a glance",
    body: "Anonymous-first, sleep in the mix, strain rings, and Plan + chat + history—**check in once**, then keep working the dashboard. (You can leave the tour anytime with Cancel tour.)",
    highlight: "landing-trust",
  },
  {
    id: "how",
    title: "How it flows",
    body: "Check in → see your snapshot and rings → use Plan, Support chat, and Burnout in one place. Re-check in when life shifts.",
    highlight: "landing-how",
  },
  {
    id: "features",
    title: "What you can do",
    body: "Plans with tasks, contextual chat, and history—built around your snapshot, not a feed or social graph.",
    highlight: "landing-features",
  },
  {
    id: "why-checkin",
    title: "Why a check-in?",
    body: "A short, structured snapshot (stress, energy, context—not a diagnosis) lets Burnout Radar tailor your **workspace**: rings, Plan, and chat grounded in how you’re doing **now**, instead of generic advice.",
    highlight: null,
  },
  {
    id: "ready-checkin",
    title: "Ready for your first check-in?",
    body: "It’s private, anonymous on this device, and you can pause anytime. When you’re ready, you’ll use **Start check-in** below—we’ll walk through each screen with you.",
    highlight: null,
  },
  {
    id: "cta",
    title: "Start your check-in",
    body: "Tap **Start check-in** on the right. The arrow points to the button—use that control so the guided tour can continue into the questionnaire.",
    highlight: "landing-checkin-cta",
  },
];

export type OnboardingTourStep = {
  title: string;
  intro: string;
  /** Second “Next” before fields unlock */
  intro2: string;
  /** After fields unlock — short reminder next to the arrow */
  actionHint: string;
};

export const ONBOARDING_TOUR_COPY: Record<
  Exclude<TourPhase, "landing" | "dashboard">,
  OnboardingTourStep
> = {
  "onboarding-1": {
    title: "Step 1 — Your context",
    intro:
      "This screen asks what describes your **role**, what’s **pressuring** you, and what would **help** most. Your answers shape how we frame your snapshot and workspace—not a diagnosis.",
    intro2:
      "Pick **at least one** option in each section. If you choose **Other**, add a short note. Nothing leaves this device until you continue—take your time.",
    actionHint:
      "Fields are unlocked. When each section is filled, press **Continue** — the arrow points to the button row.",
  },
  "onboarding-2": {
    title: "Step 2 — How it’s been feeling",
    intro:
      "You’ll mark **symptoms** that feel true and set **stress** and **energy** on simple sliders. That feeds the illustrative readout—still not medical.",
    intro2:
      "Choose at least one symptom and move both sliders. You can change answers before you continue.",
    actionHint: "Unlocked — complete the fields, then **Continue**.",
  },
  "onboarding-3": {
    title: "Step 3 — Sleep",
    intro:
      "**Duration**, **quality**, and **consistency** give recovery context. You can use the wearable demo or answer manually—both are fine.",
    intro2:
      "Answer all three groups. Optional demo buttons don’t connect a real device.",
    actionHint: "Unlocked — then **Continue**.",
  },
  "onboarding-4": {
    title: "Step 4 — Background (optional)",
    intro:
      "**Country** and **migration** context is optional—only to enrich support if you want. You can skip this whole step.",
    intro2:
      "If you use migration rows, add a country each. **Skip this step** jumps ahead with empty optional data.",
    actionHint:
      "Unlocked — **Continue**, **Skip this step**, or fill fields as you like.",
  },
  "onboarding-5a": {
    title: "Step 5a — Sensitive topics",
    intro:
      "You may add **health or personal** context on the next screen for more relevant chat—or skip straight to the dashboard.",
    intro2:
      "**Continue to optional questions** opens short follow-ups. **No thanks** saves a minimal snapshot and opens your workspace.",
    actionHint:
      "Unlocked — choose **Continue to optional questions** or **No thanks — go to dashboard**.",
  },
  "onboarding-5b": {
    title: "Step 5b — Last questions",
    intro:
      "Optional text fields feed your **private** snapshot. You can leave them blank if you prefer.",
    intro2:
      "If you add sensitive text, confirm consent where shown. You can **Skip this step** with empty fields.",
    actionHint: "Unlocked — **Continue to dashboard** (or Skip) when ready.",
  },
};

const AFFIRMATIONS = [
  "Awesome!",
  "Nice work!",
  "You’re on a roll!",
  "Great—onward!",
  "Lovely—keep going!",
] as const;

export function pickAffirmation(phase: TourPhase): string {
  let h = 0;
  for (let i = 0; i < phase.length; i++) {
    h = (h + phase.charCodeAt(i) * (i + 1)) % 997;
  }
  return AFFIRMATIONS[h % AFFIRMATIONS.length]!;
}
