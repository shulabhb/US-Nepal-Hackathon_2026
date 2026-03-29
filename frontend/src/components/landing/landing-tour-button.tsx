"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useGuidedTour } from "@/components/tour/guided-tour-provider";
import {
  isWorkspaceTutorialCompleted,
  WORKSPACE_TUTORIAL_STORAGE_KEY,
  WORKSPACE_TUTORIAL_SYNC_EVENT,
} from "@/lib/onboarding/tutorial-storage";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Override default (emit global tutorial request). */
  onStart?: () => void;
};

export function LandingTourButton({ className, onStart }: Props) {
  const tour = useGuidedTour();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!isWorkspaceTutorialCompleted());
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === WORKSPACE_TUTORIAL_STORAGE_KEY || e.key === null) {
        sync();
      }
    };
    window.addEventListener(WORKSPACE_TUTORIAL_SYNC_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WORKSPACE_TUTORIAL_SYNC_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={cn(
        "h-11 min-h-11 gap-1.5 rounded-xl border-border/90 bg-background/70 px-6 text-base font-semibold backdrop-blur-sm sm:w-auto",
        className,
      )}
      onClick={() => {
        if (onStart) {
          onStart();
        } else {
          tour?.startTour();
        }
      }}
    >
      <Sparkles className="size-4 shrink-0" aria-hidden />
      Take tour
    </Button>
  );
}
