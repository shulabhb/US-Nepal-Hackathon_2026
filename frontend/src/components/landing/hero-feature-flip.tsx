"use client";

import {
  Activity,
  ListChecks,
  MessageCircle,
  Shield,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const FEATURES: { icon: LucideIcon; label: string }[] = [
  { icon: Shield, label: "100% Anonymous" },
  { icon: Activity, label: "Strain snapshot" },
  { icon: ListChecks, label: "Plans & tailored checklists" },
  { icon: MessageCircle, label: "Contextual support chat" },
];

const INTERVAL_MS = 1600;

export function HeroFeatureFlip() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % FEATURES.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  const { icon: Icon, label } = FEATURES[index];

  return (
    <div
      className="mb-4 inline-flex w-fit max-w-[min(100%,13.5rem)] items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-bold text-foreground shadow-sm backdrop-blur-sm sm:max-w-[14.5rem]"
      role="status"
      aria-live="off"
    >
      <div className="min-h-[1.35rem] min-w-0 w-full [perspective:880px]">
        <div
          key={index}
          className={cn(
            "flex items-center gap-2 origin-[center_top] backface-hidden",
            "animate-hero-feature-flip motion-reduce:animate-none",
          )}
        >
          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="text-balance text-left leading-snug">{label}</span>
        </div>
      </div>
    </div>
  );
}
