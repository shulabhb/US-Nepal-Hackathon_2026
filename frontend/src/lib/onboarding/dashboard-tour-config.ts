import type { DashboardTabId } from "@/lib/dashboard/dashboard-tab";

/** Set before `router.replace` to dashboard after onboarding; consumed by `DashboardTourBridge`. */
export const PENDING_DASHBOARD_TOUR_SESSION_KEY =
  "burnout-radar-pending-dashboard-guided-tour-v1";

/** localStorage — hide auto-start after user finishes or skips the dashboard tour. */
export const DASHBOARD_GUIDED_TOUR_DONE_KEY =
  "burnout-radar-dashboard-guided-tour-done-v1";

export type TourStepMode = "read" | "interact";

export type DashboardTourStep = {
  id: string;
  title: string;
  body: string;
  /** Spotlight target `[data-tour="…"]`; null = full-card copy only */
  highlight: string | null;
  tab: DashboardTabId;
  /**
   * `read` = absorb the hint (in-page guidance is spotlighted; form is dimmed).
   * `interact` = work on the highlighted control.
   */
  tourMode?: TourStepMode;
};

/**
 * Post–check-in workspace walkthrough: overview → chat → Plan (real personal-task
 * flow with read/interact pairs) → burnout → finale.
 */
export const DASHBOARD_TOUR_STEPS: DashboardTourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your workspace",
    body: "This is **your dashboard**—strain readouts, next steps, and the **tab strip** up top. **Next** highlights the active tab, then the canvas.",
    highlight: "dashboard-welcome",
    tab: "overview",
  },
  {
    id: "nav-overview",
    title: "Dashboard tab",
    body: "You’re on **Dashboard** (overview)—rings, snapshot, and shortcuts live here. We’ll hop the other tabs in order: **Support chat → Plan → Burnout**.",
    highlight: "nav-tab-overview",
    tab: "overview",
  },
  {
    id: "meters-now",
    title: "Burnout meters — your “Now” ring",
    body: "**Now** blends your latest check-in with follow-through on your plan checklist. The other two rings are **scenario previews**—locked until **My tasks** exists on a saved plan.",
    highlight: "dashboard-meters-now",
    tab: "overview",
  },
  {
    id: "meters-locked",
    title: "Why the other two are locked",
    body: "They need **your task list** from a saved plan—otherwise we’d be guessing. A real plan unlocks them with the same strain language.",
    highlight: "dashboard-meters-locked",
    tab: "overview",
  },
  {
    id: "how-now",
    title: "How you’re doing right now",
    body: "A **plain-language snapshot**—risk band, focus, friction—not a diagnosis. Emotional weather for everything below.",
    highlight: "dashboard-how-now",
    tab: "overview",
  },
  {
    id: "next-best",
    title: "Next best step",
    body: "One **tiny, actionable** suggestion from your snapshot. Ignore it and use Plan or chat if you prefer.",
    highlight: "dashboard-next-best",
    tab: "overview",
  },
  {
    id: "no-plans",
    title: "No saved plans yet",
    body: "Honest empty state until you save something—**no fake progress**. After you save, a compact snapshot appears here.",
    highlight: "dashboard-no-plans",
    tab: "overview",
  },
  {
    id: "what-helps",
    title: "What can help — four doors",
    body: "**Plan**, **Support chat**, **Burnout**, **Check-in again**—different jobs, same private workspace.",
    highlight: "dashboard-what-helps",
    tab: "overview",
  },
  {
    id: "personalize",
    title: "Personalize a plan",
    body: "Tap **Personalize a plan** to open **Support chat in plan mode**. **Next** jumps to the **Support Chat** tab (seeded for the tour).",
    highlight: "dashboard-personalize",
    tab: "overview",
  },
  {
    id: "nav-chat",
    title: "Support Chat tab",
    body: "You’re on **Support Chat**—same strip stays visible so you always know where you are. **Next** highlights the conversation.",
    highlight: "nav-tab-chat",
    tab: "chat",
  },
  {
    id: "chat-open",
    title: "Support chat — plan mode",
    body: "Ask anything that fits your day. For this tour we seeded **plan mode**—when you see **Open Plan page**, tap it (we’ll also advance if you use **Next** after visiting Plan).",
    highlight: "dashboard-chat-thread",
    tab: "chat",
  },
  {
    id: "chat-composer",
    title: "Your message box",
    body: "Type naturally or use chips. During generation the composer may pause briefly. **Open Plan page** jumps to your checklist—or **Next** after you’ve tried the link.",
    highlight: "dashboard-chat-composer",
    tab: "chat",
  },
  {
    id: "nav-plan",
    title: "Plan tab",
    body: "The **Plan** tab is where you **save** plans and **generate** new ones. Next we’ll build a **real personal task plan**—read each hint first, then use **Next** to unlock the matching field.",
    highlight: "nav-tab-plan",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-read-workspace",
    title: "Saved vs Create",
    body: "**Saved plans** lists what’s on this device. **Create plan** opens the generator—same engine as chat, just form-driven. Absorb this, then **Next** to try the switcher.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-subview",
    title: "Open Create plan",
    body: "Tap **Create plan** so we can walk the fields in order.",
    highlight: "dashboard-plan-subview-tabs",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-type",
    title: "Plan type",
    body: "We’ll use **Personal tasks** for this tour—concrete tasks with time hints so the model can pace burnout-aware steps. Other types ask different questions.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-type",
    title: "Choose Personal tasks",
    body: "Select **Personal tasks** (tour keeps you here—change later if you like).",
    highlight: "dashboard-plan-field-type",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-name",
    title: "Plan name",
    body: "A short label helps you find this plan in **Saved plans** and in overview snapshots.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-name",
    title: "Name your plan",
    body: "Type something you’ll recognize—e.g. **This week’s reset**.",
    highlight: "dashboard-plan-field-name",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-schedule",
    title: "Daily or weekly",
    body: "**Daily** = tighter loops; **weekly** = broader buckets. Either works—the generator adapts checklist density.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-schedule",
    title: "Pick a schedule",
    body: "Choose **Daily plan** or **Weekly plan**.",
    highlight: "dashboard-plan-field-schedule",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-tasks",
    title: "Your tasks",
    body: "Add **at least one** named task. Time and priority help ordering and the burnout notes—not a performance review.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-tasks",
    title: "Fill task details",
    body: "Name the first task (add more with **Add task** if you want).",
    highlight: "dashboard-plan-field-tasks",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-notes",
    title: "Optional notes",
    body: "Extra context nudges tone and examples—**optional**. You can also expand the full-schedule checkbox after tasks feel solid.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-notes",
    title: "Add context (optional)",
    body: "Drop a line about constraints or preferences—skip if you’re ready to generate.",
    highlight: "dashboard-plan-field-notes",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-generate",
    title: "Generate",
    body: "This calls the model with your check-in + tasks—**real output**, not a sandbox. It may take a few seconds.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-generate",
    title: "Run the generator",
    body: "When the form validates, click **Generate plan** and wait for the card below.",
    highlight: "dashboard-plan-field-generate",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-result",
    title: "Your new plan card",
    body: "Title, summary, horizon, and a checklist—**same shape** whether you came from chat or this form. **Next** lets you try the checklist.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-checklist",
    title: "Work the checklist",
    body: "Toggle items as you go—progress feeds your **Now** ring over time.",
    highlight: "dashboard-plan-checklist",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-download",
    title: "Export (optional)",
    body: "**Download PDF** is handy for you or a clinician—**optional** anytime.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-download",
    title: "Try a PDF",
    body: "Grab a snapshot—still **not** the same as saving to this device.",
    highlight: "dashboard-plan-download",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "plan-read-save",
    title: "Save on this device",
    body: "**Save plan** stores it locally (with your anonymous id) so **Saved plans** and rings can use it.",
    highlight: "dashboard-plan-guidance-active",
    tab: "plan",
    tourMode: "read",
  },
  {
    id: "plan-field-save",
    title: "Save it",
    body: "Tap **Save plan** when you’re happy—then you can leave or keep editing later.",
    highlight: "dashboard-plan-field-save",
    tab: "plan",
    tourMode: "interact",
  },
  {
    id: "nav-burnout",
    title: "Burnout tab",
    body: "**Burnout** is where strain, trends, and history get room to breathe. **Next** tours the headline dial and the breakdown grid.",
    highlight: "nav-tab-burnout",
    tab: "burnout",
  },
  {
    id: "burnout-intro",
    title: "Your burnout picture",
    body: "Summary up top, then **Break it down**, then **Snapshot and history**—continuity without leaving the workspace.",
    highlight: "dashboard-burnout-root",
    tab: "burnout",
  },
  {
    id: "burnout-signal",
    title: "Strain dial & band",
    body: "One composite **0–100** read with a **concern band**—a rule-based blend, not a clinical score.",
    highlight: "dashboard-burnout-strain-dial",
    tab: "burnout",
  },
  {
    id: "burnout-meter",
    title: "Strain meter strip",
    body: "A linear view of the same index—easy to scan beside **last save** when history exists.",
    highlight: "dashboard-burnout-strain-meter",
    tab: "burnout",
  },
  {
    id: "burnout-breakdown",
    title: "Break it down",
    body: "Tabs for **strain by area**, drivers, footholds, nudges, and **strain over time**—each card has an info chip if you want the short interpretation.",
    highlight: "dashboard-burnout-insight-tabs",
    tab: "burnout",
  },
  {
    id: "burnout-snapshot-collapsed",
    title: "Snapshot and history (collapsed)",
    body: "This row collapses the **essentials**—latest fields and recent saves—so the page doesn’t sprawl. **Next** expands it for the tour.",
    highlight: "dashboard-burnout-snapshot-toggle",
    tab: "burnout",
  },
  {
    id: "burnout-snapshot-expanded",
    title: "Snapshot and history (open)",
    body: "Inside: your latest answers in context, plus a compact history list—same data as overview, more leg room.",
    highlight: "dashboard-burnout-snapshot-panel",
    tab: "burnout",
  },
  {
    id: "erase",
    title: "Reset this device",
    body: "The **eraser** wipes check-ins and plans **for this browser** and sends you home—use on shared machines. Not reversible.",
    highlight: "dashboard-erase",
    tab: "overview",
  },
  {
    id: "finale",
    title: "You’re set",
    body: "Ready to **track and ease strain** with Burnout Radar—on your terms, at your pace?",
    highlight: null,
    tab: "overview",
  },
];

export function dashboardTourStepIndexById(id: string): number {
  return DASHBOARD_TOUR_STEPS.findIndex((s) => s.id === id);
}

export function isPlanWorkspaceTourStep(stepIndex: number): boolean {
  const id = DASHBOARD_TOUR_STEPS[stepIndex]?.id;
  if (!id) return false;
  if (id === "nav-plan") return true;
  return id.startsWith("plan-");
}

/** In-page guidance banner + create flow (after nav-plan). */
export function isPlanTourGuidanceSegment(stepIndex: number): boolean {
  const id = DASHBOARD_TOUR_STEPS[stepIndex]?.id;
  if (!id) return false;
  return id.startsWith("plan-") && id !== "nav-plan";
}

export function isDashboardTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DASHBOARD_GUIDED_TOUR_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markDashboardTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DASHBOARD_GUIDED_TOUR_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearDashboardTourDone(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DASHBOARD_GUIDED_TOUR_DONE_KEY);
  } catch {
    /* ignore */
  }
}
