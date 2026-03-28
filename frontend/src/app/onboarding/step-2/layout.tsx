import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check-in · How you’ve been feeling",
  description:
    "Share current stress and energy signals—anonymous, on this device only.",
};

export default function OnboardingStep2Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
