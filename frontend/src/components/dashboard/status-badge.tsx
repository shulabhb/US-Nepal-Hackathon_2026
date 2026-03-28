import { cn } from "@/lib/utils";

export type StatusBadgeVariant = "live" | "mock" | "soon";

const styles: Record<
  StatusBadgeVariant,
  string
> = {
  live:
    "border-emerald-700/25 bg-emerald-600/[0.12] text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100",
  mock:
    "border-sky-700/25 bg-sky-600/[0.12] text-sky-950 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-50",
  soon:
    "border-border bg-muted/60 text-muted-foreground",
};

const defaultLabels: Record<StatusBadgeVariant, string> = {
  live: "Live now",
  mock: "Mock flow",
  soon: "Coming soon",
};

type Props = {
  variant: StatusBadgeVariant;
  children?: React.ReactNode;
  className?: string;
};

export function StatusBadge({ variant, children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[variant],
        className,
      )}
    >
      {children ?? defaultLabels[variant]}
    </span>
  );
}
