import { HandHeart, HeartHandshake, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { LANDING_IDS } from "@/lib/landing-ids";

export function MindfulDesignSection() {
  return (
    <section
      id={LANDING_IDS.mindfulDesign}
      className="border-b border-border/60 bg-muted/35"
      aria-labelledby="mindful-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Built with care
            </p>
            <h2
              id="mindful-heading"
              className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Mental-health-aware by default
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              When someone is already stretched thin, software tone matters.
              Burnout Radar uses supportive, non-judgmental language, avoids
              shamey framings, and treats privacy as a core feature—not a policy
              footnote.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Accessibility is part of that respect: semantic structure, readable
              type, visible focus states, and contrast that stays legible in
              daylight or late-night sessions.
            </p>
          </div>
          <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
            <CardContent className="space-y-6 pt-6 pb-6">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HandHeart className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Supportive language, always
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Copy is reviewed to reduce blame, catastrophizing, and
                    comparison traps. You’re met where you are—not scored like a
                    performance review.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HeartHandshake className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Privacy you can feel
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Sessions default anonymous. The goal is early support with
                    boundaries intact—especially for students and early-career
                    roles where reputational fear runs high.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Designed for emotional bandwidth
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Layouts breathe. Steps are chunked. You can pause and return
                    without losing the thread—because exhaustion rarely cooperates
                    with rigid flows.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
