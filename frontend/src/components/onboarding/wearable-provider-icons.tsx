import type { WearableProviderId } from "@/lib/onboarding/wearable-simulation";

/** Simple brand-style marks (demo UI only — not official logos). */
export function WearableBrandIcon({
  id,
  className,
}: {
  id: WearableProviderId;
  className?: string;
}) {
  const cn = className ?? "size-7";
  switch (id) {
    case "apple_watch":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      );
    case "garmin":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.18l5.5 2.75v7.14L12 19.82l-5.5-2.75V6.93L12 4.18zM11 8.5h2v5h-2v-5zm0 6h2v2h-2v-2z" />
        </svg>
      );
    case "samsung":
      /** Samsung-style oval mark (demo — not an official logo asset). */
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <ellipse cx="12" cy="12" rx="9.2" ry="5.4" transform="rotate(-28 12 12)" />
        </svg>
      );
    case "whoop":
      return (
        <svg
          className={cn}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4.5 12h3l2-6 4 12 2-6h3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
