"use client";

import { Sparkles } from "lucide-react";

export function TourAffirmation({ text }: { text: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[220] flex items-center justify-center bg-background/40 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/25 bg-card px-10 py-8 shadow-2xl">
        <Sparkles
          className="size-10 text-primary"
          strokeWidth={1.75}
          aria-hidden
        />
        <p className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {text}
        </p>
      </div>
    </div>
  );
}
