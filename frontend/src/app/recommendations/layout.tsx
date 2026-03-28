import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Your check-in results",
  description:
    "Burnout Radar snapshot from your private check-in—not a diagnosis, just practical next steps.",
};

export default function RecommendationsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return children;
}
