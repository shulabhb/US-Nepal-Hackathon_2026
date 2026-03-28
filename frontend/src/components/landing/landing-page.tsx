import { LANDING_IDS } from "@/lib/landing-ids";

import { FeatureHighlightsSection } from "./feature-highlights-section";
import { FinalCtaSection } from "./final-cta-section";
import { HeroSection } from "./hero-section";
import { HowItWorksSection } from "./how-it-works-section";
import { MindfulDesignSection } from "./mindful-design-section";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { TrustStrip } from "./trust-strip";
import { WhyDifferentSection } from "./why-different-section";

export function LandingPage() {
  return (
    <>
      <a
        href={`#${LANDING_IDS.main}`}
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:translate-y-0 focus:overflow-visible focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main id={LANDING_IDS.main}>
        <HeroSection />
        <TrustStrip />
        <HowItWorksSection />
        <WhyDifferentSection />
        <FeatureHighlightsSection />
        <MindfulDesignSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
