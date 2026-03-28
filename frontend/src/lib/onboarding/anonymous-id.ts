const STORAGE_KEY = "burnout-radar-anonymous-id";

/**
 * Stable opaque id for this browser (localStorage).
 * Not auth—just ties check-ins on this device for future history/model work.
 */
export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const id = `anon_${crypto.randomUUID()}`;
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
