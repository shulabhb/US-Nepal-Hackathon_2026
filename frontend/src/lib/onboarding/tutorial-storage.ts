import { clearDashboardTourDone } from "@/lib/onboarding/dashboard-tour-config";

export const WORKSPACE_TUTORIAL_STORAGE_KEY =
  "burnout-radar-workspace-tutorial-done-v1";

export const WORKSPACE_TUTORIAL_REQUEST_EVENT = "burnout-workspace-tutorial-request";

/** Same-tab: completion or reset changed — header can hide/show the tour button. */
export const WORKSPACE_TUTORIAL_SYNC_EVENT = "burnout-workspace-tutorial-sync";

function notifyTutorialStorageChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_TUTORIAL_SYNC_EVENT));
}

export function isWorkspaceTutorialCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WORKSPACE_TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWorkspaceTutorialCompleted(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_TUTORIAL_STORAGE_KEY, "1");
    notifyTutorialStorageChanged();
  } catch {
    /* ignore quota / private mode */
  }
}

/** Clears completion flag so the tour can run again (e.g. after “Reset this device”). */
export function clearWorkspaceTutorialState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WORKSPACE_TUTORIAL_STORAGE_KEY);
    notifyTutorialStorageChanged();
  } catch {
    /* ignore */
  }
  clearDashboardTourDone();
}

/** Fire when the user asks to start the tour; the tutorial UI can subscribe later. */
export function emitWorkspaceTutorialRequest(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_TUTORIAL_REQUEST_EVENT));
}
