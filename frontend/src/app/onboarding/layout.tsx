import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Private check-in",
  description:
    "A short anonymous check-in to help Burnout Radar understand your context—no real name required.",
};

export default function OnboardingLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,oklch(0.78_0.09_210_/0.14),transparent),radial-gradient(ellipse_55%_45%_at_100%_40%,oklch(0.55_0.05_250_/0.06),transparent)]"
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
