"use client";

import Image from "next/image";
import * as React from "react";

import { cn } from "@/lib/utils";

type LandingDashboardMockProps = {
  className?: string;
};

const SLIDES = [
  { src: "/dashboard.png", alt: "Dashboard snapshot" },
  { src: "/rings.png", alt: "Burnout rings" },
  { src: "/plan.png", alt: "Care plan" },
  { src: "/chat.png", alt: "Support chat" },
] as const;

const INTERVAL_MS = 3600;
const FADE_MS = 420;

const cardShell =
  "relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 bg-white/40 p-[2px] sm:p-1 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.2)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_36px_90px_-22px_rgba(0,0,0,0.26)] dark:border-white/10 dark:bg-black/50";

const imageInner =
  "relative aspect-[3/4] w-full overflow-hidden rounded-[0.65rem] sm:rounded-[1.35rem] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10";

const imgSizes =
  "(max-width: 768px) 90vw, (max-width: 1024px) 50vw, 560px";

export function LandingDashboardMock({ className }: LandingDashboardMockProps) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (paused) return;
    const delay = reduceMotion ? INTERVAL_MS * 2 : INTERVAL_MS;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      delay,
    );
    return () => window.clearInterval(id);
  }, [paused, reduceMotion]);

  return (
    <div
      className={cn(
        "relative w-full select-none overflow-visible pb-8 pt-10 sm:pb-14 sm:pt-16",
        className,
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[130%] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-sky-400/25 via-primary/18 to-violet-400/25 blur-3xl" />

      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_55%_55%_at_50%_50%,#000_60%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

      <div className="relative z-10 mx-auto w-full max-w-[min(100%,22rem)] sm:max-w-[28rem] lg:max-w-[32rem]">
        <div
          className="space-y-4"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-roledescription="carousel"
          aria-label="Product screenshots"
        >
          <div className={cn(cardShell)}>
            <div className={imageInner}>
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.src}
                  aria-hidden={i !== index}
                  className={cn(
                    "absolute inset-0 transition-opacity ease-out motion-reduce:transition-none",
                    i === index
                      ? "z-[2] opacity-100"
                      : "z-[1] opacity-0 pointer-events-none",
                  )}
                  style={{
                    transitionDuration: reduceMotion ? "0ms" : `${FADE_MS}ms`,
                  }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes={imgSizes}
                    quality={100}
                    className="object-contain object-center"
                    priority={i === 0}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-2"
            role="group"
            aria-label="Choose screenshot"
          >
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show image ${i + 1} of ${SLIDES.length}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                  i === index
                    ? "w-7 bg-primary"
                    : "w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
