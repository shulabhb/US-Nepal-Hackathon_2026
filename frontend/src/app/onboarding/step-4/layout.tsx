import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check-in · Background",
  description:
    "Optional background and migration context for your private check-in—skippable.",
};

export default function OnboardingStep4Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
