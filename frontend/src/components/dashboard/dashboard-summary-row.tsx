import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  labelForStoredGoal,
  labelForStoredPressure,
} from "@/lib/dashboard/stored-labels";
import { cn } from "@/lib/utils";

type Props = {
  riskLabel: string;
  currentFocus: string;
  pressureKey: string;
  goalKey: string;
  className?: string;
};

export function DashboardSummaryRow({
  riskLabel,
  currentFocus,
  pressureKey,
  goalKey,
  className,
}: Props) {
  const cells = [
    {
      label: "Support state",
      value: riskLabel,
      badge: <StatusBadge variant="live">Synced check-in</StatusBadge>,
    },
    {
      label: "Current focus",
      value: currentFocus,
      badge: null,
    },
    {
      label: "Main pressure",
      value: labelForStoredPressure(pressureKey),
      badge: null,
    },
    {
      label: "Main goal",
      value: labelForStoredGoal(goalKey),
      badge: null,
    },
  ] as const;

  return (
    <div
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-2xl border border-border/70 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {cell.label}
            </p>
            {cell.badge}
          </div>
          <p className="text-pretty text-sm font-medium leading-snug text-foreground">
            {cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}
