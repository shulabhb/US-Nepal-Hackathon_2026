import { Brain, ClipboardList, Compass, Orbit } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LANDING_IDS } from "@/lib/landing-ids";

const steps = [
  {
    step: "01",
    title: "Check in",
    body: "Chunked steps on this device—pressures, stress, energy, symptoms; optional sleep and context.",
    icon: ClipboardList,
  },
  {
    step: "02",
    title: "Snapshot & rings",
    body: "Burnout risk band, dimension-style readout, and three illustrative strain meters (Now and two scenarios)—motivation, not medicine.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Work in one dashboard",
    body: "Plan with tasks, support chat grounded in your check-in, Burnout tab for history and detail, or open Plan/Chat even before you check in.",
    icon: Orbit,
  },
  {
    step: "04",
    title: "Check in again",
    body: "When life shifts, a fresh check-in updates rings, guidance, and what Plan and Chat know about you.",
    icon: Compass,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id={LANDING_IDS.howItWorks}
      data-tour="landing-how"
      className="border-b border-border/60"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Flow
          </p>
          <h2
            id="how-heading"
            className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            How it works
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            From first check-in to the workspace you keep using—always private
            to this browser session.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ step, title, body, icon: Icon }, index) => (
            <li key={step}>
              <Card
                className="h-full border-border/80 bg-card/80 py-0 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md"
                size="sm"
              >
                <CardContent className="flex flex-col gap-3 pt-4 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {step}
                    </span>
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="size-4" aria-hidden />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-semibold leading-snug text-foreground">
                      <span className="sr-only">{`Step ${index + 1}: `}</span>
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
