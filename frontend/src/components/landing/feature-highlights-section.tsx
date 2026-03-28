import {
  BellRing,
  Check,
  Moon,
  Route,
  ScanLine,
  UserRound,
} from "lucide-react";

import { LANDING_IDS } from "@/lib/landing-ids";

const features = [
  {
    icon: UserRound,
    title: "Anonymous check-ins",
    body: "Start without tying your identity to the readout. Friction stays intentionally low.",
  },
  {
    icon: ScanLine,
    title: "Essential signals only",
    body: "Stress load, key symptoms, and optional sleep signals—no data hoarding.",
  },
  {
    icon: Moon,
    title: "Sleep routine tracking",
    body: "When you opt in, rhythm and duration inform the snapshot with extra nuance.",
  },
  {
    icon: BellRing,
    title: "Burnout risk summary",
    body: "A single calm frame—early, moderate, or high—that pairs risk with context.",
  },
  {
    icon: Check,
    title: "Personalized recovery suggestions",
    body: "Triage-style steps you can try now, scaled to how depleted you feel.",
  },
  {
    icon: Route,
    title: "Support routing if needed",
    body: "If things escalate, you’ll see clear paths—campus care, telehealth, crisis resources.",
  },
] as const;

export function FeatureHighlightsSection() {
  return (
    <section
      id={LANDING_IDS.features}
      className="border-b border-border/60"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Capabilities
          </p>
          <h2
            id="features-heading"
            className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Feature highlights
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Everything here is in service of one outcome: a trustworthy early
            readout and a humane path forward—never a pile of dashboards.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <h3 className="font-heading text-base font-semibold text-foreground">
                  {title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
