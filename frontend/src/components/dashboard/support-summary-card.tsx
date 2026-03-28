import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  labelForStoredGoal,
  labelForStoredPressure,
} from "@/lib/dashboard/stored-labels";

type Props = {
  riskLabel: string;
  summarySentence: string;
  pressure: string;
  goal: string;
};

export function SupportSummaryCard({
  riskLabel,
  summarySentence,
  pressure,
  goal,
}: Props) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
      <CardHeader className="space-y-1 pb-2 pt-5">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          Support snapshot
        </p>
        <CardTitle className="font-heading text-lg font-semibold leading-snug tracking-tight sm:text-xl">
          {riskLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5 text-sm text-muted-foreground">
        <p className="text-pretty leading-relaxed text-foreground/90">
          {summarySentence}
        </p>
        <dl className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Main pressure
            </dt>
            <dd className="mt-0.5 text-foreground">
              {labelForStoredPressure(pressure)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Main goal
            </dt>
            <dd className="mt-0.5 text-foreground">
              {labelForStoredGoal(goal)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
