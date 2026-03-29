import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { LANDING_CHECKIN_CTA } from "@/lib/landing-copy";
import { LANDING_IDS } from "@/lib/landing-ids";
import { cn } from "@/lib/utils";

export function FinalCtaSection() {
  return (
    <section
      id={LANDING_IDS.getStarted}
      className="relative overflow-hidden"
      aria-labelledby="cta-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_120%,oklch(0.55_0.08_215_/0.12),transparent),linear-gradient(180deg,oklch(0.97_0.015_250),oklch(0.985_0.012_250))]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/80 bg-card/90 p-8 text-center shadow-sm backdrop-blur-md sm:p-10">
          <h2
            id="cta-heading"
            className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Room to adjust—before things get loud.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            One check-in, a clear readout, and steps you can try while you still
            have bandwidth.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "h-11 min-h-11 w-full min-w-[14rem] justify-center rounded-xl px-8 text-base font-semibold shadow-sm sm:w-auto",
              )}
            >
              {LANDING_CHECKIN_CTA}
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            No timer—go at your own pace.
          </p>
        </div>
      </div>
    </section>
  );
}
