import { AppHeader } from "@/components/shell/app-header";

type SiteHeaderProps = {
  className?: string;
};

/** Landing navbar — same shell as dashboard; uses marketing CTA. */
export function SiteHeader({ className }: SiteHeaderProps) {
  return <AppHeader variant="marketing" className={className} />;
}
