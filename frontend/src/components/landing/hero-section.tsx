import { Lock, UserX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { LANDING_CHECKIN_CTA, LANDING_HOW_IT_WORKS } from "@/lib/landing-copy";
import { LANDING_IDS } from "@/lib/landing-ids";
import { cn } from "@/lib/utils";

import { LandingDashboardMock } from "./landing-dashboard-mock";

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden border-b border-border/60"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.78_0.09_210_/0.16),transparent),radial-gradient(ellipse_60%_50%_at_100%_50%,oklch(0.55_0.05_250_/0.06),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full motion-safe:animate-ping rounded-full bg-primary/40 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary/80" />
            </span>
            Private workspace · anonymous on this device
          </p>
          <h1
            id="hero-heading"
            className="font-heading text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-[1.12]"
          >
            See burnout strain in plain language—then act in one place.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            A structured check-in (stress, energy, symptoms, optional sleep)
            powers your dashboard: illustrative strain rings, a tailored plan with
            checklists, support chat that reads your snapshot, and a full Burnout
            view when you want depth—not a diagnosis, no real name required.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 min-h-11 justify-center rounded-xl px-6 text-base font-semibold shadow-sm sm:w-auto",
              )}
            >
              {LANDING_CHECKIN_CTA}
            </Link>
            <a
              href={`#${LANDING_IDS.howItWorks}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 min-h-11 justify-center rounded-xl border-border/90 bg-background/70 px-6 text-base font-semibold backdrop-blur-sm sm:w-auto",
              )}
            >
              {LANDING_HOW_IT_WORKS}
            </a>
          </div>
          <ul
            className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2"
            aria-label="Privacy"
          >
            <li className="flex items-center gap-2">
              <UserX className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>No real name</span>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>Anonymous by default</span>
            </li>
          </ul>
        </div>
        <div className="mt-12 flex justify-center lg:mt-0 lg:justify-end">
          <LandingDashboardMock className="w-full sm:max-w-xl lg:max-w-3xl" />
        </div>
      </div>
    </section>
  );
}
