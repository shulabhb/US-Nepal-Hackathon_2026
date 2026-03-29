import { Ban, Fingerprint, HeartPulse, ScanFace } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LANDING_IDS } from "@/lib/landing-ids";

const contrasts = [
  {
    icon: HeartPulse,
    title: "Not therapy or triage",
    body: "A self-guided workspace—plan, chat-style support, and readouts are for awareness and pacing, not treatment or crisis response.",
  },
  {
    icon: Ban,
    title: "Not a mood-streak app",
    body: "Built around burnout-style strain: pressures, energy, symptoms, optional sleep, then dashboards—not daily mood badges.",
  },
  {
    icon: ScanFace,
    title: "Minimal surface area",
    body: "No social graph or feed—check-ins, plans, and chat tied to your anonymous session.",
  },
  {
    icon: Fingerprint,
    title: "Early signal, your steering",
    body: "Rings and labels flag drift while you can still adjust workload and recovery; you choose Plan, Chat, or a fresh check-in.",
  },
] as const;

export function WhyDifferentSection() {
  return (
    <section
      id={LANDING_IDS.whyDifferent}
      className="border-b border-border/60 bg-muted/25"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Positioning
          </p>
          <h2
            id="why-heading"
            className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            What we’re not
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            The pitch matches the build: check-in data powers snapshots, rings,
            and the four workspace areas—without pretending to be care.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 lg:grid-cols-2">
          {contrasts.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
                <CardContent className="flex gap-4 pt-6 pb-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-semibold text-foreground">
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
        </ul>
      </div>
    </section>
  );
}
