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
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Built with care
            </p>
            <h2
              id="mindful-heading"
              className="font-heading mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Respectful by default
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Same tone carries from onboarding through Plan, Chat, and Burnout
              views—because bandwidth is already low when you show up here.
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
                    Plain, non-blaming copy
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Written to reduce shame and comparison—not a scoreboard.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <HeartHandshake className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Privacy as product
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Anonymous on this device by default; check-ins and plans are
                    tied to your session—not a public profile.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" aria-hidden />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    Paused-friendly flow
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Chunked steps so you can stop and resume without losing the
                    thread.
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
