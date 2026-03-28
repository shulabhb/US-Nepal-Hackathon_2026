"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";

import { CheckinHistoryCompactCard } from "@/components/dashboard/checkin-history-compact-card";
import { getCheckinHistory } from "@/lib/api/checkins";
import {
  adjustmentFeelLabel,
  buildFallbackSnapshotLine,
  buildOkayAndAttention,
  buildSignalCards,
  chipLabelForHelpId,
  chipLabelForPressureId,
  chipLabelForRoleId,
  labelSymptom,
  parseIntakeFromCheckin,
  riskLabelFromSnapshot,
  summaryFromSnapshot,
  type ParsedMigration,
  type SignalCardModel,
  type SignalTone,
} from "@/lib/dashboard/checkin-view-model";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, CheckinHistoryItem } from "@/types/api";

type Props = {
  checkin: CheckinDetailResponse;
  formattedLatestSavedAt: string;
  anonymousId: string;
};

function formatSavedIso(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toneStyles(tone: SignalTone): string {
  if (tone === "settled")
    return "border-emerald-500/20 bg-emerald-500/[0.06] shadow-sm shadow-emerald-900/5";
  if (tone === "watch")
    return "border-amber-500/25 bg-amber-500/[0.06] shadow-sm shadow-amber-900/5";
  return "border-border/80 bg-card/70 shadow-sm";
}

function SignalCard({ card }: { card: SignalCardModel }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border px-4 py-4 transition-colors",
        toneStyles(card.tone),
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {card.title}
      </p>
      <p className="font-heading text-lg font-semibold text-foreground">
        {card.value}
      </p>
      <p className="text-sm font-medium text-foreground/90">{card.status}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{card.hint}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs leading-snug text-foreground">
      {children}
    </span>
  );
}

function ExpandableTextBlock({
  id,
  label,
  text,
}: {
  id: string;
  label: string;
  text: string;
}) {
  const [open, setOpen] = React.useState(false);
  if (!text.trim()) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/50 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        id={`${id}-preview`}
        className={cn(
          "mt-2 text-sm leading-relaxed text-foreground/90",
          !open && "line-clamp-3",
        )}
      >
        {text.trim()}
      </p>
      {text.trim().length > 180 ? (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          aria-expanded={open}
          aria-controls={`${id}-preview`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              Show less
              <ChevronUp className="size-3.5" aria-hidden />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="size-3.5" aria-hidden />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

function MigrationSection({ migration }: { migration: ParsedMigration }) {
  const hasEntries =
    migration.has_migration_history === true &&
    migration.migration_entries.length > 0;

  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
      <h3 className="font-heading text-sm font-semibold text-foreground">
        Background you shared
      </h3>
      <dl className="grid gap-3 text-sm">
        {migration.country_of_birth ? (
          <div>
            <dt className="text-xs text-muted-foreground">Country of birth</dt>
            <dd className="mt-0.5 text-foreground">
              {migration.country_of_birth}
            </dd>
          </div>
        ) : null}
        {migration.has_migration_history !== null ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              Lived outside country of birth
            </dt>
            <dd className="mt-0.5 text-foreground">
              {migration.has_migration_history ? "Yes" : "No"}
            </dd>
          </div>
        ) : null}
      </dl>
      {hasEntries ? (
        <ul className="list-none space-y-2 border-t border-border/50 pt-3">
          {migration.migration_entries.map((e, i) => (
            <li
              key={`${e.country}-${i}`}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm"
            >
              <p className="font-medium text-foreground">{e.country}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjusting overall: {adjustmentFeelLabel(e.adjustment_impact)} ·{" "}
                {e.adjustment_impact}/10
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function LatestCheckinDetail({
  checkin,
  formattedCreatedAt,
}: {
  checkin: CheckinDetailResponse;
  formattedCreatedAt: string;
}) {
  const intake = React.useMemo(
    () => parseIntakeFromCheckin(checkin),
    [checkin],
  );
  const cards = React.useMemo(() => buildSignalCards(checkin), [checkin]);
  const { okay, attention } = React.useMemo(
    () => buildOkayAndAttention(checkin, intake),
    [checkin, intake],
  );

  const risk = riskLabelFromSnapshot(checkin);
  const summary = summaryFromSnapshot(checkin);
  const snapshotLine = summary ?? buildFallbackSnapshotLine(checkin);

  return (
    <div className="space-y-8">
      <header className="space-y-3 rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 to-card/40 px-5 py-5 shadow-sm backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Latest snapshot
        </p>
        <p className="text-xs text-muted-foreground">
          Saved · {formattedCreatedAt}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {risk ? (
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {risk}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-foreground/95">{snapshotLine}</p>
      </header>

      <section aria-label="Key signals">
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">
          Signals at a glance
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <SignalCard key={c.title} card={c} />
          ))}
        </div>
      </section>

      <section
        className="grid gap-4 md:grid-cols-2"
        aria-label="What looks stable and what to notice"
      >
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            What looks okay
          </h3>
          {okay.length ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              {okay.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No strong stable signals stood out yet—that doesn&apos;t mean nothing
              is going well; this view is only rule-based.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-4">
          <h3 className="font-heading text-sm font-semibold text-foreground">
            What needs attention
          </h3>
          {attention.length ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
              {attention.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No major flags stood out in this snapshot—still check in with how
              you actually feel day to day.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4" aria-label="What you shared">
        <h3 className="font-heading text-sm font-semibold text-foreground">
          What you captured
        </h3>

        {intake.roles.length ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Roles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intake.roles.map((id) => (
                <Chip key={id}>{chipLabelForRoleId(id)}</Chip>
              ))}
              {intake.role_other_text ? (
                <span className="self-center text-xs text-muted-foreground">
                  Other: {intake.role_other_text}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {intake.pressures.length ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Pressures
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intake.pressures.map((id) => (
                <Chip key={id}>{chipLabelForPressureId(id)}</Chip>
              ))}
              {intake.pressure_other_text ? (
                <span className="self-center text-xs text-muted-foreground">
                  Other: {intake.pressure_other_text}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {intake.help_needs.length ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Help that would matter
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {intake.help_needs.map((id) => (
                <Chip key={id}>{chipLabelForHelpId(id)}</Chip>
              ))}
              {intake.help_other_text ? (
                <span className="self-center text-xs text-muted-foreground">
                  Other: {intake.help_other_text}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-medium text-muted-foreground">Symptoms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {checkin.symptoms.length ? (
              checkin.symptoms.map((id) => (
                <Chip key={id}>{labelSymptom(id)}</Chip>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <ExpandableTextBlock
            id="medications"
            label="Medications (if shared)"
            text={intake.sensitive?.medications ?? ""}
          />
          <ExpandableTextBlock
            id="medical-conditions"
            label="Medical conditions (if shared)"
            text={intake.sensitive?.medical_conditions ?? ""}
          />
          <ExpandableTextBlock
            id="additional-context"
            label="Anything else you shared"
            text={intake.additional_context ?? ""}
          />
          <ExpandableTextBlock
            id="migration-context"
            label="Migration or cultural context shared"
            text={intake.migration?.migration_context ?? ""}
          />
        </div>

        {intake.migration &&
        (intake.migration.country_of_birth ||
          intake.migration.has_migration_history !== null ||
          intake.migration.migration_entries.length > 0) ? (
          <MigrationSection migration={intake.migration} />
        ) : null}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        One saved check-in—not a trend or a clinical read. Deeper trends come
        later.
      </p>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading history">
      {[1, 2, 3].map((k) => (
        <div
          key={k}
          className="h-36 animate-pulse rounded-2xl bg-muted/80"
        />
      ))}
      <p className="sr-only">Loading recent check-ins</p>
    </div>
  );
}

function CheckinHistoryList({
  anonymousId,
  latestId,
  onOpenLatestTab,
}: {
  anonymousId: string;
  latestId: string;
  onOpenLatestTab: () => void;
}) {
  const [rows, setRows] = React.useState<CheckinHistoryItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [retryToken, setRetryToken] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void getCheckinHistory(anonymousId)
      .then((list) => {
        if (!cancelled) {
          setRows(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load recent check-ins right now.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [anonymousId, retryToken]);

  if (loading) return <HistorySkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-sm">
        <p className="text-foreground">{error}</p>
        <button
          type="button"
          className="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setRetryToken((t) => t + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <p className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No saved check-in history yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Up to five recent saves, newest first. Tap{" "}
        <span className="font-medium text-foreground/80">Latest</span> for the
        full snapshot.
      </p>
      <div className="flex flex-col gap-3">
        {rows.map((item) => (
          <CheckinHistoryCompactCard
            key={item.id}
            item={item}
            formattedCreatedAt={formatSavedIso(item.created_at)}
            isLatest={item.id === latestId}
            onOpenFullSnapshot={
              item.id === latestId ? onOpenLatestTab : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export function CheckinsTabPanel({
  checkin,
  formattedLatestSavedAt,
  anonymousId,
}: Props) {
  const [subtab, setSubtab] = React.useState<"latest" | "history">("latest");

  return (
    <div
      id="dashboard-checkin-preview"
      className="mx-auto max-w-3xl space-y-6"
    >
      <div
        role="tablist"
        aria-label="Check-in view"
        className="flex flex-wrap gap-1 rounded-2xl border border-border/80 bg-muted/20 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subtab === "latest"}
          className={cn(
            "min-h-10 flex-1 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            subtab === "latest"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setSubtab("latest")}
        >
          Latest
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subtab === "history"}
          className={cn(
            "min-h-10 flex-1 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            subtab === "history"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setSubtab("history")}
        >
          History
        </button>
      </div>

      {subtab === "latest" ? (
        <LatestCheckinDetail
          checkin={checkin}
          formattedCreatedAt={formattedLatestSavedAt}
        />
      ) : (
        <CheckinHistoryList
          anonymousId={anonymousId}
          latestId={checkin.id}
          onOpenLatestTab={() => setSubtab("latest")}
        />
      )}
    </div>
  );
}
