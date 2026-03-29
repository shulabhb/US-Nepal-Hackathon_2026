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
import { Label } from "@/components/ui/label";
import type { OnboardingStep4 } from "@/lib/onboarding/step-four";
import { emptyStep4 } from "@/lib/onboarding/step-four";
import {
  useTourFormFieldsLocked,
  useTourSubmit,
} from "@/components/tour/guided-tour-provider";
import { mergeOnboardingState, readOnboardingState } from "@/lib/onboarding/storage";
import { cn } from "@/lib/utils";

type RowState = { id: string; country: string; adjustment_impact: number };

function newRow(): RowState {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return { id, country: "", adjustment_impact: 5 };
}

type MigrationChoice = "" | "yes" | "no";

export function StepFourForm() {
  const tourSubmit = useTourSubmit("onboarding-4");
  const fieldsLocked = useTourFormFieldsLocked("onboarding-4");
  const router = useRouter();
  const [gateOpen, setGateOpen] = React.useState(false);
  const [countryOfBirth, setCountryOfBirth] = React.useState("");
  const [migrationChoice, setMigrationChoice] =
    React.useState<MigrationChoice>("");
  const [rows, setRows] = React.useState<RowState[]>([]);
  const [migrationContext, setMigrationContext] = React.useState("");
  const [attemptedSubmit, setAttemptedSubmit] = React.useState(false);

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
    setGateOpen(true);

    const s4 = s.step4;
    if (s4) {
      setCountryOfBirth(s4.country_of_birth?.trim() ?? "");
      if (s4.has_migration_history === true) {
        setMigrationChoice("yes");
        setRows(
          s4.migration_entries.length > 0
            ? s4.migration_entries.map((e) => ({
                id:
                  typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `r-${Math.random()}`,
                country: e.country,
                adjustment_impact: e.adjustment_impact,
              }))
            : [newRow()],
        );
      } else if (s4.has_migration_history === false) {
        setMigrationChoice("no");
        setRows([]);
      } else {
        setMigrationChoice("");
        setRows([]);
      }
      setMigrationContext(s4.migration_context?.trim() ?? "");
    }
  }, [router]);

  const buildStep4Payload = (): OnboardingStep4 => {
    const cob = countryOfBirth.trim();
    const ctx = migrationContext.trim();
    const has = migrationChoice === "" ? null : migrationChoice === "yes";
    const entries: OnboardingStep4["migration_entries"] =
      migrationChoice === "yes"
        ? rows.map((r) => ({
            country: r.country.trim(),
            adjustment_impact: r.adjustment_impact,
          }))
        : [];

    return {
      country_of_birth: cob.length ? cob : null,
      has_migration_history: has,
      migration_entries: entries,
      migration_context: ctx.length ? ctx : null,
    };
  };

  const migrationSectionInvalid =
    migrationChoice === "yes" &&
    (rows.length === 0 ||
      rows.some((r) => !r.country.trim()) ||
      rows.some(
        (r) =>
          r.adjustment_impact < 1 ||
          r.adjustment_impact > 10 ||
          !Number.isFinite(r.adjustment_impact),
      ));

  const canContinue =
    migrationChoice !== "yes" || !migrationSectionInvalid;

  const goStepFive = (payload: OnboardingStep4) => {
    mergeOnboardingState({ step4: payload });
    router.push("/onboarding/step-5");
  };

  const handleSkip = () => {
    setAttemptedSubmit(false);
    tourSubmit(() => {
      goStepFive(emptyStep4());
    });
  };

  const handleContinue = () => {
    if (migrationChoice === "yes" && migrationSectionInvalid) {
      setAttemptedSubmit(true);
      return;
    }
    setAttemptedSubmit(false);
    tourSubmit(() => {
      goStepFive(buildStep4Payload());
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, newRow()]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  };

  const updateRow = (id: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
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
            href="/onboarding/step-3"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back
          </Link>
          <Link
            href="/onboarding/step-3"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Edit sleep step
          </Link>
        </div>
        <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
          Step <span className="text-foreground">4</span> of{" "}
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
            Optional · share only if it feels right
          </p>
          <div className="space-y-2">
            <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
              Background and migration context
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              If this feels relevant to your experience, you can share a little
              about where you were born, places you&apos;ve lived, and how
              adjusting felt. This step is optional.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-8 pt-8">
          <div className="space-y-2">
            <Label htmlFor="country-of-birth" className="text-sm font-medium">
              Country of birth
            </Label>
            <input
              id="country-of-birth"
              type="text"
              autoComplete="country-name"
              value={countryOfBirth}
              onChange={(e) => setCountryOfBirth(e.target.value)}
              maxLength={200}
              placeholder="e.g. Canada, Ethiopia, Philippines…"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <fieldset className="space-y-3 border-0 p-0">
            <legend className="text-sm font-medium text-foreground">
              Have you lived in a country different from where you were born?
            </legend>
            <p className="text-xs text-muted-foreground">
              You can skip this question — leave &quot;Skip&quot; selected if you
              prefer.
            </p>
            <select
              id="migration-history-select"
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={migrationChoice}
              onChange={(e) => {
                const v = e.target.value as MigrationChoice;
                setMigrationChoice(v);
                if (v === "no") {
                  setRows([]);
                } else if (v === "yes" && rows.length === 0) {
                  setRows([newRow()]);
                }
              }}
              aria-describedby="migration-history-hint"
            >
              <option value="">Skip this question</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
            <p id="migration-history-hint" className="sr-only">
              Optional. Choose yes if you have lived in another country, no if
              not, or leave on skip.
            </p>
          </fieldset>

          {migrationChoice === "yes" ? (
            <div className="space-y-6 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
              <p className="text-sm font-medium text-foreground">
                Places you&apos;ve lived
              </p>
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="space-y-4 border-b border-border/50 pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Stay {idx + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 shrink-0 self-start text-muted-foreground sm:self-end"
                      disabled={rows.length <= 1}
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove country entry ${idx + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`mig-country-${row.id}`}
                      className="text-sm font-medium"
                    >
                      Country you moved to
                    </Label>
                    <input
                      id={`mig-country-${row.id}`}
                      type="text"
                      autoComplete="country-name"
                      value={row.country}
                      onChange={(e) =>
                        updateRow(row.id, { country: e.target.value })
                      }
                      maxLength={200}
                      placeholder="Country name"
                      aria-invalid={
                        attemptedSubmit && !row.country.trim()
                          ? true
                          : undefined
                      }
                      className={cn(
                        "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        attemptedSubmit &&
                          !row.country.trim() &&
                          "border-destructive",
                      )}
                    />
                  </div>
                  <div className="space-y-3">
                    <p
                      id={`adj-legend-${row.id}`}
                      className="text-sm font-medium text-foreground"
                    >
                      How did adjusting to life there feel overall?
                    </p>
                    <p
                      id={`adj-desc-${row.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      1 = adjusted easily · 10 = felt very out of place
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <output
                        htmlFor={`adj-${row.id}`}
                        className="font-mono text-xl font-semibold tabular-nums text-foreground"
                        aria-live="polite"
                      >
                        {row.adjustment_impact}
                      </output>
                      <span className="text-xs text-muted-foreground">
                        out of 10
                      </span>
                    </div>
                    <input
                      id={`adj-${row.id}`}
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={row.adjustment_impact}
                      onChange={(e) =>
                        updateRow(row.id, {
                          adjustment_impact: Number(e.target.value),
                        })
                      }
                      className={cn(
                        "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      )}
                      aria-labelledby={`adj-legend-${row.id}`}
                      aria-describedby={`adj-desc-${row.id}`}
                      aria-valuemin={1}
                      aria-valuemax={10}
                      aria-valuenow={row.adjustment_impact}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 — adjusted easily</span>
                      <span>10 — felt very out of place</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={addRow}
                disabled={rows.length >= 10}
              >
                Add another country
              </Button>
              {attemptedSubmit && migrationSectionInvalid ? (
                <p className="text-sm text-destructive" role="alert">
                  For each place, add a country name. You can remove extra rows
                  or choose &quot;No&quot; if this doesn&apos;t apply.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="migration-context" className="text-sm font-medium">
              Anything else you want us to understand about this part of your
              experience?
            </Label>
            <textarea
              id="migration-context"
              value={migrationContext}
              onChange={(e) => setMigrationContext(e.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="This is optional. You can share as much or as little as you want."
              aria-describedby="migration-context-helper"
              className="min-h-[8rem] w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p
              id="migration-context-helper"
              className="text-xs text-muted-foreground"
            >
              This is optional. You can share as much or as little as you want.
            </p>
          </div>

          <div
            className="flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            data-tour-submit
          >
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
              aria-describedby={
                !canContinue ? "step4-continue-hint" : undefined
              }
            >
              Continue
            </Button>
          </div>
          <p id="step4-continue-hint" className="sr-only" aria-live="polite">
            {canContinue
              ? "Continues to optional health and personal context."
              : "Complete each country name above, or change your answer."}
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
