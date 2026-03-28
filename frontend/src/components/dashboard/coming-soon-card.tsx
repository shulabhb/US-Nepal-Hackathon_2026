import { Lock } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  title: string;
  description: string;
  footnote?: string;
  className?: string;
};

export function ComingSoonCard({
  id,
  title,
  description,
  footnote,
  className,
}: Props) {
  return (
    <Card
      id={id}
      className={cn(
        "border-border/70 bg-muted/15 shadow-sm ring-1 ring-border/40",
        className,
      )}
    >
      <CardHeader className="space-y-2 pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant="soon" />
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Staged
          </span>
        </div>
        <CardTitle className="font-heading text-base font-semibold text-foreground/90">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      {footnote ? (
        <CardContent className="pb-4 pt-0">
          <p className="text-xs text-muted-foreground">{footnote}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
