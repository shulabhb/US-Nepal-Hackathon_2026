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
import {
  useTourFormFieldsLocked,
  useTourSubmit,
} from "@/components/tour/guided-tour-provider";
import {
  mergeOnboardingState,
  readOnboardingState,
} from "@/lib/onboarding/storage";
import {
  type OnboardingSymptom,
  SYMPTOM_OPTIONS,
} from "@/lib/onboarding/step-two";
import { cn } from "@/lib/utils";

function SymptomRow({
  id,
  labelText,
  checked,
  onCheckedChange,
}: {
  id: string;
  labelText: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-card/50 px-3 py-3 transition-colors hover:bg-muted/40 has-data-[checked]:border-primary/35 has-data-[checked]:bg-primary/[0.06]">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c: boolean) => onCheckedChange(c === true)}
        className="mt-0.5"
      />
      <Label
        htmlFor={id}
        className="cursor-pointer text-left text-sm font-normal leading-snug text-foreground"
      >
        {labelText}
      </Label>
    </div>
  );
}

function TenPointSlider({
  id,
  legend,
  descriptionId,
  description,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  id: string;
  legend: string;
  descriptionId: string;
  description: string;
  value: number | null;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  const v = value ?? 5;
  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend
        id={`${id}-legend`}
        className="mb-1 font-heading text-base font-semibold text-foreground"
      >
        {legend}
      </legend>
      <p
        id={descriptionId}
        className="text-sm leading-relaxed text-muted-foreground"
      >
        {description}
      </p>
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-4">
          <output
            htmlFor={`${id}-slider`}
            className="font-mono text-2xl font-semibold tabular-nums text-foreground"
            aria-live="polite"
          >
            {value === null ? "—" : v}
          </output>
          <span className="text-xs text-muted-foreground">out of 10</span>
        </div>
        <input
          id={`${id}-slider`}
          type="range"
          min={1}
          max={10}
          step={1}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
          aria-labelledby={`${id}-legend`}
          aria-describedby={descriptionId}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={value ?? undefined}
          aria-valuetext={value === null ? undefined : `${value} of 10`}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 — {lowLabel}</span>
          <span>10 — {highLabel}</span>
        </div>
      </div>
    </fieldset>
  );
}

export function StepTwoForm() {
  const tourSubmit = useTourSubmit("onboarding-2");
  const fieldsLocked = useTourFormFieldsLocked("onboarding-2");
  const router = useRouter();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [symptoms, setSymptoms] = React.useState<OnboardingSymptom[]>([]);
  const [stressLevel, setStressLevel] = React.useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = React.useState<number | null>(null);

  React.useEffect(() => {
    const s = readOnboardingState();
    if (!s.step1) {
      router.replace("/onboarding");
      return;
    }
    setGateOpen(true);
    if (s.step2) {
      setSymptoms(s.step2.symptoms);
      setStressLevel(s.step2.stressLevel);
      setEnergyLevel(s.step2.energyLevel);
    }
  }, [router]);

  const toggleSymptom = (key: OnboardingSymptom, checked: boolean) => {
    setSymptoms((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((s) => s !== key);
    });
  };

  const isComplete =
    symptoms.length > 0 && stressLevel !== null && energyLevel !== null;

  const handleContinue = () => {
    if (!isComplete || stressLevel === null || energyLevel === null) return;
    tourSubmit(() => {
      mergeOnboardingState({
        step2: {
          symptoms,
          stressLevel,
          energyLevel,
        },
      });
      router.push("/onboarding/step-3");
    });
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
            href="/onboarding"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Edit previous step
          </Link>
        </div>
        <p
          className="text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          Step <span className="text-foreground">2</span> of{" "}
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
            Only essential signals. No diagnosis.
          </p>
          <div className="space-y-2">
            <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
              How have things felt lately?
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Choose the signals that feel most true for you right now. This
              helps us understand how pressure may be affecting your day-to-day
              life.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-10 pt-8">
          <fieldset className="space-4 border-0 p-0">
            <legend
              id="symptoms-legend"
              className="mb-3 font-heading text-base font-semibold text-foreground"
            >
              Which of these feel true lately?{" "}
              <span className="font-normal text-muted-foreground">
                (select any that apply)
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-1">
              {SYMPTOM_OPTIONS.map(({ value, label }) => (
                <SymptomRow
                  key={value}
                  id={`symptom-${value}`}
                  labelText={label}
                  checked={symptoms.includes(value)}
                  onCheckedChange={(c) => toggleSymptom(value, c)}
                />
              ))}
            </div>
          </fieldset>

          <TenPointSlider
            id="stress"
            legend="How stressed do you feel right now?"
            descriptionId="stress-helper"
            description="1 = very calm, 10 = overwhelmed"
            value={stressLevel}
            onChange={setStressLevel}
            lowLabel="very calm"
            highLabel="overwhelmed"
          />

          <TenPointSlider
            id="energy"
            legend="How is your energy level lately?"
            descriptionId="energy-helper"
            description="1 = completely drained, 10 = energized"
            value={energyLevel}
            onChange={setEnergyLevel}
            lowLabel="completely drained"
            highLabel="energized"
          />

          <div
            className="flex flex-col gap-3 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between"
            data-tour-submit
          >
            <p
              className="text-sm text-muted-foreground"
              id="step2-continue-hint"
              aria-live="polite"
            >
              {isComplete
                ? "You can continue when you’re ready."
                : "Select at least one signal and set both sliders to continue."}
            </p>
            <Button
              type="button"
              className="h-11 min-h-11 w-full shrink-0 rounded-xl px-8 sm:w-auto"
              disabled={!isComplete}
              onClick={handleContinue}
              aria-describedby={
                !isComplete ? "step2-continue-hint" : undefined
              }
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
