import { Brain, ClipboardList, Compass, Orbit } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LANDING_IDS } from "@/lib/landing-ids";

const steps = [
  {
    step: "01",
    title: "Check in",
    body: "Short structured questions—not a long form.",
    icon: ClipboardList,
  },
  {
    step: "02",
    title: "Stress, symptoms, sleep",
    body: "Core signals; sleep is optional but helps.",
    icon: Brain,
  },
  {
    step: "03",
    title: "Risk snapshot",
    body: "Plain-language label and context—supportive, not alarmist.",
    icon: Orbit,
  },
  {
    step: "04",
    title: "Next steps",
    body: "Prioritized actions; you set the pace.",
    icon: Compass,
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      id={LANDING_IDS.howItWorks}
      className="border-b border-border/60"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
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
            Four steps from check-in to suggested actions.
          </p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
