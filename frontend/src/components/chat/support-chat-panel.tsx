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

import { Loader2, Send } from "lucide-react";
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
import { generateChatReply } from "@/lib/api/ai";
import { getPlans } from "@/lib/api/plans";
import {
  buildActivePlanContext,
  buildLatestCheckinPayload,
  buildSavedPlanSummaries,
} from "@/lib/dashboard/chat-context";
import { planChecklistProgress } from "@/lib/dashboard/plan-checklist";
import { cn } from "@/lib/utils";
import type { CheckinDetailResponse, StoredPlan } from "@/types/api";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const FOLLOW_UPS: { id: string; label: string }[] = [
  { id: "plan", label: "Help me make a plan" },
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
  /** When set, “latest check-in” opens this instead of scrolling to a DOM id. */
  onOpenCheckIns?: () => void;
};

export const SupportChatPanel = forwardRef<SupportChatPanelHandle, Props>(
  function SupportChatPanel(
    {
      anonymousId,
      checkin,
      initialAssistantMessage,
      className,
      onOpenCheckIns,
    },
    ref,
  ) {
    const baseId = useId();
    const threadEndRef = useRef<HTMLDivElement>(null);
    const composerId = `${baseId}-composer`;

    const [messages, setMessages] = useState<ChatMessage[]>(() => [
      {
        id: newId(),
        role: "assistant",
        content: initialAssistantMessage,
      },
    ]);
    const [plans, setPlans] = useState<StoredPlan[] | null>(null);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const activePlan = plans != null && plans.length > 0 ? plans[0] : null;
    const planProgress = activePlan
      ? planChecklistProgress(activePlan.checklist_items)
      : null;

    useEffect(() => {
      let cancelled = false;
      void getPlans(anonymousId)
        .then((list) => {
          if (!cancelled) setPlans(list);
        })
        .catch(() => {
          if (!cancelled) setPlans([]);
        });
      return () => {
        cancelled = true;
      };
    }, [anonymousId]);

    useEffect(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

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
            if (onOpenCheckIns) {
              onOpenCheckIns();
              return;
            }
            document
              .getElementById("dashboard-checkin-preview")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }

        try {
          const list = plans ?? [];
          const data = await generateChatReply({
            anonymous_id: anonymousId,
            message: trimmed,
            latest_checkin: buildLatestCheckinPayload(checkin),
            active_plan:
              list[0] != null ? buildActivePlanContext(list[0]) : null,
            saved_plan_summaries: buildSavedPlanSummaries(list, true),
            conversation_history: historyForApi,
            session_context: {
              note:
                "Replies use read-only context. They do not automatically update saved check-ins, profile data, or stored plans.",
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
        onOpenCheckIns,
      ],
    );

    const onChip = useCallback(
      (chipId: string, label: string) => {
        if (chipId === "checkin") {
          requestAnimationFrame(() => {
            if (onOpenCheckIns) {
              onOpenCheckIns();
              return;
            }
            document
              .getElementById("dashboard-checkin-preview")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          });
        }
        void sendUserMessage(label);
      },
      [onOpenCheckIns, sendUserMessage],
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
                Using your latest check-in and active plan for context.
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
                  disabled={sending}
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
                placeholder="Ask a question… (Shift+Enter for new line)"
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
              Press Enter to send. Shift+Enter adds a line. Replies use read-only
              context and do not change saved check-ins or plans.
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
