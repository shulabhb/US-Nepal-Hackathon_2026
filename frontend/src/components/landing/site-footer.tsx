export function SiteFooter() {
  return (
    <footer
      className="border-t border-border/60 bg-background"
      aria-labelledby="footer-label"
    >
      <h2 id="footer-label" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 px-4 py-8 sm:px-6 sm:py-10 md:flex-row lg:px-8">
        <div className="flex max-w-md flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Burnout Radar
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground text-justify">
              Burnout Radar is an early-support tool and not a replacement for
              professional mental health care or emergency services. If you or
              someone else is in immediate danger, contact local emergency services or
              a crisis line right away.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Burnout Radar. All rights reserved.
          </p>
        </div>

        <div className="flex max-w-sm flex-col justify-start">
          <div className="space-y-4">
            <p className="font-heading text-lg font-semibold tracking-tight text-foreground">
              Our Features
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground text-justify">
              Anonymous check-in → private burnout readout and strain rings on a
              dashboard with tailored plans, contextual support chat, full Burnout
              detail, and check-ins you can repeat—not a replacement for care.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
