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
    title: "Anonymous by design",
    body: "No account drama. You share only what helps the snapshot stay useful.",
  },
  {
    icon: MoonStar,
    title: "Sleep-aware insights",
    body: "Optional rhythm data—when you want it—folded into the bigger picture.",
  },
  {
    icon: ArrowUpRight,
    title: "Early burnout detection",
    body: "Flags rising risk patterns while they’re still navigable, not after a crash.",
  },
  {
    icon: BookOpen,
    title: "Actionable next steps",
    body: "Plain-language moves you can try this week—not some vague self-care list.",
  },
] as const;

export function TrustStrip() {
  return (
    <section
      className="border-b border-border/60 bg-muted/35"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Why people open Burnout Radar
            </p>
            <h2
              id="trust-heading"
              className="font-heading mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Private signal. Clear readout. Gentle momentum.
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
