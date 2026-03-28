import { Lock, UserX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { LANDING_IDS } from "@/lib/landing-ids";
import { cn } from "@/lib/utils";

import { ProductPreviewCard } from "./product-preview-card";

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
            Anonymous early support for students &amp; young professionals
          </p>
          <h1
            id="hero-heading"
            className="font-heading text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-[1.12]"
          >
            Catch burnout risk early—before it becomes your default state.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Burnout Radar reads a small set of self-reported signals—and optional
            sleep rhythm—to surface a clear, private snapshot and practical next
            steps. Low friction, no real name required, and built for the stretch
            between “I’m fine” and “I need help now.”
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 min-h-11 justify-center rounded-xl px-6 text-base shadow-sm sm:w-auto",
              )}
            >
              Start Private Check-In
            </Link>
            <a
              href={`#${LANDING_IDS.howItWorks}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 min-h-11 justify-center rounded-xl border-border/90 bg-background/70 px-6 text-base backdrop-blur-sm sm:w-auto",
              )}
            >
              See How It Works
            </a>
          </div>
          <ul
            className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2"
            aria-label="Privacy reassurances"
          >
            <li className="flex items-center gap-2">
              <UserX className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>No real name required</span>
            </li>
            <li className="flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-primary/80" aria-hidden />
              <span>Anonymous by default</span>
            </li>
          </ul>
        </div>
        <div className="mt-12 flex justify-center lg:mt-0 lg:justify-end">
          <ProductPreviewCard className="w-full sm:max-w-md" />
        </div>
      </div>
    </section>
  );
}
