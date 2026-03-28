import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check-in · Sleep & recovery",
  description:
    "Optional wearable demo and sleep signals—stays on this device only.",
};

export default function OnboardingStep3Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
