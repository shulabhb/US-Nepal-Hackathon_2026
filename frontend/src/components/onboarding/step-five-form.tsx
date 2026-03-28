"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { OnboardingStep5 } from "@/lib/onboarding/step-five";
import { emptyStep5 } from "@/lib/onboarding/step-five";
import {
  mergeOnboardingState,
  readOnboardingState,
  setPreferDashboardAfterRecommendations,
} from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";

export function StepFiveForm() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [medications, setMedications] = React.useState("");
  const [medicalConditions, setMedicalConditions] = React.useState("");
  const [additionalContext, setAdditionalContext] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

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
    if (s.step5 == null && s._sensitive_step_questions !== true) {
      router.replace("/onboarding/step-5");
      return;
    }
    setGateOpen(true);

    const s5 = s.step5;
    setMedications(s5?.medications?.trim() ?? "");
    setMedicalConditions(s5?.medical_conditions?.trim() ?? "");
    const pending = s._pending_sensitive_additional?.trim() ?? "";
    const savedAdditional = s5?.additional_context?.trim() ?? "";
    setAdditionalContext(savedAdditional || pending);
    setConsent(s5?.consent_to_sensitive_context === true);
    setHydrated(true);
  }, [router]);

  const buildStep5Payload = (): OnboardingStep5 => {
    const m = medications.trim();
    const c = medicalConditions.trim();
    const a = additionalContext.trim();
    const hasAny = !!(m || c || a);
    return {
      medications: m.length ? m : null,
      medical_conditions: c.length ? c : null,
      additional_context: a.length ? a : null,
      consent_to_sensitive_context: hasAny ? consent : null,
    };
  };

  const hasSensitiveText =
    !!(medications.trim() || medicalConditions.trim() || additionalContext.trim());
  const consentOk = !hasSensitiveText || consent === true;
  const canContinue = consentOk;

  const goRecommendations = (payload: OnboardingStep5) => {
    mergeOnboardingState({
      step5: payload,
      _pending_sensitive_additional: null,
      _sensitive_step_questions: null,
    });
    setPreferDashboardAfterRecommendations();
    router.push("/recommendations");
  };

  const handleSkip = () => {
    setAttemptedSubmit(false);
    goRecommendations(emptyStep5());
  };

  const handleContinue = () => {
    if (!canContinue) {
      setAttemptedSubmit(true);
      return;
    }
    setAttemptedSubmit(false);
    goRecommendations(buildStep5Payload());
  };

  if (!gateOpen || !hydrated) {
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

      <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader className="space-y-4 border-b border-border/60 pb-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Lock className="size-3.5" aria-hidden />
            Optional · private in your saved check-in
          </p>
          <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
            Optional health and personal context
          </CardTitle>
          <CardDescription className="text-base leading-relaxed text-muted-foreground">
            Add anything below that feels helpful. You can leave everything
            blank and continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-8 pt-8">
          <div
            className={cn(
              "space-y-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-4 sm:px-5",
              attemptedSubmit && hasSensitiveText && !consent
                ? "border-destructive/50"
                : "border-border/70",
            )}
            role="group"
            aria-labelledby="sensitive-consent-label"
            aria-describedby="consent-field-requirement"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                id="sensitive-consent"
                checked={consent}
                onCheckedChange={(c: boolean) => {
                  setConsent(c === true);
                  setAttemptedSubmit(false);
                }}
                className="mt-0.5"
                aria-invalid={
                  attemptedSubmit && !consentOk ? true : undefined
                }
                aria-describedby="consent-field-requirement"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <Label
                  id="sensitive-consent-label"
                  htmlFor="sensitive-consent"
                  className="cursor-pointer text-left text-sm font-normal leading-snug text-foreground"
                >
                  I understand and want this information used to personalize my
                  support.
                </Label>
                <p
                  id="consent-field-requirement"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  If you leave all three fields below empty, you can continue
                  without checking this. If you enter anything, check this box
                  before continuing.
                </p>
              </div>
            </div>
            {attemptedSubmit && !consentOk ? (
              <p className="text-sm text-destructive" role="alert">
                Please confirm the box above to save what you entered, or clear
                the fields you do not want to include.
              </p>
            ) : null}
          </div>

          <div
            className="space-y-6 border-t border-border/60 pt-8"
            aria-label="Optional details"
          >
            <p className="text-sm font-medium text-foreground">
              Optional details
            </p>

            <div className="space-y-2">
              <Label htmlFor="medications" className="text-sm font-medium">
                Medications (optional)
              </Label>
              <textarea
                id="medications"
                value={medications}
                onChange={(e) => {
                  setMedications(e.target.value);
                  setAttemptedSubmit(false);
                }}
                rows={4}
                maxLength={8000}
                className="min-h-[7rem] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="You can list any medications you want us to consider…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medical-conditions" className="text-sm font-medium">
                Medical conditions (optional)
              </Label>
              <textarea
                id="medical-conditions"
                value={medicalConditions}
                onChange={(e) => {
                  setMedicalConditions(e.target.value);
                  setAttemptedSubmit(false);
                }}
                rows={4}
                maxLength={8000}
                className="min-h-[7rem] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="You can share any health conditions or concerns you want us to consider…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-context" className="text-sm font-medium">
                Anything else you want us to understand? (optional)
              </Label>
              <p id="additional-helper" className="text-xs text-muted-foreground">
                You can share recent stress, past experiences, mental health
                history, trauma, or anything else you think would help personalize
                support.
              </p>
              <textarea
                id="additional-context"
                value={additionalContext}
                onChange={(e) => {
                  setAdditionalContext(e.target.value);
                  setAttemptedSubmit(false);
                }}
                rows={6}
                maxLength={8000}
                aria-describedby="additional-helper"
                className="min-h-[10rem] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="You can write as much or as little as you want…"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-xl text-muted-foreground sm:order-2"
              onClick={handleSkip}
            >
              Skip this step
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 rounded-xl px-8 sm:order-1"
              onClick={handleContinue}
            >
              Continue to results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
