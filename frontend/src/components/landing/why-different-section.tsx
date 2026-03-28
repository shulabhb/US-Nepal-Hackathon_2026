import { Ban, Fingerprint, HeartPulse, ScanFace } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LANDING_IDS } from "@/lib/landing-ids";

const contrasts = [
  {
    icon: HeartPulse,
    title: "Not a therapy replacement",
    body: "Burnout Radar supports early awareness and next steps. It doesn’t replace a clinician, crisis line, or emergency care when you need them.",
  },
  {
    icon: Ban,
    title: "Not another generic mood tracker",
    body: "The focus is burnout risk—load, sleep rhythm, symptoms—not daily emoji streaks or performative wellness.",
  },
  {
    icon: ScanFace,
    title: "Not invasive",
    body: "No social graph mining. No endless questionnaires. Just the signals that help a snapshot stay honest and usable.",
  },
  {
    icon: Fingerprint,
    title: "Early support, not surveillance",
    body: "You get guidance meant to interrupt spirals early—before calendars, sleep, or focus fully collapse.",
  },
] as const;

export function WhyDifferentSection() {
  return (
    <section
      id={LANDING_IDS.whyDifferent}
      className="border-b border-border/60 bg-muted/25"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Positioning
          </p>
          <h2
            id="why-heading"
            className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Why this is different
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Most tools optimize for habit loops. Burnout Radar optimizes for clarity,
            privacy, and timely support when your capacity is already limited.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 lg:grid-cols-2">
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
