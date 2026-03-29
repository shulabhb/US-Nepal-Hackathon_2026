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
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-bold text-foreground shadow-sm backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full motion-safe:animate-ping rounded-full bg-primary/40 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary/80" />
            </span>
            100% Anonymous
          </p>
          <h1
            id="hero-heading"
            className="font-heading text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-[1.12]"
          >
            Check your strain before you make your next plans.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            A structured check-in (stress, energy, symptoms) gives you an illustrative snapshot of your strain before you organize your day or week. Use your private workspace to adjust tasks, follow tailored checklists, and get contextual support chat—not a diagnosis—and we never ask for your real name or number.
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
            className="mt-8 flex flex-col gap-2 text-sm font-medium text-foreground/80 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2"
            aria-label="Privacy Check"
          >
            <li className="flex items-center gap-2">
              <UserX className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>No names, no numbers</span>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>100% anonymous check-ins</span>
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
