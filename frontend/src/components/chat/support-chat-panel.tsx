"use client";

import { Loader2, MessageCircle, Send } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { generateChatReply } from "@/lib/api/ai";
import { getPlans } from "@/lib/api/plans";
import {
  buildActivePlanContext,
  buildLatestCheckinPayload,
  buildSavedPlanSummaries,
} from "@/lib/dashboard/chat-context";
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
    const listId = useId();
    const scrollRef = useRef<HTMLDivElement>(null);
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
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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

    return (
      <section
        className={cn(
          "flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-md",
          className,
        )}
        aria-labelledby={`${listId}-heading`}
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <MessageCircle className="size-4 text-primary" aria-hidden />
          <div>
            <h2
              id={`${listId}-heading`}
              className="font-heading text-sm font-semibold text-foreground"
            >
              Support chat
            </h2>
            <p className="text-xs text-muted-foreground">
              Local AI · planning &amp; next steps · not clinical care
            </p>
          </div>
        </div>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="max-h-[min(52vh,28rem)] flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {messages.map((m) =>
            m.role === "assistant" ? (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[min(100%,28rem)] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border/60 bg-muted/50 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[min(100%,28rem)] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
                  {m.content}
                </div>
              </div>
            ),
          )}
          {sending ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin shrink-0" aria-hidden />
                Thinking…
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-3 py-3">
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
            Try a starting point
          </p>
          <div className="flex flex-wrap gap-2">
            {FOLLOW_UPS.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="secondary"
                size="sm"
                disabled={sending}
                className="h-auto rounded-full border border-border/70 bg-background/90 px-3 py-1.5 text-xs font-normal text-foreground shadow-none hover:bg-accent/80"
                onClick={() => onChip(c.id, c.label)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-border/70 bg-card px-3 py-2">
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">
            What you share here guides this chat only. It does not automatically
            change your saved check-in or plans.
          </p>
        </div>

        <div className="flex items-end gap-2 border-t border-border/70 bg-card px-3 py-3">
          <label htmlFor={`${listId}-composer`} className="sr-only">
            Message
          </label>
          <textarea
            id={`${listId}-composer`}
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
            placeholder="Ask about next steps, prioritizing, or lightening your plan…"
            className="min-h-10 flex-1 resize-none rounded-xl border border-input bg-background/80 px-3 py-2.5 text-sm text-foreground shadow-inner placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="shrink-0 rounded-xl"
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
        {sendError ? (
          <p className="border-t border-border/60 px-3 py-2 text-xs text-destructive">
            {sendError}
          </p>
        ) : null}
      </section>
    );
  },
);
