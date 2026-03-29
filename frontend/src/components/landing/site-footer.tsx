export function SiteFooter() {
  return (
    <footer
      className="border-t border-border/60 bg-background"
      aria-labelledby="footer-label"
    >
      <h2 id="footer-label" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
            Burnout Radar
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Early burnout signal—anonymous check-in, optional sleep context, and
            clear next steps.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Burnout Radar is an early-support tool and not a replacement for
          professional mental health care or emergency services. If you or
          someone else is in immediate danger, contact local emergency services or
          a crisis line right away.
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Burnout Radar. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
