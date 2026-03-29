"use client";

import {
  AlertCircle,
  FolderOpen,
  Loader2,
  Plus,
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
  hasEnoughPersonalTasksInput,
  hasEnoughPlanContext,
  PLAN_TYPE_OPTIONS,
  type PlanTypeId,
} from "@/lib/dashboard/plan-context-fields";
import {
  normalizeChecklistForApi,
  planChecklistProgress,
} from "@/lib/dashboard/plan-checklist";
import {
  deletePlan,
  emitDashboardPlansMutated,
  getPlans,
  savePlan,
  updatePlanChecklist,
} from "@/lib/api/plans";
import { cn } from "@/lib/utils";
import type {
  CheckinDetailResponse,
  GeneratedPlan,
  GeneratePlanResponse,
  PlanChecklistItem,
  SavedPlanGenerationMeta,
  StoredPlan,
  UserPlanTaskInput,
} from "@/types/api";

type DraftTask = {
  localId: string;
  name: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
};

function newDraftTask(): DraftTask {
  return {
    localId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    priority: "medium",
    estimatedTime: "",
  };
}

export { PLAN_TYPE_OPTIONS, type PlanTypeId } from "@/lib/dashboard/plan-context-fields";

type PlanSubView = "create" | "saved";

function planTypeLabel(id: string): string {
  const hit = PLAN_TYPE_OPTIONS.find((o) => o.id === id);
  return hit?.label ?? id.replace(/_/g, " ");
}

function personalTasksMetaFromRow(row: StoredPlan): {
  meta: SavedPlanGenerationMeta;
  tasks: UserPlanTaskInput[];
} | null {
  const raw = row.plan_meta;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.user_tasks)) return null;
  return {
    meta: raw as SavedPlanGenerationMeta,
    tasks: o.user_tasks as UserPlanTaskInput[],
  };
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
  const [planSubView, setPlanSubView] = React.useState<PlanSubView>("saved");
  const [planType, setPlanType] = React.useState<PlanTypeId>("personal_tasks");
  const [planContextAnswers, setPlanContextAnswers] = React.useState<
    Record<string, string>
  >({});
  const [planDisplayName, setPlanDisplayName] = React.useState("");
  const [scheduleKind, setScheduleKind] = React.useState<"daily" | "weekly" | "">(
    "",
  );
  const [draftTasks, setDraftTasks] = React.useState<DraftTask[]>([
    newDraftTask(),
  ]);
  const [generateFullSchedule, setGenerateFullSchedule] = React.useState(false);
  const [userRequest, setUserRequest] = React.useState("");
  const [panel, setPanel] = React.useState<GeneratePanelState>({ status: "idle" });
  const [lastGenerated, setLastGenerated] =
    React.useState<GeneratePlanResponse | null>(null);
  const [lastPlanMeta, setLastPlanMeta] =
    React.useState<SavedPlanGenerationMeta | null>(null);
  const [saveState, setSaveState] = React.useState<SaveState>({ status: "idle" });
  const [savedPlans, setSavedPlans] = React.useState<StoredPlan[] | null>(null);
  const [savedListError, setSavedListError] = React.useState<string | null>(null);
  const [selectedSavedPlanId, setSelectedSavedPlanId] = React.useState<
    string | null
  >(null);
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
    if (planType !== "personal_tasks") {
      setPlanDisplayName("");
      setScheduleKind("");
      setDraftTasks([newDraftTask()]);
      setGenerateFullSchedule(false);
    }
  }, [planType]);

  React.useEffect(() => {
    if (savedPlans === null || savedPlans.length === 0) {
      setSelectedSavedPlanId(null);
      return;
    }
    setSelectedSavedPlanId((prev) => {
      if (prev != null && savedPlans.some((p) => p.id === prev)) return prev;
      return savedPlans[0]?.id ?? null;
    });
  }, [savedPlans]);

  React.useEffect(() => {
    setPlanActionMessage(null);
    setPlanActionError(null);
  }, [planSubView]);

  const personalOk = hasEnoughPersonalTasksInput(
    planDisplayName,
    scheduleKind,
    draftTasks,
  );
  const presetContextOk = hasEnoughPlanContext(planType, planContextAnswers);
  const contextOk =
    planType === "personal_tasks" ? personalOk : presetContextOk;

  const runGenerate = React.useCallback(async () => {
    if (!checkin) return;
    if (planType === "personal_tasks") {
      if (!hasEnoughPersonalTasksInput(planDisplayName, scheduleKind, draftTasks))
        return;
    } else if (!hasEnoughPlanContext(planType, planContextAnswers)) {
      return;
    }
    setPanel({ status: "generating" });
    setSaveState({ status: "idle" });
    const plan_context = buildPlanContextPayload(planType, planContextAnswers);
    const user_tasks =
      planType === "personal_tasks"
        ? draftTasks
            .map((t) => {
              const et = t.estimatedTime.trim();
              return {
                name: t.name.trim(),
                priority: t.priority,
                estimated_time: et.length > 0 ? et : null,
              };
            })
            .filter((t) => t.name.length > 0)
        : null;
    const personalMeta: SavedPlanGenerationMeta | null =
      planType === "personal_tasks" &&
      user_tasks &&
      user_tasks.length > 0 &&
      scheduleKind
        ? {
            version: 1,
            plan_type: planType,
            schedule_kind: scheduleKind,
            plan_name: planDisplayName.trim() || null,
            generate_full_schedule: generateFullSchedule,
            user_tasks,
          }
        : null;
    try {
      const data = await generatePlan({
        anonymous_id: anonymousId,
        plan_type: planType,
        user_request: userRequest.trim() || null,
        checkin_context: buildPlanCheckinContext(checkin),
        plan_context:
          planType === "personal_tasks" ? null : plan_context,
        plan_name:
          planType === "personal_tasks" ? planDisplayName.trim() : null,
        schedule_kind:
          planType === "personal_tasks" && scheduleKind
            ? scheduleKind
            : null,
        user_tasks: user_tasks && user_tasks.length > 0 ? user_tasks : null,
        generate_full_schedule:
          planType === "personal_tasks" ? generateFullSchedule : false,
      });
      setPanel({ status: "idle" });
      setLastGenerated(data);
      setLastPlanMeta(personalMeta);
      setPlanContextAnswers({});
      setUserRequest("");
      if (planType === "personal_tasks") {
        setPlanDisplayName("");
        setScheduleKind("");
        setDraftTasks([newDraftTask()]);
        setGenerateFullSchedule(false);
      }
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
    planDisplayName,
    scheduleKind,
    draftTasks,
    generateFullSchedule,
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
        plan_meta: lastPlanMeta ?? null,
      });
      setSaveState({ status: "saved" });
      setPlanSubView("saved");
      await loadSavedPlans();
      emitDashboardPlansMutated();
    } catch (e) {
      setSaveState({
        status: "error",
        message:
          e instanceof Error ? e.message : "Could not save this plan.",
      });
    }
  }, [lastGenerated, lastPlanMeta, anonymousId, checkin, loadSavedPlans]);

  const startNewPlan = React.useCallback(() => {
    setLastGenerated(null);
    setLastPlanMeta(null);
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
      if (!selectedSavedPlanId || !savedPlans) return;
      const row = savedPlans.find((p) => p.id === selectedSavedPlanId);
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
    [selectedSavedPlanId, savedPlans, anonymousId],
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
          setSavedPlans((sp) => {
            const next = sp?.filter((p) => p.id !== row.id) ?? null;
            setSelectedSavedPlanId((sel) =>
              sel === row.id ? next?.[0]?.id ?? null : sel,
            );
            return next;
          });
          emitDashboardPlansMutated();
        })
        .catch((e) => {
          setPlanActionError(
            e instanceof Error ? e.message : "Could not delete plan.",
          );
        });
    },
    [anonymousId],
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
      className="mx-auto w-full max-w-5xl space-y-5 pb-6"
      role="tabpanel"
      aria-label="Plan"
    >
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Grounded in your check-in and priorities, with steps to ease burnout.
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

              {planType === "personal_tasks" ? (
                <div className="space-y-4 rounded-lg border border-border/50 bg-muted/15 px-3 py-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="plan-display-name"
                      className="text-sm font-medium"
                    >
                      Plan name <span className="text-destructive">*</span>
                    </Label>
                    <input
                      id="plan-display-name"
                      type="text"
                      disabled={busy}
                      value={planDisplayName}
                      onChange={(e) => setPlanDisplayName(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. This week’s reset"
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">
                      Schedule <span className="text-destructive">*</span>
                    </span>
                    <div
                      className="flex flex-wrap gap-2"
                      role="group"
                      aria-label="Daily or weekly plan"
                    >
                      {(
                        [
                          { id: "daily" as const, label: "Daily plan" },
                          { id: "weekly" as const, label: "Weekly plan" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={busy}
                          onClick={() => setScheduleKind(opt.id)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            scheduleKind === opt.id
                              ? "border-primary bg-primary/15 text-foreground"
                              : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <Label className="text-sm font-medium">
                        Your tasks <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="h-8 gap-1 rounded-lg text-xs"
                        onClick={() =>
                          setDraftTasks((prev) => [...prev, newDraftTask()])
                        }
                      >
                        <Plus className="size-3.5" aria-hidden />
                        Add task
                      </Button>
                    </div>
                    <ul className="space-y-3">
                      {draftTasks.map((task, index) => (
                        <li
                          key={task.localId}
                          className="space-y-2 rounded-xl border border-border/60 bg-background/80 p-3"
                        >
                          <div className="space-y-1">
                            <Label
                              htmlFor={`task-name-${task.localId}`}
                              className="text-xs text-muted-foreground"
                            >
                              Task {index + 1} name
                            </Label>
                            <input
                              id={`task-name-${task.localId}`}
                              type="text"
                              disabled={busy}
                              value={task.name}
                              onChange={(e) =>
                                setDraftTasks((prev) =>
                                  prev.map((t) =>
                                    t.localId === task.localId
                                      ? { ...t, name: e.target.value }
                                      : t,
                                  ),
                                )
                              }
                              maxLength={500}
                              placeholder="What you want to get done"
                              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                            />
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1 space-y-1">
                              <Label
                                htmlFor={`task-time-${task.localId}`}
                                className="text-xs text-muted-foreground"
                              >
                                Est. time{" "}
                                <span className="font-normal opacity-80">
                                  (helps ordering & burnout notes)
                                </span>
                              </Label>
                              <input
                                id={`task-time-${task.localId}`}
                                type="text"
                                disabled={busy}
                                value={task.estimatedTime}
                                onChange={(e) =>
                                  setDraftTasks((prev) =>
                                    prev.map((t) =>
                                      t.localId === task.localId
                                        ? {
                                            ...t,
                                            estimatedTime: e.target.value,
                                          }
                                        : t,
                                    ),
                                  )
                                }
                                maxLength={80}
                                placeholder="e.g. 45 min, 2h"
                                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                              />
                            </div>
                            <div className="flex w-full items-end gap-2 sm:w-auto sm:shrink-0">
                              <div className="min-w-0 flex-1 space-y-1 sm:w-36 sm:flex-initial">
                                <Label
                                  htmlFor={`task-prio-${task.localId}`}
                                  className="text-xs text-muted-foreground"
                                >
                                  Priority
                                </Label>
                                <select
                                  id={`task-prio-${task.localId}`}
                                  disabled={busy}
                                  value={task.priority}
                                  onChange={(e) =>
                                    setDraftTasks((prev) =>
                                      prev.map((t) =>
                                        t.localId === task.localId
                                          ? {
                                              ...t,
                                              priority: e.target
                                                .value as DraftTask["priority"],
                                            }
                                          : t,
                                      ),
                                    )
                                  }
                                  className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={busy || draftTasks.length <= 1}
                                className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                                aria-label={`Remove task ${index + 1}`}
                                onClick={() =>
                                  setDraftTasks((prev) =>
                                    prev.length <= 1
                                      ? prev
                                      : prev.filter(
                                          (t) => t.localId !== task.localId,
                                        ),
                                  )
                                }
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/40 bg-background/50 px-3 py-3">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={generateFullSchedule}
                      onChange={(e) =>
                        setGenerateFullSchedule(e.target.checked)
                      }
                      className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
                    />
                    <span className="min-w-0 text-sm leading-snug">
                      <span className="font-medium text-foreground">
                        Generate a full {scheduleKind === "weekly" ? "weekly" : "daily"} schedule
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">
                        Adds ordered steps for rest, sleep-friendly pacing,
                        light social connection, and burnout-aware recovery
                        (non-clinical). May produce more checklist items.
                      </span>
                    </span>
                  </label>
                </div>
              ) : (
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
              )}

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
                  {planType === "personal_tasks"
                    ? "Add a plan name, choose daily or weekly, and at least one task with a name."
                    : planType === "custom_plan"
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
            <>
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
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-0">
                <aside
                  className="w-full shrink-0 md:w-[13.75rem] md:border-r md:border-border/45 md:pr-4"
                  aria-label="Plan list"
                >
                  <ul className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1.5 md:overflow-visible md:pb-0">
                    {savedPlans.map((row) => {
                      const selected = row.id === selectedSavedPlanId;
                      const { percent } = planChecklistProgress(
                        row.checklist_items,
                      );
                      return (
                        <li key={row.id} className="min-w-[11rem] shrink-0 md:min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSavedPlanId(row.id);
                              setChecklistSyncError(null);
                            }}
                            aria-current={selected ? "true" : undefined}
                            className={cn(
                              "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              selected
                                ? "border-primary/45 bg-primary/[0.07] shadow-sm"
                                : "border-border/55 bg-card/45 hover:border-border hover:bg-card/70",
                            )}
                          >
                            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                              {row.title}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              <span className="tabular-nums font-medium text-foreground/90">
                                {percent}%
                              </span>
                              <span aria-hidden> · </span>
                              <span className="line-clamp-1">
                                {planTypeLabel(row.plan_type)}
                              </span>
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 hidden w-full gap-1.5 rounded-xl md:flex"
                    onClick={() => setPlanSubView("create")}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    New plan
                  </Button>
                </aside>

                <div className="min-w-0 flex-1 md:pl-5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-4 gap-1.5 rounded-xl md:hidden"
                    onClick={() => setPlanSubView("create")}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    New plan
                  </Button>
                  {(() => {
                    const row = savedPlans.find(
                      (p) => p.id === selectedSavedPlanId,
                    );
                    if (!row) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          Select a plan from the list.
                        </p>
                      );
                    }
                    return (
                      <SavedPlanDetailView
                        row={row}
                        onDelete={confirmAndDeletePlan}
                        checklistSyncError={checklistSyncError}
                        onToggleChecklistItem={toggleSavedChecklistItem}
                      />
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SavedPlanDetailView({
  row,
  onDelete,
  checklistSyncError,
  onToggleChecklistItem,
}: {
  row: StoredPlan;
  onDelete: (row: StoredPlan) => void;
  checklistSyncError: string | null;
  onToggleChecklistItem: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            id={`saved-plan-${row.id}-title`}
            className="font-heading text-lg font-semibold leading-snug text-foreground"
          >
            {row.title}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {planTypeLabel(row.plan_type)}
            <span aria-hidden> · </span>
            <span className="whitespace-nowrap">
              {formatSavedAt(row.created_at)}
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${row.title}`}
          onClick={() => onDelete(row)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {row.summary}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Horizon <span aria-hidden>·</span> {row.time_horizon}
      </p>

      {(() => {
        const pm = personalTasksMetaFromRow(row);
        if (!pm) return null;
        const { meta, tasks } = pm;
        return (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
            <p className="text-[11px] font-medium text-primary">
              Your time inputs (saved)
            </p>
            {meta.schedule_kind ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Scope:{" "}
                {meta.schedule_kind === "daily" ? "Daily" : "Weekly"}
                {meta.generate_full_schedule ? " · full schedule requested" : null}
              </p>
            ) : null}
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {tasks.map((ut, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{ut.name}</span>
                  <span aria-hidden> · </span>
                  {ut.priority} priority
                  {ut.estimated_time ? (
                    <>
                      <span aria-hidden> · </span>
                      {ut.estimated_time}
                    </>
                  ) : (
                    <span className="opacity-80"> · no time estimate</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="mt-4">
        <PlanProgressBar items={row.checklist_items} />
      </div>
      {checklistSyncError ? (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {checklistSyncError}
        </p>
      ) : null}
      <div className="mt-3">
        <PlanTaskList
          items={row.checklist_items}
          interactive
          onToggleChecklistItem={onToggleChecklistItem}
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
      <p className="mt-4 text-[10px] text-muted-foreground/60">
        {row.source} · {row.model ?? "—"}
      </p>
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
