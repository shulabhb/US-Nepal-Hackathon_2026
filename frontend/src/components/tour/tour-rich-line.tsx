"use client";

import { cn } from "@/lib/utils";

/** Shared **bold** parsing for tour hints (matches GuidedTourPanel). */
export function TourRichLine({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return (
    <p className={cn("leading-relaxed", className)}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong
              key={i}
              className="font-semibold text-foreground/95"
            >
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
