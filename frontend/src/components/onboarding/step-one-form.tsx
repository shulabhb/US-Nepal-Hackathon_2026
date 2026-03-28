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
  HELP_NEED_OPTIONS,
  PRESSURE_OPTIONS,
  ROLE_OPTIONS,
} from "@/lib/onboarding/step-one";
import {
  mergeOnboardingState,
  readOnboardingState,
} from "@/lib/onboarding/storage";

function MultiRow({
  id,
  labelText,
  checked,
  onCheckedChange,
}: {
  id: string;
  labelText: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
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

function toggleInList(list: string[], value: string, on: boolean): string[] {
  if (on) return list.includes(value) ? list : [...list, value];
  return list.filter((x) => x !== value);
}

export function StepOneForm() {
  const router = useRouter();
  const [roles, setRoles] = React.useState<string[]>([]);
  const [roleOther, setRoleOther] = React.useState("");
  const [pressures, setPressures] = React.useState<string[]>([]);
  const [pressureOther, setPressureOther] = React.useState("");
  const [helpNeeds, setHelpNeeds] = React.useState<string[]>([]);
  const [helpOther, setHelpOther] = React.useState("");

  React.useEffect(() => {
    const s = readOnboardingState();
    if (s.step1) {
      setRoles(s.step1.roles);
      setRoleOther(s.step1.role_other_text?.trim() ?? "");
      setPressures(s.step1.pressures);
      setPressureOther(s.step1.pressure_other_text?.trim() ?? "");
      setHelpNeeds(s.step1.help_needs);
      setHelpOther(s.step1.help_other_text?.trim() ?? "");
    }
  }, []);

  const roleOtherOk = !roles.includes("other") || roleOther.trim().length > 0;
  const pressureOtherOk =
    !pressures.includes("other") || pressureOther.trim().length > 0;
  const helpOtherOk =
    !helpNeeds.includes("other") || helpOther.trim().length > 0;

  const isComplete =
    roles.length > 0 &&
    pressures.length > 0 &&
    helpNeeds.length > 0 &&
    roleOtherOk &&
    pressureOtherOk &&
    helpOtherOk;

  const handleContinue = () => {
    if (!isComplete) return;
    mergeOnboardingState({
      step1: {
        roles,
        role_other_text: roles.includes("other")
          ? roleOther.trim() || null
          : null,
        pressures,
        pressure_other_text: pressures.includes("other")
          ? pressureOther.trim() || null
          : null,
        help_needs: helpNeeds,
        help_other_text: helpNeeds.includes("other")
          ? helpOther.trim() || null
          : null,
      },
    });
    router.push("/onboarding/step-2");
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14 md:px-6 lg:py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          Back to home
        </Link>
        <p
          className="text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          Step <span className="text-foreground">1</span> of{" "}
          <span className="text-foreground">5</span>
        </p>
      </div>

      <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
        <CardHeader className="space-y-4 border-b border-border/60 pb-6">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
            <Lock className="size-3.5" aria-hidden />
            Anonymous by default
          </p>
          <div className="space-y-2">
            <CardTitle className="font-heading text-2xl leading-tight tracking-tight sm:text-3xl">
              Let&apos;s start with a quick private check-in
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Choose anything that fits—you can pick more than one in each
              section. No real name required.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-10 pt-8">
      <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              What describes your role?
            </legend>
            <p className="mb-3 text-sm text-muted-foreground">
              Select all that apply.
            </p>
            <div className="grid gap-2 sm:grid-cols-1">
              {ROLE_OPTIONS.map(({ value, label }) => (
                <MultiRow
                  key={value}
                  id={`role-${value}`}
                  labelText={label}
                  checked={roles.includes(value)}
                  onCheckedChange={(on) =>
                    setRoles((prev) => toggleInList(prev, value, on))
                  }
                />
              ))}
            </div>
            {roles.includes("other") ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="role-other" className="text-sm text-foreground">
                  Tell us a bit more
                </Label>
                <textarea
                  id="role-other"
                  value={roleOther}
                  onChange={(e) => setRoleOther(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Role or situation in your words…"
                  aria-required
                />
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              What&apos;s putting the most pressure on you right now?
            </legend>
            <p className="mb-3 text-sm text-muted-foreground">
              Select all that apply.
            </p>
            <div className="grid gap-2">
              {PRESSURE_OPTIONS.map(({ value, label }) => (
                <MultiRow
                  key={value}
                  id={`pressure-${value}`}
                  labelText={label}
                  checked={pressures.includes(value)}
                  onCheckedChange={(on) =>
                    setPressures((prev) => toggleInList(prev, value, on))
                  }
                />
              ))}
            </div>
            {pressures.includes("other") ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="pressure-other" className="text-sm">
                  Describe the pressure
                </Label>
                <textarea
                  id="pressure-other"
                  value={pressureOther}
                  onChange={(e) => setPressureOther(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="In your words…"
                  aria-required
                />
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-4 border-0 p-0">
            <legend className="mb-3 font-heading text-base font-semibold text-foreground">
              What would help most right now?
            </legend>
            <p className="mb-3 text-sm text-muted-foreground">
              Select all that apply.
            </p>
            <div className="grid gap-2">
              {HELP_NEED_OPTIONS.map(({ value, label }) => (
                <MultiRow
                  key={value}
                  id={`help-${value}`}
                  labelText={label}
                  checked={helpNeeds.includes(value)}
                  onCheckedChange={(on) =>
                    setHelpNeeds((prev) => toggleInList(prev, value, on))
                  }
                />
              ))}
            </div>
            {helpNeeds.includes("other") ? (
              <div className="mt-3 space-y-2">
                <Label htmlFor="help-other" className="text-sm">
                  What would help?
                </Label>
                <textarea
                  id="help-other"
                  value={helpOther}
                  onChange={(e) => setHelpOther(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="In your words…"
                  aria-required
                />
              </div>
            ) : null}
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p
              className="text-sm text-muted-foreground"
              id="continue-hint"
              aria-live="polite"
            >
              {isComplete
                ? "You can continue when you’re ready."
                : "Choose at least one option in each section. If you pick Other, add a short note."}
            </p>
            <Button
              type="button"
              className="h-11 min-h-11 w-full shrink-0 rounded-xl px-8 sm:w-auto"
              disabled={!isComplete}
              onClick={handleContinue}
              aria-describedby={!isComplete ? "continue-hint" : undefined}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
