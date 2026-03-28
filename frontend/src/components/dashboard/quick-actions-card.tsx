"use client";

import {
  CalendarClock,
  ClipboardList,
  MessageSquareText,
  Moon,
  RotateCcw,
  Wind,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { cn } from "@/lib/utils";

export type QuickActionId =
  | "plan"
  | "calm"
  | "sleep"
  | "workload"
  | "retake"
  | "checkin";

type ActionDef = {
  id: QuickActionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "mock" | "live" | "soon";
  hint?: string;
};

const ACTIONS: ActionDef[] = [
  {
    id: "plan",
    label: "Make a plan",
    icon: CalendarClock,
    status: "mock",
    hint: "Opens a scripted reply in chat",
  },
  {
    id: "calm",
    label: "Calm down now",
    icon: Wind,
    status: "mock",
  },
  {
    id: "sleep",
    label: "Improve sleep tonight",
    icon: Moon,
    status: "mock",
  },
  {
    id: "retake",
    label: "Retake check-in",
    icon: RotateCcw,
    status: "live",
    hint: "Starts a fresh onboarding flow",
  },
  {
    id: "checkin",
    label: "View latest check-in",
    icon: ClipboardList,
    status: "mock",
    hint: "Scrolls to your saved snapshot",
  },
];

type Props = {
  onAction: (id: QuickActionId) => void;
  className?: string;
};

export function QuickActionsCard({ onAction, className }: Props) {
  return (
    <Card
      id="section-quick-actions"
      className={cn("border-border/75 bg-card/90 shadow-sm", className)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-4">
        <div>
          <CardTitle className="font-heading text-base font-semibold">
            Quick actions
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Shortcuts—some are exploratory mock flows today.
          </p>
        </div>
        <StatusBadge variant="mock">Guided</StatusBadge>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const variant =
            a.status === "live" ? "live" : a.status === "mock" ? "mock" : "soon";
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(a.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-left transition-colors",
                "hover:border-primary/35 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/80 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {a.label}
                  </span>
                  <StatusBadge variant={variant}>
                    {a.status === "live"
                      ? "Live now"
                      : a.status === "mock"
                        ? "Mock flow"
                        : "Soon"}
                  </StatusBadge>
                </span>
                {a.hint ? (
                  <span className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                    <MessageSquareText
                      className="mt-0.5 size-3 shrink-0 opacity-70"
                      aria-hidden
                    />
                    {a.hint}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
