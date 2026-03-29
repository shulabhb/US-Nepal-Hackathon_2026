"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useTourFormFieldsLocked,
  useTourSubmit,
} from "@/components/tour/guided-tour-provider";
import { PENDING_DASHBOARD_TOUR_SESSION_KEY } from "@/lib/onboarding/dashboard-tour-config";
import { GUIDED_TOUR_SESSION_KEY } from "@/lib/onboarding/guided-tour-config";
import { dashboardHref } from "@/lib/dashboard/dashboard-tab";
import { cn } from "@/lib/utils";
import { emptyStep5 } from "@/lib/onboarding/step-five";
import {
  mergeOnboardingState,
  readOnboardingState,
} from "@/lib/onboarding/storage";
import { syncCheckinFromCompletedOnboarding } from "@/lib/onboarding/sync-checkin-from-onboarding";

export function StepFiveDisclaimerForm() {
  const tourSubmit = useTourSubmit("onboarding-5a");
  const fieldsLocked = useTourFormFieldsLocked("onboarding-5a");
  const router = useRouter();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const s = readOnboardingState();
    if (!s.step1) {
      router.replace("/onboarding");
      return;
    }
    if (!s.step2) {
      router.replace("/onboarding/step-2");
      return;
    }
    if (!s.step3) {
      router.replace("/onboarding/step-3");
      return;
    }
    if (s.step4 == null) {
      router.replace("/onboarding/step-4");
      return;
    }
    if (s.step5 != null) {
      router.replace("/onboarding/step-5/questions");
      return;
    }
    setGateOpen(true);
  }, [router]);

  const handleDecline = () => {
    tourSubmit(() => {
      mergeOnboardingState({
        step5: emptyStep5(),
        _pending_sensitive_additional: null,
        _sensitive_step_questions: null,
      });
      setSyncError(null);
      setFinishing(true);
      void (async () => {
        const result = await syncCheckinFromCompletedOnboarding();
        setFinishing(false);
        if (!result.ok) {
          setSyncError(result.error);
          return;
        }
        try {
          sessionStorage.removeItem(GUIDED_TOUR_SESSION_KEY);
          sessionStorage.setItem(PENDING_DASHBOARD_TOUR_SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
        router.replace(dashboardHref("overview"));
      })();
    });
  };

  const handleAccept = () => {
    tourSubmit(() => {
      mergeOnboardingState({ _sensitive_step_questions: true });
      router.push("/onboarding/step-5/questions");
    });
  };

  if (!gateOpen) {
    return (
      <div
        className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4"
        aria-busy="true"
      >
        <p className="sr-only">Loading</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14 md:px-6 lg:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/onboarding/step-4"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back
          </Link>
          <Link
            href="/onboarding/step-4"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Edit previous step
          </Link>
        </div>
        <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
          Step <span className="text-foreground">5</span> of{" "}
          <span className="text-foreground">5</span>
        </p>
      </div>

      <div
        data-tour="onboarding-form"
        className={cn(
          "transition-shadow duration-300",
          fieldsLocked && "pointer-events-none select-none",
        )}
      >
      <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader className="space-y-4 border-b border-border/60 pb-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Lock className="size-3.5" aria-hidden />
            Optional · private in your saved check-in
          </p>
          <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
            Optional health and personal context
          </CardTitle>
        </CardHeader>
        <CardContent className="space-8 pt-8">
          <div className="space-y-3">
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Some people want to share medications, health conditions, or
              personal experiences so support feels more relevant. This is
              optional. If you add anything on the next screen, it will be saved
              with your check-in and used only to personalize support inside this
              app.
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              You do not need to share anything deeply personal unless you want
              to.
            </p>
          </div>

          {syncError ? (
            <p className="text-sm text-destructive" role="alert">
              {syncError}{" "}
              <span className="text-muted-foreground">
                Try again—your answers are still on this device.
              </span>
            </p>
          ) : null}

          <div
            className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-between"
            data-tour-submit
          >
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-xl text-muted-foreground sm:order-2 sm:max-w-[12rem]"
              onClick={handleDecline}
              disabled={finishing}
            >
              {finishing ? "Saving…" : "No thanks — go to dashboard"}
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 rounded-xl px-8 sm:order-1 sm:flex-1 sm:max-w-md"
              onClick={handleAccept}
              disabled={finishing}
            >
              Continue to optional questions
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
