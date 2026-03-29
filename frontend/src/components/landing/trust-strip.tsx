import {
  ArrowUpRight,
  BookOpen,
  MoonStar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "Anonymous-first",
    body: "No real name; session data stays tied to this browser’s anonymous ID.",
  },
  {
    icon: MoonStar,
    title: "Sleep in the mix",
    body: "Optional sleep fields inform the same snapshot that drives rings and Plan.",
  },
  {
    icon: ArrowUpRight,
    title: "Strain you can see",
    body: "Composite-style rings and bands visualize load—not a medical readout.",
  },
  {
    icon: BookOpen,
    title: "Plan + chat + history",
    body: "Checklists and tasks, contextual support chat, and a Burnout tab for depth and past check-ins.",
  },
] as const;

export function TrustStrip() {
  return (
    <section
      data-tour="landing-trust"
      className="border-b border-border/60 bg-muted/35"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              At a glance
            </p>
            <h2
              id="trust-heading"
              className="font-heading mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Check-in once; keep working the dashboard.
            </h2>
          </div>
          <Sparkles
            className="hidden size-8 text-primary/50 sm:block"
            aria-hidden
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </div>
              <h3 className="font-heading text-sm font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
