"use client";

import { cn } from "@/lib/utils";

type Strength = "heavy" | "light" | "none";

/**
 * Blocks interaction with the page behind the tour. `light` + pointer-events-none
 * keeps primary CTAs (e.g. Start check-in) clickable when raised in z-index.
 */
export function TourBackdrop({
  strength,
  className,
}: {
  strength: Strength;
  className?: string;
}) {
  if (strength === "none") return null;
  return (
    <div
      className={cn(
        "fixed inset-0 z-[188] transition-opacity duration-300",
        strength === "heavy" ? "bg-black/60" : "bg-black/45",
        strength === "heavy" ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      aria-hidden
    />
  );
}
