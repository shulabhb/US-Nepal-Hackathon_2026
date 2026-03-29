"use client";

import * as React from "react";

const PAD = 10;

/**
 * Dims the viewport except a rectangular “hole” over `[data-tour="…"]` or
 * `[data-tour-submit]`, so the focused region keeps natural color. Renders
 * above page content; the hole has no overlay so clicks pass through.
 */
export function TourSpotlight({
  active,
  /** `data-tour` value, or the literal `"data-tour-submit"` for submit rows */
  highlightKey,
}: {
  active: boolean;
  highlightKey: string | null;
}) {
  const [box, setBox] = React.useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    if (!active || !highlightKey) {
      setBox(null);
      return;
    }

    const measure = () => {
      const el =
        highlightKey === "data-tour-submit"
          ? document.querySelector("[data-tour-submit]")
          : document.querySelector(`[data-tour="${highlightKey}"]`);
      if (!el || !(el instanceof HTMLElement)) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBox({
        top: Math.max(0, r.top - PAD),
        left: Math.max(0, r.left - PAD),
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    const root =
      highlightKey === "data-tour-submit"
        ? document.querySelector("[data-tour-submit]")
        : document.querySelector(`[data-tour="${highlightKey}"]`);
    if (root instanceof HTMLElement) ro.observe(root);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const id = window.setInterval(measure, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(id);
    };
  }, [active, highlightKey]);

  if (!active || !highlightKey) return null;

  /** Brief full dim while measuring, or if the node is missing (avoids an undimmed flash). */
  if (box == null) {
    return (
      <div
        className="pointer-events-auto fixed inset-0 z-[188] bg-black/50 transition-opacity duration-200"
        aria-hidden
      />
    );
  }

  const { top, left, width, height } = box;
  const dim = "bg-black/50";

  return (
    <div className="pointer-events-none fixed inset-0 z-[188]" aria-hidden>
      {/* top */}
      <div
        className={`pointer-events-auto fixed left-0 right-0 top-0 ${dim}`}
        style={{ height: top }}
      />
      {/* bottom */}
      <div
        className={`pointer-events-auto fixed left-0 right-0 ${dim}`}
        style={{ top: top + height, bottom: 0 }}
      />
      {/* left */}
      <div
        className={`pointer-events-auto fixed left-0 ${dim}`}
        style={{ top, width: left, height }}
      />
      {/* right */}
      <div
        className={`pointer-events-auto fixed ${dim}`}
        style={{ top, left: left + width, right: 0, height }}
      />
    </div>
  );
}
