"use client";

import * as React from "react";

import { GuidedTourProvider } from "@/components/tour/guided-tour-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <GuidedTourProvider>{children}</GuidedTourProvider>;
}
