"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onStartCheckin: () => void;
  /** Optional server/load warning shown under the main copy. */
  notice?: string | null;
  title?: string;
  description?: string;
  className?: string;
};

const DEFAULT_DESCRIPTION =
  "To use this area on this device, complete your first check-in. It helps you see where things stand so we can support you better—a snapshot to work from, not a diagnosis.";

export function FirstCheckinGate({
  onStartCheckin,
  notice,
  title = "Check-in required",
  description = DEFAULT_DESCRIPTION,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md px-4 py-12 text-center sm:py-16",
        className,
      )}
    >
      <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {notice ? (
        <p
          className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-100/90"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button
          type="button"
          size="lg"
          className="min-h-11 rounded-xl px-8 font-semibold"
          onClick={onStartCheckin}
        >
          Start check-in
        </Button>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
