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
    title: "Anonymous check-in",
    body: "No account required to begin.",
  },
  {
    icon: ScanLine,
    title: "Focused signals",
    body: "Stress, symptoms, optional sleep—nothing extra.",
  },
  {
    icon: Moon,
    title: "Sleep (optional)",
    body: "Rhythm and duration when you opt in.",
  },
  {
    icon: BellRing,
    title: "Risk summary",
    body: "One calm frame with short context.",
  },
  {
    icon: Check,
    title: "Suggestions",
    body: "Steps scaled to how depleted you feel.",
  },
  {
    icon: Route,
    title: "If you need more help",
    body: "Pointers to care routes when intensity rises.",
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
            What you get
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Everything serves one outcome: a useful readout and a doable path
            forward.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
