/**
 * Targeted checklist edits in chat plan review (avoid full regenerate when possible).
 */

import type { PlanChecklistItem } from "@/types/api";

export type ChecklistChatEditResult =
  | { kind: "none" }
  | { kind: "clarify"; message: string }
  | { kind: "applied"; items: PlanChecklistItem[]; message: string };

function haystack(it: PlanChecklistItem): string {
  const legacy = it as PlanChecklistItem & { rationale?: string | null };
  return `${it.label ?? ""} ${it.description ?? ""} ${legacy.rationale ?? ""}`.toLowerCase();
}

/** Whole message is only “remove step 3” / “delete task #2”. */
function parseRemoveByIndex(
  t: string,
  len: number,
): { index1: number } | null {
  const m = t.match(
    /^(?:remove|delete|drop|take\s+out)\s+(?:task|step|item)?\s*#?\s*(\d+)\s*$/i,
  );
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 1) return null;
  if (n > len) return null;
  return { index1: n };
}

function parseRemoveByPhrase(t: string): string | null {
  const m = t.match(
    /^(?:remove|delete|drop|take\s+out|strip)\s+(?:the\s+)?(?:task|step|item)?\s*[:\-]?\s*(.+)$/i,
  );
  if (!m) return null;
  const needle = m[1].trim().replace(/\s+/g, " ");
  if (needle.length < 2) return null;
  if (/^\d+$/.test(needle)) return null;
  return needle;
}

function parseAdd(t: string): string | null {
  const m = t.match(
    /^(?:add|also\s+add|include)\b\s*[:\-]?\s*(.+)$/i,
  );
  if (!m) return null;
  const name = m[1].trim().replace(/\s+/g, " ");
  if (name.length < 2) return null;
  return name;
}

export function wantsFullPlanRegenerate(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /\b(regenerate|redo\s+(the\s+)?whole\s+plan|start\s+over|rebuild\s+(the\s+)?plan|from\s+scratch)\b/.test(
      t,
    )
  );
}

/**
 * Try add/remove by number or matching text. Returns `none` → caller may full-regenerate.
 */
export function applyChecklistEditFromChatMessage(args: {
  userText: string;
  items: PlanChecklistItem[];
}): ChecklistChatEditResult {
  const t = args.userText.trim();
  if (!t) return { kind: "none" };

  const idx = parseRemoveByIndex(t, args.items.length);
  if (idx) {
    const i = idx.index1 - 1;
    const removed = args.items[i];
    const next = args.items.filter((_, j) => j !== i);
    return {
      kind: "applied",
      items: next,
      message: `Removed step ${idx.index1}: “${(removed.label ?? "").trim()}”. ${next.length} step(s) left. Say **save** when it looks right, or keep editing.`,
    };
  }

  const phrase = parseRemoveByPhrase(t);
  if (phrase) {
    const needle = phrase.toLowerCase();
    const next = args.items.filter((it) => !haystack(it).includes(needle));
    if (next.length === args.items.length) {
      return {
        kind: "clarify",
        message: `No step matched “${phrase}”. Try a shorter snippet from the step title, or **remove 3** using the step number from the preview.`,
      };
    }
    return {
      kind: "applied",
      items: next,
      message: `Removed ${args.items.length - next.length} step(s) matching “${phrase}”. ${next.length} left.`,
    };
  }

  const addLabel = parseAdd(t);
  if (addLabel) {
    const newItem: PlanChecklistItem = {
      label: addLabel.slice(0, 500),
      description: "Added in chat before saving.",
      time_estimate: "Flexible",
      completed: false,
    };
    const next = [...args.items, newItem];
    return {
      kind: "applied",
      items: next,
      message: `Added: “${newItem.label}”. You now have ${next.length} steps (numbered in the preview).`,
    };
  }

  return { kind: "none" };
}

export function formatChecklistPreviewLines(
  items: PlanChecklistItem[],
  max = 12,
): string {
  const lines = items.slice(0, max).map((it, i) => {
    const l = (it.label ?? "Step").trim();
    const te = (it.time_estimate ?? "").trim();
    return `${i + 1}. ${l}${te ? ` · ${te}` : ""}`;
  });
  const more =
    items.length > max ? `\n… +${items.length - max} more` : "";
  return ["Steps:", ...lines, more].filter((x) => x).join("\n");
}
