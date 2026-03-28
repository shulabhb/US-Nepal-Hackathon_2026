import Link from "next/link";

import { LANDING_IDS } from "@/lib/landing-ids";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: `#${LANDING_IDS.howItWorks}`, label: "How it works" },
  { href: `#${LANDING_IDS.whyDifferent}`, label: "Why different" },
  { href: `#${LANDING_IDS.features}`, label: "Features" },
  { href: `#${LANDING_IDS.mindfulDesign}`, label: "Thoughtful design" },
] as const;

type SiteHeaderProps = {
  className?: string;
};

export function SiteHeader({ className }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 font-heading text-base font-semibold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:text-lg"
        >
          Burnout Radar
        </Link>
        <nav
          aria-label="In-page navigation"
          className="min-w-0 flex-1 md:flex-none"
        >
          <ul className="-mx-1 flex items-center gap-1 overflow-x-auto overscroll-x-contain px-1 py-1 text-xs sm:gap-3 sm:text-sm md:justify-end md:gap-6">
            {navLinks.map(({ href, label }) => (
              <li key={href} className="shrink-0">
                <a
                  href={href}
                  className="rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-2"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/onboarding"
          className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-3 sm:text-sm"
        >
          Start check-in
        </Link>
      </div>
    </header>
  );
}
