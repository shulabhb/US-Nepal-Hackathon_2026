import { jsPDF } from "jspdf";

import type { PlanChecklistItem } from "@/types/api";

export type PlanPdfPayload = {
  title: string;
  summary: string;
  time_horizon: string;
  checklist_items: PlanChecklistItem[];
  notes: string[];
};

function slugifyFilename(s: string): string {
  const t = s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return t.length > 0 ? t.slice(0, 56) : "plan";
}

function taskLines(item: PlanChecklistItem): {
  label: string;
  body: string;
  done: boolean;
} {
  const legacy = item as PlanChecklistItem & { rationale?: string | null };
  const description =
    (item.description?.trim() || legacy.rationale?.trim() || "").trim() ||
    "Details for this step weren’t stored.";
  const time =
    (item.time_estimate?.trim() || "").trim() || "Flexible";
  const label = (item.label?.trim() || "Task").trim();
  const extra = item.additional_info?.trim();
  const body =
    extra != null && extra.length > 0
      ? `${description}\nTime: ${time}\n${extra}`
      : `${description}\nTime: ${time}`;
  return {
    label,
    body,
    done: item.completed === true,
  };
}

/**
 * Builds a printable PDF with title, summary, horizon, and checklist rows
 * using [ ] / [x] markers for completion state.
 */
export function downloadPlanPdf(
  plan: PlanPdfPayload,
  options?: { filename?: string },
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = margin;

  const lineH = (pt: number) => {
    doc.setFontSize(pt);
    return doc.getLineHeight() / doc.internal.scaleFactor;
  };

  const needPage = (h: number) => {
    if (y + h <= pageH - margin) return;
    doc.addPage();
    y = margin;
  };

  const writeParagraph = (text: string, pt: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(pt);
    doc.setTextColor(0, 0, 0);
    const lh = lineH(pt);
    const lines = doc.splitTextToSize(text, maxW) as string[];
    for (const line of lines) {
      needPage(lh + 1);
      doc.text(line, margin, y);
      y += lh;
    }
  };

  writeParagraph(plan.title, 15, true);
  y += 2;
  writeParagraph(plan.summary, 10);
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  needPage(lineH(9) + 2);
  doc.text(`Horizon: ${plan.time_horizon}`, margin, y);
  y += lineH(9) + 4;
  doc.setTextColor(0, 0, 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  needPage(lineH(11) + 2);
  doc.text("Checklist", margin, y);
  y += lineH(11) + 3;
  doc.setFont("helvetica", "normal");

  if (plan.checklist_items.length === 0) {
    writeParagraph("No checklist steps in this plan.", 10);
  } else {
    plan.checklist_items.forEach((item, i) => {
      const t = taskLines(item);
      const box = t.done ? "[x]" : "[ ]";
      const header = `${box} ${i + 1}. ${t.label}`;
      writeParagraph(header, 10, false);
      y += 1;
      doc.setFontSize(9);
      doc.setTextColor(55, 55, 55);
      const bodyLines = doc.splitTextToSize(t.body, maxW - 6) as string[];
      const lh9 = lineH(9);
      for (const line of bodyLines) {
        needPage(lh9 + 1);
        doc.text(line, margin + 6, y);
        y += lh9;
      }
      doc.setTextColor(0, 0, 0);
      y += 3;
    });
  }

  if (plan.notes?.length) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    needPage(lineH(10) + 2);
    doc.text("Notes", margin, y);
    y += lineH(10) + 2;
    doc.setFont("helvetica", "normal");
    for (const n of plan.notes) {
      writeParagraph(n, 9);
      y += 1;
    }
  }

  const foot = "Burnout Radar — planning support only; not medical advice.";
  const last = doc.getNumberOfPages();
  doc.setPage(last);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(foot, margin, pageH - margin);

  const stamp = new Date().toISOString().slice(0, 10);
  const base = options?.filename ?? `plan-${slugifyFilename(plan.title)}-${stamp}.pdf`;
  const safe = base.endsWith(".pdf") ? base : `${base}.pdf`;
  doc.save(safe);
}
