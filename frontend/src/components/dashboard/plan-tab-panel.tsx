"use client";

import {
  AlertCircle,
  ChevronRight,
  FolderOpen,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  buildPlanCheckinContext,
  generatePlan,
} from "@/lib/api/ai";
import {
  buildPlanContextPayload,
  fieldsForPlanType,
  hasEnoughPlanContext,
} from "@/lib/dashboard/plan-context-fields";
import {
  normalizeChecklistForApi,
  planChecklistProgress,
} from "@/lib/dashboard/plan-checklist";
import { deletePlan, getPlans, savePlan, updatePlanChecklist } from "@/lib/api/plans";
import { cn } from "@/lib/utils";
import type {
  CheckinDetailResponse,
  GeneratedPlan,
  GeneratePlanResponse,
  PlanChecklistItem,
  StoredPlan,
} from "@/types/api";

export const PLAN_TYPE_OPTIONS = [
  { id: "stress_reset", label: "Stress reset" },
  { id: "sleep_reset", label: "Sleep reset" },
  { id: "study_plan", label: "Study plan" },
  { id: "workload_plan", label: "Workload plan" },
  { id: "fitness_plan", label: "Fitness plan" },
  { id: "job_search_plan", label: "Job search plan" },
  { id: "custom_plan", label: "Something else" },
] as const;

export type PlanTypeId = (typeof PLAN_TYPE_OPTIONS)[number]["id"];

type PlanSubView = "create" | "saved";

function planTypeLabel(id: string): string {
  const hit = PLAN_TYPE_OPTIONS.find((o) => o.id === id);
  return hit?.label ?? id.replace(/_/g, " ");
}

function formatSavedAt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function PlanProgressBar({
  items,
  compact,
}: {
  items: PlanChecklistItem[];
  compact?: boolean;
}) {
  const { completed, total, percent } = planChecklistProgress(items);
  if (total === 0) return null;
  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 text-muted-foreground",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <span>
          {compact ? (
            <>
              {completed} of {total} complete
            </>
          ) : (
            <>
              {completed} of {total} tasks completed
            </>
          )}
        </span>
        <span className="tabular-nums font-medium text-foreground">{percent}%</span>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-muted",
          compact ? "h-1" : "h-1.5",
        )}
      >
        <div
          className="h-full rounded-full bg-primary/80 transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Safe display for tasks (handles older items that only had label + rationale). */
function taskForDisplay(item: PlanChecklistItem) {
  const legacy = item as PlanChecklistItem & { rationale?: string | null };
  const description =
    (item.description?.trim() || legacy.rationale?.trim() || "").trim() ||
    "Details for this step weren’t stored.";
  const timeEstimate =
    (item.time_estimate?.trim() || "").trim() || "Flexible";
  return {
    label: (item.label?.trim() || "Task").trim(),
    description,
    timeEstimate,
    additionalInfo:
      item.additional_info?.trim() || null,
  };
}

function PlanTaskList({
  items,
  interactive,
  onToggleChecklistItem,
}: {
  items: PlanChecklistItem[];
  interactive?: boolean;
  onToggleChecklistItem?: (index: number) => void;
}) {
  const done =
    interactive === true && typeof onToggleChecklistItem === "function";

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No tasks in this plan.</p>
    );
  }

  return (
    <ul className="divide-y divide-border/40" aria-label="Tasks">
      {items.map((item, i) => {
        const t = taskForDisplay(item);
        const isComplete = item.completed === true;
        return (
          <li
            key={`${t.label}-${i}`}
            className={cn(
              "flex gap-2.5 py-2.5 first:pt-0 last:pb-0",
              isComplete && "opacity-80",
            )}
          >
            {done ? (
              <input
                type="checkbox"
                checked={isComplete}
                onChange={() => onToggleChecklistItem(i)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-primary"
                aria-label={`Mark complete: ${t.label}`}
              />
            ) : (
              <span
                className="mt-0.5 flex size-4 shrink-0 rounded border border-input"
                aria-hidden
              />
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug text-foreground",
                    isComplete &&
                      "line-through decoration-muted-foreground/70",
                  )}
                >
                  {t.label}
                </p>
                <span className="shrink-0 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {t.timeEstimate}
                </span>
              </div>
              <p
                className={cn(
                  "text-xs leading-relaxed text-muted-foreground",
                  isComplete &&
                    "line-through decoration-muted-foreground/50",
                )}
              >
                {t.description}
              </p>
              {t.additionalInfo ? (
                <p className="text-[11px] leading-snug text-muted-foreground/80">
                  {t.additionalInfo}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type GeneratePanelState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "error"; message: string };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

type Props = {
  checkin: CheckinDetailResponse | null;
  anonymousId: string;
};

export function PlanTabPanel({ checkin, anonymousId }: Props) {
  const [planSubView, setPlanSubView] = React.useState<PlanSubView>("create");
  const [planType, setPlanType] = React.useState<PlanTypeId>("stress_reset");
  const [planContextAnswers, setPlanContextAnswers] = React.useState<
    Record<string, string>
  >({});
  const [userRequest, setUserRequest] = React.useState("");
  const [panel, setPanel] = React.useState<GeneratePanelState>({ status: "idle" });
  const [lastGenerated, setLastGenerated] =
    React.useState<GeneratePlanResponse | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>({ status: "idle" });
  const [savedPlans, setSavedPlans] = React.useState<StoredPlan[] | null>(null);
  const [savedListError, setSavedListError] = React.useState<string | null>(null);
  const [expandedSavedId, setExpandedSavedId] = React.useState<string | null>(
    null,
  );
  const [checklistSyncError, setChecklistSyncError] = React.useState<
    string | null
  >(null);
  const [planActionMessage, setPlanActionMessage] = React.useState<
    string | null
  >(null);
  const [planActionError, setPlanActionError] = React.useState<string | null>(
    null,
  );

  const loadSavedPlans = React.useCallback(async () => {
    setSavedListError(null);
    try {
      const list = await getPlans(anonymousId);
      setSavedPlans(list);
    } catch (e) {
      setSavedPlans([]);
      setSavedListError(
        e instanceof Error ? e.message : "Could not load saved plans.",
      );
    }
  }, [anonymousId]);

  React.useEffect(() => {
    void loadSavedPlans();
  }, [loadSavedPlans]);

  React.useEffect(() => {
    setPlanContextAnswers({});
  }, [planType]);

  React.useEffect(() => {
    if (savedPlans === null) return;
    setExpandedSavedId((prev) => {
      if (prev != null && savedPlans.some((p) => p.id === prev)) return prev;
      return null;
    });
  }, [savedPlans]);

  React.useEffect(() => {
    setPlanActionMessage(null);
    setPlanActionError(null);
  }, [planSubView]);

  const contextOk = hasEnoughPlanContext(planType, planContextAnswers);

  const runGenerate = React.useCallback(async () => {
    if (!checkin) return;
    if (!hasEnoughPlanContext(planType, planContextAnswers)) return;
    setPanel({ status: "generating" });
    setSaveState({ status: "idle" });
    const plan_context = buildPlanContextPayload(planType, planContextAnswers);
    try {
      const data = await generatePlan({
        anonymous_id: anonymousId,
        plan_type: planType,
        user_request: userRequest.trim() || null,
        checkin_context: buildPlanCheckinContext(checkin),
        plan_context,
      });
      setPanel({ status: "idle" });
      setLastGenerated(data);
      setPlanContextAnswers({});
      setUserRequest("");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not generate a plan.";
      setPanel({ status: "error", message });
    }
  }, [
    anonymousId,
    checkin,
    planType,
    planContextAnswers,
    userRequest,
  ]);

  const runSave = React.useCallback(async () => {
    if (!checkin || !lastGenerated) return;
    const { plan, model, source } = lastGenerated;
    setSaveState({ status: "saving" });
    try {
      await savePlan({
        anonymous_id: anonymousId,
        source_checkin_id: checkin.id,
        plan,
        model,
        source,
      });
      setSaveState({ status: "saved" });
      await loadSavedPlans();
    } catch (e) {
      setSaveState({
        status: "error",
        message:
          e instanceof Error ? e.message : "Could not save this plan.",
      });
    }
  }, [lastGenerated, anonymousId, checkin, loadSavedPlans]);

  const startNewPlan = React.useCallback(() => {
    setLastGenerated(null);
    setSaveState({ status: "idle" });
    setPanel({ status: "idle" });
  }, []);

  const toggleFreshChecklistItem = React.useCallback((index: number) => {
    setLastGenerated((prev) => {
      if (!prev) return prev;
      const items = prev.plan.checklist_items.map((it, j) =>
        j === index ? { ...it, completed: !(it.completed === true) } : it,
      );
      return { ...prev, plan: { ...prev.plan, checklist_items: items } };
    });
  }, []);

  const toggleSavedChecklistItem = React.useCallback(
    (index: number) => {
      if (!expandedSavedId || !savedPlans) return;
      const row = savedPlans.find((p) => p.id === expandedSavedId);
      if (!row) return;
      const prevItems = row.checklist_items.map((x) => ({ ...x }));
      const next = prevItems.map((it, j) =>
        j === index ? { ...it, completed: !(it.completed === true) } : it,
      );
      setChecklistSyncError(null);
      setSavedPlans((sp) =>
        sp?.map((p) => (p.id === row.id ? { ...p, checklist_items: next } : p)) ??
        null,
      );
      void updatePlanChecklist(
        row.id,
        anonymousId,
        normalizeChecklistForApi(next),
      )
        .then((updated) => {
          setSavedPlans((sp) =>
            sp?.map((p) => (p.id === row.id ? updated : p)) ?? null,
          );
        })
        .catch(() => {
          setChecklistSyncError(
            "Couldn’t save your checkmarks. Try again.",
          );
          setSavedPlans((sp) =>
            sp?.map((p) =>
              p.id === row.id ? { ...p, checklist_items: prevItems } : p,
            ) ?? null,
          );
        });
    },
    [expandedSavedId, savedPlans, anonymousId],
  );

  const confirmAndDeletePlan = React.useCallback(
    (row: StoredPlan) => {
      if (
        !window.confirm(
          `Delete “${row.title}”? This can’t be undone.`,
        )
      ) {
        return;
      }
      setPlanActionError(null);
      setPlanActionMessage(null);
      void deletePlan(row.id, anonymousId)
        .then(() => {
          setPlanActionMessage("Plan deleted.");
          setSavedPlans((sp) => sp?.filter((p) => p.id !== row.id) ?? null);
          if (expandedSavedId === row.id) {
            setExpandedSavedId(null);
          }
        })
        .catch((e) => {
          setPlanActionError(
            e instanceof Error ? e.message : "Could not delete plan.",
          );
        });
    },
    [anonymousId, expandedSavedId],
  );

  if (!checkin) {
    return (
      <div className="mx-auto max-w-xl space-y-4" role="tabpanel" aria-label="Plan">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Plan</h2>
        <Card className="border-border/75 bg-card/85 shadow-sm backdrop-blur-sm">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="font-heading text-lg text-foreground">
              Check-in needed first
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete a check-in, then you can build plans here.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/recommendations">Go to recommendations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const busy = panel.status === "generating";

  return (
    <div
      className="mx-auto w-full max-w-2xl space-y-5 pb-6"
      role="tabpanel"
      aria-label="Plan"
    >
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          From your latest check-in.
        </p>
      </div>

      <div
        className="inline-flex rounded-full border border-border/70 bg-muted/30 p-0.5 shadow-sm"
        role="tablist"
        aria-label="Plan workspace"
      >
        <button
          type="button"
          role="tab"
          aria-selected={planSubView === "create"}
          id="plan-sub-create"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            planSubView === "create"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setPlanSubView("create")}
        >
          Create plan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={planSubView === "saved"}
          id="plan-sub-saved"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            planSubView === "saved"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setPlanSubView("saved")}
        >
          Saved plans
        </button>
      </div>

      <div
        role="tabpanel"
        aria-labelledby="plan-sub-create"
        hidden={planSubView !== "create"}
        className={planSubView !== "create" ? "hidden" : undefined}
      >
        <div className="space-y-4">
          {busy && !lastGenerated ? (
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardContent className="flex items-center gap-3 py-8">
                <Loader2
                  className="size-5 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Generating your plan…
                </p>
              </CardContent>
            </Card>
          ) : null}

          {!lastGenerated && !busy ? (
            <Card className="border-border/60 bg-card/80 shadow-sm">
              <CardHeader className="space-y-0 pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 font-heading text-sm font-semibold">
                  <Sparkles className="size-3.5 text-primary" aria-hidden />
                  New plan
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="space-y-2">
                <Label htmlFor="plan-type" className="text-sm font-medium">
                  Plan type
                </Label>
                <select
                  id="plan-type"
                  disabled={busy}
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value as PlanTypeId)}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  {PLAN_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border/50 bg-muted/15 px-3 py-3">
                  {fieldsForPlanType(planType).map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label
                        htmlFor={`plan-ctx-${field.key}`}
                        className="text-sm font-medium leading-snug"
                      >
                        {field.key === "plan_topic"
                          ? `${field.label} (required)`
                          : field.label}
                      </Label>
                      {field.kind === "select" && field.options ? (
                        <select
                          id={`plan-ctx-${field.key}`}
                          disabled={busy}
                          value={planContextAnswers[field.key] ?? ""}
                          onChange={(e) =>
                            setPlanContextAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        >
                          <option value="">Select…</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.kind === "textarea" ? (
                        <textarea
                          id={`plan-ctx-${field.key}`}
                          disabled={busy}
                          value={planContextAnswers[field.key] ?? ""}
                          onChange={(e) =>
                            setPlanContextAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          rows={3}
                          maxLength={1200}
                          className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        />
                      ) : (
                        <input
                          id={`plan-ctx-${field.key}`}
                          type="text"
                          disabled={busy}
                          value={planContextAnswers[field.key] ?? ""}
                          onChange={(e) =>
                            setPlanContextAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-request" className="text-sm font-medium">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="plan-request"
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Extra context…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {!contextOk ? (
                <p className="text-xs text-muted-foreground" role="status">
                  {planType === "custom_plan"
                    ? "Add a topic and at least one other field."
                    : "Answer at least two questions above."}
                </p>
              ) : null}

              <Button
                type="button"
                className="h-10 w-full rounded-xl sm:w-auto sm:min-w-[160px]"
                disabled={!contextOk}
                onClick={() => void runGenerate()}
              >
                Generate plan
              </Button>

              {panel.status === "error" ? (
                <div
                  className="flex flex-col gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-3"
                  role="alert"
                >
                  <div className="flex gap-2">
                    <AlertCircle
                      className="mt-0.5 size-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                    <p className="min-w-0 text-xs text-muted-foreground break-words">
                      {panel.message}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start rounded-lg"
                    onClick={() => void runGenerate()}
                  >
                    Retry
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
          ) : null}

          {lastGenerated ? (
            <GeneratedPlanCard
              plan={lastGenerated.plan}
              source={lastGenerated.source}
              model={lastGenerated.model}
              interactiveChecklist
              onToggleChecklistItem={toggleFreshChecklistItem}
              primaryActions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={
                      saveState.status === "saving" ||
                      saveState.status === "saved"
                    }
                    onClick={() => void runSave()}
                  >
                    {saveState.status === "saving" ? (
                      <>
                        <Loader2
                          className="mr-2 size-4 animate-spin"
                          aria-hidden
                        />
                        Saving…
                      </>
                    ) : saveState.status === "saved" ? (
                      "Saved"
                    ) : (
                      "Save plan"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={startNewPlan}
                  >
                    Generate new plan
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground"
                    onClick={() => setPlanSubView("saved")}
                  >
                    Saved plans
                  </Button>
                </div>
              }
              afterPrimaryActions={
                saveState.status === "error" ? (
                  <p className="text-xs text-destructive" role="alert">
                    {saveState.message}
                  </p>
                ) : saveState.status === "saved" ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Saved to this device.
                  </p>
                ) : null
              }
            />
          ) : null}
        </div>
      </div>

      <div
        role="tabpanel"
        aria-labelledby="plan-sub-saved"
        hidden={planSubView !== "saved"}
        className={planSubView !== "saved" ? "hidden" : undefined}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5 shrink-0 opacity-80" aria-hidden />
              On this device
            </p>
            {savedListError ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => void loadSavedPlans()}
              >
                Retry
              </Button>
            ) : null}
          </div>

          {savedPlans === null ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading saved plans…
            </div>
          ) : savedListError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-foreground">
              <p>{savedListError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
                onClick={() => void loadSavedPlans()}
              >
                Try again
              </Button>
            </div>
          ) : savedPlans.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/15 px-5 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No saved plans yet.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-4 rounded-xl"
                onClick={() => setPlanSubView("create")}
              >
                Create your first plan
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {planActionMessage ? (
                <p
                  className="text-xs text-emerald-700 dark:text-emerald-400"
                  role="status"
                >
                  {planActionMessage}
                </p>
              ) : null}
              {planActionError ? (
                <p className="text-xs text-destructive" role="alert">
                  {planActionError}
                </p>
              ) : null}
              <ul className="space-y-1.5" aria-label="Saved plans list">
                {savedPlans.map((row) => {
                  const expanded = row.id === expandedSavedId;
                  const toggle = () => {
                    setExpandedSavedId((id) => (id === row.id ? null : row.id));
                    setChecklistSyncError(null);
                  };
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        "overflow-hidden rounded-lg border transition-colors",
                        expanded
                          ? "border-border bg-card/40"
                          : "border-border/60 bg-card/30 hover:border-border",
                      )}
                    >
                      <div className="relative flex gap-0.5 pr-10">
                        <button
                          type="button"
                          className="flex shrink-0 items-center px-1.5 py-2.5 text-muted-foreground hover:text-foreground"
                          aria-expanded={expanded}
                          aria-label={expanded ? "Collapse" : "Expand"}
                          onClick={toggle}
                        >
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 transition-transform duration-200",
                              expanded && "rotate-90",
                            )}
                            aria-hidden
                          />
                        </button>
                        <button
                          type="button"
                          className="min-w-0 flex-1 py-2.5 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          onClick={toggle}
                        >
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {row.title}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {planTypeLabel(row.plan_type)}
                            <span aria-hidden> · </span>
                            <span className="whitespace-nowrap">
                              {formatSavedAt(row.created_at)}
                            </span>
                          </p>
                          {!expanded ? (
                            <div className="mt-1.5">
                              <PlanProgressBar
                                items={row.checklist_items}
                                compact
                              />
                            </div>
                          ) : null}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0.5 top-1.5 size-8 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Delete ${row.title}`}
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            confirmAndDeletePlan(row);
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                      {expanded ? (
                        <div className="border-t border-border/50 px-3 pb-3 pt-2">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {row.summary}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Horizon <span aria-hidden>·</span>{" "}
                            {row.time_horizon}
                          </p>
                          <div className="mt-3">
                            <PlanProgressBar items={row.checklist_items} />
                          </div>
                          {checklistSyncError ? (
                            <p
                              className="mt-1.5 text-xs text-destructive"
                              role="alert"
                            >
                              {checklistSyncError}
                            </p>
                          ) : null}
                          <div className="mt-3">
                            <PlanTaskList
                              items={row.checklist_items}
                              interactive
                              onToggleChecklistItem={toggleSavedChecklistItem}
                            />
                          </div>
                          {row.notes?.length ? (
                            <div className="mt-3">
                              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                                Notes
                              </p>
                              <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
                                {row.notes.map((n, i) => (
                                  <li key={i}>{n}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <p className="mt-3 text-[10px] text-muted-foreground/60">
                            {row.source} · {row.model ?? "—"}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GeneratedPlanCard({
  plan,
  source,
  model,
  actions,
  primaryActions,
  afterPrimaryActions,
  interactiveChecklist,
  onToggleChecklistItem,
  checklistSyncError,
}: {
  plan: GeneratedPlan;
  source: string;
  model: string;
  actions?: React.ReactNode;
  primaryActions?: React.ReactNode;
  afterPrimaryActions?: React.ReactNode;
  interactiveChecklist?: boolean;
  onToggleChecklistItem?: (index: number) => void;
  checklistSyncError?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm">
      <div className="space-y-3">
        <div>
          <h3 className="font-heading text-lg font-semibold leading-snug tracking-tight text-foreground">
            {plan.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {plan.summary}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Horizon <span aria-hidden>·</span> {plan.time_horizon}
          </p>
        </div>

        <div>
          <PlanProgressBar items={plan.checklist_items} />
          {checklistSyncError ? (
            <p className="mt-1.5 text-xs text-destructive" role="alert">
              {checklistSyncError}
            </p>
          ) : null}
        </div>

        {primaryActions ? <div>{primaryActions}</div> : null}
        {afterPrimaryActions ? <div>{afterPrimaryActions}</div> : null}

        <div>
          <PlanTaskList
            items={plan.checklist_items}
            interactive={interactiveChecklist}
            onToggleChecklistItem={onToggleChecklistItem}
          />
        </div>

        {plan.notes?.length ? (
          <div aria-label="Notes">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              Notes
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">
              {plan.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[10px] text-muted-foreground/50">
          {source} · {model}
        </p>

        {actions}
      </div>
    </div>
  );
}
