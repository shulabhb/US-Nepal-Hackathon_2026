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
    title: "Anonymous on this device",
    body: "No real name; an anonymous ID stores your check-ins and plans for this browser.",
  },
  {
    icon: ScanLine,
    title: "Structured check-in",
    body: "Role, pressures, stress and energy sliders, symptoms, optional sleep—paced in steps you can resume.",
  },
  {
    icon: Moon,
    title: "Optional sleep context",
    body: "Duration, quality, and rhythm when you want the snapshot to include recovery nuance.",
  },
  {
    icon: BellRing,
    title: "Burnout readout & rings",
    body: "Risk band, dimension scores, and three strain rings that visualize load—not a clinical score.",
  },
  {
    icon: Check,
    title: "Plan, tasks, follow-through",
    body: "Generate or refine a plan into checklists and My tasks; overview shows gentle progress on saved plans.",
  },
  {
    icon: Route,
    title: "Support chat & care cues",
    body: "Chat uses your latest check-in context; scripted recommendations can remind you about human support when patterns are heavy.",
  },
] as const;

export function FeatureHighlightsSection() {
  return (
    <section
      id={LANDING_IDS.features}
      className="border-b border-border/60"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Capabilities
          </p>
          <h2
            id="features-heading"
            className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            What you get
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            The product is the whole workspace—not only the first screen after
            onboarding.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
