import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check-in · Optional health context",
  description:
    "Optional medications, health context, and personal notes for your private check-in—with clear acknowledgement before saving.",
};

export default function OnboardingStep5Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
