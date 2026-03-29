import Image from "next/image";

import { cn } from "@/lib/utils";

type LandingDashboardMockProps = {
  className?: string;
};

export function LandingDashboardMock({ className }: LandingDashboardMockProps) {
  return (
    <div
      className={cn(
        "relative w-full select-none pb-12 pt-12 sm:pb-24 sm:pt-20 overflow-visible",
        className,
      )}
    >
      {/* Abstract Dribbble-style background blur/glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[120%] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-sky-400/20 via-primary/15 to-violet-400/20 blur-3xl" />
      
      {/* Decorative dot pattern */}
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_65%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />

      <div className="relative z-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-10 sm:gap-y-6 lg:-mx-8 lg:gap-x-12">
        <div className="flex flex-col gap-4 sm:gap-6 translate-y-6 sm:translate-y-12">
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-[1.75rem] border border-white/40 bg-white/40 p-[2px] sm:p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-black/50">
            <div className="relative overflow-hidden rounded-[0.65rem] sm:rounded-[1.5rem] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10">
              <Image src="/dashboard.png" alt="Dashboard Snapshot" width={1200} height={1600} sizes="(max-width: 768px) 50vw, 400px" quality={100} className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" priority />
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-[1.75rem] border border-white/40 bg-white/40 p-[2px] sm:p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-black/50">
            <div className="relative overflow-hidden rounded-[0.65rem] sm:rounded-[1.5rem] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10">
              <Image src="/plan.png" alt="Care Plan feature" width={1200} height={1600} sizes="(max-width: 768px) 50vw, 400px" quality={100} className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" priority />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 sm:gap-6 -translate-y-6 sm:-translate-y-10">
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-[1.75rem] border border-white/40 bg-white/40 p-[2px] sm:p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-black/50">
            <div className="relative overflow-hidden rounded-[0.65rem] sm:rounded-[1.5rem] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10">
              <Image src="/rings.png" alt="Burnout Rings feature" width={1200} height={1600} sizes="(max-width: 768px) 50vw, 400px" quality={100} className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" priority />
            </div>
          </div>
          
          <div className="group relative overflow-hidden rounded-xl sm:rounded-[1.75rem] border border-white/40 bg-white/40 p-[2px] sm:p-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] dark:border-white/10 dark:bg-black/50">
            <div className="relative overflow-hidden rounded-[0.65rem] sm:rounded-[1.5rem] bg-white ring-1 ring-black/5 dark:bg-black dark:ring-white/10">
              <Image src="/chat.png" alt="Support Chat detail" width={1200} height={1600} sizes="(max-width: 768px) 50vw, 400px" quality={100} className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" priority />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
