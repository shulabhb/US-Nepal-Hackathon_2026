"use client";

/**
 * Support Chat — three-part vertical shell (must sit inside a height-bounded parent):
 *
 * 1. Top chrome — `header` (shrink-0): title, badges, context strip. Does not scroll.
 * 2. Middle — single `overflow-y-auto` region (flex-1 min-h-0): message log only.
 * 3. Bottom — `footer` (shrink-0): quick prompts + composer. Does not scroll.
 *
 * The dashboard chat tab uses AppShell `viewportFill` + a flex-1 column so this
 * panel receives the remaining height below the app nav; only part (2) scrolls.
 */

import { ClipboardList, Loader2, Send } from "lucide-react";
import Link from "next/link";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  buildPlanCheckinContext,
  generateChatReply,
  generatePlan,
} from "@/lib/api/ai";
import { getCheckinHistory } from "@/lib/api/checkins";
import {
  emitDashboardPlansMutated,
  getPlans,
  savePlan,
} from "@/lib/api/plans";
import {
  buildActivePlanContext,
  buildBurnoutChatContext,
  buildChatCheckinPayload,
  buildSavedPlanSummaries,
} from "@/lib/dashboard/chat-context";
import {
  applyChecklistEditFromChatMessage,
  formatChecklistPreviewLines,
  wantsFullPlanRegenerate,
} from "@/lib/dashboard/chat-plan-checklist-edit";
import {
  buildSavedMetaForChatGenerate,
  formatPlanTypeMenu,
  formatPresetFieldQuestion,
  messageStartsPlanFlow,
  normalizePresetAnswer,
  optionalNotesPrompt,
  parsePersonalTaskLines,
  parsePlanTypeId,
  parseScheduleKind,
  parseSelectChoice,
  parseYesNo,
  PLAN_FLOW_CHIP_LABELS,
  summarizeGeneratedPlan,
  wantsCancelFlow,
  wantsConfirmRisk,
  wantsKeepPlanInstead,
  wantsSavePlanReply,
  wantsStripRecoveryOrLightenLoad,
  type ChatPlanSession,
  type PendingChatGenerate,
} from "@/lib/dashboard/chat-plan-flow";
import { CHAT_SEED_QUICK_PLAN } from "@/lib/dashboard/dashboard-tab";
import { projectStrainIfStrippingRecovery } from "@/lib/dashboard/burnout-projection";
import {
  buildPlanContextPayload,
  fieldsForPlanType,
  hasEnoughPlanContext,
} from "@/lib/dashboard/plan-context-fields";
import { planChecklistProgress } from "@/lib/dashboard/plan-checklist";
import { buildRichChatOpening } from "@/lib/dashboard/seed-assistant-message";
import {
  buildDashboardAlignedBurnoutViewModel,
  previousCheckinFromHistory,
} from "@/lib/burnout/burnout-view-model";
import { dashboardHref } from "@/lib/dashboard/dashboard-tab";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant only: show link to Plan tab (e.g. after saving a plan from chat). */
  showPlanPageLink?: boolean;
};

const FOLLOW_UPS: { id: string; label: string }[] = [
  { id: "plan", label: "Help me make a quick plan" },
  { id: "calm", label: "Help me calm down right now" },
  { id: "sleep", label: "Help me improve sleep tonight" },
  { id: "workload", label: "Break down my workload" },
  { id: "checkin", label: "Show my latest check-in" },
];

function newId(): string {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatCheckinTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type SupportChatPanelHandle = {
  /** Sends the same user text as the matching follow-up chip (AI-backed). */
  playFollowUp: (id: string) => void;
};

type Props = {
  anonymousId: string;
  checkin: CheckinDetailResponse;
  initialAssistantMessage: string;
  className?: string;
  /** When set, “latest check-in” / Burnout navigation opens this tab instead of scrolling to a DOM id. */
  onOpenBurnout?: () => void;
  /**
   * From dashboard `?chatSeed=quick-plan`: after the opening message is ready, send the quick-plan
   * prompt so the guided plan flow starts (same as the “Help me make a quick plan” chip).
   */
  chatSeed?: string | null;
  /** Called once after the seeded quick-plan message is sent — use to strip `chatSeed` from the URL. */
  onChatSeedConsumed?: () => void;
};

export const SupportChatPanel = forwardRef<SupportChatPanelHandle, Props>(
  function SupportChatPanel(
    {
      anonymousId,
      checkin,
      initialAssistantMessage,
      className,
      onOpenBurnout,
      chatSeed,
      onChatSeedConsumed,
    },
    ref,
  ) {
    const baseId = useId();
    const threadEndRef = useRef<HTMLDivElement>(null);
    const composerRef = useRef<HTMLTextAreaElement>(null);
    const wasSendingRef = useRef(false);
    const quickPlanSeedConsumedRef = useRef(false);
    const composerId = `${baseId}-composer`;

    const [messages, setMessages] = useState<ChatMessage[]>(() => [
      {
        id: newId(),
        role: "assistant",
        content: initialAssistantMessage,
      },
    ]);
    const [plans, setPlans] = useState<StoredPlan[] | null>(null);
    const [previousCheckin, setPreviousCheckin] =
      useState<CheckinDetailResponse | null>(null);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [planFlow, setPlanFlow] = useState<ChatPlanSession | null>(null);

    const activePlan = plans != null && plans.length > 0 ? plans[0] : null;
    const planProgress = activePlan
      ? planChecklistProgress(activePlan.checklist_items)
      : null;

    /** Guided Plan tab flow in chat — not general Q&A until user cancels or finishes. */
    const planModeActive = planFlow != null;

    useEffect(() => {
      let cancelled = false;
      void Promise.allSettled([
        getPlans(anonymousId),
        getCheckinHistory(anonymousId),
      ]).then((results) => {
        if (cancelled) return;
        const planList =
          results[0].status === "fulfilled" ? results[0].value : [];
        const history =
          results[1].status === "fulfilled" ? results[1].value : [];
        setPlans(planList);
        const prev = previousCheckinFromHistory(history, checkin.id);
        setPreviousCheckin(prev);
        const model = buildDashboardAlignedBurnoutViewModel(checkin, {
          previousCheckin: prev,
          plans: planList,
        });
        const rich = buildRichChatOpening(
          checkin,
          model,
          planList[0] ?? null,
        );
        setMessages((prevMsgs) => {
          if (prevMsgs.length === 1 && prevMsgs[0].role === "assistant") {
            return [{ ...prevMsgs[0], content: rich }];
          }
          return prevMsgs;
        });
      });
      return () => {
        cancelled = true;
      };
    }, [anonymousId, checkin]);

    useEffect(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    useEffect(() => {
      if (wasSendingRef.current && !sending) {
        requestAnimationFrame(() => {
          composerRef.current?.focus();
        });
      }
      wasSendingRef.current = sending;
    }, [sending]);

    const sendUserMessage = useCallback(
      async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || sending) return;

        const historyForApi = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "user", content: trimmed },
        ]);
        setSending(true);
        setSendError(null);

        if (trimmed.toLowerCase().includes("show my latest check-in")) {
          requestAnimationFrame(() => {
            if (onOpenBurnout) {
              onOpenBurnout();
              return;
            }
            document
              .getElementById("dashboard-checkin-preview")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }

        const pushAssistant = (
          content: string,
          opts?: { showPlanPageLink?: boolean },
        ) => {
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content,
              showPlanPageLink: opts?.showPlanPageLink,
            },
          ]);
        };

        const runPlanGeneration = async (
          base: PendingChatGenerate,
          restoreOnFail?: ChatPlanSession,
        ) => {
          try {
            const listForModel = plans ?? [];
            const burnoutForPlan = buildDashboardAlignedBurnoutViewModel(
              checkin,
              {
                previousCheckin,
                plans: listForModel,
              },
            );
            const data = await generatePlan({
              anonymous_id: anonymousId,
              plan_type: base.planType,
              user_request: base.userRequest.trim() || null,
              checkin_context: buildPlanCheckinContext(checkin),
              burnout_context: buildBurnoutChatContext(burnoutForPlan),
              plan_context:
                base.planType === "personal_tasks"
                  ? null
                  : buildPlanContextPayload(base.planType, base.rawAnswers),
              plan_name:
                base.planType === "personal_tasks"
                  ? (base.planName?.trim() || null)
                  : null,
              schedule_kind:
                base.planType === "personal_tasks" ? base.scheduleKind : null,
              user_tasks:
                base.planType === "personal_tasks" && base.userTasks?.length
                  ? base.userTasks
                  : null,
              generate_full_schedule:
                base.planType === "personal_tasks"
                  ? base.generateFullSchedule
                  : false,
            });
            const meta = buildSavedMetaForChatGenerate(base);
            setPlanFlow({ kind: "review", draft: data, meta, base });
            pushAssistant(summarizeGeneratedPlan(data));
          } catch (e) {
            pushAssistant(
              `I couldn’t generate that plan (${e instanceof Error ? e.message : "error"}). Check the API or try the Plan tab. Say **cancel** to exit this flow.`,
            );
            if (restoreOnFail) setPlanFlow(restoreOnFail);
          }
        };

        const handlePlanFlowActions = async (
          session: ChatPlanSession,
          userText: string,
        ) => {
          if (session.kind === "risk_strip") {
            if (wantsKeepPlanInstead(userText)) {
              setPlanFlow({
                kind: "review",
                draft: session.draft,
                meta: session.meta,
                base: session.base,
              });
              pushAssistant(
                "Keeping the current draft. Reply **save** when you’re ready, or describe other tweaks.",
              );
              return;
            }
            if (wantsConfirmRisk(userText)) {
              const nextBase: PendingChatGenerate = {
                ...session.base,
                userRequest: `${session.base.userRequest} User confirmed in chat: remove or reduce wellness, recovery, and extra pacing steps; shorter checklist focused on core obligations.`.trim(),
              };
              await runPlanGeneration(nextBase, {
                kind: "risk_strip",
                draft: session.draft,
                meta: session.meta,
                base: session.base,
                baselineComposite: session.baselineComposite,
                strippedProjected: session.strippedProjected,
                explainer: session.explainer,
              });
              return;
            }
            if (wantsCancelFlow(userText)) {
              setPlanFlow(null);
              pushAssistant(
                "Okay—we stopped plan-making. Use the quick prompt or say you want a plan anytime.",
              );
              return;
            }
            pushAssistant(
              "Reply **confirm** to regenerate a leaner plan, or **keep** to stay with the last draft.",
            );
            return;
          }

          if (wantsCancelFlow(userText)) {
            setPlanFlow(null);
            pushAssistant(
              "Okay—we stopped plan-making. Use the quick prompt or say you want a plan anytime.",
            );
            return;
          }

          switch (session.kind) {
            case "pick_type": {
              const id = parsePlanTypeId(userText);
              if (!id) {
                pushAssistant(
                  "Reply with a number 1–8 or an id (e.g. study_plan). Say **cancel** to stop.",
                );
                return;
              }
              if (id === "personal_tasks") {
                setPlanFlow({ kind: "personal_name" });
                pushAssistant(
                  "What should we call this plan? (Short name—same as the Plan tab.)",
                );
                return;
              }
              const fields = fieldsForPlanType(id);
              if (fields.length === 0) {
                pushAssistant(
                  "That plan type has no extra questions in-app—try another number or say **cancel**.",
                );
                return;
              }
              setPlanFlow({
                kind: "preset_field",
                planType: id,
                index: 0,
                answers: {},
              });
              pushAssistant(formatPresetFieldQuestion(id, fields[0]));
              return;
            }
            case "personal_name": {
              const name = userText.trim();
              if (name.length < 2) {
                pushAssistant("Add a short plan name (at least a couple characters).");
                return;
              }
              setPlanFlow({ kind: "personal_schedule", planName: name.slice(0, 200) });
              pushAssistant(
                "Is this a **daily** or **weekly** plan? Reply with `daily` or `weekly`.",
              );
              return;
            }
            case "personal_schedule": {
              const sk = parseScheduleKind(userText);
              if (!sk) {
                pushAssistant("Reply with **daily** or **weekly**.");
                return;
              }
              setPlanFlow({
                kind: "personal_tasks",
                planName: session.planName,
                scheduleKind: sk,
              });
              pushAssistant(
                [
                  "List your tasks—**one per line**. Optional format:",
                  "`Task name | high, medium, or low | 45 min`",
                  "Example: `Inbox zero | high | 1h`",
                  "",
                  "If you skip priority or time, we’ll assume medium priority and flexible time.",
                ].join("\n"),
              );
              return;
            }
            case "personal_tasks": {
              const parsed = parsePersonalTaskLines(userText);
              if (!parsed.ok) {
                pushAssistant(parsed.error ?? "Couldn’t read tasks—try again.");
                return;
              }
              setPlanFlow({
                kind: "personal_full",
                planName: session.planName,
                scheduleKind: session.scheduleKind,
                tasks: parsed.tasks,
              });
              pushAssistant(
                "Include a fuller schedule with pacing, rest, and light connection (may add more checklist items)? Reply **yes** or **no**.",
              );
              return;
            }
            case "personal_full": {
              const yn = parseYesNo(userText);
              if (yn === null) {
                pushAssistant("Please reply **yes** or **no**.");
                return;
              }
              const base: PendingChatGenerate = {
                planType: "personal_tasks",
                planName: session.planName,
                scheduleKind: session.scheduleKind,
                userTasks: session.tasks,
                generateFullSchedule: yn,
                rawAnswers: {},
                userRequest: "",
              };
              setPlanFlow({ kind: "await_notes", base });
              pushAssistant(optionalNotesPrompt());
              return;
            }
            case "preset_field": {
              const fields = fieldsForPlanType(session.planType);
              const field = fields[session.index];
              if (!field) {
                pushAssistant("Something went wrong in the questionnaire—say **cancel**.");
                return;
              }
              const resolved =
                field.kind === "select"
                  ? normalizePresetAnswer(
                      parseSelectChoice(userText, field) ?? userText,
                    )
                  : normalizePresetAnswer(userText);
              if (!resolved) {
                pushAssistant("I need an answer for that—try again.");
                return;
              }
              const answers = { ...session.answers, [field.key]: resolved };
              if (session.index + 1 < fields.length) {
                setPlanFlow({
                  kind: "preset_field",
                  planType: session.planType,
                  index: session.index + 1,
                  answers,
                });
                pushAssistant(
                  formatPresetFieldQuestion(session.planType, fields[session.index + 1]),
                );
                return;
              }
              if (!hasEnoughPlanContext(session.planType, answers)) {
                pushAssistant(
                  "A bit more detail is required for this plan type—elaborate on the last answer or say **cancel**.",
                );
                return;
              }
              const base: PendingChatGenerate = {
                planType: session.planType,
                planName: null,
                scheduleKind: null,
                userTasks: null,
                generateFullSchedule: false,
                rawAnswers: answers,
                userRequest: "",
              };
              setPlanFlow({ kind: "await_notes", base });
              pushAssistant(optionalNotesPrompt());
              return;
            }
            case "await_notes": {
              const note =
                userText.trim().toLowerCase() === "skip"
                  ? ""
                  : userText.trim();
              const base: PendingChatGenerate = {
                ...session.base,
                userRequest: note,
              };
              await runPlanGeneration(base, { kind: "await_notes", base });
              return;
            }
            case "review": {
              if (wantsSavePlanReply(userText)) {
                try {
                  await savePlan({
                    anonymous_id: anonymousId,
                    source_checkin_id: checkin.id,
                    plan: session.draft.plan,
                    model: session.draft.model,
                    source: session.draft.source,
                    plan_meta: session.meta ?? null,
                  });
                  emitDashboardPlansMutated();
                  const list = await getPlans(anonymousId);
                  setPlans(list);
                  setPlanFlow(null);
                  pushAssistant(
                    "Your plan is saved. Use the link below to open your Plan page and work through checklist steps. This chat stays read-only for other tabs.",
                    { showPlanPageLink: true },
                  );
                } catch (e) {
                  pushAssistant(
                    `Couldn’t save (${e instanceof Error ? e.message : "error"}). Try saving from the Plan tab.`,
                  );
                }
                return;
              }
              const checklistEdit = applyChecklistEditFromChatMessage({
                userText,
                items: session.draft.plan.checklist_items,
              });
              if (checklistEdit.kind === "clarify") {
                pushAssistant(checklistEdit.message);
                return;
              }
              if (checklistEdit.kind === "applied") {
                const newDraft = {
                  ...session.draft,
                  plan: {
                    ...session.draft.plan,
                    checklist_items: checklistEdit.items,
                  },
                };
                setPlanFlow({
                  kind: "review",
                  draft: newDraft,
                  meta: null,
                  base: session.base,
                });
                pushAssistant(
                  `${checklistEdit.message}\n\n${formatChecklistPreviewLines(checklistEdit.items)}`,
                );
                return;
              }
              if (wantsStripRecoveryOrLightenLoad(userText)) {
                const list = plans ?? [];
                const burnoutModel = buildDashboardAlignedBurnoutViewModel(
                  checkin,
                  {
                    previousCheckin,
                    plans: list,
                  },
                );
                const { baseline, stripped, line } =
                  projectStrainIfStrippingRecovery({
                    checkin,
                    baselineComposite: burnoutModel.composite,
                    checklistItems: session.draft.plan.checklist_items,
                  });
                setPlanFlow({
                  kind: "risk_strip",
                  draft: session.draft,
                  meta: session.meta,
                  base: session.base,
                  baselineComposite: baseline,
                  strippedProjected: stripped,
                  explainer: line,
                });
                pushAssistant(
                  [
                    "Trimming wellness, recovery, or pacing usually shifts the **rule-based readout** upward because those pieces buffer load—not clinical, and not a prediction.",
                    "",
                    `Your current overview-style strain is about **${baseline}/100**. If you remove that padding, a rough illustrative level is often nearer **${stripped}/100**.`,
                    "",
                    line,
                    "",
                    "Reply **confirm** if you’re sure you want a leaner plan without those softer steps, or **keep** to leave this draft as-is.",
                  ].join("\n"),
                );
                return;
              }
              if (wantsFullPlanRegenerate(userText)) {
                const nextBase: PendingChatGenerate = {
                  ...session.base,
                  userRequest: `${session.base.userRequest} User asked in chat to regenerate the entire plan (same answers, fresh generation).`.trim(),
                };
                await runPlanGeneration(nextBase, {
                  kind: "review",
                  draft: session.draft,
                  meta: session.meta,
                  base: session.base,
                });
                return;
              }
              const nextBase: PendingChatGenerate = {
                ...session.base,
                userRequest: `${session.base.userRequest} Revision requested in chat: ${userText.trim()}`.trim(),
              };
              await runPlanGeneration(nextBase, {
                kind: "review",
                draft: session.draft,
                meta: session.meta,
                base: session.base,
              });
              return;
            }
            default:
              return;
          }
        };

        try {
          const flowSnapshot = planFlow;
          if (flowSnapshot) {
            await handlePlanFlowActions(flowSnapshot, trimmed);
            return;
          }

          if (messageStartsPlanFlow(trimmed)) {
            setPlanFlow({ kind: "pick_type" });
            pushAssistant(formatPlanTypeMenu());
            return;
          }

          const list = plans ?? [];
          const burnoutModel = buildDashboardAlignedBurnoutViewModel(checkin, {
            previousCheckin,
            plans: list,
          });
          const data = await generateChatReply({
            anonymous_id: anonymousId,
            message: trimmed,
            latest_checkin: buildChatCheckinPayload(checkin),
            active_plan:
              list[0] != null ? buildActivePlanContext(list[0]) : null,
            saved_plan_summaries: buildSavedPlanSummaries(list, true),
            burnout_context: buildBurnoutChatContext(burnoutModel),
            conversation_history: historyForApi,
            session_context: {
              note:
                "Replies use read-only context. They do not automatically update saved check-ins, profile data, or stored plans. When the user asks for next steps, priorities, or task help, weigh their saved plan checklist (and any user_tasks_from_generation) together with check-in and burnout—not the latest check-in alone.",
            },
          });

          let content = data.reply.trim();
          if (data.caution?.trim()) {
            content = `${content}\n\n— ${data.caution.trim()}`;
          }

          setMessages((prev) => [
            ...prev,
            { id: newId(), role: "assistant", content: content },
          ]);
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Something went wrong sending.";
          setSendError(msg);
          setMessages((prev) => [
            ...prev,
            {
              id: newId(),
              role: "assistant",
              content:
                "I couldn’t reach the server just now. Check that the API is running and try again.",
            },
          ]);
        } finally {
          setSending(false);
        }
      },
      [
        anonymousId,
        checkin,
        messages,
        sending,
        plans,
        planFlow,
        previousCheckin,
        onOpenBurnout,
      ],
    );

    useEffect(() => {
      if (chatSeed !== CHAT_SEED_QUICK_PLAN || quickPlanSeedConsumedRef.current) {
        return;
      }
      if (plans === null) return;
      quickPlanSeedConsumedRef.current = true;
      void sendUserMessage(PLAN_FLOW_CHIP_LABELS[0]);
      onChatSeedConsumed?.();
    }, [chatSeed, plans, sendUserMessage, onChatSeedConsumed]);

    const onChip = useCallback(
      (chipId: string, label: string) => {
        if (chipId === "checkin") {
          requestAnimationFrame(() => {
            if (onOpenBurnout) {
              onOpenBurnout();
              return;
            }
            document
              .getElementById("dashboard-checkin-preview")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
        void sendUserMessage(label);
      },
      [onOpenBurnout, sendUserMessage],
    );

    useImperativeHandle(
      ref,
      () => ({
        playFollowUp: (id: string) => {
          const c = FOLLOW_UPS.find((x) => x.id === id);
          if (c) onChip(c.id, c.label);
        },
      }),
      [onChip],
    );

    const onSubmit = useCallback(() => {
      void sendUserMessage(draft);
      setDraft("");
    }, [draft, sendUserMessage]);

    const headingId = `${baseId}-heading`;

    return (
      <section
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
          className,
        )}
        aria-labelledby={headingId}
      >
        {/* (1) Fixed chat chrome — does not scroll with the thread */}
        <header className="shrink-0 border-b border-border/40 px-1 pb-3 pt-1 sm:px-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h2
                id={headingId}
                className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl"
              >
                Support Chat
              </h2>
              <p className="max-w-xl text-xs leading-snug text-muted-foreground sm:text-sm">
                Uses your check-in, rule-based burnout snapshot, and saved plan
                when available—all read-only here.
              </p>
            </div>
            <div
              className="flex shrink-0 flex-wrap items-center gap-2"
              aria-label="Chat mode"
            >
              <StatusBadge variant="live" className="text-[10px]">
                Local AI
              </StatusBadge>
              <StatusBadge variant="soon" className="text-[10px]">
                Beta
              </StatusBadge>
            </div>
          </div>

          <div
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/30 pt-3 text-[11px] text-muted-foreground sm:text-xs"
            aria-label="Context in use"
          >
            <span>
              Check-in{" "}
              <span className="text-foreground/80">
                {formatCheckinTime(checkin.created_at) || "available"}
              </span>
            </span>
            {plans === null ? (
              <span className="text-muted-foreground/80">Plan context…</span>
            ) : activePlan && planProgress && planProgress.total > 0 ? (
              <span className="max-w-[min(100%,20rem)] truncate sm:max-w-md">
                Plan{" "}
                <span className="font-medium text-foreground/90">
                  {activePlan.title}
                </span>
                <span aria-hidden> · </span>
                <span className="tabular-nums">
                  {planProgress.percent}% done
                </span>
              </span>
            ) : activePlan ? (
              <span className="max-w-[min(100%,20rem)] truncate sm:max-w-md">
                Plan{" "}
                <span className="font-medium text-foreground/90">
                  {activePlan.title}
                </span>
              </span>
            ) : (
              <span>No saved plan yet</span>
            )}
          </div>
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            Not for crisis or clinical care.
          </p>
        </header>

        {planModeActive ? (
          <div
            role="status"
            aria-live="polite"
            className="shrink-0 border-b border-amber-500/40 bg-amber-500/[0.12] px-3 py-2.5 dark:bg-amber-500/15 sm:px-4"
          >
            <div className="mx-auto flex max-w-2xl flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex min-w-0 gap-2.5">
                <ClipboardList
                  className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-300"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1 text-xs leading-snug">
                  <p className="font-semibold tracking-tight text-foreground">
                    Plan mode
                  </p>
                  <p className="text-muted-foreground">
                    You’re in the guided plan builder. General questions won’t
                    get a normal chat reply until you exit. For best results,
                    follow the prompts in order—some steps are optional.
                  </p>
                  <p className="text-muted-foreground">
                    Reply{" "}
                    <span className="font-medium text-foreground">cancel</span>{" "}
                    or use Exit to return to regular support chat.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0 border-amber-600/40 bg-background/80 text-foreground hover:bg-amber-500/10 dark:border-amber-500/45"
                disabled={sending}
                onClick={() => void sendUserMessage("cancel")}
              >
                Exit plan mode
              </Button>
            </div>
          </div>
        ) : null}

        {/* (2) Only vertical scroll container in this workspace */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          role="region"
          aria-label="Chat messages"
        >
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation"
            className="mx-auto flex w-full max-w-2xl flex-col space-y-5 px-3 py-5 sm:px-4 sm:py-6"
          >
            {messages.map((m) =>
              m.role === "assistant" ? (
                <article
                  key={m.id}
                  className="flex justify-start"
                  aria-label="Assistant"
                >
                  <div className="max-w-[min(100%,42rem)] whitespace-pre-wrap rounded-xl bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {m.content}
                    {m.showPlanPageLink ? (
                      <p className="mt-3 border-t border-border/45 pt-3 whitespace-normal">
                        <Link
                          href={dashboardHref("plan")}
                          className="font-medium text-primary underline decoration-primary/35 underline-offset-[3px] transition-colors hover:text-primary/90 hover:decoration-primary/70"
                        >
                          Open Plan page
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </article>
              ) : (
                <article
                  key={m.id}
                  className="flex justify-end"
                  aria-label="You"
                >
                  <div className="max-w-[min(100%,85%)] whitespace-pre-wrap rounded-xl border border-border/50 bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
                    {m.content}
                  </div>
                </article>
              ),
            )}
            {sending ? (
              <div className="flex justify-start" aria-live="polite">
                <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2
                    className="size-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Thinking…
                </div>
              </div>
            ) : null}
            <div ref={threadEndRef} aria-hidden className="h-px shrink-0" />
          </div>
        </div>

        {/* (3) Fixed composer — flex sibling, not sticky; parent column bounds height */}
        <footer className="shrink-0 border-t border-border/50 bg-background pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.25)]">
          <div className="mx-auto w-full max-w-2xl px-3 sm:px-4">
            <p
              id={`${baseId}-quick-label`}
              className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/90"
            >
              Quick prompts
            </p>
            <div
              className="mb-3 flex flex-wrap gap-2"
              role="group"
              aria-labelledby={`${baseId}-quick-label`}
            >
              {FOLLOW_UPS.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={sending || planModeActive}
                  className="h-9 min-h-9 rounded-full border border-border/60 bg-muted/30 px-3 text-xs font-normal text-foreground shadow-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onChip(c.id, c.label)}
                >
                  {c.label}
                </Button>
              ))}
            </div>

            <div className="flex min-h-[44px] items-end gap-2 pb-3">
              <label htmlFor={composerId} className="sr-only">
                Message to assistant
              </label>
              <textarea
                ref={composerRef}
                id={composerId}
                rows={2}
                disabled={sending}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                placeholder={
                  planModeActive
                    ? "Answer the plan prompt, or type cancel… (Shift+Enter for new line)"
                    : "Ask a question… (Shift+Enter for new line)"
                }
                aria-describedby={`${baseId}-compose-hint`}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-input bg-background px-3 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              />
              <Button
                type="button"
                size="icon"
                className="size-11 shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                onClick={() => onSubmit()}
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            <p id={`${baseId}-compose-hint`} className="sr-only">
              {planModeActive
                ? "Plan mode: messages follow the guided plan flow only. Press Enter to send. Shift+Enter adds a line. Say cancel or use Exit plan mode to return to normal chat."
                : "Press Enter to send. Shift+Enter adds a line. Replies use read-only context and do not change saved check-ins or plans."}
            </p>
            {sendError ? (
              <p
                className="pb-3 text-xs text-destructive"
                role="alert"
              >
                {sendError}
              </p>
            ) : null}
          </div>
        </footer>
      </section>
    );
  },
);
