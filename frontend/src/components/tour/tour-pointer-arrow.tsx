"use client";

import { ArrowLeft } from "lucide-react";
import * as React from "react";

type Target = "submit" | "landing-cta";

/**
 * Arrow to the **right** of the target, pointing **left** toward the button
 * (Continue, Skip row, or Start check-in).
 */
export function TourPointerArrow({ target }: { target: Target }) {
  const [box, setBox] = React.useState<DOMRect | null>(null);

  const selector =
    target === "landing-cta"
      ? '[data-tour="landing-checkin-cta"]'
      : "[data-tour-submit]";

  React.useLayoutEffect(() => {
    const update = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      setBox(el?.getBoundingClientRect() ?? null);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 350);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [selector]);

  if (box == null) return null;

  const top = box.top + box.height / 2 - 20;
  const left = box.right + 10;

  return (
    <div
      className="pointer-events-none fixed z-[205] flex items-center gap-2"
      style={{ top, left }}
      aria-hidden
    >
      <ArrowLeft
        className="size-9 shrink-0 text-primary drop-shadow-md motion-safe:animate-pulse"
        strokeWidth={2.5}
      />
      <span className="max-w-[9rem] text-[11px] font-semibold leading-snug text-primary">
        Press here to continue
      </span>
    </div>
  );
}
