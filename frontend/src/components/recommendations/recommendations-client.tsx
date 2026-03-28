"use client";

import { ArrowLeft, HeartHandshake, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getLatestCheckin, saveCheckin } from "@/lib/api/checkins";
import { getOrCreateAnonymousId } from "@/lib/onboarding/anonymous-id";
import {
  clearOnboardingState,
  clearPreferDashboardAfterRecommendations,
  consumePreferDashboardAfterRecommendations,
  getCheckinSyncHash,
  getOnboardingResumePath,
  readOnboardingState,
  setCheckinSyncHash,
} from "@/lib/onboarding/storage";
import {
  checkinPersistFingerprint,
  toCheckinPayload,
} from "@/lib/onboarding/to-checkin-payload";
import { dashboardHref } from "@/lib/dashboard/dashboard-tab";
import { buildRecommendations } from "@/lib/scoring/recommendation-engine";
import { toRecommendationSnapshot } from "@/lib/scoring/recommendation-snapshot";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse } from "@/types/api";

function formatSavedCheckinAt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function snapshotRisk(snapshot: Record<string, unknown> | null | undefined): {
  label: string | null;
  score: number | null;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { label: null, score: null };
  }
  const labelRaw = snapshot.risk_label;
  const scoreRaw = snapshot.risk_score;
  return {
    label: typeof labelRaw === "string" ? labelRaw : null,
    score: typeof scoreRaw === "number" ? scoreRaw : null,
  };
}

export function RecommendationsClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState<ReturnType<typeof buildRecommendations>>(
    null,
  );
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [saveStatusLine, setSaveStatusLine] = useState<string | null>(null);
  const [fetchStatusLine, setFetchStatusLine] = useState<string | null>(null);
  const [fetchPreviewError, setFetchPreviewError] = useState(false);
  const [latestCheckin, setLatestCheckin] = useState<CheckinDetailResponse | null>(
    null,
  );

  useEffect(() => {
    const state = readOnboardingState();
    const resume = getOnboardingResumePath(state);
    if (resume !== null) {
      router.replace(resume);
      return;
    }

    let cancelled = false;

    (async () => {
      const rec = buildRecommendations(state);
      if (!rec) {
        if (!cancelled) router.replace("/onboarding");
        return;
      }

      if (!cancelled) {
        startTransition(() => {
          setPayload(rec);
          setReady(true);
        });
      }

      const snapshot = toRecommendationSnapshot(rec);
      const fingerprint = checkinPersistFingerprint(state, snapshot);
      const anonymousId = getOrCreateAnonymousId();
      let saveFailed = false;

      if (getCheckinSyncHash() !== fingerprint) {
        if (!cancelled) setSaveStatusLine("Saving your private check-in...");
        try {
          const body = toCheckinPayload(state, anonymousId, {
            recommendationSnapshot: snapshot,
          });
          await saveCheckin(body);
          if (!cancelled) {
            setCheckinSyncHash(fingerprint);
            setSaveStatusLine("Private check-in saved");
          }
        } catch (err) {
          saveFailed = true;
          if (!cancelled) {
            setSyncNotice(
              err instanceof Error
                ? err.message
                : "Could not reach the server to save your check-in.",
            );
            setSaveStatusLine(null);
          }
        }
      } else {
        if (!cancelled) setSaveStatusLine(null);
      }

      if (cancelled || saveFailed) {
        if (saveFailed && !cancelled) {
          clearPreferDashboardAfterRecommendations();
        }
        return;
      }

      if (!cancelled) {
        setFetchStatusLine("Fetching saved check-in...");
        setFetchPreviewError(false);
      }

      try {
        const row = await getLatestCheckin(anonymousId);
        if (!cancelled) {
          setLatestCheckin(row);
          setFetchStatusLine("Saved check-in loaded");
        }
      } catch {
        if (!cancelled) {
          setFetchPreviewError(true);
          setFetchStatusLine(null);
        }
      }

      if (!cancelled && consumePreferDashboardAfterRecommendations()) {
        router.replace(dashboardHref("overview"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRetake = () => {
    clearOnboardingState();
    router.push("/onboarding");
  };

  if (!ready || !payload) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4"
        aria-busy="true"
      >
        <p className="sr-only">Loading your results</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,oklch(0.78_0.09_210_/0.14),transparent),radial-gradient(ellipse_55%_45%_at_100%_40%,oklch(0.55_0.05_250_/0.06),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14 md:px-6 lg:max-w-3xl lg:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back home
          </Link>
          <div className="text-right text-sm text-muted-foreground sm:text-left">
            <p>Private check-in · this device only</p>
            {saveStatusLine ? (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                {saveStatusLine}
              </p>
            ) : null}
            {fetchStatusLine ? (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                {fetchStatusLine}
              </p>
            ) : null}
            {fetchPreviewError ? (
              <p className="mt-1 text-xs text-muted-foreground/90" role="status">
                Couldn&apos;t load saved check-in preview right now.
              </p>
            ) : null}
            {syncNotice ? (
              <p
                className="mt-2 text-xs text-amber-800 dark:text-amber-200/90"
                role="status"
              >
                {syncNotice}{" "}
                <span className="text-muted-foreground">
                  Your results below are still based on this browser session.
                </span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mb-6 space-y-3">
          {payload.importedFromWearable ? (
            <span className="inline-flex w-fit items-center rounded-full border border-border/80 bg-card/90 px-3 py-1 text-xs font-medium text-muted-foreground">
              Sample wearable data was used in your sleep step
            </span>
          ) : null}
          <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {payload.summary}
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:p-6">
          <p className="font-heading text-base font-semibold text-foreground">
            Continue in your support space
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your workspace opens with overview, chat, and more in tabs.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              href={dashboardHref("overview")}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "inline-flex h-11 w-full items-center justify-center rounded-xl px-8 sm:w-auto",
              )}
            >
              Open support dashboard
            </Link>
            <Link
              href={dashboardHref("chat")}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "inline-flex h-11 w-full items-center justify-center rounded-xl px-8 sm:w-auto",
              )}
            >
              Go to chat
            </Link>
          </div>
        </div>

        <Card className="mb-10 border-border/80 bg-card/95 shadow-md backdrop-blur-sm">
          <CardHeader className="space-y-3 border-b border-border/60 pb-6">
            <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
              <Lock className="size-3.5" aria-hidden />
              Snapshot · not a diagnosis
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="font-heading text-2xl tracking-tight sm:text-3xl">
                  {payload.riskLabel}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  A simple score from your check-in—not medical or clinical
                  advice.
                </CardDescription>
              </div>
              <p
                className="font-mono text-sm text-muted-foreground"
                aria-label={`Score ${payload.riskScore}`}
              >
                Score ·{" "}
                <span className="font-semibold text-foreground">
                  {payload.riskScore}
                </span>
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Higher scores mean more overlapping strain signals in this model.
              Use it as a compass, not a verdict.
            </p>
          </CardContent>
        </Card>

        <section
          className="mb-10"
          aria-labelledby="why-heading"
        >
          <h2
            id="why-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground"
          >
            Why this came up
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {payload.reasons.map((reason) => (
              <li key={reason} className="flex gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                  aria-hidden
                />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator className="mb-10 bg-border/80" />

        <section className="mb-10" aria-labelledby="next-heading">
          <h2
            id="next-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground"
          >
            What to do next
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {payload.immediateActions.map((item, i) => (
              <li key={i} className="pl-1 marker:text-primary">
                {item}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10" aria-labelledby="plan-heading">
          <h2
            id="plan-heading"
            className="font-heading text-xl font-semibold tracking-tight text-foreground"
          >
            Next 72 hours
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {payload.next72HourPlan.map((item, i) => (
              <li key={i} className="pl-1 marker:text-primary">
                {item}
              </li>
            ))}
          </ol>
        </section>

        {payload.supportRoute ? (
          <>
            <Separator className="mb-10 bg-border/80" />
            <section
              className="mb-10 rounded-2xl border border-primary/20 bg-primary/[0.06] p-6"
              aria-labelledby="support-heading"
            >
              <div className="flex gap-3">
                <HeartHandshake
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <h2
                    id="support-heading"
                    className="font-heading text-lg font-semibold text-foreground"
                  >
                    Support can help here
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    You’re not meant to white-knuckle this alone. A counselor,
                    mentor, or someone you trust can share the load early—before
                    things feel urgent.
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {payload.supportRoute.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-primary" aria-hidden>
                          ·
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {latestCheckin ? (
          <>
            <Separator className="mb-10 bg-border/60" />
            <section
              className="mb-10 rounded-2xl border border-dashed border-border/80 bg-muted/30 p-5"
              aria-labelledby="saved-preview-heading"
            >
              <h2
                id="saved-preview-heading"
                className="font-heading text-sm font-semibold tracking-tight text-muted-foreground"
              >
                Saved check-in preview
              </h2>
              <p className="mt-1 text-xs text-muted-foreground/90">
                Read-back from your server — for verification only.
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 sm:text-sm">
                <div>
                  <dt className="text-muted-foreground">Anonymous id</dt>
                  <dd className="mt-0.5 break-all font-mono text-foreground">
                    {latestCheckin.anonymous_id}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created at</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatSavedCheckinAt(latestCheckin.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="mt-0.5 text-foreground">{latestCheckin.role}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Main pressure</dt>
                  <dd className="mt-0.5 text-foreground">{latestCheckin.pressure}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Main goal</dt>
                  <dd className="mt-0.5 text-foreground">{latestCheckin.goal}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Symptoms</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.symptoms.length
                      ? latestCheckin.symptoms.join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stress level</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.stress_level}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Energy level</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.energy_level}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sleep duration</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.sleep_duration}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sleep quality</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.sleep_quality}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Sleep consistency</dt>
                  <dd className="mt-0.5 text-foreground">
                    {latestCheckin.sleep_consistency}
                  </dd>
                </div>
                {(() => {
                  const { label, score } = snapshotRisk(
                    latestCheckin.recommendation_snapshot,
                  );
                  if (label === null && score === null) return null;
                  return (
                    <>
                      {label !== null ? (
                        <div>
                          <dt className="text-muted-foreground">Risk label</dt>
                          <dd className="mt-0.5 text-foreground">{label}</dd>
                        </div>
                      ) : null}
                      {score !== null ? (
                        <div>
                          <dt className="text-muted-foreground">Risk score</dt>
                          <dd className="mt-0.5 font-mono text-foreground">
                            {score}
                          </dd>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </dl>
            </section>
          </>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={handleRetake}
          >
            Retake check-in
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "inline-flex h-11 items-center justify-center rounded-xl px-8",
            )}
          >
            Back home
          </Link>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          Burnout Radar is an early-support tool. It does not replace emergency
          services or professional mental health care.
        </p>
      </div>
    </div>
  );
}
