"use client";

import { ArrowLeft, Lock, Watch } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { mergeOnboardingState, readOnboardingState } from "@/lib/onboarding/storage";
import {
  CONSISTENCY_OPTIONS,
  DURATION_OPTIONS,
  QUALITY_OPTIONS,
  SAMPLE_WEARABLE_STEP3,
  type OnboardingStep3,
  type SleepConsistencyLevel,
  type SleepDurationBucket,
  type SleepQualityLevel,
} from "@/lib/onboarding/step-three";

function ChoiceRow({
  value,
  labelText,
  groupName,
}: {
  value: string;
  labelText: string;
  groupName: string;
}) {
  const id = `${groupName}-${value}`;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-card/50 px-3 py-3 transition-colors hover:bg-muted/40 has-[[data-checked]]:border-primary/35 has-[[data-checked]]:bg-primary/[0.06]">
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <Label
        htmlFor={id}
        className="cursor-pointer text-left text-sm font-normal leading-snug text-foreground"
      >
        {labelText}
      </Label>
    </div>
  );
}

export function StepThreeForm() {
  const router = useRouter();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [duration, setDuration] = React.useState<SleepDurationBucket | "">("");
  const [quality, setQuality] = React.useState<SleepQualityLevel | "">("");
  const [consistency, setConsistency] = React.useState<
    SleepConsistencyLevel | ""
  >("");
  const [importedFromWearable, setImportedFromWearable] = React.useState(false);

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
    setGateOpen(true);
    if (s.step3) {
      setDuration(s.step3.duration);
      setQuality(s.step3.quality);
      setConsistency(s.step3.consistency);
      setImportedFromWearable(s.step3.importedFromWearable);
    }
  }, [router]);

  const clearWearableFlag = () => setImportedFromWearable(false);

  const handleDurationChange = (v: string) => {
    clearWearableFlag();
    setDuration(v as SleepDurationBucket);
  };

  const handleQualityChange = (v: string) => {
    clearWearableFlag();
    setQuality(v as SleepQualityLevel);
  };

  const handleConsistencyChange = (v: string) => {
    clearWearableFlag();
    setConsistency(v as SleepConsistencyLevel);
  };

  const applySampleWearable = () => {
    setDuration(SAMPLE_WEARABLE_STEP3.duration);
    setQuality(SAMPLE_WEARABLE_STEP3.quality);
    setConsistency(SAMPLE_WEARABLE_STEP3.consistency);
    setImportedFromWearable(true);
  };

  const isComplete = Boolean(duration && quality && consistency);

  const handleContinue = () => {
    if (!isComplete) return;
    const payload: OnboardingStep3 = {
      duration: duration as SleepDurationBucket,
      quality: quality as SleepQualityLevel,
      consistency: consistency as SleepConsistencyLevel,
      importedFromWearable,
    };
    mergeOnboardingState({ step3: payload });
    router.push("/onboarding/step-4");
  };

  if (!gateOpen) {
    return (
      <div
        className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4"
        aria-busy="true"
      >
        <p className="sr-only">Loading check-in</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14 md:px-6 lg:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <Link
            href="/onboarding/step-2"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back
          </Link>
          <Link
            href="/onboarding/step-2"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Edit previous step
          </Link>
        </div>
        <p
          className="text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          Step <span className="text-foreground">3</span> of{" "}
          <span className="text-foreground">5</span>
        </p>
      </div>

      <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader className="space-y-4 border-b border-border/60 pb-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Lock className="size-3.5" aria-hidden />
            Essential signals only.
          </p>
          <div className="space-y-2">
            <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
              How has your sleep been lately?
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Sleep is one of the clearest early signals of overload and
              recovery. Share what feels most accurate.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-10 pt-8">
          <div className="rounded-xl border border-dashed border-border/90 bg-muted/25 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Watch className="size-4" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Optional: sample wearable data
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Demo only—prefills believable sleep patterns. Not connected
                    to Apple Watch or any device.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 self-start rounded-lg border-border/90 bg-background/80 text-xs sm:self-center"
                onClick={applySampleWearable}
              >
                Use sample wearable data
              </Button>
            </div>
            {importedFromWearable ? (
              <p
                className="mt-3 text-xs text-muted-foreground"
                aria-live="polite"
              >
                Sample values applied—you can adjust any answer below.
              </p>
            ) : null}
          </div>

          <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              How many hours have you been sleeping lately?
            </legend>
            <RadioGroup
              name="onboarding-sleep-duration"
              value={duration || undefined}
              onValueChange={handleDurationChange}
              className="grid gap-2"
              required
              aria-required
            >
              {DURATION_OPTIONS.map(({ value, label }) => (
                <ChoiceRow
                  key={value}
                  value={value}
                  labelText={label}
                  groupName="duration"
                />
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              How would you rate your sleep quality?
            </legend>
            <RadioGroup
              name="onboarding-sleep-quality"
              value={quality || undefined}
              onValueChange={handleQualityChange}
              className="grid gap-2 sm:grid-cols-1"
              required
              aria-required
            >
              {QUALITY_OPTIONS.map(({ value, label }) => (
                <ChoiceRow
                  key={value}
                  value={value}
                  labelText={label}
                  groupName="quality"
                />
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              How consistent has your sleep routine been?
            </legend>
            <RadioGroup
              name="onboarding-sleep-consistency"
              value={consistency || undefined}
              onValueChange={handleConsistencyChange}
              className="grid gap-2"
              required
              aria-required
            >
              {CONSISTENCY_OPTIONS.map(({ value, label }) => (
                <ChoiceRow
                  key={value}
                  value={value}
                  labelText={label}
                  groupName="consistency"
                />
              ))}
            </RadioGroup>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-sm text-muted-foreground"
              id="step3-continue-hint"
              aria-live="polite"
            >
              {isComplete
                ? "You can continue when you’re ready."
                : "Answer all three questions to continue."}
            </p>
            <Button
              type="button"
              className="h-11 min-h-11 w-full shrink-0 rounded-xl px-8 sm:w-auto"
              disabled={!isComplete}
              onClick={handleContinue}
              aria-describedby={
                !isComplete ? "step3-continue-hint" : undefined
              }
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
