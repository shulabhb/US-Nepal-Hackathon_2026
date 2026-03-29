import { Activity, ArrowRight, Moon, Shield } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ProductPreviewCardProps = {
  className?: string;
};

export function ProductPreviewCard({ className }: ProductPreviewCardProps) {
  return (
    <Card
      className={cn(
        "relative max-w-md shadow-[0_0_0_1px_oklch(0.52_0.08_215_/0.12),0_24px_64px_-24px_oklch(0.35_0.06_240_/0.35)] ring-0",
        className,
      )}
      aria-label="Example check-in summary preview"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(120%_80%_at_20%_10%,oklch(0.78_0.08_210_/0.14),transparent_55%),radial-gradient(100%_70%_at_90%_80%,oklch(0.55_0.06_250_/0.08),transparent_50%)]"
        aria-hidden
      />
      <CardHeader className="relative gap-2 border-b border-border/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg tracking-tight">
              Snapshot · This week
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Example only · not clinical
            </CardDescription>
          </div>
          <span className="inline-flex h-5 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/80 px-2.5 text-[0.7rem] font-medium text-muted-foreground backdrop-blur-sm">
            Private session
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5 pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Activity className="size-3.5" aria-hidden />
              Stress signal
            </div>
            <p className="font-heading text-base font-semibold tracking-tight text-foreground">
              Elevated · sustained
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Example framing
            </p>
          </div>
          <div className="rounded-lg border border-border/80 bg-muted/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Moon className="size-3.5" aria-hidden />
              Sleep rhythm
            </div>
            <p className="font-heading text-base font-semibold tracking-tight text-foreground">
              Irregular · ~6.1h avg
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional tracking · you stay in control
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-primary/15 bg-primary/[0.06] px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-primary">
            <Shield className="size-3.5" aria-hidden />
            Burnout risk
          </div>
          <p className="mt-2 font-heading text-base font-semibold tracking-tight text-foreground">
            Moderate · early pattern
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Illustrative risk band—not your real result.
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested next steps
          </p>
          <ol className="space-y-2 text-sm">
            {[
              "Protect one 90-minute recovery block this week",
              "Shorten deep-work sprints; add buffer between meetings",
              "If symptoms intensify, route to campus care or telehealth",
            ].map((item, index) => (
              <li key={item} className="flex gap-2">
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card text-[0.65rem] font-semibold text-muted-foreground"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="leading-snug text-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </div>
        <Separator className="bg-border/80" />
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Suggestions only</span>
          <ArrowRight className="size-3 opacity-70" aria-hidden />
          <span>not a diagnosis</span>
        </p>
      </CardContent>
    </Card>
  );
}
